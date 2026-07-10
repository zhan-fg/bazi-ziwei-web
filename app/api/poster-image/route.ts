import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import { renderPosterHTML } from '@/lib/chart';
import { generateAnalysis } from '@/lib/analysis';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazi-ziwei-web.vercel.app';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const data = getChart(id);
  if (!data) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  const currentYear = new Date().getFullYear();
  const analysisJson = generateAnalysis(data.chart, data.birthInfo);
  let html = renderPosterHTML(data.chart, analysisJson, currentYear);

  // Inject QR code into the poster — right before </body>
  const shareUrl = `${SITE_URL}/share/${id}`;
  const qrImg = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(shareUrl)}" 
    style="position:absolute;bottom:60px;right:40px;width:100px;height:100px;border-radius:8px;" 
    alt="Scan to view reading" />`;
  html = html.replace('</body>', `${qrImg}</body>`);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
