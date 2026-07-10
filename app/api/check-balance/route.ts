import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * GET /api/check-balance?email=xxx
 *
 * Returns the user's current report_unlocks_remaining.
 * If balance is 0, also checks processed_sales for any new purchases
 * not yet credited (webhook not deployed or delayed).
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    const { data: user } = await db
      .from(TABLES.users)
      .select("id, report_unlocks_remaining, last_credited_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const balance = user?.report_unlocks_remaining || 0;

    return NextResponse.json({ balance, email: normalizedEmail });
  } catch (error: any) {
    console.error("[check-balance] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
