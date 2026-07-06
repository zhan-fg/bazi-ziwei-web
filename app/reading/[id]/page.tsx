"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-stone-500 text-sm">{label}</span>
      <span className="text-stone-800 text-sm font-medium">{value || "-"}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <h2 className="text-base font-semibold text-stone-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function ReadingPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [llmType, setLlmType] = useState<'bazi' | 'ziwei' | 'combined' | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmText, setLlmText] = useState('');
  const [llmError, setLlmError] = useState('');

  const runLLM = async (type: 'bazi' | 'ziwei' | 'combined') => {
    setLlmType(type);
    setLlmLoading(true);
    setLlmError('');
    setLlmText('');
    try {
      const res = await fetch(`/api/analyze?id=${id}&type=${type}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Analysis failed');
      setLlmText(d.analysis);
    } catch (err: any) {
      setLlmError(err.message);
    } finally {
      setLlmLoading(false);
    }
  };

  useEffect(() => {
    fetch(`/api/reading?id=${id}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || d.message || `Server error (${res.status})`);
        return d;
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <LoadingSpinner message="加载命盘数据..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline">返回首页</Link>
      </main>
    );
  }

  const chart = data?.chart;
  const bz = chart?.bazi;
  const zw = chart?.ziwei;
  const bi = data?.birthInfo;
  const en = bz?.enrichment;

  const dayunCurrent = (bz?.dayun || []).find((d: any) => {
    const age = new Date().getFullYear() - bi.year + 1;
    return d.startAge <= age && age <= (d.endAge || d.startAge + 9);
  });

  const mingGong = zw?.gongs?.[0];
  const shenGongIdx = zw?.shenGongIndex;
  const shenGong = zw?.gongs?.find((g: any) =>
    g.dizhi === ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][shenGongIdx]
  );

  const allSihua = zw?.gongs?.flatMap((g: any) => (g.sihua || []).map((s: any) => `${s.star}${s.hua}`)) || [];

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← 返回首页
        </Link>
        <Link
          href={`/poster/${id}`}
          className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          查看英文海报
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">命盘解读</h1>
        <p className="text-stone-500 text-sm">
          {bi?.gender === 'male' ? '男' : '女'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')} · {bi?.isLunar ? '农历' : '公历'}
        </p>
      </div>

      {/* Overview */}
      <Card title="命局总览">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs text-stone-400 uppercase tracking-wide mb-2">八字</h3>
            <div className="space-y-0.5">
              <InfoRow label="格局" value={en?.['格局']?.primary || '-'} />
              <InfoRow label="日主" value={`${bz?.dayMaster}土` || '-'} />
              <InfoRow label="旺衰" value={`${en?.['旺衰']?.verdict || '-'} (${en?.['旺衰']?.score ?? '-'})`} />
              <InfoRow label="调候" value={(en?.['调候用神'] || []).join('、') || '-'} />
              <InfoRow label="四柱" value={`${bz?.siZhu?.year.gan}${bz?.siZhu?.year.zhi} ${bz?.siZhu?.month.gan}${bz?.siZhu?.month.zhi} ${bz?.siZhu?.day.gan}${bz?.siZhu?.day.zhi} ${bz?.siZhu?.hour.gan}${bz?.siZhu?.hour.zhi}`} />
            </div>
          </div>
          <div>
            <h3 className="text-xs text-stone-400 uppercase tracking-wide mb-2">紫微</h3>
            <div className="space-y-0.5">
              <InfoRow label="命宫" value={`${mingGong?.dizhi} · ${(mingGong?.mainStars || []).join('·') || '无主星'}`} />
              <InfoRow label="身宫" value={`${shenGong?.gong || ''} · ${(shenGong?.mainStars || []).join('·') || '-'}`} />
              <InfoRow label="五行局" value={zw?.wuXingJu?.name || '-'} />
              <InfoRow label="生年四化" value={allSihua.join(' · ') || '-'} />
              <InfoRow label="阴阳" value={zw?.yinYang || '-'} />
            </div>
          </div>
        </div>
      </Card>

      {/* Current Dayun */}
      {dayunCurrent && (
        <Card title="当前大运">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-amber-700">
              {dayunCurrent.ganZhi.gan}{dayunCurrent.ganZhi.zhi}
            </span>
            <span className="text-stone-500 text-sm">
              {dayunCurrent.startYear}-{dayunCurrent.endYear} · {dayunCurrent.ganShiShen}/{dayunCurrent.zhiShiShen}
            </span>
          </div>
          <p className="text-stone-600 text-sm">
            此运{dayunCurrent.ganShiShen?.includes('印') ? '学习成长黄金期，借平台之力攀升' :
              dayunCurrent.ganShiShen?.includes('财') ? '财富积累期，开源节流并重' :
              dayunCurrent.ganShiShen?.includes('官') || dayunCurrent.ganShiShen?.includes('杀') ? '压力与机遇并存，化压力为动力' :
              '人生转折阶段，顺势而为'}
          </p>
        </Card>
      )}

      {/* 12 Gongs */}
      <Card title="紫微十二宫">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(zw?.gongs || []).map((g: any) => (
            <div key={g.gong} className="bg-stone-50 rounded-lg p-3 text-sm">
              <div className="text-stone-400 text-xs mb-1">{g.tiangan}{g.dizhi} · {g.gong}</div>
              <div className="font-medium text-stone-800">
                {g.mainStars?.length > 0 ? g.mainStars.join('·') : '无主星'}
              </div>
              {g.auxStars?.length > 0 && (
                <div className="text-stone-500 text-xs mt-0.5">{g.auxStars.join('·')}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Bazi Dayun */}
      <Card title="八字大运">
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {(bz?.dayun || []).slice(0, 10).map((d: any) => {
              const currentAge = new Date().getFullYear() - bi.year + 1;
              const active = d.startAge <= currentAge && currentAge <= (d.endAge || d.startAge + 9);
              return (
                <div
                  key={d.startYear}
                  className={`rounded-lg px-3 py-2 text-center min-w-[72px] ${
                    active ? 'bg-amber-100 border border-amber-300' : 'bg-stone-50'
                  }`}
                >
                  <div className="text-xs text-stone-400">{d.startAge}-{d.endAge || d.startAge + 9}岁</div>
                  <div className={`text-sm font-bold ${active ? 'text-amber-800' : 'text-stone-700'}`}>
                    {d.ganZhi.gan}{d.ganZhi.zhi}
                  </div>
                  <div className="text-xs text-stone-400">{d.ganShiShen}/{d.zhiShiShen}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* LLM Analysis */}
      <Card title="AI 深度解读">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => runLLM('bazi')}
            disabled={llmLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              llmLoading && llmType === 'bazi'
                ? 'bg-amber-200 text-amber-700 cursor-wait'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {llmLoading && llmType === 'bazi' ? '生成中...' : '八字解读'}
          </button>
          <button
            onClick={() => runLLM('ziwei')}
            disabled={llmLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              llmLoading && llmType === 'ziwei'
                ? 'bg-purple-200 text-purple-700 cursor-wait'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {llmLoading && llmType === 'ziwei' ? '生成中...' : '紫微解读'}
          </button>
          <button
            onClick={() => runLLM('combined')}
            disabled={llmLoading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              llmLoading && llmType === 'combined'
                ? 'bg-stone-200 text-stone-700 cursor-wait'
                : 'bg-stone-700 text-white hover:bg-stone-800'
            }`}
          >
            {llmLoading && llmType === 'combined' ? '生成中...' : '综合印证'}
          </button>
        </div>

        {llmError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {llmError}
          </div>
        )}

        {llmLoading && (
          <div className="flex items-center gap-3 text-stone-500 py-4">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI 正在生成{llmType === 'bazi' ? '八字' : llmType === 'ziwei' ? '紫微' : '综合'}解读，请稍候...
          </div>
        )}

        {llmText && (
          <div className="prose prose-stone max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {llmText}
          </div>
        )}

        {!llmText && !llmLoading && !llmError && (
          <p className="text-stone-400 text-sm">
            点击上方按钮，AI 将根据命盘数据为你生成深度解读报告（需配置 LLM_API_KEY）。
          </p>
        )}
      </Card>

      {/* Raw text toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-stone-400 hover:text-stone-600 text-xs underline"
        >
          {showRaw ? '收起原始命盘' : '查看原始命盘数据'}
        </button>
      </div>

      {showRaw && (
        <pre className="bg-stone-900 text-stone-200 p-6 rounded-xl text-xs leading-relaxed overflow-x-auto whitespace-pre font-mono">
          {data?.chartText || '暂无数据'}
        </pre>
      )}

      {/* Footer */}
      <div className="text-center pt-4">
        <Link href="/" className="text-amber-600 hover:underline text-sm">
          为新用户生成命盘 →
        </Link>
      </div>

      <p className="text-center text-xs text-stone-400 pt-4 pb-8">
        本命盘由算法层（Yiqi + enrichBazi）自动生成 · 仅供文化研究与娱乐参考
      </p>
    </main>
  );
}
