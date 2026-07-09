import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * GET /api/claim-status?token=xxx
 *
 * Polled by the frontend after Gumroad payment.
 * Checks both bazi_claim_tokens (where init-claim writes) and
 * claim_tokens (where the shared webhook writes verified status).
 */
export async function GET(request: NextRequest) {
  try {
    const db = requireSupabaseAdmin();
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ status: "invalid" }, { status: 400 });

    // Check bazi_claim_tokens first
    const { data: baziData, error: baziErr } = await db
      .from(TABLES.claimTokens)
      .select("status, email, chart_id")
      .eq("token", token)
      .maybeSingle();

    if (baziData && (baziData.status === "verified" || baziData.status === "claimed")) {
      return NextResponse.json({
        status: baziData.status,
        email: baziData.email || undefined,
        chartId: baziData.chart_id,
      });
    }

    // Fallback: check shared claim_tokens (written by chinese-name webhook)
    const { data: sharedData } = await db
      .from("claim_tokens")
      .select("status, email")
      .eq("token", token)
      .maybeSingle();

    if (sharedData && sharedData.status === "verified" && sharedData.email) {
      // Update bazi_claim_tokens to match, so future polls hit the fast path
      await db
        .from(TABLES.claimTokens)
        .update({ status: "verified", email: sharedData.email })
        .eq("token", token)
        .eq("status", "pending");

      return NextResponse.json({
        status: "verified",
        email: sharedData.email,
        chartId: null,
      });
    }

    // Still pending or not found
    if (baziErr || !baziData) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      status: baziData.status,
      email: baziData.email || undefined,
      chartId: baziData.chart_id,
    });
  } catch (error) {
    console.error("claim-status error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
