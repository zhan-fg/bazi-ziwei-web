"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

type TabType = "poster" | "bazi" | "ziwei" | "combined";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("poster");
  const [posterHTML, setPosterHTML] = useState("");
  const [llmText, setLlmText] = useState<Record<string, string>>({});
  const [llmLoading, setLlmLoading] = useState<Record<string, boolean>>({});
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/reading?id=${id}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load");
        return d;
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
        // Load poster
        fetch(`/api/poster-image?id=${id}`)
          .then(async (r) => { if (r.ok) setPosterHTML(await r.text()); })
          .catch(() => {});
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  const runLLM = async (type: string) => {
    setLlmLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch(`/api/analyze?id=${id}&type=${type}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Analysis failed");
      setLlmText((prev) => ({ ...prev, [type]: d.analysis }));
    } catch (err: any) {
      setLlmText((prev) => ({ ...prev, [type]: `Error: ${err.message}` }));
    } finally {
      setLlmLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleDownloadPNG = async () => {
    if (!posterRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(posterRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `bazi-ziwei-chart-${id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) return <LoadingSpinner message="Loading your destiny chart..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline">Back to Home</Link>
      </main>
    );
  }

  const chart = data?.chart;
  const bz = chart?.bazi;
  const zw = chart?.ziwei;
  const bi = data?.birthInfo;
  const dayunCurrent = (bz?.dayun || []).find((d: any) => {
    const age = new Date().getFullYear() - bi.year + 1;
    return d.startAge <= age && age <= (d.endAge || d.startAge + 9);
  });

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "poster", label: "Poster", icon: "🎴" },
    { key: "bazi", label: "Bazi", icon: "☯" },
    { key: "ziwei", label: "Ziwei", icon: "⭐" },
    { key: "combined", label: "Synthesis", icon: "🔮" },
  ];

  return (
    <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← New Reading
        </Link>
        <div className="text-sm text-stone-500">
          {bi?.gender === 'male' ? 'Male' : 'Female'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key !== "poster" && !llmText[t.key] && !llmLoading[t.key]) runLLM(t.key);
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 ${
              activeTab === t.key
                ? "bg-white text-stone-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "poster" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-3">
            <button onClick={handleDownloadPNG}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Download PNG
            </button>
          </div>
          {posterHTML ? (
            <div ref={posterRef} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-lg"
              dangerouslySetInnerHTML={{ __html: posterHTML }} />
          ) : (
            <p className="text-stone-400 text-center py-12">Loading poster...</p>
          )}
        </div>
      )}

      {activeTab !== "poster" && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 min-h-[400px]">
          {llmLoading[activeTab] ? (
            <div className="flex items-center gap-3 text-stone-500 py-12 justify-center">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating {activeTab === "bazi" ? "Bazi" : activeTab === "ziwei" ? "Ziwei" : "combined"} analysis...
            </div>
          ) : llmText[activeTab] ? (
            <div className="prose prose-stone max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {llmText[activeTab]}
            </div>
          ) : (
            <p className="text-stone-400 text-center py-12">Analysis will appear here.</p>
          )}
        </div>
      )}

      {/* Quick facts row */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Day Master", `${bz?.dayMaster} Earth`],
          ["Structure", data?.chart?.bazi?.enrichment?.['格局']?.primary || '-'],
          ["Self Palace", zw?.gongs?.[0]?.mainStars?.join('·') || '-'],
          ["Current Cycle", dayunCurrent ? `${dayunCurrent.ganZhi.gan}${dayunCurrent.ganZhi.zhi}` : '-'],
        ].map(([label, val]) => (
          <div key={label} className="bg-stone-50 rounded-lg p-3 text-center">
            <div className="text-xs text-stone-400 mb-0.5">{label}</div>
            <div className="text-sm font-semibold text-stone-800">{val}</div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only · Not professional advice
      </p>
    </main>
  );
}
