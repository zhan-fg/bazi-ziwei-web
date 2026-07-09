import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET /api/debug — returns env + file state for troubleshooting
// Only available when DEBUG env var is set
export async function GET() {
  if (process.env.DEBUG !== '1') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const cwd = process.cwd();
  const info: any = {
    cwd,
    nodeVersion: process.version,
    platform: process.platform,
    env: {
      NODE_PATH: process.env.NODE_PATH || '(not set)',
      PATH: process.env.PATH?.slice(0, 100) || '(not set)',
    },
    files: {} as any,
  };

  // Check key files
  const checks = [
    ['calc/run-chart.js', 'calculator/dist/run-chart.js'],
    ['calc/yiqi-core/index.js', 'calculator/dist/yiqi-core/index.js'],
    ['calc/yiqi-core/bazi.js', 'calculator/dist/yiqi-core/bazi.js'],
    ['calc/enrich/enrich.js', 'calculator/dist/bazi-enrich/enrich.js'],
    ['calc/dump-text.js', 'calculator/dist/dump-text.js'],
    ['calc/render.js', 'calculator/dist/render.js'],
    ['calc/node_modules/lunar-typescript', 'calculator/node_modules/lunar-typescript'],
    ['root/node_modules/lunar-typescript', 'node_modules/lunar-typescript'],
    ['templates/poster.html', 'templates/report-zonghe-poster.html'],
  ];

  for (const [label, filePath] of checks) {
    const full = path.join(cwd, filePath);
    info.files[label] = fs.existsSync(full);

    // If lunar-typescript exists, check its package.json
    if (label.includes('lunar-typescript') && info.files[label]) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(full, 'package.json'), 'utf-8'));
        info.files[label + '_version'] = pkg.version;
      } catch (_) {}
    }

    // If a directory, list first few files
    if (info.files[label] && fs.statSync(full).isDirectory()) {
      try {
        info.files[label + '_entries'] = fs.readdirSync(full).slice(0, 5);
      } catch (_) {}
    }
  }

  return NextResponse.json(info);
}
