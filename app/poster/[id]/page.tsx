"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function PosterPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [posterHTML, setPosterHTML] = useState("");
  const [error, setError] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`/api/poster-image?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load poster");
        return res.text();
      })
      .then((html) => {
        setPosterHTML(html);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleDownload = async () => {
    // Client-side: use html2canvas to capture the iframe
    // For now, offer the HTML directly
    const blob = new Blob([posterHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bazi-ziwei-poster-${id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner message="加载海报..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline">返回首页</Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <div className="flex items-center gap-4 mb-6 w-full max-w-4xl">
        <Link href={`/reading/${id}`} className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          ← 返回解读
        </Link>
        <div className="flex-1" />
        <button
          onClick={handleDownload}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          下载海报
        </button>
      </div>

      <div className="w-full max-w-4xl border border-stone-200 rounded-xl overflow-hidden shadow-lg">
        <iframe
          ref={iframeRef}
          srcDoc={posterHTML}
          className="w-full"
          style={{ height: "800px", border: "none" }}
          title="Bazi & Ziwei Poster"
        />
      </div>

      <p className="mt-6 text-center text-xs text-stone-400">
        海报含 QR 码 · 扫码可查看完整解读 · 仅供文化研究与娱乐参考
      </p>
    </main>
  );
}
