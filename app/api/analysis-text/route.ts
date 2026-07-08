import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import { generateAnalysisText } from '@/lib/analysis';
import { generateAnalysis, isLLMConfigured } from '@/lib/llm';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const data = getChart(id);
  if (!data) return NextResponse.json({ error: 'Chart not found' }, { status: 404 });

  // Try LLM first, fall back to chart-derived text
  if (isLLMConfigured()) {
    try {
      const promptPath = path.join(process.cwd(), 'prompts', 'ziwei-prompt-en.md');
      const systemPrompt = fs.readFileSync(promptPath, 'utf-8');
      const analysis = await generateAnalysis(systemPrompt, data.chartText, { maxTokens: 4096 });
      return NextResponse.json({ analysis, source: 'llm' });
    } catch (err: any) {
      console.warn('[analysis-text] LLM failed, using fallback:', err.message);
    }
  }

  // Fallback: generate from chart data
  const text = generateAnalysisText(data.chart, data.birthInfo);
  return NextResponse.json({ analysis: text, source: 'chart' });
}
