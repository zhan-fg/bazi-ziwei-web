// Single translation layer for the English build.
// Chart JSON stays raw Chinese (engine output); every display surface calls
// these helpers to render English/pinyin at the last moment. Logic code that
// matches on Chinese enum values (e.g. g.gong === '官禄') keeps reading raw
// Chinese — only display values are glossaried.
//
// Data lives in glossary.json so calculator/render.ts (a separate package,
// cannot import across tsconfig rootDir) can read the same file via fs.

import G from "./glossary.json";

type Dict = Record<string, string>;

function pick(dict: Dict | undefined, term: string | undefined | null): string {
  if (!term) return "";
  const v = dict?.[term];
  return v !== undefined ? v : term; // fall back to original Chinese to avoid blanks
}

// General category lookups — category-specific because terms like 七杀 are
// ambiguous (star "Qi Sha" vs ten-god "Seven Killings").
export const tStar = (s?: string | null) => pick(G.stars as Dict, s);
export const tPalace = (s?: string | null) => {
  if (!s) return "";
  const v = pick(G.palaces as Dict, s);
  if (v !== s) return v;
  // data sometimes carries a trailing 宫 (e.g. 命宫) — strip and retry
  const base = s.endsWith("宫") ? s.slice(0, -1) : s;
  return pick(G.palaces as Dict, base);
};
export const tPalaceBody = (s?: string | null) => pick(G.palaceBodies as Dict, s);
export const tGan = (s?: string | null) => {
  if (!s) return "";
  const en = (G.stems as Dict)[s];
  return en ? `${s}${en}` : s;
};
export const tGanElement = (s?: string | null) => pick(G.stemElements as Dict, s);
export const tZhi = (s?: string | null) => {
  if (!s) return "";
  const en = (G.branches as Dict)[s];
  return en ? `${s}${en}` : s;
};
// Translate a 2-char stem-branch string (e.g. "癸丑" → "癸Gui 丑Chou").
export const tGanZhi = (s?: string | null) => {
  if (!s) return "";
  if (s.length >= 2) return tGan(s[0]) + " " + tZhi(s[1]);
  return tGan(s) || tZhi(s) || s;
};
export const tElement = (s?: string | null) => pick(G.elements as Dict, s);
export const tYinYang = (s?: string | null) => pick(G.yinyang as Dict, s);
export const tShiShen = (s?: string | null) => pick(G.shishen as Dict, s);
export const tShiShenShort = (s?: string | null) => pick(G.shishenShort as Dict, s);
export const tSiHua = (s?: string | null) => pick(G.sihua as Dict, s);
export const tSiHuaFull = (s?: string | null) => pick(G.sihuaFull as Dict, s);
export const tState = (s?: string | null) => pick(G.states as Dict, s);
export const tWangXiang = (s?: string | null) => pick(G.wangxiang as Dict, s);
export const tGeju = (s?: string | null) => pick(G.geju as Dict, s);
export const tWangShuai = (s?: string | null) => pick(G.wangshuai as Dict, s);
export const tConfidence = (s?: string | null) => pick(G.confidence as Dict, s);
export const tZhangSheng = (s?: string | null) => pick(G.zhangsheng as Dict, s);
export const tWuXingJu = (s?: string | null) => pick(G.wuxingju as Dict, s);
export const tNaYin = (s?: string | null) => pick(G.nayin as Dict, s);
export const tShenSha = (s?: string | null) => pick(G.shensha as Dict, s);
export const tPillar = (s?: string | null) => pick(G.pillarNames as Dict, s);
export const tCangGanRole = (s?: string | null) => pick(G.cangganRole as Dict, s);

// Split a 2-char ganzhi string (e.g. "癸丑") into "Gui Chou" with a space.
export const splitGanZhi = (s?: string | null) => {
  if (!s || s.length < 2) return s || "";
  return tGan(s[0]) + " " + tZhi(s[1]);
};

// Translate a list of star names, joining with separator.
export const tStars = (arr?: string[] | null, sep = " · ") =>
  (arr || []).map(tStar).join(sep);

// Translate an array of {star, hua} sihua entries.
export const tSihuaList = (arr?: { star: string; hua: string }[] | null) =>
  (arr || []).map((s) => `${tStar(s.star)} ${tSiHua(s.hua)}`);

export default G;
