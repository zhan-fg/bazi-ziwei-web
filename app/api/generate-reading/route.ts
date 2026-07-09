import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin, TABLES } from "@/lib/supabase";
import { getChart } from "@/lib/storage";
import { generateAnalysis, isLLMConfigured } from "@/lib/llm";
import fs from "fs";
import path from "path";

/**
 * POST /api/generate-reading
 *
 * Generates a full Bazi+Ziwei combined reading using DeepSeek API.
 * Requires the user to have unlocked this chart.
 *
 * Body: chartId, email, + chartText/chart/birthInfo (optional — passed from
 * client to avoid relying on local file storage in serverless environments).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chartId, email, chartText, chart, birthInfo } = body;

    if (!chartId || !email) {
      return NextResponse.json({ error: "chartId and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = requireSupabaseAdmin();

    // Verify user has unlocked this chart
    const { data: user } = await db
      .from(TABLES.users)
      .select("id, unlocked_charts, report_unlocks_remaining")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const unlockedCharts: string[] = user?.unlocked_charts || [];
    const hasMoreUnlocks = (user?.report_unlocks_remaining || 0) > 0;

    if (!user || (!unlockedCharts.includes(chartId) && !hasMoreUnlocks)) {
      return NextResponse.json(
        { error: "Chart not unlocked. Please complete payment first." },
        { status: 403 }
      );
    }

    // Check Supabase cache first
    const { data: cached } = await db
      .from(TABLES.chartCache)
      .select("analysis_text")
      .eq("chart_id", chartId)
      .maybeSingle();

    if (cached?.analysis_text) {
      return NextResponse.json({ analysis: cached.analysis_text, source: "cache", chartId });
    }

    // ── Resolve chart data: prefer client-supplied, fall back to local file ──
    let data: any = null;
    let textForLLM = "";
    if (chartText && chart && birthInfo) {
      data = { chartText, chart, birthInfo };
      textForLLM = chartText;
    } else {
      data = getChart(chartId);
      if (!data) {
        return NextResponse.json({ error: "Chart data not found" }, { status: 404 });
      }
      textForLLM = data.chartText;
    }

    if (!isLLMConfigured()) {
      const { generateAnalysisText } = await import("@/lib/analysis");
      const analysisChart = data.chart;
      const analysisBirthInfo = data.birthInfo;
      const text = generateAnalysisText(analysisChart, analysisBirthInfo);
      return NextResponse.json({ analysis: text, source: "algorithm", chartId });
    }

    // Load prompt
    const promptPath = path.join(process.cwd(), "prompts", "zonghe-yinzheng-prompt.md");
    let systemPrompt: string;
    if (fs.existsSync(promptPath)) {
      systemPrompt = fs.readFileSync(promptPath, "utf-8");
    } else {
      systemPrompt = `You are a master of Chinese astrology — BaZi and Zi Wei Dou Shu. Analyze this chart and produce a comprehensive reading with sections: Overview, Career & Wealth, Relationships, Health, Life Cycles, and Guidance. Write warmly and authoritatively.`;
    }

    const analysis = await generateAnalysis(systemPrompt, textForLLM, { maxTokens: 8192 });

    // Cache result in Supabase
    await db
      .from(TABLES.chartCache)
      .upsert(
        { chart_id: chartId, analysis_text: analysis, created_at: new Date().toISOString() },
        { onConflict: "chart_id" }
      );

    return NextResponse.json({ analysis, source: "deepseek", chartId });
  } catch (error: any) {
    console.error("generate-reading error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
