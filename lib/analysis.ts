// Generate analysis JSON from chart data without LLM.
// Fills poster template fields with chart-derived insights in English.
//
// The chart JSON stays in the engine's raw Chinese form. Logic that matches on
// Chinese enum values (geju.includes('杀'), g.gong === '官禄', ws5['土'] === '死',
// ganShiShen.includes('印')) keeps reading raw Chinese — only the values
// embedded in English output strings are glossaried via lib/glossary.

import {
  tGeju, tGan, tGanElement, tWangShuai, tStar, tStars, tSiHua,
  tZhi, tPalace, tShiShen, tWuXingJu,
} from '@/lib/glossary';

export function generateAnalysis(chart: any, birthInfo: any): any {
  const bz = chart.bazi;
  const zw = chart.ziwei;
  const en = bz.enrichment;

  const geju = en?.['格局']?.primary || '';
  const wangshuai = en?.['旺衰']?.verdict || '';
  const tiaohouRaw = (en?.['调候用神'] || []);
  const tiaohou = tiaohouRaw.map(tGan).join(', ');
  const dayMaster = bz.dayMaster;
  const dayMasterEl = tGanElement(dayMaster) || 'Earth';
  const dayunCurrent = (bz.dayun || []).find((d: any) => {
    const age = new Date().getFullYear() - birthInfo.year + 1;
    return d.startAge <= age && age <= (d.endAge || d.startAge + 9);
  });

  const mingGong = zw.gongs[0];
  const shenGongIdx = zw.shenGongIndex;
  const shenGong = zw.gongs.find((g: any) =>
    g.dizhi === ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][shenGongIdx]
  );
  const mainStars = (mingGong.mainStars || []).map(tStar).join(' · ');
  const allSihua: string[] = [];
  for (const g of zw.gongs) {
    for (const s of g.sihua || []) allSihua.push(`${tStar(s.star)} ${tSiHua(s.hua)}`);
  }

  // --- logic on raw Chinese geju/wangshuai (unchanged) ---
  const careerBazi = geju.includes('杀') ? 'Pressure into authority — thrive in organizations'
    : geju.includes('官') ? 'Disciplined path for structured roles'
    : 'Balanced: multiple viable paths';

  const careerZiwei = (() => {
    const guanlu = zw.gongs.find((g: any) => g.gong === '官禄');
    const stars = (guanlu?.mainStars || []).map(tStar).join(' · ') || '';
    return stars ? `Career Palace: ${stars} — clear direction` : 'Career strength drawn from opposite palace';
  })();

  const wealthBazi = (() => {
    const ws = en?.['旺衰']?.verdict;
    return ws?.includes('弱') ? 'Wealth abundant but self weaker — defend'
      : ws?.includes('旺') ? 'Strong self shoulders wealth — invest actively'
      : 'Wealth fluctuates with cycles';
  })();

  const wealthZiwei = (() => {
    const caibo = zw.gongs.find((g: any) => g.gong === '财帛');
    const stars = (caibo?.mainStars || []).map(tStar).join(' · ') || '';
    return caibo?.mainStars?.length ? `Wealth Palace: ${stars}` : 'Wealth Palace empty — hedge with property';
  })();

  const marriageBazi = (() => {
    return `Day Branch ${tZhi(bz.siZhu.day.zhi)}: partner is grounded and practical`;
  })();

  const marriageZiwei = (() => {
    const fuqi = zw.gongs.find((g: any) => g.gong === '夫妻');
    const stars = (fuqi?.mainStars || []).map(tStar).join(' · ') || '';
    return stars ? `Spouse Palace: ${stars}` : 'Spouse Palace: late marriage favored';
  })();

  const childrenBazi = `Hour Pillar ${tGan(bz.siZhu.hour.gan)}${tZhi(bz.siZhu.hour.zhi)}: children with promise`;
  const childrenZiwei = (() => {
    const zinvg = zw.gongs.find((g: any) => g.gong === '子女');
    const stars = (zinvg?.mainStars || []).map(tStar).join(' · ') || '';
    return stars ? `Children Palace: ${stars}` : 'Children Palace: steady';
  })();

  const healthBazi = (() => {
    const ws5 = en?.['五行旺相'] || {};
    const weak: string[] = [];
    if (ws5['土'] === '死') weak.push('digestive');
    if (ws5['金'] === '囚') weak.push('respiratory');
    if (ws5['水'] === '休') weak.push('kidneys');
    return weak.length ? `Watch: ${weak.join(', ')}` : 'Overall balanced';
  })();

  const healthZiwei = (() => {
    const jie = zw.gongs.find((g: any) => g.gong === '疾厄');
    const stars = (jie?.mainStars || []).map(tStar).join(' · ') || '';
    return stars ? `Health Palace: ${stars}` : 'Health Palace: steady';
  })();

  const archetypeName = `${tGeju(geju)} ${tGan(dayMaster)} ${dayMasterEl}`;
  const axisOneliner = `${tGeju(geju) || 'Chart'} · ${tWangShuai(wangshuai) || 'Balanced'} · ${tiaohou || 'Seasonal'}`;

  const nodes = (bz.dayun || []).slice(0, 5).map((d: any) => ({
    age: d.startAge,
    year: d.startYear,
    event: `${tGan(d.ganZhi.gan)}${tZhi(d.ganZhi.zhi)} cycle (${tShiShen(d.ganShiShen)}/${tShiShen(d.zhiShiShen)})`,
  }));

  const tiaohouGan = tGan((en?.['调候用神'] || [])[0]);

  const shenGongDizhi = tZhi(shenGong?.dizhi);
  const shenGongName = tPalace(shenGong?.gong);

  return {
    meta: { archetype_name: archetypeName.slice(0, 20), axis_oneliner: axisOneliner.slice(0, 30) },
    axes: {
      bazi_main: `${tGeju(geju)} · Day Master ${tGan(dayMaster)} ${dayMasterEl} · ${tWangShuai(wangshuai)} · Needs ${tiaohou}`.slice(0, 60),
      ziwei_main: `Life ${tZhi(mingGong.dizhi)} · ${mainStars} · Body ${shenGongDizhi} · ${allSihua.join(' ')}`.slice(0, 60),
    },
    consistency: 'Aligned',
    strengths: [
      { title: 'Clear Structure', desc: `${tGeju(geju)}: well-defined life direction` },
      { title: 'Solid Core', desc: `Day Master ${tGan(dayMaster)} ${dayMasterEl}: resilient` },
      { title: tiaohou ? 'Seasonal Balance' : 'Element Flow', desc: tiaohou ? `Seasonal needs met` : 'Elements balanced' },
    ],
    weaknesses: [
      { title: wangshuai?.includes('弱') ? 'Lower Stamina' : 'Flexibility', desc: wangshuai?.includes('弱') ? 'Pace yourself through demands' : 'Temper strength with adaptability' },
      { title: 'Wealth Flux', desc: 'Anchor wealth with real estate' },
      { title: 'Deep Thinker', desc: 'Practice letting go of over-analysis' },
    ],
    section_01: {
      text: `${tGeju(geju)} chart, Day Master ${tGan(dayMaster)} ${dayMasterEl}, born in ${tZhi(bz.siZhu.month.zhi)} month. ${wangshuai ? `Self is ${tWangShuai(wangshuai)}. ` : ''}Seasonal needs: ${tiaohou}. Life Palace in ${tZhi(mingGong.dizhi)} with ${mainStars}, Body Palace in ${shenGongName}. Birth transformations: ${allSihua.join(' · ')}. Both systems converge: the BaZi ${tGeju(geju)} and Ziwei ${mainStars} point to one life path. ${dayunCurrent ? `Currently in ${tGan(dayunCurrent.ganZhi.gan)}${tZhi(dayunCurrent.ganZhi.zhi)} cycle.` : ''}`.slice(0, 300),
      word_count: 180,
    },
    section_02: {
      conclusion: dayunCurrent
        ? `Currently ${dayunCurrent.startYear}-${dayunCurrent.endYear}: ${tGan(dayunCurrent.ganZhi.gan)}${tZhi(dayunCurrent.ganZhi.zhi)} cycle (${tShiShen(dayunCurrent.ganShiShen)}/${tShiShen(dayunCurrent.zhiShiShen)}) — ${dayunCurrent.ganShiShen?.includes('印') ? 'prime learning period' : dayunCurrent.ganShiShen?.includes('财') ? 'wealth accumulation' : 'life transition'}.`
        : 'Cycles unfold according to chart dynamics.',
    },
    dim: {
      career:   { bazi: careerBazi, ziwei: careerZiwei, verdict: '🟢 Aligned', verdict_class: 'verdict-yes', fused: 'Build career through platforms and expertise' },
      wealth:   { bazi: wealthBazi, ziwei: wealthZiwei, verdict: '🟢 Aligned', verdict_class: 'verdict-yes', fused: 'Earned income first, real estate anchor' },
      marriage: { bazi: marriageBazi, ziwei: marriageZiwei, verdict: '🟢 Aligned', verdict_class: 'verdict-yes', fused: 'Partner is steady and reliable' },
      children: { bazi: childrenBazi, ziwei: childrenZiwei, verdict: '🟢 Aligned', verdict_class: 'verdict-yes', fused: 'Children show integrity — nurture wisely' },
      family:   { bazi: 'Deep ancestral roots, family support', ziwei: 'Property Palace stable and grounded', verdict: '🟢 Aligned', verdict_class: 'verdict-yes', fused: 'Home stable, foundations deep' },
      health:   { bazi: healthBazi, ziwei: healthZiwei, verdict: '🟢 Aligned', verdict_class: 'verdict-yes', fused: 'Monitor weak points, stabilize in midlife' },
    },
    conflicts: [
      { point: 'Strength Edge', bazi: `Self ${tWangShuai(wangshuai)}: luck-dependent`, ziwei: 'Life Palace stars steady', impact: 'Low', impact_class: 'low', advice: 'Use cycles as guide, stay flexible' },
      { point: 'Wealth View', bazi: 'Many stars, self weaker', ziwei: 'Wealth Palace empty', impact: 'Low', impact_class: 'low', advice: 'Defensive posture, hedge with property' },
      { point: 'Relationships', bazi: 'Peer support present', ziwei: 'Friends Palace unique', impact: 'Low', impact_class: 'low', advice: 'Choose partners carefully, clear accounts' },
    ],
    final: {
      life_axis: `${tGeju(geju)} ${tGan(dayMaster)} ${dayMasterEl} · ${mainStars} · ${tWangShuai(wangshuai) || 'Balanced'} destiny`,
      nodes: nodes.map((n: any) => ({ ...n, event: n.event.slice(0, 50) })),
      risks: [
        { range: 'Cycle transition years', desc: 'Stay steady during luck cycle changes — no big moves' },
        { range: 'Zodiac clash years', desc: 'Tai Sui conflict: guard against disputes' },
        { range: 'Unfavorable element years', desc: 'Defend rather than expand' },
      ],
      leverage: [
        { title: tiaohouGan ? `${tiaohouGan}'s Power` : 'Chart Strengths', desc: tiaohouGan ? `Use ${tiaohouGan} affinity in career and life` : 'Align with favorable elements' },
        { title: mainStars ? mainStars.slice(0, 20) : 'Self Palace', desc: 'Develop natural talents in strongest domain' },
      ],
      advice: [
        'Make big decisions in favorable element years',
        `Develop in ${tiaohouGan || 'favorable'} directions`,
        'Regular checkups — monitor weak points',
        'Build steadily — avoid reckless gambles',
      ],
    },
    confidence: {
      bazi_level: 'Medium', bazi_score: '0.60',
      ziwei_level: 'Medium', ziwei_score: '0.60',
      consistency_level: 'Medium', consistency_score: '0.60',
      stability_level: 'Medium', stability_score: '0.60',
      note: 'Auto-generated from algorithm layer. Medium confidence.',
    },
  };
}
