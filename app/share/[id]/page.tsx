"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import { marked } from "marked";

function parseMarkdown(text: string): string {
  return marked.parse(text, { breaks: true }) as string;
}

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [posterHTML, setPosterHTML] = useState("");

  useEffect(() => {
    fetch(`/api/reading?id=${id}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Failed");
        return d;
      })
      .then(() => {
        // Load reading from public cache
        return fetch(`/api/share-reading?id=${id}`);
      })
      .then(async (res) => {
        const d = await res.json();
        if (d.analysis) setAnalysis(d.analysis);
        return fetch(`/api/poster-image?id=${id}`);
      })
      .then(async (res) => {
        if (res.ok) setPosterHTML(await res.text());
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600 text-sm">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline text-sm">
          Generate your own chart →
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <span className="text-lg font-bold text-stone-800">Chart Reading</span>
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
          Get Your Own →
        </Link>
      </div>

      {posterHTML && (
        <div className="bg-stone-100 overflow-hidden flex justify-center">
          <div className="w-full flex justify-center" style={{ minHeight: "400px" }}>
            <iframe srcDoc={posterHTML} className="border-none origin-top"
              style={{ width: "1080px", height: "1920px", transform: "scale(var(--poster-scale, 1))" }}
              title="Chart" />
            <style jsx>{`@media (max-width: 1100px) { iframe { --poster-scale: calc(100vw / 1080); } }`}</style>
          </div>
        </div>
      )}

      {analysis && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="prose prose-stone max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }} />
          </div>
        </div>
      )}

      {!analysis && (
        <div className="text-center py-20">
          <p className="text-stone-400 text-sm">Reading not yet generated for this chart.</p>
          <Link href="/" className="text-amber-600 hover:underline text-sm mt-4 inline-block">
            Generate your own chart →
          </Link>
        </div>
      )}
    </main>
  );
}
