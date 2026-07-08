import { NextRequest, NextResponse } from "next/server";
import { getChart } from "@/lib/storage";
import { generateAnalysisText } from "@/lib/analysis";
import { generateAnalysis, isLLMConfigured } from "@/lib/llm";
import fs from "fs";
import path from "path";

/**
 * GET /api/analysis-text?id=xxx
 *
 * Generates an analysis text for a chart.
 * Tries DeepSeek LLM first, falls back to algorithm-derived text.
 * Used by the reading page (free tier) and poster generation.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const data = getChart(id);
  if (!data) return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  // Try DeepSeek first
  if (isLLMConfigured()) {
    try {
      const promptPath = path.join(process.cwd(), "prompts", "zonghe-yinzheng-prompt.md");
      let systemPrompt: string;
      if (fs.existsSync(promptPath)) {
        systemPrompt = fs.readFileSync(promptPath, "utf-8");
      } else {
        systemPrompt = `You are a master of Chinese astrology — BaZi and Zi Wei Dou Shu. Analyze this chart data and produce a comprehensive reading.`;
      }
      const analysis = await generateAnalysis(systemPrompt, data.chartText, { maxTokens: 4096 });
      return NextResponse.json({ analysis, source: "deepseek" });
    } catch (err: any) {
      console.warn("[analysis-text] DeepSeek failed, using fallback:", err.message);
    }
  }

  // Fallback: generate from chart data
  const text = generateAnalysisText(data.chart, data.birthInfo);
  return NextResponse.json({ analysis: text, source: "algorithm" });
}
