"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paid = searchParams.get("paid");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [posterHTML, setPosterHTML] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(!!paid);

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

  useEffect(() => {
    if (!data) return;
    fetch(`/api/poster-image?id=${id}`)
      .then(async (r) => { if (r.ok) setPosterHTML(await r.text()); })
      .catch(() => {});
  }, [data]);

  useEffect(() => {
    if (paid && !analysis && !analysisLoading) {
      runAnalysis();
    }
  }, [paid]);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setUnlocked(true);
    // Step 1: fast chart-derived analysis (always works)
    try {
      const r1 = await fetch(`/api/analysis-text?id=${id}`);
      const d1 = await r1.json();
      if (r1.ok && d1.analysis) {
        setAnalysis(d1.analysis);
        setAnalysisLoading(false);
        // Step 2: try LLM in background for richer content
        fetch(`/api/analyze?id=${id}&type=combined`)
          .then(async (r2) => {
            if (r2.ok) {
              const d2 = await r2.json();
              if (d2.analysis) setAnalysis(d2.analysis);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setAnalysis(`Error: ${err.message}`);
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
    if (!posterHTML) return;
    const blob = new Blob([posterHTML], { type: "text/html" });
    const a = document.createElement("a");
    a.download = `bazi-ziwei-chart-${id}.html`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
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

  const bi = data?.birthInfo;

  return (
    <main className="flex-1 w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← New Reading
        </Link>
        <div className="text-xs text-stone-400">
          {bi?.gender === 'male' ? 'Male' : 'Female'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')}
        </div>
        <div className="w-20" />
      </div>

      {/* Poster as HTML iframe */}
      <div className="relative bg-stone-100">
        {posterHTML && (
          <button
            onClick={handleDownload}
            className="absolute top-3 right-3 z-10 bg-stone-800/80 hover:bg-stone-900 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition"
          >
            ↓ Save
          </button>
        )}
        {posterHTML ? (
          <iframe
            srcDoc={posterHTML}
            className="w-full border-none"
            style={{ height: "calc(100vh - 60px)", minHeight: "800px" }}
            title="Bazi & Ziwei Chart"
          />
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
              Opens in new tab · Pay securely via Gumroad
            </p>
            <div className="pt-2 border-t border-stone-100">
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
      </div>

      <p className="text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only · Not professional advice
      </p>
    </main>
  );
}
