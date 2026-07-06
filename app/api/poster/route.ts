import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import { renderPosterHTML } from '@/lib/chart';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const data = getChart(id);
  if (!data) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  // Return chart data for poster rendering
  // The poster JSON (LLM-generated) would come from a separate generation flow
  return NextResponse.json({
    id,
    chart: data.chart,
    birthInfo: data.birthInfo,
  });
}
