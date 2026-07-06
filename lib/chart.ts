import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CALCULATOR_DIR = path.join(process.cwd(), 'calculator');
const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'report-zonghe-poster.html');

function execCalc(cmd: string): string {
  try {
    return execSync(cmd, {
      cwd: CALCULATOR_DIR,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: any) {
    const stderr = e.stderr?.toString() || '';
    const stdout = e.stdout?.toString() || '';
    throw new Error(`Calculator error: ${stderr || stdout || e.message}`);
  }
}

export interface ChartResult {
  json: any;
  text: string;
}

export function runChart(birthInfo: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: 'male' | 'female';
  isLunar?: boolean;
}): ChartResult {
  const args = [
    `--year=${birthInfo.year}`,
    `--month=${birthInfo.month}`,
    `--day=${birthInfo.day}`,
    `--hour=${birthInfo.hour}`,
    `--minute=${birthInfo.minute}`,
    `--gender=${birthInfo.gender}`,
  ];
  if (birthInfo.isLunar) args.push('--isLunar=true');

  // Step 1: run-chart
  const raw = execCalc(`node dist/run-chart.js ${args.join(' ')}`);

  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  const clean = (jsonStart >= 0 && jsonEnd >= 0) ? raw.slice(jsonStart, jsonEnd + 1) : raw;
  const chart = JSON.parse(clean);

  // Step 2: dump-text
  const tmpJson = path.join(CALCULATOR_DIR, '.tmp-chart.json');
  fs.writeFileSync(tmpJson, JSON.stringify(chart), 'utf-8');
  const text = execCalc('node dist/dump-text.js --input=.tmp-chart.json');
  fs.unlinkSync(tmpJson);

  return { json: chart, text };
}

export function renderPosterHTML(
  chartJson: any,
  analysisJson: any,
  currentYear: number
): string {
  const tmpChart = path.join(CALCULATOR_DIR, '.tmp-poster-chart.json');
  const tmpAnalysis = path.join(CALCULATOR_DIR, '.tmp-poster-analysis.json');

  fs.writeFileSync(tmpChart, JSON.stringify(chartJson), 'utf-8');
  fs.writeFileSync(tmpAnalysis, JSON.stringify(analysisJson), 'utf-8');

  const html = execCalc(
    `node dist/render.js --chart=.tmp-poster-chart.json --analysis=.tmp-poster-analysis.json --template=${TEMPLATE_PATH} --currentYear=${currentYear}`
  );

  fs.unlinkSync(tmpChart);
  fs.unlinkSync(tmpAnalysis);

  const htmlStart = html.indexOf('<!DOCTYPE');
  return htmlStart >= 0 ? html.slice(htmlStart) : html;
}
