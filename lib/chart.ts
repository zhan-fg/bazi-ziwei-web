import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CALCULATOR_DIR = path.join(process.cwd(), 'calculator');

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

  // Step 1: run-chart — generate chart.json
  const jsonOutput = execSync(
    `node dist/run-chart.js ${args.join(' ')}`,
    { cwd: CALCULATOR_DIR, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
  );

  // Strip any stderr that leaked into stdout (console.error messages)
  const jsonStart = jsonOutput.indexOf('{');
  const jsonEnd = jsonOutput.lastIndexOf('}');
  const cleanJson = (jsonStart >= 0 && jsonEnd >= 0)
    ? jsonOutput.slice(jsonStart, jsonEnd + 1)
    : jsonOutput;

  const chart = JSON.parse(cleanJson);

  // Step 2: dump-text — convert to human-readable text
  const tmpJsonPath = path.join(CALCULATOR_DIR, '.tmp-chart.json');
  fs.writeFileSync(tmpJsonPath, JSON.stringify(chart), 'utf-8');

  const textOutput = execSync(
    `node dist/dump-text.js --input=.tmp-chart.json`,
    { cwd: CALCULATOR_DIR, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
  );
  fs.unlinkSync(tmpJsonPath);

  return { json: chart, text: textOutput };
}

export function renderPosterHTML(
  chartJson: any,
  analysisJson: any,
  currentYear: number
): string {
  const tmpChartPath = path.join(CALCULATOR_DIR, '.tmp-poster-chart.json');
  const tmpAnalysisPath = path.join(CALCULATOR_DIR, '.tmp-poster-analysis.json');
  const templatePath = path.join(process.cwd(), 'templates', 'report-zonghe-poster.html');

  fs.writeFileSync(tmpChartPath, JSON.stringify(chartJson), 'utf-8');
  fs.writeFileSync(tmpAnalysisPath, JSON.stringify(analysisJson), 'utf-8');

  const html = execSync(
    `node dist/render.js --chart=.tmp-poster-chart.json --analysis=.tmp-poster-analysis.json --template=${templatePath} --currentYear=${currentYear}`,
    { cwd: CALCULATOR_DIR, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
  );

  fs.unlinkSync(tmpChartPath);
  fs.unlinkSync(tmpAnalysisPath);

  const htmlStart = html.indexOf('<!DOCTYPE');
  return htmlStart >= 0 ? html.slice(htmlStart) : html;
}
