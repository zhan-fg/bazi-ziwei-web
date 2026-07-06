import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

// Create a require function that resolves from the calculator dist directory.
// This ensures lunar-typescript (installed in root node_modules) is found
// via Node's standard upward module resolution.
const CALCULATOR_DIST = path.join(process.cwd(), 'calculator', 'dist');
const calRequire = createRequire(path.join(CALCULATOR_DIST, 'run-chart.js'));

// Dynamically load calculator modules in-process (no child_process needed)
const yiqiCore: any = calRequire('./yiqi-core/index');
const baziMod: any = calRequire('./yiqi-core/bazi');
const enrichMod: any = calRequire('./bazi-enrich/enrich');

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
  // Step 1: Yiqi algorithm layer — Bazi + Ziwei + Dayun + Liunian
  const chart: any = yiqiCore.createChart({
    year: birthInfo.year,
    month: birthInfo.month,
    day: birthInfo.day,
    hour: birthInfo.hour,
    minute: birthInfo.minute,
    isLunar: birthInfo.isLunar || false,
    gender: birthInfo.gender,
    timeZone: 8,
  });

  // Attach hidden stems (cang gan) with shiShen
  const dm = chart.bazi.dayMaster;
  const sz = chart.bazi.siZhu;
  chart.bazi.cangGan = {
    year: baziMod.getZhiCangGanFull(sz.year.zhi, dm),
    month: baziMod.getZhiCangGanFull(sz.month.zhi, dm),
    day: baziMod.getZhiCangGanFull(sz.day.zhi, dm),
    hour: baziMod.getZhiCangGanFull(sz.hour.zhi, dm),
  };

  // Patch endAge for dayun (Yiqi only gives startAge/endYear)
  if (chart.bazi.dayun && Array.isArray(chart.bazi.dayun)) {
    for (const d of chart.bazi.dayun) {
      if (d.startAge !== undefined && d.endAge === undefined) {
        d.endAge = d.startAge + 9;
      }
    }
  }

  // Step 2: enrichBazi — geju / wangshuai / tiaohou / relations / pillar judgement
  const siZhuForEnrich: any = {
    '年': chart.bazi.siZhu.year,
    '月': chart.bazi.siZhu.month,
    '日': chart.bazi.siZhu.day,
    '时': chart.bazi.siZhu.hour,
  };
  chart.bazi.enrichment = enrichMod.enrichBazi(siZhuForEnrich);

  // Step 3: dump-text — convert to human-readable tree text
  const text = generateChartText(chart, birthInfo);

  return { json: chart, text };
}

export function renderPosterHTML(
  chartJson: any,
  analysisJson: any,
  currentYear: number
): string {
  // In-process rendering: the render.js module reads chart + analysis JSON and
  // a template HTML file, then does {{key}} placeholder replacement
  const renderMod: any = calRequire('./render');
  const templatePath = path.join(process.cwd(), 'templates', 'report-zonghe-poster.html');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Flatten chart data (same logic as render.ts chartToFlat)
  const chartFlat = chartToFlat(chartJson, currentYear);
  const analysisFlat = analysisToFlat(analysisJson);
  const data = { ...chartFlat, ...analysisFlat };

  // Template replacement (same as render.ts renderTemplate)
  let html = template;
  for (const k of Object.keys(data)) {
    const re = new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
    html = html.replace(re, String(data[k] ?? ''));
  }
  html = html.replace(/\{\{[a-zA-Z0-9_.]+\}\}/g, '-');

  return html;
}

// ---- Private helpers (mirroring dump-text.ts and render.ts logic) ----

const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function generateChartText(chart: any, birthInfo: any): string {
  const lines: string[] = [];
  const bi = chart.ziwei?.birthInfo || birthInfo;
  const zw = chart.ziwei;
  const bz = chart.bazi;

  // ---- Ziwei section ----
  lines.push('紫微斗数命盘', '│', '├基本信息');
  lines.push(`│ ├性别 : ${bi.gender === 'male' ? '男' : '女'}`);
  lines.push(`│ ├阳历 : ${bi.year}-${String(bi.month).padStart(2, '0')}-${String(bi.day).padStart(2, '0')} ${String(bi.hour).padStart(2, '0')}:${String(bi.minute).padStart(2, '0')}`);
  if (zw?.lunarDate) {
    lines.push(`│ ├农历 : ${zw.lunarDate.year}年${zw.lunarDate.monthCn}月${zw.lunarDate.dayCn}`);
  }
  if (zw?.siZhu) {
    const sz2 = zw.siZhu;
    lines.push(`│ ├节气四柱 : ${sz2.year.gan}${sz2.year.zhi} ${sz2.month.gan}${sz2.month.zhi} ${sz2.day.gan}${sz2.day.zhi} ${sz2.hour.gan}${sz2.hour.zhi}`);
  }
  lines.push(`│ ├阴阳 : ${zw?.yinYang || ''}`);
  lines.push(`│ ├五行局 : ${zw?.wuXingJu?.name || ''}`);
  const mingDizhi = zw?.gongs?.[0]?.dizhi;
  const shenDizhi = DIZHI[zw?.shenGongIndex ?? 0];
  lines.push(`│ └命宫=${mingDizhi}  身宫=${shenDizhi}`, '│');

  // Shengnian sihua
  const allSihua: string[] = [];
  for (const g of zw?.gongs || []) {
    for (const s of g.sihua || []) allSihua.push(`${s.star}${s.hua}`);
  }
  if (allSihua.length > 0) {
    lines.push('├生年四化', `│ └${allSihua.join(' · ')}`, '│');
  }

  // 12 gongs
  lines.push('├命盘十二宫');
  (zw?.gongs || []).forEach((g: any, idx: number) => {
    const isLast = idx === (zw.gongs.length - 1);
    const pre = isLast ? '│ └' : '│ ├';
    const subPre = isLast ? '│   ' : '│ │ ';
    const isMing = g.gong === '命宫';
    const isShen = g.dizhi === shenDizhi;
    const marks: string[] = [];
    if (isMing) marks.push('[命]');
    if (isShen && !isMing) marks.push('[身]');
    const gongName = g.gong.endsWith('宫') ? g.gong : g.gong + '宫';
    lines.push(`${pre}${gongName}[${g.tiangan}${g.dizhi}]${marks.join('')}`);
    const main = g.mainStars?.length > 0 ? g.mainStars.join('·') : '无主星';
    lines.push(`${subPre}├主星 : ${main}`);
    const aux = g.auxStars?.length > 0 ? g.auxStars.join('·') : '无';
    lines.push(`${subPre}├辅星 : ${aux}`);
    if (g.sihua?.length > 0) {
      lines.push(`${subPre}├生年四化 : ${g.sihua.map((s: any) => s.star + s.hua).join('·')}`);
    }
    if (g.daXian) {
      const dxMark = g.daXian.isCurrent ? '★当前' : '';
      lines.push(`${subPre}├大限 : ${g.daXian.startAge}-${g.daXian.endAge}虚岁 ${dxMark}`);
    }
    if (g.liuNian?.length > 0) {
      lines.push(`${subPre}└流年 : ${g.liuNian.join('·')}虚岁`);
    }
    if (!isLast) lines.push('│ │');
  });

  // ---- Bazi section ----
  lines.push('', '八字命盘', '│', '├四柱');
  const sz3 = bz.siZhu;
  const ss = bz.shiShen;
  const zs = bz.zhangSheng || {};
  const zz = bz.enrichment?.['自坐'] || {};
  const ny = bz.naYin || {};
  const cg = bz.cangGan || {};
  const cols = ['年', '月', '日', '时'];
  const pks = ['year', 'month', 'day', 'hour'];

  for (let i = 0; i < 4; i++) {
    const isLast = i === 3;
    const pre = isLast ? '│ └' : '│ ├';
    const subPre = isLast ? '│   ' : '│ │ ';
    const pk = pks[i];
    const sx = ss[pk] || '';
    const isDay = pk === 'day';
    const tag = isDay ? '[日主]' : `[${sx}]`;
    lines.push(`${pre}${cols[i]}柱 : ${sz3[pk].gan}${sz3[pk].zhi} ${tag}`);
    if (cg[pk]) {
      const cgStr = (cg[pk] || []).map((x: any) => `${x.gan}(${x.shiShen || ''})`).join(' ');
      lines.push(`${subPre}├藏干 : ${cgStr}`);
    }
    lines.push(`${subPre}├星运 : ${zs[pk] || '-'}`);
    lines.push(`${subPre}├自坐 : ${zz[cols[i]] || zz[pk] || '-'}`);
    lines.push(`${subPre}└纳音 : ${ny[pk] || '-'}`);
    if (!isLast) lines.push('│ │');
  }

  // Dayun
  lines.push('│');
  if (bz.dayun?.length > 0) {
    lines.push(`├大运 (起运 ${bz.dayunStart}岁)`);
    bz.dayun.slice(0, 10).forEach((d: any, i: number) => {
      const isLast = i === Math.min(9, bz.dayun.length - 1);
      const pre = isLast ? '│ └' : '│ ├';
      const dxTag = `${d.ganShiShen || ''}/${d.zhiShiShen || ''}`;
      lines.push(`${pre}${d.startYear}-${d.endYear}  ${d.ganZhi.gan}${d.ganZhi.zhi}  (${dxTag})`);
    });
    lines.push('│');
  }

  // Enrich
  const en = bz.enrichment;
  if (en) {
    lines.push('├算法补层');
    lines.push(`│ ├格局 : ${en['格局']?.primary || '-'}  (置信度: ${en['格局']?.confidence || '-'})`);
    if (en['格局']?.basis) lines.push(`│ │ └依据 : ${en['格局'].basis}`);
    const ws = en['旺衰'];
    if (ws) {
      lines.push(`│ ├旺衰 : ${ws.verdict || ws.level || '-'}  (score=${ws.score ?? '-'}, 置信度: ${ws.confidence || '-'})`);
      if (ws.breakdown) {
        const b = ws.breakdown;
        lines.push(`│ │ └四维 : 得令${b.得令} 长生${b.长生} 得地${b.得地} 得势${b.得势}`);
      }
    }
    if (en['调候用神']) lines.push(`│ ├调候用神 : ${en['调候用神'].join('、')}`);
    if (en['五行旺相']) {
      const w5 = en['五行旺相'];
      lines.push(`│ ├五行旺相 : 木${w5.木} 火${w5.火} 土${w5.土} 金${w5.金} 水${w5.水}`);
    }
    if (en['五行统计']) {
      const s5 = en['五行统计'].surface || en['五行统计'];
      const w5c = en['五行统计'].withCangGan;
      if (s5) lines.push(`│ ├五行统计(surface) : 木${s5.木 || 0} 火${s5.火 || 0} 土${s5.土 || 0} 金${s5.金 || 0} 水${s5.水 || 0}`);
      if (w5c) lines.push(`│ ├五行统计(含藏干) : 木${w5c.木 || 0} 火${w5c.火 || 0} 土${w5c.土 || 0} 金${w5c.金 || 0} 水${w5c.水 || 0}`);
    }
    const gr = en['天干关系'];
    if (gr?.length > 0) {
      lines.push('│ ├天干关系');
      gr.forEach((r: any, i: number) => {
        const last = i === gr.length - 1;
        lines.push(`│ │ ${last ? '└' : '├'}${r.type} : ${(r.gans || []).join('')}  (${(r.pillars || []).join('-')}柱)`);
      });
    }
    const zr2 = en['地支关系'];
    if (zr2?.length > 0) {
      lines.push('│ ├地支关系');
      zr2.forEach((r: any, i: number) => {
        const last = i === zr2.length - 1;
        const extra = r.detail ? `  ${r.detail}` : '';
        lines.push(`│ │ ${last ? '└' : '├'}${r.type} : ${(r.zhi || []).join('')}  (${(r.pillars || []).join('-')}柱)${extra}`);
      });
    }
    const zp = en['整柱'];
    if (zp?.length > 0) {
      lines.push('│ └整柱判定');
      zp.forEach((p: any, i: number) => {
        const last = i === zp.length - 1;
        lines.push(`│   ${last ? '└' : '├'}${p.pillar}柱 ${p.gan}${p.zhi} : ${p.verdict}`);
      });
    }
  }
  lines.push('', '└[备注: 本盘由 bazi-ziwei skill 算法层生成 — Yiqi core + enrichBazi 补层]');

  return lines.join('\n');
}

function chartToFlat(chart: any, currentYear?: number): Record<string, any> {
  const out: Record<string, any> = {};
  const bi = chart.bazi.birthInfo;
  const bz = chart.bazi;
  const zw = chart.ziwei;
  currentYear = currentYear || new Date().getFullYear();
  const virtualAge = currentYear - bi.year + 1;

  out['meta.solar_date'] = `${bi.year}-${String(bi.month).padStart(2, '0')}-${String(bi.day).padStart(2, '0')} ${String(bi.hour).padStart(2, '0')}:${String(bi.minute).padStart(2, '0')}`;
  if (zw?.lunarDate) {
    out['meta.lunar_date'] = `${zw.lunarDate.year}年 ${zw.lunarDate.monthCn}月${zw.lunarDate.dayCn}`;
  } else out['meta.lunar_date'] = '-';
  out['meta.gender_full'] = bi.gender === 'male' ? '男（阳）' : '女（阴）';
  out['meta.age_virtual'] = String(virtualAge);
  out['meta.current_year'] = String(currentYear);
  out['meta.yinyang'] = zw?.yinYang || '-';

  const en = bz.enrichment;
  out['core.geju'] = en?.['格局']?.primary || '-';
  out['core.geju_confidence'] = en?.['格局']?.confidence || '-';
  out['core.wangshuai_verdict'] = en?.['旺衰']?.verdict || '-';
  out['core.wangshuai_score'] = String(en?.['旺衰']?.score ?? '-');
  const ws = en?.['旺衰']?.score ?? 0;
  out['core.wangshuai_pos_pct'] = String(Math.max(0, Math.min(100, Math.round((ws + 10) * 5))));
  const tc = en?.['调候用神'] || [];
  out['core.tiaohou.0'] = tc[0] || '-';
  out['core.tiaohou.1'] = tc[1] || '-';
  out['core.tiaohou_confidence'] = '高';

  const yl = en?.['五行旺相'] || {};
  for (const k of ['木', '火', '土', '金', '水']) out[`core.yueling.${k}`] = yl[k] || '-';
  const wx = en?.['五行统计']?.withCangGan || en?.['五行统计'] || {};
  for (const k of ['木', '火', '土', '金', '水']) out[`core.wuxing.${k}`] = wx[k] ?? '-';

  // Ziwei 12 gongs
  const MING_ZHU: any = { '子': '贪狼', '丑': '巨门', '寅': '禄存', '卯': '文曲', '辰': '廉贞', '巳': '武曲', '午': '破军', '未': '武曲', '申': '廉贞', '酉': '文曲', '戌': '禄存', '亥': '巨门' };
  const SHEN_ZHU: any = { '子': '火星', '丑': '天相', '寅': '天梁', '卯': '天同', '辰': '文昌', '巳': '天机', '午': '火星', '未': '天相', '申': '天梁', '酉': '天同', '戌': '文昌', '亥': '天机' };
  const mingDizhi2 = zw?.gongs?.[0]?.dizhi;
  const shenDizhi2 = DIZHI[zw?.shenGongIndex ?? 0];
  out['ziwei.ming_zhu'] = MING_ZHU[mingDizhi2] || '-';
  out['ziwei.shen_zhu'] = SHEN_ZHU[shenDizhi2] || '-';
  out['ziwei.wuxing_ju'] = zw?.wuXingJu?.name || '-';

  for (const g of zw?.gongs || []) {
    const mainStarsHtml = g.mainStars?.length > 0 ? g.mainStars.join('·') : '无主星';
    const auxHtml = g.auxStars?.length > 0 ? g.auxStars.join('·') : '—';
    out[`gongs.${g.dizhi}.name`] = g.gong.endsWith('宫') ? g.gong : g.gong + '宫';
    out[`gongs.${g.dizhi}.ganzhi`] = g.tiangan + g.dizhi;
    out[`gongs.${g.dizhi}.mainStarsHtml`] = mainStarsHtml;
    out[`gongs.${g.dizhi}.auxStars`] = auxHtml;
    out[`gongs.${g.dizhi}.daxian_range`] = g.daXian ? `${g.daXian.startAge}-${g.daXian.endAge}` : '-';
    const flags: string[] = [];
    if (g.dizhi === mingDizhi2) flags.push('ming');
    if (g.dizhi === shenDizhi2) flags.push('shen');
    if (g.daXian && g.daXian.startAge <= virtualAge && virtualAge <= g.daXian.endAge) flags.push('current-daxian');
    out[`gongs.${g.dizhi}.flag`] = flags.join(' ');
    out[`gongs.${g.dizhi}.shenBadge`] = g.dizhi === shenDizhi2 ? '<span class="shen-badge">身</span>' : '';
  }

  // Bazi 4 pillars
  const pillarKeyToCn: any = { year: '年', month: '月', day: '日', hour: '时' };
  for (const k of ['year', 'month', 'day', 'hour']) {
    out[`bazi.${k}.shiShen`] = bz.shiShen?.[k] || '-';
    out[`bazi.${k}.gan`] = bz.siZhu[k].gan;
    out[`bazi.${k}.zhi`] = bz.siZhu[k].zhi;
    out[`bazi.${k}.zhangSheng`] = bz.zhangSheng?.[k] || '-';
    out[`bazi.${k}.ziZuo`] = en?.['自坐']?.[pillarKeyToCn[k]] || en?.['自坐']?.[k] || '-';
    out[`bazi.${k}.naYin`] = bz.naYin?.[k] || '-';
  }
  out['bazi.dayunStart'] = String(bz.dayunStart ?? '-');

  // Dayun
  const dayunArr = (bz.dayun || []).slice(0, 10);
  let currentDayun: any = null;
  for (const d of dayunArr) {
    if (d && d.startAge <= virtualAge && virtualAge <= d.endAge) currentDayun = d;
  }
  for (let i = 0; i < 10; i++) {
    const d = dayunArr[i];
    if (!d) {
      out[`dayun.${i}.gz`] = '-'; out[`dayun.${i}.age_range`] = '-';
      out[`dayun.${i}.shishen`] = '-'; out[`dayun.${i}.current_class`] = '-';
      continue;
    }
    out[`dayun.${i}.gz`] = d.ganZhi.gan + d.ganZhi.zhi;
    out[`dayun.${i}.age_range`] = `${d.startAge}-${d.endAge}`;
    out[`dayun.${i}.shishen`] = (d.ganShiShen || '').slice(0, 1) + (d.zhiShiShen || '').slice(0, 1);
    out[`dayun.${i}.current_class`] = (currentDayun && d === currentDayun) ? 'current dayun' : '';
  }

  return out;
}

function analysisToFlat(analysis: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (analysis.meta) {
    out['meta.archetype_name'] = analysis.meta.archetype_name;
    out['meta.axis_oneliner'] = analysis.meta.axis_oneliner;
  }
  if (analysis.axes) {
    out['axes.bazi_main'] = analysis.axes.bazi_main;
    out['axes.ziwei_main'] = analysis.axes.ziwei_main;
  }
  if (analysis.consistency) out['ziwei.consistency'] = analysis.consistency;

  for (let i = 0; i < 3; i++) {
    const s = analysis.strengths?.[i] || {};
    out[`strengths.${i}.title`] = s.title || '-';
    out[`strengths.${i}.desc`] = s.desc || '-';
    const w = analysis.weaknesses?.[i] || {};
    out[`weaknesses.${i}.title`] = w.title || '-';
    out[`weaknesses.${i}.desc`] = w.desc || '-';
  }

  if (analysis.section_01) {
    out['section_01.text'] = analysis.section_01.text || '-';
    out['section_01.word_count'] = analysis.section_01.word_count || '-';
  }
  if (analysis.section_02) {
    out['section_02.conclusion'] = analysis.section_02.conclusion || '-';
  }

  const dims = ['career', 'wealth', 'marriage', 'children', 'family', 'health'];
  for (const k of dims) {
    const d = analysis.dim?.[k] || {};
    out[`dim.${k}.bazi`] = d.bazi || '-';
    out[`dim.${k}.ziwei`] = d.ziwei || '-';
    out[`dim.${k}.verdict`] = d.verdict || '-';
    out[`dim.${k}.verdict_class`] = d.verdict_class || 'verdict-yes';
    out[`dim.${k}.fused`] = d.fused || '-';
  }

  for (let i = 0; i < 3; i++) {
    const c = analysis.conflicts?.[i] || {};
    out[`conflicts.${i}.point`] = c.point || '-';
    out[`conflicts.${i}.bazi`] = c.bazi || '-';
    out[`conflicts.${i}.ziwei`] = c.ziwei || '-';
    out[`conflicts.${i}.impact`] = c.impact || '-';
    out[`conflicts.${i}.impact_class`] = c.impact_class || 'low';
    out[`conflicts.${i}.advice`] = c.advice || '-';
  }

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

  if (analysis.confidence) {
    for (const k of ['bazi', 'ziwei', 'consistency', 'stability']) {
      out[`confidence.${k}_level`] = analysis.confidence[`${k}_level`] || '-';
      out[`confidence.${k}_score`] = analysis.confidence[`${k}_score`] || '-';
    }
    out['confidence.note'] = analysis.confidence.note || '-';
  }

  return out;
}
