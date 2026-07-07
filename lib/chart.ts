import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const CWD = process.cwd();
const CALCULATOR_DIR = path.join(CWD, 'calculator');
const TEMPLATE_PATH = path.join(CWD, 'templates', 'report-zonghe-poster.html');
const TMP = os.tmpdir();
const DEBUG = process.env.DEBUG === '1';

function log(msg: string) {
  if (DEBUG) console.error(`[chart.ts] ${msg}`);
}

function execCalc(cmd: string): string {
  const fullCmd = `node ${cmd}`;
  log(`exec: ${fullCmd}`);
  log(`cwd: ${CALCULATOR_DIR}`);
  log(`cwd exists: ${fs.existsSync(CALCULATOR_DIR)}`);

  // Pre-flight: check that key files exist
  const distDir = path.join(CALCULATOR_DIR, 'dist');
  log(`dist exists: ${fs.existsSync(distDir)}`);
  if (fs.existsSync(distDir)) {
    log(`dist files: ${fs.readdirSync(distDir).join(', ')}`);
  }
  const nmDir = path.join(CALCULATOR_DIR, 'node_modules', 'lunar-typescript');
  log(`lunar-typescript in calc: ${fs.existsSync(nmDir)}`);
  const rootNm = path.join(CWD, 'node_modules', 'lunar-typescript');
  log(`lunar-typescript in root: ${fs.existsSync(rootNm)}`);

  try {
    return execSync(fullCmd, {
      cwd: CALCULATOR_DIR,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e: any) {
    const stderr = e.stderr?.toString() || '';
    const stdout = e.stdout?.toString() || '';
    const msg = [
      `[execCalc] command failed`,
      `cmd: ${fullCmd}`,
      `cwd: ${CALCULATOR_DIR}`,
      `exit code: ${e.status}`,
      `stderr: ${stderr.slice(-500)}`,
      `stdout: ${stdout.slice(-200)}`,
    ].join('\n');
    console.error(msg);
    throw new Error(stderr.trim() || stdout.trim() || e.message || 'execCalc failed');
  }
}

export interface ChartResult {
  json: any;
  text: string;
}

const GONG_NAMES_EN: Record<string, string> = {
  '命宫': 'Life', '兄弟': 'Siblings', '夫妻': 'Spouse', '子女': 'Children',
  '财帛': 'Wealth', '疾厄': 'Health', '迁移': 'Travel', '交友': 'Friends',
  '官禄': 'Career', '田宅': 'Property', '福德': 'Fortune', '父母': 'Parents',
};

function translateGongNames(chart: any) {
  for (const g of chart.ziwei?.gongs || []) {
    if (GONG_NAMES_EN[g.gong]) g.gong = GONG_NAMES_EN[g.gong];
  }
  // Translate element names in wuxing wangxiang
  const ELEMENT_EN: Record<string, string> = { '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal', '水': 'Water' };
  const wx = chart.bazi?.enrichment?.['五行旺相'];
  if (wx) {
    for (const k of Object.keys(wx)) {
      if (ELEMENT_EN[k]) {
        wx[ELEMENT_EN[k]] = wx[k];
        delete wx[k];
      }
    }
  }
  // Translate shiShen labels to English short forms
  const SS_EN: Record<string, string> = {
    '正印': 'DirRes', '偏印': 'IndRes', '正官': 'DirOff', '七杀': '7Kill',
    '正财': 'DirWth', '偏财': 'IndWth', '食神': 'EatGod', '伤官': 'HurtOff',
    '比肩': 'Friend', '劫财': 'RobWth',
  };
  for (const d of chart.bazi?.dayun || []) {
    if (SS_EN[d.ganShiShen]) d.ganShiShen = SS_EN[d.ganShiShen];
    if (SS_EN[d.zhiShiShen]) d.zhiShiShen = SS_EN[d.zhiShiShen];
  }
  for (const d of chart.bazi?.shiShen ? [chart.bazi.shiShen] : []) {
    for (const k of Object.keys(d)) {
      if (SS_EN[d[k]]) d[k] = SS_EN[d[k]];
    }
  }
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

  log(`runChart: ${JSON.stringify(birthInfo)}`);

  // Step 1: run-chart
  const raw = execCalc(`dist/run-chart.js ${args.join(' ')}`);

  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart < 0) {
    throw new Error(`No JSON found in output. Raw output: ${raw.slice(0, 500)}`);
  }
  const clean = raw.slice(jsonStart, jsonEnd + 1);
  const chart = JSON.parse(clean);
  translateGongNames(chart);

  // Step 2: dump-text — write chart to /tmp, pass absolute path
  const tmpJson = path.join(TMP, `.chart-${Date.now()}.json`);
  fs.writeFileSync(tmpJson, JSON.stringify(chart), 'utf-8');
  const text = execCalc(`dist/dump-text.js --input=${tmpJson}`);
  fs.unlinkSync(tmpJson);

  return { json: chart, text };
}

export function renderPosterHTML(
  chartJson: any,
  analysisJson: any,
  currentYear: number
): string {
  const tmpChart = path.join(TMP, `.poster-chart-${Date.now()}.json`);
  const tmpAnalysis = path.join(TMP, `.poster-analysis-${Date.now()}.json`);

  fs.writeFileSync(tmpChart, JSON.stringify(chartJson), 'utf-8');
  fs.writeFileSync(tmpAnalysis, JSON.stringify(analysisJson), 'utf-8');

  const html = execCalc(
    `dist/render.js --chart=${tmpChart} --analysis=${tmpAnalysis} --template=${TEMPLATE_PATH} --currentYear=${currentYear}`
  );

  fs.unlinkSync(tmpChart);
  fs.unlinkSync(tmpAnalysis);

  const htmlStart = html.indexOf('<!DOCTYPE');
  return htmlStart >= 0 ? html.slice(htmlStart) : html;
}
