import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * POST /api/verify-purchase
 *
 * Checks both processed_sales (shared chinese-name table) and
 * bazi_processed_sales (bazi-ziwei table) for a purchase matching
 * the given email. Grants one unlock per unique sale_id.
 *
 * Body: { email: string, chartId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, chartId } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // Query both tables in parallel
    const [{ data: sharedSale }, { data: baziSale }] = await Promise.all([
      db.from("processed_sales")
        .select("id, sale_id, email, product_permalink, price, created_at")
        .eq("email", normalizedEmail)
        .ilike("product_permalink", "%pyzrg%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from(TABLES.processedSales)
        .select("id, sale_id, email, product_permalink, price, created_at")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Pick most recent
    const sale = [sharedSale, baziSale]
      .filter(Boolean)
      .sort((a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime())[0];

    if (!sale) {
      return NextResponse.json({
        verified: false,
        error: "No purchase found for this email. Make sure you completed payment on Gumroad.",
      });
    }

    // Check if this sale_id was already consumed
    const { data: consumed } = await db
      .from(TABLES.processedSales)
      .select("id")
      .eq("sale_id", sale.sale_id)
      .maybeSingle();

    // Get or create user
    const { data: user } = await db
      .from(TABLES.users)
      .select("id, report_unlocks_remaining, unlocked_charts")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const unlockedCharts: string[] = user?.unlocked_charts || [];
    const alreadyUnlocked = unlockedCharts.includes(chartId);
    const hasRemaining = (user?.report_unlocks_remaining || 0) > 0;

    if (alreadyUnlocked || hasRemaining) {
      if (!alreadyUnlocked && user) {
        unlockedCharts.push(chartId);
        await db.from(TABLES.users)
          .update({ unlocked_charts: unlockedCharts, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
      return NextResponse.json({ verified: true });
    }

    if (consumed) {
      return NextResponse.json({
        verified: false,
        error: "This purchase has already been used. Please make a new purchase to unlock another chart.",
      });
    }

    // Mark consumed
    await db.from(TABLES.processedSales).insert({
      sale_id: sale.sale_id,
      email: normalizedEmail,
      product_permalink: sale.product_permalink || "",
      price: sale.price || 0,
      created_at: new Date().toISOString(),
    });

    // Grant unlock
    if (user) {
      unlockedCharts.push(chartId);
      await db.from(TABLES.users)
        .update({
          unlocked_charts: unlockedCharts,
          report_unlocks_remaining: (user.report_unlocks_remaining || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } else {
      await db.from(TABLES.users).insert({
        anonymous_id: `gsale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: normalizedEmail,
        free_uses_remaining: 0,
        report_unlocks_remaining: 1,
        unlocked_charts: [chartId],
        subscription_status: "none",
      });
    }

    return NextResponse.json({ verified: true });
  } catch (error: any) {
    console.error("[verify-purchase] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
