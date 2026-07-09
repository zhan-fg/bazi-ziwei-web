import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * POST /api/verify-purchase
 *
 * Checks bazi_users first. If the user already has unlocks from a previous
 * webhook-triggered purchase (handleBaziPurchase), returns immediately.
 *
 * Falls back to checking processed_sales for old purchases made before
 * the webhook's bazi detection was fixed. Only grants an unlock for
 * brand-new users — existing users with 0 unlocks need a new purchase.
 *
 * Body: { email: string, chartId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, chartId } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // Check bazi_users first (webhook now writes here for new purchases)
    const { data: user } = await db
      .from(TABLES.users)
      .select("id, report_unlocks_remaining, unlocked_charts, created_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const unlockedCharts: string[] = user?.unlocked_charts || [];
    const hasRemaining = (user?.report_unlocks_remaining || 0) > 0;

    if (unlockedCharts.includes(chartId) || hasRemaining) {
      // Already has access via webhook — just ensure chart is in unlocked list
      if (!unlockedCharts.includes(chartId) && user) {
        unlockedCharts.push(chartId);
        await db.from(TABLES.users)
          .update({ unlocked_charts: unlockedCharts, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
      return NextResponse.json({ verified: true });
    }

    // No unlocks in bazi_users — check processed_sales for old purchases
    const [{ data: sharedSale }, { data: baziSale }] = await Promise.all([
      db.from("processed_sales")
        .select("id, sale_id, email, created_at")
        .eq("email", normalizedEmail)
        .ilike("product_permalink", "%pyzrg%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from(TABLES.processedSales)
        .select("id, sale_id, email, created_at")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const sale = [sharedSale, baziSale].filter(Boolean).sort(
      (a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime()
    )[0];

    if (!sale) {
      return NextResponse.json({
        verified: false,
        error: "No purchase found for this email. Make sure you completed payment on Gumroad.",
      });
    }

    // Only grant unlock for brand-new users (first-time verification).
    // Existing users with 0 unlocks must make a new purchase — the webhook
    // will grant them via handleBaziPurchase.
    if (user) {
      return NextResponse.json({
        verified: false,
        error: "No remaining unlocks. Please make a new purchase.",
      });
    }

    // New user — grant one unlock from this old purchase
    await db.from(TABLES.users).insert({
      anonymous_id: `gsale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: normalizedEmail,
      free_uses_remaining: 0,
      report_unlocks_remaining: 1,
      unlocked_charts: [chartId],
      subscription_status: "none",
    });

    return NextResponse.json({ verified: true });
  } catch (error: any) {
    console.error("[verify-purchase] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
