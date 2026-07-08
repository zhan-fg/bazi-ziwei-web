// 渲染脚本: 算法 JSON + 分析 JSON + 模板 → 单文件 HTML
//
// 用法:
//   npx tsx render.ts \
//     --chart=path/to/chart.json \
//     --analysis=path/to/analysis.json \
//     --template=../templates/report-zonghe-poster.html \
//     --output=path/to/output.html
//
// chart.json: run-chart.ts 的输出 (算法层, 原始中文)
// analysis.json: LLM 按 zonghe-poster.md schema 输出的 JSON (英文)
//
// 翻译策略: chart 保持原始中文 (算法 enum 键, 用于模板占位符 key 匹配);
// 所有显示给用户的值在 emit 时过 glossary → 英文/拼音.

import * as fs from 'fs';
import * as path from 'path';

// ============ GLOSSARY (shared with ../lib/glossary.json) ============
function loadGlossary(): any {
  const candidates = [
    path.join(process.cwd(), '..', 'lib', 'glossary.json'),   // cwd = calculator/
    path.join(process.cwd(), 'lib', 'glossary.json'),         // cwd = repo root
    path.join(__dirname, '..', '..', 'lib', 'glossary.json'), // from dist/
    path.join(__dirname, '..', 'lib', 'glossary.json'),       // from calculator/ (tsx)
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
  }
  return {};
}
const G = loadGlossary();
function pick(dict: any, term: string | undefined | null | any): string {
  if (term === undefined || term === null || term === '') return '';
  const v = dict?.[String(term)];
  return v !== undefined ? v : String(term);
}
function bilingual(dict: any, term: string | undefined | null | any): string {
  if (term === undefined || term === null || term === '') return '';
  const raw = String(term);
  const en = dict?.[raw];
  return en !== undefined ? `${en} ${raw}` : raw;
}
const tStar = (s?: any) => pick(G.stars, s);
const tPalace = (s?: any) => {
  if (!s) return '';
  if (G.palaces[s]) return G.palaces[s];
  const base = String(s).endsWith('宫') ? String(s).slice(0, -1) : String(s);
  return G.palaces[base] ?? String(s);
};
const tGan = (s?: any) => bilingual(G.stems, s);
const tZhi = (s?: any) => bilingual(G.branches, s);
const tGanZhi = (s?: any) => {
  if (!s) return '';
  const str = String(s);
  if (str.length >= 2) return `${tGan(str[0])} ${tZhi(str[1])}`;
  if (G.stems[str]) return tGan(str);
  if (G.branches[str]) return tZhi(str);
  return str;
};
const tElement = (s?: any) => pick(G.elements, s);
const tYinYang = (s?: any) => pick(G.yinyang, s);
const tShiShen = (s?: any) => pick(G.shishen, s);
const tShiShenShort = (s?: any) => pick(G.shishenShort, s);
const tSiHua = (s?: any) => pick(G.sihua, s);
const tWangXiang = (s?: any) => pick(G.wangxiang, s);
const tGeju = (s?: any) => pick(G.geju, s);
const tWangShuai = (s?: any) => pick(G.wangshuai, s);
const tConfidence = (s?: any) => pick(G.confidence, s);
const tZhangSheng = (s?: any) => pick(G.zhangsheng, s);
const tWuXingJu = (s?: any) => pick(G.wuxingju, s);
const tNaYin = (s?: any) => pick(G.nayin, s);

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const a of process.argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const DIZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS_CN = ['木','火','土','金','水'];

function calcVirtualAge(birthYear: number, currentYear: number): number {
  return currentYear - birthYear + 1;
}

function chartToFlat(chart: any, currentYear?: number): Record<string, any> {
  const out: Record<string, any> = {};
  const bi = chart.bazi.birthInfo;
  const bz = chart.bazi;
  const zw = chart.ziwei;
  currentYear = currentYear || new Date().getFullYear();
  const virtualAge = calcVirtualAge(bi.year, currentYear);

  // ============ META ============
  out['meta.solar_date'] = `${bi.year}-${String(bi.month).padStart(2,'0')}-${String(bi.day).padStart(2,'0')} ${String(bi.hour).padStart(2,'0')}:${String(bi.minute).padStart(2,'0')}`;
  if (zw.lunarDate && zw.lunarDate.year) {
    const L = zw.lunarDate;
    out['meta.lunar_date'] = `${L.year}-${String(L.month).padStart(2,'0')}-${String(L.day).padStart(2,'0')} (Lunar)`;
  } else {
    out['meta.lunar_date'] = '-';
  }
  out['meta.gender_full'] = bi.gender === 'male' ? 'Male' : 'Female';
  out['meta.age_virtual'] = virtualAge.toString();
  out['meta.current_year'] = currentYear.toString();
  const now = new Date();
  out['meta.gen_time'] = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  out['meta.yinyang'] = tYinYang(zw.yinYang) || '-';

  // ============ ZIWEI META ============
  const MING_ZHU = { '子':'贪狼','丑':'巨门','寅':'禄存','卯':'文曲','辰':'廉贞','巳':'武曲','午':'破军','未':'武曲','申':'廉贞','酉':'文曲','戌':'禄存','亥':'巨门' };
  const SHEN_ZHU = { '子':'火星','丑':'天相','寅':'天梁','卯':'天同','辰':'文昌','巳':'天机','午':'火星','未':'天相','申':'天梁','酉':'天同','戌':'文昌','亥':'天机' };
  const mingDizhi = zw.gongs[0].dizhi;
  const shenDizhi = DIZHI[zw.shenGongIndex];
  out['ziwei.ming_zhu'] = tStar((MING_ZHU as any)[mingDizhi]) || '-';
  out['ziwei.shen_zhu'] = tStar((SHEN_ZHU as any)[shenDizhi]) || '-';
  out['ziwei.zi_dou_jun'] = zw.ziDouJun || '-';
  out['ziwei.wuxing_ju'] = tWuXingJu(zw.wuXingJu?.name) || '-';

  // ============ CORE DATA ============
  const en = bz.enrichment;
  out['core.geju'] = tGeju(en?.格局?.primary) || '-';
  out['core.geju_confidence'] = tConfidence(en?.格局?.confidence) || '-';
  out['core.wangshuai_verdict'] = tWangShuai(en?.旺衰?.verdict) || '-';
  out['core.wangshuai_score'] = en?.旺衰?.score?.toString() || '-';
  const ws = en?.旺衰?.score ?? 0;
  out['core.wangshuai_pos_pct'] = Math.max(0, Math.min(100, Math.round((ws + 10) * 5))).toString();
  const tc = en?.调候用神 || [];
  out['core.tiaohou.0'] = tGan(tc[0]) || '-';
  out['core.tiaohou.1'] = tGan(tc[1]) || '-';
  out['core.tiaohou_confidence'] = tConfidence('高');

  const yl = en?.五行旺相 || {};
  for (const k of ELEMENTS_CN) {
    out[`core.yueling.${tElement(k)}`] = tWangXiang(yl[k]) || '-';
  }

  const wx = en?.五行统计?.withCangGan || en?.五行统计 || { 木:0,火:0,土:0,金:0,水:0 };
  for (const k of ELEMENTS_CN) out[`core.wuxing.${tElement(k)}`] = wx[k] ?? '-';
  const wxMax = Math.max(...ELEMENTS_CN.map(k => +wx[k] || 0)) || 1;
  for (const k of ELEMENTS_CN) out[`core.wuxing_pct.${tElement(k)}`] = Math.round(((+wx[k] || 0) / wxMax) * 100);

  // ============ ZIWEI 12 GONGS ============
  // 四化: 可见 tag 用英文 (Lu/Quan/Ke/Ji), CSS class 保留中文以对齐模板 .sihua-禄 样式
  const sihuaTagText: any = { 化禄:'Lu', 化权:'Quan', 化科:'Ke', 化忌:'Ji' };
  const sihuaClassKey: any = { 化禄:'禄', 化权:'权', 化科:'科', 化忌:'忌' };
  const fmtStarWithSihua = (s: string, sihua: any[]): string => {
    const sh = (sihua || []).find((x: any) => x.star === s);
    if (sh) {
      const cls = sihuaClassKey[sh.hua] || sh.hua;
      const tag = sihuaTagText[sh.hua] || sh.hua;
      return `<span class="sihua-${cls}">${tStar(s)}<span class="sihua-tag">${tag}</span></span>`;
    }
    return tStar(s);
  };
  for (const g of zw.gongs) {
    const mainStarsHtml = (g.mainStars && g.mainStars.length > 0)
      ? g.mainStars.map((s: string) => fmtStarWithSihua(s, g.sihua)).join(' · ')
      : '<span style="color:var(--ink-faint)">No Major Star</span>';
    const auxStarsHtml = (g.auxStars && g.auxStars.length > 0)
      ? g.auxStars.map((s: string) => fmtStarWithSihua(s, g.sihua)).join(' · ')
      : '—';
    const tiangan = g.tiangan || '';
    const ganzhi = tiangan.length >= 2 ? tGanZhi(tiangan) : `${tGan(tiangan)} ${tZhi(g.dizhi)}`;
    out[`gongs.${g.dizhi}.name`] = tPalace(g.gong);
    out[`gongs.${g.dizhi}.ganzhi`] = ganzhi;
    out[`gongs.${g.dizhi}.mainStarsHtml`] = mainStarsHtml;
    out[`gongs.${g.dizhi}.auxStars`] = auxStarsHtml;
    out[`gongs.${g.dizhi}.smallStars`] = '';
    out[`gongs.${g.dizhi}.daxian_range`] = g.daXian ? `${g.daXian.startAge}-${g.daXian.endAge}` : '-';
    const flags: string[] = [];
    if (g.dizhi === mingDizhi) flags.push('ming');
    if (g.dizhi === shenDizhi) flags.push('shen');
    if (g.daXian && g.daXian.startAge <= virtualAge && virtualAge <= g.daXian.endAge) flags.push('current-daxian');
    out[`gongs.${g.dizhi}.flag`] = flags.join(' ');
    out[`gongs.${g.dizhi}.shenBadge`] = (g.dizhi === shenDizhi) ? '<span class="shen-badge">Body</span>' : '';
  }

  // ============ BAZI 4 PILLARS ============
  const cangGanFmt = (arr: any[]) => (arr || []).map((x: any) => `${tGan(x.gan)}(${tShiShenShort(x.shiShen)})`).join(' ');
  const pillarKeyToCn: any = { year: '年', month: '月', day: '日', hour: '时' };
  for (const k of ['year','month','day','hour']) {
    out[`bazi.${k}.shiShen`] = tShiShen(bz.shiShen?.[k]) || '-';
    out[`bazi.${k}.gan`] = tGan(bz.siZhu[k].gan);
    out[`bazi.${k}.zhi`] = tZhi(bz.siZhu[k].zhi);
    out[`bazi.${k}.cangGanHtml`] = cangGanFmt(bz.cangGan?.[k] || []);
    out[`bazi.${k}.zhangSheng`] = tZhangSheng(bz.zhangSheng?.[k]) || '-';
    const ziZuoRaw = en?.自坐?.[pillarKeyToCn[k]] || en?.自坐?.[k];
    out[`bazi.${k}.ziZuo`] = tZhangSheng(ziZuoRaw) || '-';
    out[`bazi.${k}.naYin`] = tNaYin(bz.naYin?.[k]) || '-';
  }
  out['bazi.dayunStart'] = bz.dayunStart?.toString() || '-';

  // ============ DAYUN 10 ============
  const fmtShortShiShen = (gan?: string, zhi?: string): string => {
    const sg = gan ? tShiShenShort(gan) : '';
    const sz = zhi ? tShiShenShort(zhi) : '';
    return sg && sz ? `${sg}/${sz}` : (sg || sz);
  };
  const dayunArr = (bz.dayun || []).slice(0, 10);
  let currentDayun: any = null;
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (d && d.startAge <= virtualAge && virtualAge <= d.endAge) currentDayun = d;
  }
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (!d) {
      ['gz','age_range','shishen','current_class'].forEach(f => out[`dayun.${i}.${f}`] = '-');
      continue;
    }
    out[`dayun.${i}.gz`] = `${tGan(d.ganZhi.gan)} ${tZhi(d.ganZhi.zhi)}`;
    out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
    out[`dayun.${i}.shishen`] = fmtShortShiShen(d.ganShiShen, d.zhiShiShen);
    out[`dayun.${i}.current_class`] = (currentDayun && d === currentDayun) ? 'current dayun' : '';
  }

  // ============ SECTION 02 阶段印证时间轴 (从 chart 算, 不靠 LLM) ============
  const dayunForStage = dayunArr.slice(0, 7);
  for (let i = 0; i < 7; i++) {
    const d = dayunForStage[i];
    if (!d) {
      ['range','gz','shishen','current_class'].forEach(f => out[`section_02.bazi.${i}.${f}`] = '-');
      continue;
    }
    out[`section_02.bazi.${i}.range`] = `${d.startAge}-${d.endAge}`;
    out[`section_02.bazi.${i}.gz`] = `${tGan(d.ganZhi.gan)} ${tZhi(d.ganZhi.zhi)}`;
    out[`section_02.bazi.${i}.shishen`] = fmtShortShiShen(d.ganShiShen, d.zhiShiShen);
    out[`section_02.bazi.${i}.current_class`] = (d.startAge <= virtualAge && virtualAge <= d.endAge) ? 'current' : '';
  }

  const ziweiDaxian = zw.gongs
    .filter((g: any) => g.daXian)
    .map((g: any) => ({ startAge: g.daXian.startAge, endAge: g.daXian.endAge, gong: g.gong }))
    .sort((a: any, b: any) => a.startAge - b.startAge)
    .slice(0, 7);
  for (let i = 0; i < 7; i++) {
    const d = ziweiDaxian[i];
    if (!d) {
      ['range','current_class'].forEach(f => out[`section_02.ziwei.${i}.${f}`] = '-');
      continue;
    }
    out[`section_02.ziwei.${i}.range`] = `${d.startAge}-${d.endAge}`;
    out[`section_02.ziwei.${i}.current_class`] = (d.startAge <= virtualAge && virtualAge <= d.endAge) ? 'current' : '';
  }

  // ============ LIUNIAN 10 (current dayun) ============
  if (currentDayun) {
    out['liunian_dayun_label'] = `${tGan(currentDayun.ganZhi.gan)} ${tZhi(currentDayun.ganZhi.zhi)} ${currentDayun.startAge}-${currentDayun.endAge}`;
  } else {
    out['liunian_dayun_label'] = '-';
  }
  const liunianArr = ((currentDayun?.liuNian) || []).slice(0, 10);
  for (let i = 0; i < 10; i++) {
    const ln = liunianArr[i];
    if (!ln) {
      ['year','age','gz','shishen','current_class'].forEach(f => out[`liunian.${i}.${f}`] = '-');
      continue;
    }
    out[`liunian.${i}.year`] = ln.year;
    out[`liunian.${i}.age`] = ln.age;
    out[`liunian.${i}.gz`] = `${tGan(ln.ganZhi.gan)} ${tZhi(ln.ganZhi.zhi)}`;
    out[`liunian.${i}.shishen`] = fmtShortShiShen(ln.ganShiShen, ln.zhiShiShen);
    out[`liunian.${i}.current_class`] = (ln.age === virtualAge) ? 'current' : '';
  }

  return out;
}

function analysisToFlat(analysis: any): Record<string, any> {
  const out: Record<string, any> = {};

  // meta
  if (analysis.meta) {
    out['meta.archetype_name'] = analysis.meta.archetype_name;
    out['meta.axis_oneliner'] = analysis.meta.axis_oneliner;
  }

  // axes + consistency
  if (analysis.axes) {
    out['axes.bazi_main'] = analysis.axes.bazi_main;
    out['axes.ziwei_main'] = analysis.axes.ziwei_main;
  }
  if (analysis.consistency) out['ziwei.consistency'] = analysis.consistency;

  // strengths / weaknesses
  for (let i = 0; i < 3; i++) {
    const s = analysis.strengths?.[i] || {};
    out[`strengths.${i}.title`] = s.title || '-';
    out[`strengths.${i}.desc`] = s.desc || '-';
    const w = analysis.weaknesses?.[i] || {};
    out[`weaknesses.${i}.title`] = w.title || '-';
    out[`weaknesses.${i}.desc`] = w.desc || '-';
  }

  // section 01
  if (analysis.section_01) {
    out['section_01.text'] = analysis.section_01.text || '-';
    out['section_01.word_count'] = analysis.section_01.word_count || '-';
  }

  // section 02 - bazi/ziwei dayun ranges already from chart, only conclusion
  if (analysis.section_02) {
    out['section_02.conclusion'] = analysis.section_02.conclusion || '-';
  }

  // dim
  const dims = ['career','wealth','marriage','children','family','health'];
  for (const k of dims) {
    const d = analysis.dim?.[k] || {};
    out[`dim.${k}.bazi`] = d.bazi || '-';
    out[`dim.${k}.ziwei`] = d.ziwei || '-';
    out[`dim.${k}.verdict`] = d.verdict || '-';
    out[`dim.${k}.verdict_class`] = d.verdict_class || 'verdict-yes';
    out[`dim.${k}.fused`] = d.fused || '-';
  }

  // conflicts
  for (let i = 0; i < 3; i++) {
    const c = analysis.conflicts?.[i] || {};
    out[`conflicts.${i}.point`] = c.point || '-';
    out[`conflicts.${i}.bazi`] = c.bazi || '-';
    out[`conflicts.${i}.ziwei`] = c.ziwei || '-';
    out[`conflicts.${i}.impact`] = c.impact || '-';
    out[`conflicts.${i}.impact_class`] = c.impact_class || 'low';
    out[`conflicts.${i}.advice`] = c.advice || '-';
  }

  // final
  if (analysis.final) {
    out['final.life_axis'] = analysis.final.life_axis || '-';
    for (let i = 0; i < 5; i++) {
      const n = analysis.final.nodes?.[i] || {};
      out[`final.nodes.${i}.age`] = n.age || '-';
      out[`final.nodes.${i}.year`] = n.year || '-';
      out[`final.nodes.${i}.event`] = n.event || '-';
    }
    for (let i = 0; i < 3; i++) {
      const r = analysis.final.risks?.[i] || {};
      out[`final.risks.${i}.range`] = r.range || '-';
      out[`final.risks.${i}.desc`] = r.desc || '-';
    }
    for (let i = 0; i < 2; i++) {
      const l = analysis.final.leverage?.[i] || {};
      out[`final.leverage.${i}.title`] = l.title || '-';
      out[`final.leverage.${i}.desc`] = l.desc || '-';
    }
    for (let i = 0; i < 4; i++) out[`final.advice.${i}`] = analysis.final.advice?.[i] || '-';
  }

  // confidence
  if (analysis.confidence) {
    for (const k of ['bazi','ziwei','consistency','stability']) {
      out[`confidence.${k}_level`] = analysis.confidence[`${k}_level`] || '-';
      out[`confidence.${k}_score`] = analysis.confidence[`${k}_score`] || '-';
    }
    out['confidence.note'] = analysis.confidence.note || '-';
  }

  return out;
}

function renderTemplate(template: string, data: Record<string, any>): string {
  let html = template;
  // 第一轮: 精确替换
  for (const k of Object.keys(data)) {
    const re = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
    html = html.replace(re, String(data[k]));
  }
  // 兜底: 剩余未匹配占位符替换为 '-'
  html = html.replace(/\{\{[a-zA-Z0-9_.]+\}\}/g, '-');
  return html;
}

function main() {
  const args = parseArgs();
  if (!args.chart || !args.template) {
    console.error('Usage: npx tsx render.ts --chart=chart.json [--analysis=analysis.json] --template=path/to/template.html [--output=out.html]');
    process.exit(1);
  }
  const chart = JSON.parse(fs.readFileSync(args.chart, 'utf-8'));
  const analysis = args.analysis ? JSON.parse(fs.readFileSync(args.analysis, 'utf-8')) : {};
  const template = fs.readFileSync(args.template, 'utf-8');

  const chartFlat = chartToFlat(chart, args.currentYear ? +args.currentYear : undefined);
  const analysisFlat = analysisToFlat(analysis);
  const data = { ...chartFlat, ...analysisFlat };

  const html = renderTemplate(template, data);

  if (args.output) {
    fs.writeFileSync(args.output, html, 'utf-8');
    console.error(`Rendered HTML written to ${args.output}`);
  } else {
    process.stdout.write(html);
  }
}

main();
