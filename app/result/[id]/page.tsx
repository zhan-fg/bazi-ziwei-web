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

  const [phase, setPhase] = useState<"init" | "manual" | "claiming" | "unlocked" | "generating" | "done">("init");
  const [email, setEmail] = useState("");
  const [claimError, setClaimError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [exporting, setExporting] = useState<"" | "chart" | "reading">("");
  const [balance, setBalance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const posterFrameRef = useRef<HTMLIFrameElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

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
  }, [data, id]);
  // Check if already unlocked
  useEffect(() => {
    if (!id) return;
    try {
      const unlocked = JSON.parse(localStorage.getItem("bazi-unlocked") || "[]");
      if (unlocked.includes(id)) setPhase("unlocked");
    } catch {}
  }, [id]);

  // Generate QR code when reading is complete
  useEffect(() => {
    if (phase !== "done" || !qrRef.current) return;
    import("qrcode").then((QRCode) => {
      const shareUrl = `https://bazi-ziwei-web.vercel.app/share/${id}`;
      QRCode.toCanvas(qrRef.current!, shareUrl, {
        width: 100, margin: 1,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    });
  }, [phase, id]);

  const checkBalance = async () => {
    const userEmail = email.trim();
    if (!userEmail || !userEmail.includes("@")) return;
    setChecking(true);
    setBalance(null);
    try {
      const res = await fetch(`/api/check-balance?email=${encodeURIComponent(userEmail)}`);
      const d = await res.json();
      if (res.ok) setBalance(d.balance ?? 0);
    } catch {
      setBalance(null);
    } finally {
      setChecking(false);
    }
  };

  const unlockWithBalance = () => {
    setPhase("generating");
  };

  // ─── Payment ────────────────────────────────────────────

  const startPayment = () => {
    setClaimError("");
    window.open(GUMROAD_PRODUCT_URL, "_blank", "noopener,noreferrer");
    setPhase("manual");
  };

  const handleVerify = async () => {
    const userEmail = email.trim();
    if (!userEmail || !userEmail.includes("@")) {
      setClaimError("Please enter a valid email address");
      return;
    }
    setPhase("claiming");
    setClaimError("");

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
  }, []);

  // Effect: start reading when phase changes to generating
  useEffect(() => {
    if (phase === "generating" && data) {
      generateReading(email);
    }
  }, [phase, data, email]);

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

      // Fetch poster with QR code
      const res = await fetch(`/api/poster-image?id=${id}&qr=1`);
      if (!res.ok) { setExporting(""); return; }
      const qrHTML = await res.text();

      // Create hidden iframe for capture
      const tmpFrame = document.createElement("iframe");
      tmpFrame.style.cssText = "position:fixed;left:-9999px;width:1080px;height:2000px;";
      tmpFrame.srcdoc = qrHTML;
      document.body.appendChild(tmpFrame);
      await new Promise<void>((resolve) => { tmpFrame.onload = () => resolve(); });
      await new Promise((r) => setTimeout(r, 800)); // wait for images to load

      const body = tmpFrame.contentDocument?.body;
      if (!body) { document.body.removeChild(tmpFrame); setExporting(""); return; }

      const canvas = await html2canvas(body, {
        backgroundColor: "#f5f1e8", scale: 2,
        width: body.scrollWidth, height: body.scrollHeight,
      });
      document.body.removeChild(tmpFrame);
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
      if (!el) { console.error("Export: readingRef is null"); return; }
      if (!el.offsetHeight) { console.error("Export: readingRef has zero height"); return; }
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff", scale: 2,
        onclone: (clonedDoc) => {
          // Ensure the cloned element is visible
          const cloned = clonedDoc.body.firstElementChild as HTMLElement;
          if (cloned) cloned.style.overflow = "visible";
        },
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
        <p className="text-red-600 text-sm text-center">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline text-sm">← New Reading</Link>
      </main>
    );
  }

  const bi = data?.birthInfo;

  return (
    <main className="flex-1 w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <Link href="/bazi" className="text-amber-600 hover:text-amber-700 text-sm font-medium shrink-0">← New</Link>
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
      <div className="bg-stone-100 overflow-hidden flex justify-center relative">
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
        {/* QR code overlay — appears after reading is generated */}
        {phase === "done" && (
          <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-lg p-2 flex items-center gap-2">
            <canvas ref={qrRef} width={100} height={100} />
            <div className="text-[10px] text-stone-500 leading-tight max-w-[80px]">
              Scan to view<br />full reading
            </div>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {(phase === "manual" || phase === "claiming") && (
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-stone-800">Verify Your Purchase</h2>
            <p className="text-stone-500 text-sm">
              Enter the email you used on Gumroad to unlock your reading
            </p>
            {claimError && (
              <p className="text-red-500 text-sm bg-red-50 py-2 px-4 rounded-lg">{claimError}</p>
            )}
            <div className="flex gap-2 max-w-sm mx-auto">
              <input type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="you@email.com"
                disabled={phase === "claiming"}
                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                autoFocus />
              <button onClick={handleVerify}
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

        {phase === "generating" && (
          <div className="text-center py-12 space-y-3">
            <svg className="animate-spin h-8 w-8 text-amber-600 mx-auto" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-stone-700 font-medium">Analyzing your chart...</p>
          </div>
        )}

        {phase === "done" && analysis && !analysis.startsWith("Error") && (
          <div ref={readingRef} className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="prose prose-stone max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }} />
          </div>
        )}

        {phase === "done" && analysis && analysis.startsWith("Error") && (
          <div className="text-center py-8">
            <p className="text-red-600 text-sm">{analysis}</p>
            <button onClick={() => { setPhase("manual"); setClaimError(""); }}
              className="mt-4 text-amber-600 hover:text-amber-700 text-sm underline">Try again</button>
          </div>
        )}

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

            {/* Balance check */}
            <div className="border-t border-stone-200 pt-5 mt-4">
              <p className="text-xs text-stone-400 mb-2">Already purchased? Check your balance:</p>
              <div className="flex gap-2 max-w-xs mx-auto">
                <input type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setBalance(null); }}
                  onKeyDown={(e) => e.key === "Enter" && checkBalance()}
                  placeholder="Gumroad email"
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
                <button onClick={checkBalance}
                  disabled={checking || !email.trim()}
                  className="px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-medium transition disabled:opacity-50">
                  {checking ? "..." : "Check"}
                </button>
              </div>
              {balance !== null && balance > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-green-700 font-medium">
                    Balance: {balance} unlock{balance > 1 ? "s" : ""} available
                  </p>
                  <button onClick={() => { handleVerify(); }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
                    Unlock Reading
                  </button>
                </div>
              )}
              {balance === 0 && (
                <p className="text-sm text-stone-500 mt-3">
                  No balance. Please purchase above first.
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "unlocked" && (
          <div className="text-center space-y-3">
            <p className="text-stone-500 text-sm">This chart is unlocked. Enter your email to generate your reading.</p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 px-4 py-2.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                autoFocus />
              <button onClick={() => { setPhase("generating"); }}
                disabled={!email.trim()}
                className="px-6 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition">
                Generate
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 pb-8">
        For cultural and entertainment purposes only
      </p>
    </main>
  );
}
