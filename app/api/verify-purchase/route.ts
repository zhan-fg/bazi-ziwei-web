import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email, chartId } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check bazi_users
    const { data: user, error: userErr } = await db
      .from(TABLES.users)
      .select("id, report_unlocks_remaining, unlocked_charts")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[vp] user:", { found: !!user, unlocks: user?.report_unlocks_remaining, charts: user?.unlocked_charts, err: userErr?.message });

    const unlockedCharts: string[] = user?.unlocked_charts || [];
    const hasRemaining = (user?.report_unlocks_remaining || 0) > 0;

    if (unlockedCharts.includes(chartId) || hasRemaining) {
      if (!unlockedCharts.includes(chartId) && user) {
        unlockedCharts.push(chartId);
        await db.from(TABLES.users)
          .update({ unlocked_charts: unlockedCharts, updated_at: new Date().toISOString() })
          .eq("id", user.id);
      }
      console.log("[vp] existing user with access — verified");
      return NextResponse.json({ verified: true });
    }

    // 2. Check both purchase tables
    const [{ data: shared }, { data: bazi }] = await Promise.all([
      db.from("processed_sales")
        .select("id, sale_id, email, product_permalink, created_at")
        .eq("email", normalizedEmail)
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

    console.log("[vp] sales:", {
      shared: shared ? { id: shared.id, permalink: shared.product_permalink } : null,
      bazi: bazi ? { id: bazi.id } : null,
    });

    // Filter shared sale by product_permalink manually (avoid ilike issues)
    const validShared = shared && (shared.product_permalink || "").toLowerCase().includes("pyzrg") ? shared : null;

    const sale = [validShared, bazi].filter(Boolean).sort(
      (a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime()
    )[0];

    console.log("[vp] selected sale:", sale ? { id: sale.id, sale_id: sale.sale_id } : null);

    if (!sale) {
      return NextResponse.json({
        verified: false,
        error: "No purchase found for this email. Make sure you completed payment on Gumroad.",
      });
    }

    // 3. Grant unlock: new users only
    if (user) {
      console.log("[vp] existing user, no unlocks — denied");
      return NextResponse.json({
        verified: false,
        error: "No remaining unlocks. Please make a new purchase.",
      });
    }

    await db.from(TABLES.users).insert({
      anonymous_id: `gsale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: normalizedEmail,
      free_uses_remaining: 0,
      report_unlocks_remaining: 1,
      unlocked_charts: [chartId],
      subscription_status: "none",
    });

    console.log("[vp] new user created — verified");
    return NextResponse.json({ verified: true });
  } catch (error: any) {
    console.error("[verify-purchase] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
