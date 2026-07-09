"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { marked } from "marked";

function parseMarkdown(text: string): string {
  return marked.parse(text, { breaks: true }) as string;
}

const GUMROAD_PRODUCT_URL = process.env.NEXT_PUBLIC_GUMROAD_URL || "https://zhanqiuhui.gumroad.com/l/pyzrg";
const GUMROAD_PRICE = process.env.NEXT_PUBLIC_GUMROAD_PRICE || "$4.99";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [posterHTML, setPosterHTML] = useState("");

  // Payment flow state
  const [phase, setPhase] = useState<"init" | "manual" | "claiming" | "unlocked" | "generating" | "done">(
    "init"
  );
  const [email, setEmail] = useState("");
  const [claimError, setClaimError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisSource, setAnalysisSource] = useState("");


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
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Load poster
  useEffect(() => {
    if (!data) return;
    fetch(`/api/poster-image?id=${id}`)
      .then(async (r) => { if (r.ok) setPosterHTML(await r.text()); })
      .catch(() => {});
  }, [data, id]);



  // Check if already unlocked from localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const unlocked = JSON.parse(localStorage.getItem("bazi-unlocked") || "[]");
      if (unlocked.includes(id)) {
        setPhase("unlocked");
      }
    } catch {}
  }, [id]);

  // ─── Payment flow ───────────────────────────────────────

  // Step 1: Open Gumroad → go straight to email input
  const startPayment = () => {
    setClaimError("");
    const gumroadUrl = `${GUMROAD_PRODUCT_URL}?wanted=true`;
    window.open(gumroadUrl, "_blank", "noopener,noreferrer");
    setPhase("manual");
  };

  // Step 2: Verify purchase via email (queries shared processed_sales table)
  const handleManualClaim = async () => {
    if (!email.trim() || !email.includes("@")) {
      setClaimError("Please enter a valid email address");
      return;
    }

    setPhase("claiming");
    setClaimError("");

    try {
      const res = await fetch("/api/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), chartId: id }),
      });

      const d = await res.json();

      if (res.ok && d.verified) {
        // Save to localStorage
        try {
          const unlocked = JSON.parse(localStorage.getItem("bazi-unlocked") || "[]");
          if (!unlocked.includes(id)) {
            unlocked.push(id);
            localStorage.setItem("bazi-unlocked", JSON.stringify(unlocked));
          }
        } catch {}

        onUnlocked(email.trim());
      } else {
        setClaimError(d.error || "No purchase found. Use the same email as your Gumroad purchase.");
        setPhase("manual");
      }
    } catch {
      setClaimError("Network error. Please try again.");
      setPhase("manual");
    }
  };

  // ─── After unlock: generate reading ─────────────────────

  const onUnlocked = useCallback((userEmail: string) => {
    setPhase("generating");
    generateReading(userEmail);
  }, [id, email]);

  const generateReading = async (userEmail: string) => {
    try {
      const savedEmail = userEmail || email || "";
      const res = await fetch("/api/generate-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartId: id,
          email: savedEmail,
          chartText: data?.chartText,
          chart: data?.chart,
          birthInfo: data?.birthInfo,
        }),
      });

      const d = await res.json();

      if (res.ok && d.analysis) {
        setAnalysis(d.analysis);
        setAnalysisSource(d.source || "deepseek");
      } else {
        setAnalysis(`Error: ${d.error || "Failed to generate reading"}`);
        setAnalysisSource("error");
      }
    } catch (err: any) {
      setAnalysis(`Error: ${err.message}`);
      setAnalysisSource("error");
    } finally {
      setPhase("done");
    }
  };

  // ─── Download poster ────────────────────────────────────

  const handleDownload = () => {
    if (!posterHTML) return;
    const blob = new Blob([posterHTML], { type: "text/html" });
    const a = document.createElement("a");
    a.download = `bazi-ziwei-chart-${id}.html`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ─── Render ─────────────────────────────────────────────

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
      {/* Header */}
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

      {/* Reading section */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Email input */}
        {(phase === "manual" || phase === "claiming") && (
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-stone-800">Unlock Your Full Reading</h2>
            <p className="text-stone-500 text-sm">
              Enter the email you used on Gumroad to verify your purchase
            </p>
            {claimError && (
              <p className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">{claimError}</p>
            )}
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualClaim()}
                placeholder="you@email.com"
                disabled={phase === "claiming"}
                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                autoFocus
              />
              <button
                onClick={handleManualClaim}
                disabled={phase === "claiming" || !email.trim()}
                className="px-6 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition"
              >
                {phase === "claiming" ? "..." : "Unlock"}
              </button>
            </div>
          </div>
        )}

        {/* Generating reading */}
        {phase === "generating" && (
          <div className="text-center py-12 space-y-4">
            <svg className="animate-spin h-8 w-8 text-amber-600 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-stone-700 font-medium">Generating your complete reading...</p>
            <p className="text-stone-400 text-sm">DeepSeek AI is analyzing your BaZi and Ziwei chart</p>
          </div>
        )}

        {/* Done — show analysis */}
        {phase === "done" && analysis && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-800">Your Complete Reading</h2>
            </div>
            <div
              className="prose prose-stone max-w-none text-sm leading-relaxed bg-white rounded-xl border border-stone-200 p-6"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }}
            />
          </div>
        )}

        {/* Done — error */}
        {phase === "done" && analysisSource === "error" && (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm">{analysis}</p>
            <button
              onClick={() => { setPhase("generating"); generateReading(email || ""); }}
              className="mt-4 text-amber-600 hover:text-amber-700 text-sm underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Initial CTA */}
        {(phase === "init") && (
          <div className="text-center space-y-3">
            <h2 className="text-lg font-semibold text-stone-800">
              Unlock Your Complete Reading
            </h2>
            <p className="text-stone-500 text-sm max-w-sm mx-auto">
              Get a full BaZi + Ziwei analysis powered by DeepSeek AI —
              career, wealth, relationships, health, and life guidance.
            </p>
            {claimError && (
              <p className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">{claimError}</p>
            )}
            <button
              onClick={startPayment}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200"
            >
              Unlock Full Reading · {GUMROAD_PRICE}
            </button>
            <p className="text-xs text-stone-400">
              One-time purchase · Secured by Gumroad · Opens in new tab
            </p>
          </div>
        )}

        {/* Already unlocked CTA */}
        {(phase === "unlocked") && (
          <div className="text-center space-y-3">
            <button
              onClick={() => { setPhase("generating"); generateReading(email || ""); }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200"
            >
              Generate Full Reading
            </button>
            <p className="text-xs text-stone-400">Already unlocked · No additional charge</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only · Not professional advice
      </p>
    </main>
  );
}
