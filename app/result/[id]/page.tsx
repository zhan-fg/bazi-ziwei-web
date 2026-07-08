"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [posterHTML, setPosterHTML] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // Payment flow state
  const [showPayForm, setShowPayForm] = useState(false);
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/reading?id=${id}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed to load");
        return d;
      })
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!data) return;
    fetch(`/api/poster-image?id=${id}`)
      .then(async (r) => { if (r.ok) setPosterHTML(await r.text()); })
      .catch(() => {});
  }, [data]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const r = await fetch(`/api/analysis-text?id=${id}`);
      const d = await r.json();
      if (r.ok && d.analysis) setAnalysis(d.analysis);
    } catch (err: any) {
      setAnalysis(`Error: ${err.message}`);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const startPayment = () => setShowPayForm(true);

  const handlePayAndVerify = async () => {
    if (!email.trim() || !email.includes("@")) {
      setVerifyError("Please enter a valid email address");
      return;
    }
    setVerifying(true);
    setVerifyError("");

    // Open Gumroad
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: id }),
      });
      const d = await res.json();
      if (d.url) window.open(d.url, "_blank");
    } catch { /* Gumroad opens even if this fails */ }

    // Start polling
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const r = await fetch("/api/verify-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });
        const d = await r.json();
        if (d.verified) {
          clearInterval(pollRef.current!);
          setVerifying(false);
          setUnlocked(true);
          runAnalysis();
        }
      } catch { /* keep polling */ }

      if (attempts >= 40) { // 2 min timeout
        clearInterval(pollRef.current!);
        setVerifying(false);
        setVerifyError("Verification timed out. If you completed payment, try again or contact support.");
      }
    }, 3000);
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
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">← New Reading</Link>
        <div className="text-xs text-stone-400">
          {bi?.gender === 'male' ? 'Male' : 'Female'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')}
        </div>
        <div className="w-20" />
      </div>

      {/* Poster */}
      <div className="relative bg-stone-100">
        {posterHTML && (
          <button onClick={handleDownload}
            className="absolute top-3 right-3 z-10 bg-stone-800/80 hover:bg-stone-900 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition">
            ↓ Save
          </button>
        )}
        {posterHTML ? (
          <iframe srcDoc={posterHTML} className="w-full border-none"
            style={{ height: "calc(100vh - 60px)", minHeight: "800px" }}
            title="Bazi & Ziwei Chart" />
        ) : (
          <div className="flex items-center justify-center py-20 text-stone-400">Loading poster...</div>
        )}
      </div>

      {/* Analysis section */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {verifying ? (
          <div className="text-center py-12 space-y-4">
            <svg className="animate-spin h-8 w-8 text-amber-600 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-stone-700 font-medium">Verifying your payment...</p>
            <p className="text-stone-400 text-sm">Complete your purchase on Gumroad and this page will update automatically</p>
          </div>
        ) : verifyError ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-red-600 text-sm">{verifyError}</p>
            <button onClick={() => { setVerifyError(""); setVerifying(false); }}
              className="text-amber-600 hover:text-amber-700 text-sm underline">Try again</button>
          </div>
        ) : unlocked ? (
          analysisLoading ? (
            <div className="flex items-center gap-3 text-stone-500 py-12 justify-center">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating your reading...
            </div>
          ) : analysis ? (
            <div className="prose prose-stone max-w-none text-sm leading-relaxed whitespace-pre-wrap">{analysis}</div>
          ) : null
        ) : showPayForm ? (
          <div className="text-center space-y-4">
            <p className="text-stone-600 text-sm">Enter your email to verify purchase with Gumroad</p>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full max-w-xs px-4 py-2 border border-stone-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            {verifyError && <p className="text-red-500 text-xs">{verifyError}</p>}
            <button onClick={handlePayAndVerify}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200">
              Pay with Gumroad · $1.99
            </button>
            <p className="text-xs text-stone-400">Opens in new tab · We&apos;ll verify automatically</p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <button onClick={startPayment}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200">
              Unlock Full Reading · $1.99
            </button>
            <p className="text-xs text-stone-400">Powered by Gumroad</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only · Not professional advice
      </p>
    </main>
  );
}
