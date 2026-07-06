import { NextRequest, NextResponse } from 'next/server';
import { runChart } from '@/lib/chart';
import { saveChart, cleanupOldFiles } from '@/lib/storage';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, day, hour, minute, gender, isLunar } = body;

    if (!year || !month || !day || hour === undefined || minute === undefined || !gender) {
      return NextResponse.json({ error: 'Missing required fields: year, month, day, hour, minute, gender' }, { status: 400 });
    }

    const birthInfo = {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      gender: gender === '男' ? 'male' as const : 'female' as const,
      isLunar: isLunar === true,
    };

    const result = runChart(birthInfo);

    const id = crypto.randomUUID().slice(0, 8);

    saveChart(id, {
      birthInfo,
      chart: result.json,
      chartText: result.text,
      createdAt: Date.now(),
    });

    // Cleanup in background (non-blocking)
    setTimeout(() => cleanupOldFiles(), 100);

    return NextResponse.json({
      id,
      chart: result.json,
    });
  } catch (err: any) {
    console.error('Chart generation error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate chart' }, { status: 500 });
  }
}
