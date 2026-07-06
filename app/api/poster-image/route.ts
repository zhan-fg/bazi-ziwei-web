import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import { renderPosterHTML } from '@/lib/chart';
import { generateQRDataURL } from '@/lib/qrcode';
import { renderPosterPNG } from '@/lib/poster';
import { generateAnalysis } from '@/lib/analysis';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const data = getChart(id);
  if (!data) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  const baseUrl = request.nextUrl.origin;
  const qrDataURL = await generateQRDataURL(`${baseUrl}/reading/${id}`);
  const currentYear = new Date().getFullYear();

  // Generate analysis from chart data (no LLM needed)
  const analysisJson = generateAnalysis(data.chart, data.birthInfo);

  const posterHTML = renderPosterHTML(data.chart, analysisJson, currentYear);
  const result = await renderPosterPNG(posterHTML, qrDataURL);

  const html = result.toString('utf-8');
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
