"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { tGan, tZhi, tStar, tGeju, tGanElement } from "@/lib/glossary";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paid = searchParams.get("paid");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [posterHTML, setPosterHTML] = useState("");
  const [posterImg, setPosterImg] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(!!paid);
  const posterContainerRef = useRef<HTMLDivElement>(null);

  // Load chart data
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
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  // Load poster HTML → render to image
  useEffect(() => {
    if (!data) return;
    fetch(`/api/poster-image?id=${id}`)
      .then(async (r) => { if (r.ok) setPosterHTML(await r.text()); })
      .catch(() => {});
  }, [data]);

  // Convert poster HTML to image once loaded
  useEffect(() => {
    if (!posterHTML || !posterContainerRef.current || posterImg) return;
    const el = posterContainerRef.current;
    // Inject hidden iframe to render, then capture
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;left:-9999px;width:1200px;height:1600px;border:none";
    iframe.srcdoc = posterHTML;
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const canvas = await html2canvas(doc.body, {
          scale: 2,
          backgroundColor: "#ffffff",
          width: 1200,
          height: doc.body.scrollHeight || 1600,
        });
        setPosterImg(canvas.toDataURL("image/png"));
      } finally {
        document.body.removeChild(iframe);
      }
    };
  }, [posterHTML, posterImg]);

  // Auto-unlock if coming from Stripe
  useEffect(() => {
    if (paid && !analysis && !analysisLoading) {
      runAnalysis();
    }
  }, [paid]);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setUnlocked(true);
    try {
      const res = await fetch(`/api/analyze?id=${id}&type=combined`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Analysis failed");
      setAnalysis(d.analysis);
    } catch (err: any) {
      setAnalysis(`Error: ${err.message}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handlePay = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: id }),
      });
      const d = await res.json();
      if (d.url) window.open(d.url, "_blank");
      else throw new Error(d.error || "Payment failed");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleManualUnlock = () => {
    setUnlocked(true);
    if (!analysis && !analysisLoading) runAnalysis();
  };

  const handleDownload = () => {
    if (!posterImg) return;
    const a = document.createElement("a");
    a.download = `bazi-ziwei-chart-${id}.png`;
    a.href = posterImg;
    a.click();
  };

  if (loading) return <LoadingSpinner message="Generating your chart..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline">Back</Link>
      </main>
    );
  }

  const chart = data?.chart;
  const bi = data?.birthInfo;
  const bz = chart?.bazi;
  const zw = chart?.ziwei;

  return (
    <main className="flex-1 w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← New Reading
        </Link>
        <div className="text-xs text-stone-400">
          {bi?.gender === 'male' ? 'Male' : 'Female'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')}
        </div>
        <div className="w-20" />
      </div>

      {/* Poster image — zoomable on mobile */}
      <div className="relative bg-stone-100">
        {posterImg && (
          <button
            onClick={handleDownload}
            className="absolute top-3 right-3 z-10 bg-stone-800/80 hover:bg-stone-900 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition"
          >
            ↓ Save
          </button>
        )}
        {/* Hidden div for html2canvas rendering */}
        <div
          ref={posterContainerRef}
          className="absolute left-[-9999px] top-0 w-[1200px]"
          dangerouslySetInnerHTML={{ __html: posterHTML }}
        />

        {posterImg ? (
          <div className="overflow-auto touch-pan-x touch-pan-y" style={{ maxHeight: "calc(100vh - 120px)" }}>
            <img
              src={posterImg}
              alt="Bazi & Ziwei Chart"
              className="block mx-auto"
              style={{ minWidth: "100%", maxWidth: "1200px" }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-stone-400">
            Loading poster...
          </div>
        )}
      </div>

      {/* Analysis section */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {!unlocked ? (
          <div className="text-center space-y-3">
            <button
              onClick={handlePay}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200"
            >
              Unlock Professional Analysis · $1.99
            </button>
            <p className="text-xs text-stone-400">
              Secure payment via Gumroad
            </p>
            <div className="pt-2 border-t border-stone-100">
              <p className="text-xs text-stone-300 mb-2">Already paid?</p>
              <button
                onClick={handleManualUnlock}
                className="text-amber-600 hover:text-amber-700 text-sm underline font-medium"
              >
                I've paid — unlock now
              </button>
            </div>
          </div>
        ) : analysisLoading ? (
          <div className="flex items-center gap-3 text-stone-500 py-12 justify-center">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating your reading...
          </div>
        ) : analysis ? (
          <div className="prose prose-stone max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {analysis}
          </div>
        ) : null}

        {/* Quick facts */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[
            ["Day Master", `${tGan(bz?.dayMaster)} ${tGanElement(bz?.dayMaster) || 'Earth'}`],
            ["Structure", tGeju(chart?.bazi?.enrichment?.['格局']?.primary) || '-'],
            ["Self Palace", (zw?.gongs?.[0]?.mainStars || []).map(tStar).join(' · ') || '-'],
            ["Current Cycle", (() => {
              const d = (bz?.dayun || []).find((d: any) => {
                const age = new Date().getFullYear() - bi.year + 1;
                return d.startAge <= age && age <= (d.endAge || d.startAge + 9);
              });
              return d ? `${tGan(d.ganZhi.gan)} ${tZhi(d.ganZhi.zhi)}` : '-';
            })()],
          ].map(([label, val]) => (
            <div key={label} className="bg-stone-50 rounded-lg p-3 text-center">
              <div className="text-xs text-stone-400 mb-0.5">{label}</div>
              <div className="text-sm font-semibold text-stone-800">{val}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only · Not professional advice
      </p>
    </main>
  );
}
