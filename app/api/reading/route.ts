import { NextRequest, NextResponse } from 'next/server';
import { getChart } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const data = getChart(id);
  if (!data) {
    return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
  }

  // Return the chart text which can be consumed by LLM
  // The actual LLM call happens client-side or via a separate endpoint
  return NextResponse.json({
    id,
    chartText: data.chartText,
    birthInfo: data.birthInfo,
    chart: data.chart,
  });
}
