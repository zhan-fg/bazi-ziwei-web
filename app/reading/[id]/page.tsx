"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";
import {
  tPalace, tGan, tZhi, tStar, tGeju, tWangShuai, tShiShen,
  tYinYang, tWuXingJu, tSiHua,
} from "@/lib/glossary";

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

// split a 2-char ganzhi string (e.g. "癸丑") → "Gui Chou"
function fmtGanZhi(s?: string) {
  if (!s || s.length < 2) return s || "";
  return tGan(s[0]) + tZhi(s[1]);
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

  if (loading) return <LoadingSpinner message="Loading chart..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline">Back</Link>
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
  // logic reads raw Chinese dizhi (chart stays Chinese) — unchanged
  const shenGong = zw?.gongs?.find((g: any) =>
    g.dizhi === ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][shenGongIdx]
  );

  const allSihua = zw?.gongs?.flatMap((g: any) =>
    (g.sihua || []).map((s: any) => `${tStar(s.star)} ${tSiHua(s.hua)}`)
  ) || [];

  // dayun interpretation — logic on raw Chinese shishen, English output
  const dayunInterpret = (g: any) => {
    const ss = g?.ganShiShen || '';
    if (ss.includes('印')) return 'A prime period for learning and growth — leverage platforms to rise.';
    if (ss.includes('财')) return 'A wealth-building phase — balance earning with saving.';
    if (ss.includes('官') || ss.includes('杀')) return 'Pressure and opportunity coexist — turn pressure into momentum.';
    return 'A life-transition phase — go with the flow of the times.';
  };

  const fourPillars = bz?.siZhu
    ? `${fmtGanZhi(bz.siZhu.year.gan + bz.siZhu.year.zhi)} ${fmtGanZhi(bz.siZhu.month.gan + bz.siZhu.month.zhi)} ${fmtGanZhi(bz.siZhu.day.gan + bz.siZhu.day.zhi)} ${fmtGanZhi(bz.siZhu.hour.gan + bz.siZhu.hour.zhi)}`
    : '-';

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← Back
        </Link>
        <Link
          href={`/poster/${id}`}
          className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          View Poster
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Chart Reading</h1>
        <p className="text-stone-500 text-sm">
          {bi?.gender === 'male' ? 'Male' : 'Female'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')} · {bi?.isLunar ? 'Lunar' : 'Gregorian'}
        </p>
      </div>

      {/* Overview */}
      <Card title="Overview">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs text-stone-400 uppercase tracking-wide mb-2">BaZi</h3>
            <div className="space-y-0.5">
              <InfoRow label="Structure" value={tGeju(en?.['格局']?.primary) || '-'} />
              <InfoRow label="Day Master" value={`${tGan(bz?.dayMaster)} Earth` || '-'} />
              <InfoRow label="Strength" value={`${tWangShuai(en?.['旺衰']?.verdict) || '-'} (${en?.['旺衰']?.score ?? '-'})`} />
              <InfoRow label="Seasonal Need" value={(en?.['调候用神'] || []).map(tGan).join(', ') || '-'} />
              <InfoRow label="Four Pillars" value={fourPillars} />
            </div>
          </div>
          <div>
            <h3 className="text-xs text-stone-400 uppercase tracking-wide mb-2">Ziwei</h3>
            <div className="space-y-0.5">
              <InfoRow label="Life Palace" value={`${tZhi(mingGong?.dizhi)} · ${(mingGong?.mainStars || []).map(tStar).join(' · ') || 'No Major Star'}`} />
              <InfoRow label="Body Palace" value={`${tPalace(shenGong?.gong) || ''} · ${(shenGong?.mainStars || []).map(tStar).join(' · ') || '-'}`} />
              <InfoRow label="Element Frame" value={tWuXingJu(zw?.wuXingJu?.name) || '-'} />
              <InfoRow label="Annual Transformations" value={allSihua.join(' · ') || '-'} />
              <InfoRow label="Yin/Yang" value={tYinYang(zw?.yinYang) || '-'} />
            </div>
          </div>
        </div>
      </Card>

      {/* Current Dayun */}
      {dayunCurrent && (
        <Card title="Current Luck Cycle">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-amber-700">
              {tGan(dayunCurrent.ganZhi.gan)}{tZhi(dayunCurrent.ganZhi.zhi)}
            </span>
            <span className="text-stone-500 text-sm">
              {dayunCurrent.startYear}-{dayunCurrent.endYear} · {tShiShen(dayunCurrent.ganShiShen)}/{tShiShen(dayunCurrent.zhiShiShen)}
            </span>
          </div>
          <p className="text-stone-600 text-sm">
            {dayunInterpret(dayunCurrent)}
          </p>
        </Card>
      )}

      {/* 12 Gongs */}
      <Card title="Ziwei 12 Palaces">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(zw?.gongs || []).map((g: any) => (
            <div key={g.gong} className="bg-stone-50 rounded-lg p-3 text-sm">
              <div className="text-stone-400 text-xs mb-1">{tGan(g.tiangan)}{tZhi(g.dizhi)} · {tPalace(g.gong)}</div>
              <div className="font-medium text-stone-800">
                {g.mainStars?.length > 0 ? g.mainStars.map(tStar).join(' · ') : 'No Major Star'}
              </div>
              {g.auxStars?.length > 0 && (
                <div className="text-stone-500 text-xs mt-0.5">{g.auxStars.map(tStar).join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Bazi Dayun */}
      <Card title="BaZi Luck Cycles">
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
                  <div className="text-xs text-stone-400">{d.startAge}-{d.endAge || d.startAge + 9}yr</div>
                  <div className={`text-sm font-bold ${active ? 'text-amber-800' : 'text-stone-700'}`}>
                    {tGan(d.ganZhi.gan)}{tZhi(d.ganZhi.zhi)}
                  </div>
                  <div className="text-xs text-stone-400">{tShiShen(d.ganShiShen)}/{tShiShen(d.zhiShiShen)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* LLM Analysis */}
      <Card title="Professional Reading">
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
            {llmLoading && llmType === 'bazi' ? 'Generating...' : 'BaZi Analysis'}
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
            {llmLoading && llmType === 'ziwei' ? 'Generating...' : 'Ziwei Analysis'}
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
            {llmLoading && llmType === 'combined' ? 'Generating...' : 'Combined Analysis'}
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
            Generating {llmType === 'bazi' ? 'BaZi' : llmType === 'ziwei' ? 'Ziwei' : 'combined'} reading, please wait...
          </div>
        )}

        {llmText && (
          <div className="prose prose-stone max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {llmText}
          </div>
        )}

        {!llmText && !llmLoading && !llmError && (
          <p className="text-stone-400 text-sm">
            Tap a button above to generate a deep reading from your chart data (requires LLM_API_KEY).
          </p>
        )}
      </Card>

      {/* Raw text toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-stone-400 hover:text-stone-600 text-xs underline"
        >
          {showRaw ? 'Hide raw chart data' : 'Show raw chart data'}
        </button>
      </div>

      {showRaw && (
        <pre className="bg-stone-900 text-stone-200 p-6 rounded-xl text-xs leading-relaxed overflow-x-auto whitespace-pre font-mono">
          {data?.chartText || 'No data'}
        </pre>
      )}

      {/* Footer */}
      <div className="text-center pt-4">
        <Link href="/" className="text-amber-600 hover:underline text-sm">
          Generate a chart for someone new →
        </Link>
      </div>

      <p className="text-center text-xs text-stone-400 pt-4 pb-8">
        Chart auto-generated by the algorithm layer (Yiqi + enrichBaZi) · For cultural study and entertainment only
      </p>
    </main>
  );
}
