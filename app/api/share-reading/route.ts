import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";

/**
 * GET /api/share-reading?id=xxx
 *
 * Public endpoint — returns cached reading for sharing.
 * No authentication required. Reads from bazi_chart_cache.
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = requireSupabaseAdmin();
    const { data: cached } = await db
      .from(TABLES.chartCache)
      .select("analysis_text")
      .eq("chart_id", id)
      .maybeSingle();

    if (!cached?.analysis_text) {
      return NextResponse.json({ error: "Reading not found" }, { status: 404 });
    }

    return NextResponse.json({ analysis: cached.analysis_text });
  } catch (error: any) {
    console.error("[share-reading] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
