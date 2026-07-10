import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import { renderPosterHTML } from '@/lib/chart';
import { generateAnalysis } from '@/lib/analysis';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bazi-ziwei-web.vercel.app';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const withQR = request.nextUrl.searchParams.get('qr') === '1';

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

  if (withQR) {
    const shareUrl = `${SITE_URL}/share/${id}`;
    const qrBlock = `
    <div style="position:absolute;bottom:60px;right:40px;display:flex;align-items:center;gap:8px;
      background:#fff;border-radius:12px;padding:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);z-index:10;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(shareUrl)}"
        style="width:100px;height:100px;border-radius:6px;" alt="QR" />
      <span style="font-size:10px;color:#888;max-width:70px;line-height:1.3;">Scan to view<br>full reading</span>
    </div>`;
    html = html.replace('</body>', `${qrBlock}</body>`);
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
