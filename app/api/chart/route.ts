import { NextRequest, NextResponse } from 'next/server';
import { runChart } from '@/lib/chart';
import { saveChart, cleanupOldFiles } from '@/lib/storage';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, day, hour, minute, gender, isLunar } = body;

    if (!year || !month || !day || hour === undefined || minute === undefined || !gender) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: 'year, month, day, hour, minute, gender',
        received: { year, month, day, hour, minute, gender },
      }, { status: 400 });
    }

    const birthInfo = {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      gender: gender === 'male' ? 'male' as const : 'female' as const,
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

    setTimeout(() => cleanupOldFiles(), 100);

    return NextResponse.json({ id, chart: result.json });
  } catch (err: any) {
    const debug: any = {
      error: err.message || 'Failed to generate chart',
      stack: err.stack?.split('\n').slice(0, 5),
      cwd: process.cwd(),
      envNodeVersion: process.version,
    };

    // Add file existence checks
    const cwd = process.cwd();
    try {
      debug['files'] = {
        calcDist: fs.existsSync(path.join(cwd, 'calculator', 'dist', 'run-chart.js')),
        calcLunar: fs.existsSync(path.join(cwd, 'calculator', 'node_modules', 'lunar-typescript')),
        rootLunar: fs.existsSync(path.join(cwd, 'node_modules', 'lunar-typescript')),
        calcDistDir: fs.existsSync(path.join(cwd, 'calculator', 'dist')),
      };
    } catch (_) {
      debug['files'] = 'unable to check';
    }

    console.error('[chart API] error:', JSON.stringify(debug, null, 2));
    return NextResponse.json(debug, { status: 500 });
  }
}
