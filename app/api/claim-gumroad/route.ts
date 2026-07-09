import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * POST /api/claim-gumroad
 * Called after Gumroad purchase to unlock content.
 *
 * Body: { email: string, token: string, chartId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, token, chartId } = await request.json();

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Claim token is required" }, { status: 400 });
    if (!chartId) return NextResponse.json({ error: "chartId is required" }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    // Verify token
    const { data: pendingRecord } = await supabaseAdmin
      .from(TABLES.claimTokens)
      .select("id, chart_id, status, expires_at, email")
      .eq("token", token)
      .eq("chart_id", chartId)
      .in("status", ["pending", "verified"])
      .maybeSingle();

    if (!pendingRecord) {
      return NextResponse.json({ error: "Invalid or expired claim token." }, { status: 400 });
    }

    if (new Date(pendingRecord.expires_at) < new Date()) {
      await supabaseAdmin.from(TABLES.claimTokens)
        .update({ status: "expired" }).eq("id", pendingRecord.id);
      return NextResponse.json({ error: "Claim token has expired." }, { status: 400 });
    }

    // Mark token as claimed
    await supabaseAdmin.from(TABLES.claimTokens).update({
      status: "claimed",
      claimed_at: new Date().toISOString(),
      email: normalizedEmail,
    }).eq("id", pendingRecord.id);

    // Verify user has unlocks
    let { data: userRecord } = await supabaseAdmin
      .from(TABLES.users)
      .select("id, report_unlocks_remaining")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // ── Fallback 1: check shared processed_sales (chinese-name table) ──
    // If the webhook missed the bazi product (e.g. env var not set),
    // the sale is recorded in the shared processed_sales table.
    if (!userRecord || (userRecord.report_unlocks_remaining || 0) <= 0) {
      const { data: saleRecord } = await supabaseAdmin
        .from("processed_sales")
        .select("id")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (saleRecord) {
        console.log(`claim-gumroad: found purchase in processed_sales for ${normalizedEmail}`);
        if (userRecord) {
          await supabaseAdmin.from(TABLES.users)
            .update({
              report_unlocks_remaining: (userRecord.report_unlocks_remaining || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userRecord.id);
        } else {
          const { data: newUser } = await supabaseAdmin.from(TABLES.users)
            .insert({
              anonymous_id: `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              email: normalizedEmail,
              free_uses_remaining: 0,
              report_unlocks_remaining: 1,
              subscription_status: "none",
            })
            .select("id, report_unlocks_remaining")
            .single();
          userRecord = newUser;
        }
      }
    }

    // ── Fallback 2: check bazi_processed_sales (own table) ──
    // If handleBaziPurchase ran but bazi_users write failed for any reason,
    // the sale is still recorded in bazi_processed_sales.
    if (!userRecord || (userRecord.report_unlocks_remaining || 0) <= 0) {
      const { data: baziSaleRecord } = await supabaseAdmin
        .from(TABLES.processedSales)
        .select("id")
        .eq("email", normalizedEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (baziSaleRecord) {
        console.log(`claim-gumroad: found purchase in bazi_processed_sales for ${normalizedEmail}`);
        if (userRecord) {
          await supabaseAdmin.from(TABLES.users)
            .update({
              report_unlocks_remaining: (userRecord.report_unlocks_remaining || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userRecord.id);
        } else {
          const { data: newUser } = await supabaseAdmin.from(TABLES.users)
            .insert({
              anonymous_id: `bazi-recovery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              email: normalizedEmail,
              free_uses_remaining: 0,
              report_unlocks_remaining: 1,
              subscription_status: "none",
            })
            .select("id, report_unlocks_remaining")
            .single();
          userRecord = newUser;
        }
      }
    }

    // ── Final fallback: check Gumroad API directly ──
    if (!userRecord || (userRecord.report_unlocks_remaining || 0) <= 0) {
      const { verifyPurchase } = await import("@/lib/gumroad");
      const gumroadVerified = await verifyPurchase(normalizedEmail);
      if (gumroadVerified) {
        // Create user with 1 unlock
        const { data: newUser } = await supabaseAdmin.from(TABLES.users)
          .insert({
            anonymous_id: `gumroad-api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            email: normalizedEmail,
            free_uses_remaining: 0,
            report_unlocks_remaining: 1,
            subscription_status: "none",
          })
          .select("id, report_unlocks_remaining")
          .single();
        userRecord = newUser;
      }
    }

    const reportUnlocks = userRecord?.report_unlocks_remaining || 0;

    if (!userRecord || reportUnlocks <= 0) {
      return NextResponse.json(
        { error: "No verified purchase found. Use the same email as Gumroad." },
        { status: 400 }
      );
    }

    // Decrement unlocks
    await supabaseAdmin.from(TABLES.users)
      .update({
        report_unlocks_remaining: reportUnlocks - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userRecord.id);

    // Add chartId to unlocked_charts
    const { data: existingUser } = await supabaseAdmin
      .from(TABLES.users)
      .select("id, unlocked_charts")
      .eq("id", userRecord.id)
      .single();

    const unlockedCharts: string[] = existingUser?.unlocked_charts || [];
    if (!unlockedCharts.includes(chartId)) {
      unlockedCharts.push(chartId);
      await supabaseAdmin.from(TABLES.users)
        .update({
          unlocked_charts: unlockedCharts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userRecord.id);
    }

    return NextResponse.json({ success: true, isUnlock: true, chartId });
  } catch (error) {
    console.error("claim-gumroad error:", error);
    return NextResponse.json({ error: "Failed to claim" }, { status: 500 });
  }
}
