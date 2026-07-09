import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";
import crypto from "crypto";

/**
 * POST /api/init-claim
 * Generates a one-time claim token bound to a specific chartId.
 * Writes to both bazi_claim_tokens AND claim_tokens so the shared
 * Gumroad webhook can update the token status.
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
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Write to bazi_claim_tokens (primary)
    const { error: baziErr } = await db.from(TABLES.claimTokens).insert({
      token,
      chart_id: chartId,
      status: "pending",
      expires_at: expiresAt,
    });

    if (baziErr) {
      console.error("Failed to store bazi claim token:", baziErr);
      return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
    }

    // Also write to shared claim_tokens so the Gumroad webhook can find it
    // The webhook does: UPDATE claim_tokens SET status='verified', email=... WHERE token=...
    const { error: sharedErr } = await db.from("claim_tokens").insert({
      token,
      chart_id: chartId,
      status: "pending",
      expires_at: expiresAt,
    });

    if (sharedErr) {
      // Non-fatal — the webhook won't update this token, but bazi_claim_tokens is still valid
      console.warn("Failed to store shared claim token:", sharedErr);
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("init-claim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
