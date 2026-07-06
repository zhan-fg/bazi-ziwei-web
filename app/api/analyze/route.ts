import { NextRequest, NextResponse } from 'next/server';
import { getChart, saveAnalysis, getAnalysis } from '@/lib/storage';
import { generateAnalysis, isLLMConfigured } from '@/lib/llm';
import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

function loadPrompt(name: string): string {
  const p = path.join(PROMPTS_DIR, name);
  if (!fs.existsSync(p)) throw new Error(`Prompt not found: ${name}`);
  return fs.readFileSync(p, 'utf-8');
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const type = request.nextUrl.searchParams.get('type') || 'bazi'; // bazi | ziwei | combined

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  if (!isLLMConfigured()) {
    return NextResponse.json({ error: 'LLM not configured. Set LLM_API_KEY env var.' }, { status: 503 });
  }

  const data = getChart(id);
  if (!data) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  // Check cache
  const cacheKey = `llm-${type}`;
  const cached = getAnalysis(id, cacheKey);
  if (cached) {
    return NextResponse.json({ id, type, analysis: cached.analysis, cached: true });
  }

  try {
    // Load the appropriate prompt
    const promptMap: Record<string, string> = {
      bazi: 'bazi-prompt-en.md',
      ziwei: 'ziwei-prompt-en.md',
      combined: 'zonghe-poster-en.md',
    };
    const promptFile = promptMap[type];
    if (!promptFile) {
      return NextResponse.json({ error: `Invalid type: ${type}. Use bazi, ziwei, or combined.` }, { status: 400 });
    }

    const systemPrompt = loadPrompt(promptFile);
    const userContent = data.chartText;

    const analysis = await generateAnalysis(systemPrompt, userContent, { maxTokens: 8192 });

    // Cache the result
    saveAnalysis(id, cacheKey, { analysis, type, generatedAt: Date.now() });

    return NextResponse.json({ id, type, analysis, cached: false });
  } catch (err: any) {
    console.error('[analyze] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
