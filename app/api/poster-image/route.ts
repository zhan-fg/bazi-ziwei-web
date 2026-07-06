import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import { renderPosterHTML } from '@/lib/chart';
import { generateQRDataURL } from '@/lib/qrcode';
import { renderPosterPNG } from '@/lib/poster';

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

  // For now, generate a simple HTML poster with the chart data
  // Full poster with LLM analysis requires the analysis JSON
  // This is a fallback that shows the raw chart data
  const currentYear = new Date().getFullYear();

  // Use a minimal analysis JSON if none is cached
  const analysisJson = {
    meta: { archetype_name: 'Bazi & Ziwei Chart', axis_oneliner: data.birthInfo.gender === 'male' ? 'Male chart' : 'Female chart' },
    axes: { bazi_main: '', ziwei_main: '' },
    consistency: '同向印证',
    strengths: [{ title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' }],
    weaknesses: [{ title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' }],
    section_01: { text: '', word_count: 0 },
    section_02: { conclusion: '' },
    dim: {
      career: { bazi: '', ziwei: '', verdict: '', verdict_class: 'verdict-yes', fused: '' },
      wealth: { bazi: '', ziwei: '', verdict: '', verdict_class: 'verdict-yes', fused: '' },
      marriage: { bazi: '', ziwei: '', verdict: '', verdict_class: 'verdict-yes', fused: '' },
      children: { bazi: '', ziwei: '', verdict: '', verdict_class: 'verdict-yes', fused: '' },
      family: { bazi: '', ziwei: '', verdict: '', verdict_class: 'verdict-yes', fused: '' },
      health: { bazi: '', ziwei: '', verdict: '', verdict_class: 'verdict-yes', fused: '' },
    },
    conflicts: [
      { point: '', bazi: '', ziwei: '', impact: '低', impact_class: 'low', advice: '' },
      { point: '', bazi: '', ziwei: '', impact: '低', impact_class: 'low', advice: '' },
      { point: '', bazi: '', ziwei: '', impact: '低', impact_class: 'low', advice: '' },
    ],
    final: {
      life_axis: '',
      nodes: [
        { age: 0, year: 0, event: '' }, { age: 0, year: 0, event: '' },
        { age: 0, year: 0, event: '' }, { age: 0, year: 0, event: '' },
        { age: 0, year: 0, event: '' },
      ],
      risks: [
        { range: '', desc: '' }, { range: '', desc: '' }, { range: '', desc: '' },
      ],
      leverage: [
        { title: '', desc: '' }, { title: '', desc: '' },
      ],
      advice: ['', '', '', ''],
    },
    confidence: {
      bazi_level: '', bazi_score: '', ziwei_level: '', ziwei_score: '',
      consistency_level: '', consistency_score: '', stability_level: '', stability_score: '',
      note: '',
    },
  };

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
