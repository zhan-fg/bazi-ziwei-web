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
      await consumeUnlockIfNeeded(db, user, chartId, unlockedCharts);
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

    // Load system prompt (skill-style: 3-phase analysis)
    const promptPath = path.join(process.cwd(), "prompts", "zonghe-yinzheng-prompt.md");
    let systemPrompt: string;
    if (fs.existsSync(promptPath)) {
      systemPrompt = fs.readFileSync(promptPath, "utf-8");
    } else {
      systemPrompt = `You are a master of Chinese astrology — BaZi and Zi Wei Dou Shu. Analyze this chart and produce a comprehensive reading with sections: Overview, Career & Wealth, Relationships, Health, Life Cycles, and Guidance. Write warmly and authoritatively.`;
    }

    // Build user message: birth info + chart data (for skill-style 3-phase analysis)
    const bi = data.birthInfo;
    const userMessage = [
      `## 出生信息`,
      `- 性別：${bi.gender === 'male' ? '男' : '女'}`,
      `- 出生日期：${bi.year}年${bi.month}月${bi.day}日 ${String(bi.hour).padStart(2, '0')}:${String(bi.minute).padStart(2, '0')}`,
      `- 曆法：${bi.isLunar ? '農曆' : '公曆'}`,
      ``,
      `## 算法層命盤數據`,
      textForLLM,
    ].join('\n');

    const analysis = await generateAnalysis(systemPrompt, userMessage, { maxTokens: 8192 });

    // Cache result in Supabase
    await db
      .from(TABLES.chartCache)
      .upsert(
        { chart_id: chartId, analysis_text: analysis, created_at: new Date().toISOString() },
        { onConflict: "chart_id" }
      );

    // Consume one unlock if chart wasn't already unlocked
    await consumeUnlockIfNeeded(db, user, chartId, unlockedCharts);

    return NextResponse.json({ analysis, source: "deepseek", chartId });
  } catch (error: any) {
    console.error("generate-reading error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

/**
 * Consume one report_unlocks_remaining if this chart isn't already in
 * the user's unlocked_charts. Called after a successful read.
 */
async function consumeUnlockIfNeeded(
  db: ReturnType<typeof requireSupabaseAdmin>,
  user: any,
  chartId: string,
  unlockedCharts: string[],
) {
  if (!user) return;
  if (unlockedCharts.includes(chartId)) return; // already consumed for this chart
  if ((user.report_unlocks_remaining || 0) <= 0) return; // no unlocks to consume

  unlockedCharts.push(chartId);
  await db
    .from(TABLES.users)
    .update({
      unlocked_charts: unlockedCharts,
      report_unlocks_remaining: (user.report_unlocks_remaining || 1) - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
}
