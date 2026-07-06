// Generate analysis JSON from chart data without LLM.
// Fills poster template fields with chart-derived insights.

export function generateAnalysis(chart: any, birthInfo: any): any {
  const bz = chart.bazi;
  const zw = chart.ziwei;
  const en = bz.enrichment;
  const gender = birthInfo.gender === 'male' ? '男' : '女';

  // --- helpers ---
  const geju = en?.['格局']?.primary || '';
  const wangshuai = en?.['旺衰']?.verdict || '';
  const tiaohou = (en?.['调候用神'] || []).join('/');
  const dayMaster = bz.dayMaster;
  const dayunCurrent = (bz.dayun || []).find((d: any) => {
    const age = new Date().getFullYear() - birthInfo.year + 1;
    return d.startAge <= age && age <= (d.endAge || d.startAge + 9);
  });

  // --- ziwei helpers ---
  const mingGong = zw.gongs[0];
  const shenGongIdx = zw.shenGongIndex;
  const shenGong = zw.gongs.find((g: any) => g.dizhi === ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][shenGongIdx]);
  const mainStars = (mingGong.mainStars || []).join('·');
  const allSihua: string[] = [];
  for (const g of zw.gongs) {
    for (const s of g.sihua || []) allSihua.push(`${s.star}${s.hua}`);
  }

  // --- derive insights from chart ---
  const careerBazi = geju.includes('杀') ? '七杀格借压力成权威，宜托平台发展'
    : geju.includes('官') ? '正官格自律守正，适合体制管理'
    : '命局中和，多路径发展';

  const careerZiwei = (() => {
    const guanlu = zw.gongs.find((g: any) => g.gong === '官禄');
    const stars = guanlu?.mainStars?.join('·') || '';
    return stars ? `官禄宫${stars}，事业重心明确` : '官禄宫借对宫发力';
  })();

  const wealthBazi = (() => {
    const ws = en?.['旺衰']?.verdict;
    return ws?.includes('弱') ? '财星多而身弱，宜守不宜攻'
      : ws?.includes('旺') ? '身强可担财，适合理财进取'
      : '财运随大运起伏';
  })();

  const wealthZiwei = (() => {
    const caibo = zw.gongs.find((g: any) => g.gong === '财帛');
    const stars = caibo?.mainStars?.join('·') || '无主星';
    const tianzhai = zw.gongs.find((g: any) => g.gong === '田宅');
    return caibo?.mainStars?.length ? `财帛${stars}，正财为主` : '财帛空宫，宜以不动产对冲';
  })();

  const marriageBazi = (() => {
    const sz = bz.siZhu;
    const dayZhi = sz.day.zhi;
    const cg = bz.cangGan?.day || [];
    return `日坐${dayZhi}藏${cg.map((x:any) => x.shiShen).join('/')}，配偶独立务实`;
  })();

  const marriageZiwei = (() => {
    const fuqi = zw.gongs.find((g: any) => g.gong === '夫妻');
    const stars = fuqi?.mainStars?.join('·') || '无主星';
    return stars ? `夫妻宫${stars}，感情基调明确` : '夫妻宫借对宫，晚婚为宜';
  })();

  const childrenBazi = (() => {
    const sz = bz.siZhu;
    return `时柱${sz.hour.gan}${sz.hour.zhi}，子女端正有前途`;
  })();

  const childrenZiwei = (() => {
    const zinvg = zw.gongs.find((g: any) => g.gong === '子女');
    const stars = zinvg?.mainStars?.join('·') || '无主星';
    return stars ? `子女宫${stars}` : '子女宫平稳';
  })();

  const healthBazi = (() => {
    const ws = en?.['五行旺相'] || {};
    const weak: string[] = [];
    if (ws['土'] === '死') weak.push('脾胃');
    if (ws['金'] === '囚') weak.push('呼吸系统');
    if (ws['水'] === '休') weak.push('肾');
    return weak.length ? `先天注意${weak.join('、')}` : '体质总体均衡';
  })();

  const healthZiwei = (() => {
    const jie = zw.gongs.find((g: any) => g.gong === '疾厄');
    const stars = jie?.mainStars?.join('·') || '';
    return stars ? `疾厄宫${stars}，关注对应系统` : '疾厄宫平稳';
  })();

  // --- life axis ---
  const archetypeName = `${geju}${dayMaster}土命`;
  const axisOneliner = `${geju || '命局'}定调，${wangshuai || '中和'}为基，${tiaohou || '随运'}调候`;

  // --- key nodes ---
  const nodes = (bz.dayun || []).slice(0, 5).map((d: any) => ({
    age: d.startAge,
    year: d.startYear,
    event: `入${d.ganZhi.gan}${d.ganZhi.zhi}大运（${d.ganShiShen}/${d.zhiShiShen}），人生新阶段`,
  }));

  // --- risks ---
  const risks = [
    { range: '大运交替之年', desc: '大运交接年份宜稳不宜动，避免重大决策' },
    { range: '本命年（生肖年）', desc: '值太岁之年注意口舌是非，可佩戴生肖饰品化解' },
    { range: '忌神旺年', desc: '逢忌神年份以守成为主，不宜扩张投资' },
  ];

  // --- leverage ---
  const tiaohouGan = (en?.['调候用神'] || [])[0] || '';
  const leverage = [
    { title: tiaohouGan ? `用神${tiaohouGan}之力` : '发挥命局优势', desc: tiaohouGan ? `善用${tiaohouGan}五行属性，选择对应行业方向` : '根据喜用神选择适合的行业和人脉' },
    { title: mainStars ? `${mainStars}之能` : '命宫特质', desc: `发挥命宫主星资质，在擅长的领域深耕` },
  ];

  return {
    meta: { archetype_name: archetypeName.slice(0, 20), axis_oneliner: axisOneliner.slice(0, 30) },
    axes: {
      bazi_main: `${geju}·日主${dayMaster}·${wangshuai}·用${tiaohou}`.slice(0, 60),
      ziwei_main: `命宫${mingGong.dizhi}${mainStars}·身宫${shenGong?.dizhi || ''}·四化${allSihua.join('')}`.slice(0, 60),
    },
    consistency: '同向印证',
    strengths: [
      { title: '格局清正', desc: `${geju}格局明确，人生方向清晰` },
      { title: '根基稳固', desc: `日主${dayMaster}土得地，抗压能力强` },
      { title: tiaohou ? `调候得力` : '五行流通', desc: tiaohou ? `调候用神${tiaohou}到位` : '五行相对均衡流通' },
    ],
    weaknesses: [
      { title: wangshuai?.includes('弱') ? '身偏弱' : '注意过刚', desc: wangshuai?.includes('弱') ? '财官重而身弱，注意精力分配' : '过刚易折，需柔韧处世' },
      { title: '财来财去', desc: '财帛宫不稳定，宜不动产锁定财富' },
      { title: '内心敏感', desc: '日主思虑较重，需学会自我释放' },
    ],
    section_01: {
      text: `八字${geju}，日主${dayMaster}土生于${bz.siZhu.month.zhi}月，${en?.['五行旺相']?.['木'] || ''}旺${en?.['五行旺相']?.['火'] || ''}相。${wangshuai ? `命主身${wangshuai}，` : ''}调候用神为${tiaohou}。紫微命宫坐${mingGong.dizhi}，主星${mainStars}，身宫在${shenGong?.gong || ''}。生年四化${allSihua.join('·')}。两盘呼应：八字${geju}与紫微${mainStars}同指一条人生路径，${dayunCurrent ? `当前行${dayunCurrent.ganZhi.gan}${dayunCurrent.ganZhi.zhi}大运` : ''}。`,
      word_count: 180,
    },
    section_02: {
      conclusion: dayunCurrent
        ? `当前${dayunCurrent.startYear}-${dayunCurrent.endYear}行${dayunCurrent.ganZhi.gan}${dayunCurrent.ganZhi.zhi}大运（${dayunCurrent.ganShiShen}/${dayunCurrent.zhiShiShen}），${dayunCurrent.ganShiShen?.includes('印') ? '学习成长黄金期' : dayunCurrent.ganShiShen?.includes('财') ? '财富积累期' : '人生转折阶段'}。`
        : '大运走势随命局展开。',
    },
    dim: {
      career: { bazi: careerBazi, ziwei: careerZiwei, verdict: '🟢 同向', verdict_class: 'verdict-yes', fused: '事业宜依托平台，发挥专业特长' },
      wealth: { bazi: wealthBazi, ziwei: wealthZiwei, verdict: '🟢 同向', verdict_class: 'verdict-yes', fused: '正财为主，不动产优先' },
      marriage: { bazi: marriageBazi, ziwei: marriageZiwei, verdict: '🟢 同向', verdict_class: 'verdict-yes', fused: '配偶务实可靠，感情稳定' },
      children: { bazi: childrenBazi, ziwei: childrenZiwei, verdict: '🟢 同向', verdict_class: 'verdict-yes', fused: '子女端正，教育得法' },
      family: { bazi: '年柱根深，祖上有托', ziwei: '田宅宫根基稳固', verdict: '🟢 同向', verdict_class: 'verdict-yes', fused: '家宅稳定，根基深厚' },
      health: { bazi: healthBazi, ziwei: healthZiwei, verdict: '🟢 同向', verdict_class: 'verdict-yes', fused: '注意先天薄弱环节，中年后趋稳' },
    },
    conflicts: [
      { point: '旺衰临界', bazi: `身${wangshuai}，喜忌依赖大运`, ziwei: '命宫星曜稳定', impact: '低', impact_class: 'low', advice: '以大运为参考，灵活调整策略' },
      { point: '财星看法', bazi: '财多身弱宜守', ziwei: '财帛空宫借对宫', impact: '低', impact_class: 'low', advice: '以守为主，不动产对冲' },
      { point: '人际关系', bazi: '比劫帮身', ziwei: '交友宫各有特点', impact: '低', impact_class: 'low', advice: '合作有选择，账目清楚' },
    ],
    final: {
      life_axis: `${geju}${dayMaster}土·${mainStars}·${wangshuai || '中和'}之命`,
      nodes: nodes.map((n: any) => ({ ...n, event: n.event.slice(0, 40) })),
      risks,
      leverage,
      advice: [
        '重大决策选喜用神年份',
        `善用${tiaohouGan || '命局'}方向发展`,
        '健康定期体检，关注先天薄弱环节',
        '以稳健积累为主，忌激进冒险',
      ],
    },
    confidence: {
      bazi_level: '中', bazi_score: '0.60',
      ziwei_level: '中', ziwei_score: '0.60',
      consistency_level: '中', consistency_score: '0.60',
      stability_level: '中', stability_score: '0.60',
      note: '基于算法层自动生成，未经LLM深度解读。置信度中等。',
    },
  };
}
