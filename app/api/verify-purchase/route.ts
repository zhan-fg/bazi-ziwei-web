import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * POST /api/verify-purchase
 *
 * Credit model: each pyzrg purchase grants +1 report_unlocks_remaining.
 * Only grants credits for purchases made AFTER the user's last_credited_at
 * timestamp. This prevents old purchases from granting unlimited unlocks.
 *
 * Body: { email: string, chartId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, chartId } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Get or create user
    const { data: user } = await db
      .from(TABLES.users)
      .select("id, report_unlocks_remaining, unlocked_charts, last_credited_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Count new purchases since last credit.
    // Only count processed_sales (shared table) — bazi_processed_sales purchases
    // are handled by the webhook's handleBaziPurchase which directly updates bazi_users.
    // If last_credited_at is null, default to now so no historical double-count.
    const lastCreditedAt = user?.last_credited_at || new Date().toISOString();

    const { data: sharedSales } = await db
      .from("processed_sales")
      .select("sale_id, product_permalink, created_at")
      .eq("email", normalizedEmail)
      .gt("created_at", lastCreditedAt)
      .order("created_at", { ascending: false });

    // Filter to pyzrg purchases only
    const newPurchases = (sharedSales || [])
      .filter((s: any) => (s.product_permalink || "").toLowerCase().includes("pyzrg"));

    const totalNew = newPurchases.length;

    // 3. Apply credits
    let reportUnlocks = user?.report_unlocks_remaining || 0;
    if (totalNew > 0 && user) {
      reportUnlocks += totalNew;
      await db.from(TABLES.users)
        .update({
          report_unlocks_remaining: reportUnlocks,
          last_credited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else if (totalNew > 0 && !user) {
      reportUnlocks = totalNew;
      const { data: newUser } = await db.from(TABLES.users)
        .insert({
          anonymous_id: `gsale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          email: normalizedEmail,
          free_uses_remaining: 0,
          report_unlocks_remaining: totalNew,
          unlocked_charts: [],
          last_credited_at: new Date().toISOString(),
          subscription_status: "none",
        })
        .select("id")
        .single();
    }

    // 4. Check if user can unlock this chart
    const unlockedCharts: string[] = user?.unlocked_charts || [];
    if (reportUnlocks <= 0 && !unlockedCharts.includes(chartId)) {
      return NextResponse.json({
        verified: false,
        error: "No purchase found. Please complete a purchase on Gumroad first.",
      });
    }

    // 5. Grant access to this specific chart
    if (!unlockedCharts.includes(chartId)) {
      unlockedCharts.push(chartId);
      await db.from(TABLES.users)
        .update({
          unlocked_charts: unlockedCharts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);
    }

    return NextResponse.json({ verified: true, credits: reportUnlocks });
  } catch (error: any) {
    console.error("[verify-purchase] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
