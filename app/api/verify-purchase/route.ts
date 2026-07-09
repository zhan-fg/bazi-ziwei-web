import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * POST /api/verify-purchase
 *
 * Verifies a Gumroad purchase by querying the shared `processed_sales` table
 * (written by the other project's webhook). Filters by product_permalink
 * containing "pyzrg" to identify bazi-ziwei purchases specifically.
 *
 * Body: { email: string, chartId: string }
 * Returns: { verified: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, chartId } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // ── Query shared processed_sales table, filter by bazi product ──
    const { data: sale, error } = await db
      .from("processed_sales")
      .select("id, email, product_permalink, price")
      .eq("email", normalizedEmail)
      .ilike("product_permalink", "%pyzrg%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[verify-purchase] query error:", error);
      return NextResponse.json({ verified: false, error: "Query failed" }, { status: 500 });
    }

    if (!sale) {
      return NextResponse.json({
        verified: false,
        error: "No purchase found. Use the same email as your Gumroad purchase.",
      });
    }

    // ── Found purchase → ensure user has unlocks & unlocked_charts ──
    const { data: user } = await db
      .from(TABLES.users)
      .select("id, report_unlocks_remaining, unlocked_charts")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (user) {
      const unlockedCharts: string[] = user.unlocked_charts || [];
      if (!unlockedCharts.includes(chartId)) {
        unlockedCharts.push(chartId);
        await db
          .from(TABLES.users)
          .update({
            unlocked_charts: unlockedCharts,
            report_unlocks_remaining: Math.max(
              user.report_unlocks_remaining || 0,
              1
            ),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } else if ((user.report_unlocks_remaining || 0) <= 0) {
        // Already unlocked this chart but no remaining unlocks — ensure at least 1
        await db
          .from(TABLES.users)
          .update({
            report_unlocks_remaining: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    } else {
      // New user — create record with this chart pre-unlocked
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
