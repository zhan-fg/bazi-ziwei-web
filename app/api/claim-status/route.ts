import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * GET /api/claim-status?token=xxx
 *
 * Polled by the frontend after Gumroad payment.
 * Returns whether the claim token has been verified.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ status: "invalid" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from(TABLES.claimTokens)
      .select("status, email, chart_id")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      status: data.status,
      email: data.email || undefined,
      chartId: data.chart_id,
    });
  } catch (error) {
    console.error("claim-status error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
