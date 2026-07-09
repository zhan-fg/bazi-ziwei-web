import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/gumroad-webhook
 *
 * Gumroad Ping endpoint for bazi-ziwei-web.
 *
 * NOTE: If you share a Gumroad account with chinese-name-website,
 * the Ping URL must point to ONE project. The recommended setup is:
 *   - Primary Ping URL 鈫?newchinesename.com/api/gumroad-webhook
 *   - That webhook detects bazi products by permalink and writes to bazi_* tables
 *   - This endpoint serves as a fallback / can be used with a separate Gumroad account
 *
 * Product mapping (set your Gumroad product permalink):
 *   $4.99 鈥?1 chart unlock
 *   $9.99 鈥?10 chart unlocks
 */
export async function POST(request: NextRequest) {
  try {
    const db = requireSupabaseAdmin();
    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, string> = {};

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => { body[key] = value; });
    }

    const saleId = body.sale_id;
    const email = body.email;
    const price = parseInt(body.price || "0", 10);
    const permalink = body.product_permalink || "";
    const productName = body.product_name || "";

    // Extract claim_token from url_params
    let claimToken = "";
    try {
      if (body.url_params) {
        const parsed = typeof body.url_params === "string"
          ? JSON.parse(body.url_params.replace(/'/g, '"'))
          : body.url_params;
        claimToken = parsed.claim_token || "";
      }
    } catch {}
    if (!claimToken) {
      claimToken = body["url_params[claim_token]"] || "";
    }

    if (!saleId || !email) {
      console.error("Gumroad Ping: missing sale_id or email");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Idempotency check
    const { data: existing } = await db
      .from(TABLES.processedSales)
      .select("id")
      .eq("sale_id", saleId)
      .single();

    if (existing) {
      console.log(`Gumroad Ping: sale ${saleId} already processed`);
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    // Determine unlocks based on price / permalink
    let reportUnlocks = 0;
    // pyzrg = Bazi Reading ($4.99 鈫?1 unlock, $9.99 鈫?10 unlocks)
    if (price === 499 || permalink === "pyzrg") {
      reportUnlocks = 1;
    } else if (price === 999) {
      reportUnlocks = 10;
    } else {
      console.log(`Gumroad Ping: unknown product price=${price} permalink=${permalink}`);
      reportUnlocks = 1; // safe default
    }

    if (reportUnlocks > 0) {
      await addReportUnlocks(db, normalizedEmail, reportUnlocks);
    }

    // Record processed sale
    await db.from(TABLES.processedSales).insert({
      sale_id: saleId,
      email: normalizedEmail,
      product_permalink: permalink,
      price,
      created_at: new Date().toISOString(),
    });

    // Link claim_token
    if (claimToken) {
      const { error: tokenErr } = await db
        .from(TABLES.claimTokens)
        .update({ email: normalizedEmail, status: "verified" })
        .eq("token", claimToken)
        .eq("status", "pending");

      if (tokenErr) {
        console.error("Failed to link claim_token:", tokenErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("gumroad-webhook error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function addReportUnlocks(db: SupabaseClient, email: string, count: number) {
  const { data: existing } = await db
    .from(TABLES.users)
    .select("id, report_unlocks_remaining")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await db
      .from(TABLES.users)
      .update({
        report_unlocks_remaining: (existing.report_unlocks_remaining || 0) + count,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await db.from(TABLES.users).insert({
      anonymous_id: `gumroad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email,
      free_uses_remaining: 0,
      report_unlocks_remaining: count,
      subscription_status: "none",
    });
  }
}

