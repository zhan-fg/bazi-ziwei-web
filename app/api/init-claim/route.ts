import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";
import crypto from "crypto";

/**
 * POST /api/init-claim
 * Generates a one-time claim token bound to a specific chartId.
 *
 * Body: { chartId: string }
 * Returns: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const db = requireSupabaseAdmin();
    const { chartId } = await request.json();

    if (!chartId || typeof chartId !== "string") {
      return NextResponse.json({ error: "chartId is required" }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString("hex");

    const { error } = await db.from(TABLES.claimTokens).insert({
      token,
      chart_id: chartId,
      status: "pending",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    if (error) {
      console.error("Failed to store claim token:", error);
      return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("init-claim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

