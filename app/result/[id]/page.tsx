"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

  // Flow: init → polling → manual → claiming → unlocked → generating → done
  const [phase, setPhase] = useState<"init" | "polling" | "manual" | "claiming" | "unlocked" | "generating" | "done">("init");
  const [email, setEmail] = useState("");
  const [claimError, setClaimError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [exporting, setExporting] = useState<"" | "chart" | "reading">("");
  const [pollToken, setPollToken] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 45; // 45 × 2s = 90s

  const posterFrameRef = useRef<HTMLIFrameElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);

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

  // Check if already unlocked
  useEffect(() => {
    if (!id) return;
    try {
      const unlocked = JSON.parse(localStorage.getItem("bazi-unlocked") || "[]");
      if (unlocked.includes(id)) setPhase("unlocked");
    } catch {}
  }, [id]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ─── Payment: auto (claim token polling) ────────────────

  const startPayment = async () => {
    let token = "";
    try {
      const res = await fetch("/api/init-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId: id }),
      });
      const d = await res.json();
      token = d.token;
    } catch {}

    const gumroadUrl = token
      ? `${GUMROAD_PRODUCT_URL}?claim_token=${encodeURIComponent(token)}`
      : GUMROAD_PRODUCT_URL;
    window.open(gumroadUrl, "_blank", "noopener,noreferrer");

    if (token) {
      setPollToken(token);
      setPhase("polling");
      startAutoPoll(token);
    } else {
      setPhase("manual");
    }
  };

  const startAutoPoll = (token: string) => {
    pollCountRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      pollCountRef.current++;
      try {
        const res = await fetch(`/api/claim-status?token=${encodeURIComponent(token)}`);
        const d = await res.json();

        if (d.status === "verified" || d.status === "claimed") {
          if (pollRef.current) clearInterval(pollRef.current);
          const userEmail = d.email || "";
          if (userEmail) {
            setEmail(userEmail);
            await finalizeUnlock(userEmail);
          } else {
            // Token verified but no email yet — switch to manual for email input
            setPhase("manual");
            setClaimError("Purchase verified! Enter your Gumroad email to continue.");
          }
          return;
        }

        if (d.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("manual");
          return;
        }
      } catch {}

      if (pollCountRef.current >= MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        // Don't error — just switch to manual with a hint
        setPhase("manual");
        setClaimError("");
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);
  };

  // ─── Payment: manual (email input) ──────────────────────

  const handleManualClaim = async () => {
    if (!email.trim() || !email.includes("@")) {
      setClaimError("Please enter a valid email address");
      return;
    }
    setPhase("claiming");
    setClaimError("");
    await finalizeUnlock(email.trim());
  };

  const finalizeUnlock = async (userEmail: string) => {
    try {
      const res = await fetch("/api/verify-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, chartId: id }),
      });
      const d = await res.json();
      if (d.verified) {
        setEmail(userEmail);
        saveUnlock();
        onUnlocked(userEmail);
        return;
      }
      setClaimError(d.error || "No purchase found. Use the same email as your Gumroad purchase.");
      setPhase("manual");
    } catch {
      setClaimError("Network error. Please try again.");
      setPhase("manual");
    }
  };

  const saveUnlock = () => {
    try {
      const unlocked = JSON.parse(localStorage.getItem("bazi-unlocked") || "[]");
      if (!unlocked.includes(id)) {
        unlocked.push(id);
        localStorage.setItem("bazi-unlocked", JSON.stringify(unlocked));
      }
    } catch {}
  };

  // ─── Generate reading ───────────────────────────────────

  const onUnlocked = useCallback((userEmail: string) => {
    setPhase("generating");
    generateReading(userEmail);
  }, [id]);

  const generateReading = async (userEmail: string) => {
    try {
      const res = await fetch("/api/generate-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartId: id,
          email: userEmail,
          chartText: data?.chartText,
          chart: data?.chart,
          birthInfo: data?.birthInfo,
        }),
      });
      const d = await res.json();
      if (res.ok && d.analysis) {
        setAnalysis(d.analysis);
      } else {
        setAnalysis(`Error: ${d.error || "Failed to generate reading"}`);
      }
    } catch (err: any) {
      setAnalysis(`Error: ${err.message}`);
    } finally {
      setPhase("done");
    }
  };

  // ─── Export ─────────────────────────────────────────────

  const exportChart = async () => {
    setExporting("chart");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const frame = posterFrameRef.current;
      if (!frame?.contentDocument?.body) return;
      const body = frame.contentDocument.body;
      const canvas = await html2canvas(body, {
        backgroundColor: "#f5f1e8", scale: 2,
        width: body.scrollWidth, height: body.scrollHeight,
      });
      downloadBlob(await canvasToBlob(canvas), `bazi-chart-${id}.png`);
    } catch (err) {
      console.error("Export chart failed:", err);
    } finally {
      setExporting("");
    }
  };

  const exportReading = async () => {
    setExporting("reading");
    try {
      const el = readingRef.current;
      if (!el) { console.error("readingRef is null"); return; }
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff", scale: 2,
        useCORS: true, logging: true,
      });
      downloadBlob(await canvasToBlob(canvas), `bazi-reading-${id}.png`);
    } catch (err) {
      console.error("Export reading failed:", err);
    } finally {
      setExporting("");
    }
  };

  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = filename; a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ─── Render ─────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Generating your chart..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600 text-sm text-center max-w-sm">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline text-sm">← New Reading</Link>
      </main>
    );
  }

  const bi = data?.birthInfo;

  return (
    <main className="flex-1 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium shrink-0">← New</Link>
        <div className="text-xs text-stone-400 truncate mx-2">
          {bi?.gender === 'male' ? 'Male' : 'Female'} · {bi?.year}-{String(bi?.month).padStart(2, '0')}-{String(bi?.day).padStart(2, '0')}
        </div>
        {phase === "done" ? (
          <div className="flex gap-1.5 shrink-0">
            <button onClick={exportChart} disabled={exporting !== ""}
              className="text-xs bg-stone-700 hover:bg-stone-800 text-white px-2.5 py-1.5 rounded-full transition disabled:opacity-50">
              {exporting === "chart" ? "..." : "Chart"}
            </button>
            <button onClick={exportReading} disabled={exporting !== ""}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-full transition disabled:opacity-50">
              {exporting === "reading" ? "..." : "Reading"}
            </button>
          </div>
        ) : <div className="w-20 shrink-0" />}
      </div>

      {/* Poster */}
      <div className="bg-stone-100 overflow-hidden flex justify-center">
        {posterHTML ? (
          <div className="w-full flex justify-center" style={{ minHeight: "400px" }}>
            <iframe ref={posterFrameRef} srcDoc={posterHTML}
              className="border-none origin-top" title="Bazi & Ziwei Chart"
              style={{ width: "1080px", height: "1920px", transform: "scale(var(--poster-scale, 1))" }} />
            <style jsx>{`@media (max-width: 1100px) { iframe { --poster-scale: calc(100vw / 1080); } }`}</style>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-stone-400">Loading chart...</div>
        )}
      </div>

      {/* Reading section */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Polling: spinner + manual fallback below */}
        {phase === "polling" && (
          <div className="text-center py-8 space-y-3">
            <svg className="animate-spin h-8 w-8 text-amber-600 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-stone-700 font-medium">Waiting for your payment...</p>
            <p className="text-stone-400 text-sm max-w-xs mx-auto">
              Complete your purchase on Gumroad and this page will unlock automatically
            </p>
          </div>
        )}

        {/* Manual email input (fallback / shown alongside polling) */}
        {(phase === "manual" || phase === "claiming" || phase === "polling") && (
          <div className="text-center space-y-4">
            {phase === "polling" && (
              <div className="border-t border-stone-200 pt-6 mt-2">
                <p className="text-xs text-stone-400 mb-3">Automatic verification is running. You can also enter your email below:</p>
              </div>
            )}
            {phase === "manual" && (
              <>
                <h2 className="text-lg font-semibold text-stone-800">Verify Your Purchase</h2>
                <p className="text-stone-500 text-sm">
                  Enter the email you used on Gumroad
                </p>
              </>
            )}
            {claimError && (
              <p className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">{claimError}</p>
            )}
            <div className="flex gap-2 max-w-sm mx-auto">
              <input type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualClaim()}
                placeholder="you@email.com"
                disabled={phase === "claiming"}
                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                autoFocus />
              <button onClick={handleManualClaim}
                disabled={phase === "claiming" || !email.trim()}
                className="px-6 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition">
                {phase === "claiming" ? "..." : "Verify"}
              </button>
            </div>
            <p className="text-xs text-stone-400">
              Complete your purchase on Gumroad first
            </p>
          </div>
        )}

        {/* Generating */}
        {phase === "generating" && (
          <div className="text-center py-12 space-y-3">
            <svg className="animate-spin h-8 w-8 text-amber-600 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-stone-700 font-medium">Analyzing your chart...</p>
          </div>
        )}

        {/* Done */}
        {phase === "done" && analysis && !analysis.startsWith("Error") && (
          <div ref={readingRef} className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="prose prose-stone max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }} />
          </div>
        )}

        {/* Done — error */}
        {phase === "done" && analysis && analysis.startsWith("Error") && (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm">{analysis}</p>
            <button onClick={() => { setPhase("generating"); generateReading(email || ""); }}
              className="mt-4 text-amber-600 hover:text-amber-700 text-sm underline">Try again</button>
          </div>
        )}

        {/* Init CTA */}
        {phase === "init" && (
          <div className="text-center space-y-3">
            <h2 className="text-lg font-semibold text-stone-800">Chart Reading</h2>
            <p className="text-stone-500 text-sm max-w-sm mx-auto">
              Unlock a personalized BaZi + Ziwei deep reading —
              career, wealth, relationships, health, and life guidance.
            </p>
            <button onClick={startPayment}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200">
              Unlock · {GUMROAD_PRICE}
            </button>
            <p className="text-xs text-stone-400">One-time purchase · Secured by Gumroad</p>
          </div>
        )}

        {/* Already unlocked */}
        {phase === "unlocked" && (
          <div className="text-center space-y-3">
            <button onClick={() => { setPhase("generating"); generateReading(email || ""); }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-amber-200">
              Generate Reading
            </button>
            <p className="text-xs text-stone-400">Already unlocked · No additional charge</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only
      </p>
    </main>
  );
}
