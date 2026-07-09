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
 * Requires the user to have already claimed this chart.
 */
export async function POST(request: NextRequest) {
  try {
    const { chartId, email } = await request.json();
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

    const data = getChart(chartId);
    if (!data) return NextResponse.json({ error: "Chart data not found" }, { status: 404 });

    // Check cache
    const { data: cached } = await db
      .from(TABLES.chartCache)
      .select("analysis_text")
      .eq("chart_id", chartId)
      .single();

    if (cached?.analysis_text) {
      return NextResponse.json({ analysis: cached.analysis_text, source: "cache", chartId });
    }

    if (!isLLMConfigured()) {
      const { generateAnalysisText } = await import("@/lib/analysis");
      const text = generateAnalysisText(data.chart, data.birthInfo);
      return NextResponse.json({ analysis: text, source: "algorithm", chartId });
    }

    // Load prompt
    const promptPath = path.join(process.cwd(), "prompts", "zonghe-yinzheng-prompt.md");
    let systemPrompt: string;
    if (fs.existsSync(promptPath)) {
      systemPrompt = fs.readFileSync(promptPath, "utf-8");
    } else {
      systemPrompt = `You are a master of Chinese astrology 鈥?BaZi and Zi Wei Dou Shu. Analyze this chart and produce a comprehensive reading with sections: Overview, Career & Wealth, Relationships, Health, Life Cycles, and Guidance. Write warmly and authoritatively.`;
    }

    const analysis = await generateAnalysis(systemPrompt, data.chartText, { maxTokens: 8192 });

    // Cache
    await db.from(TABLES.chartCache).upsert(
      { chart_id: chartId, analysis_text: analysis, created_at: new Date().toISOString() },
      { onConflict: "chart_id" }
    );

    return NextResponse.json({ analysis, source: "deepseek", chartId });
  } catch (error: any) {
    console.error("generate-reading error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

