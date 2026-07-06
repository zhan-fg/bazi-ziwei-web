import fs from 'fs';
import path from 'path';

import os from 'os';

const DATA_DIR = path.join(os.tmpdir(), 'bazi-ziwei-data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveChart(id: string, data: any): void {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

export function getChart(id: string): any | null {
  const file = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function saveAnalysis(id: string, key: string, data: any): void {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, `${id}-${key}.json`), JSON.stringify(data, null, 2), 'utf-8');
}

export function getAnalysis(id: string, key: string): any | null {
  const file = path.join(DATA_DIR, `${id}-${key}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function cleanupOldFiles(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
  ensureDir();
  const now = Date.now();
  for (const file of fs.readdirSync(DATA_DIR)) {
    const filePath = path.join(DATA_DIR, file);
    if (now - fs.statSync(filePath).mtimeMs > maxAgeMs) {
      fs.unlinkSync(filePath);
    }
  }
}
