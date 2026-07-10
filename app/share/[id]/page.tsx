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

  useEffect(() => {
    fetch(`/api/share-reading?id=${id}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Not found");
        return d;
      })
      .then((d) => {
        if (d.analysis) setAnalysis(d.analysis);
        else setError("Reading not yet generated for this chart.");
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

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="prose prose-stone max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(analysis) }} />
        </div>
      </div>

      <div className="text-center pb-8">
        <Link href="/" className="text-amber-600 hover:underline text-sm">
          Generate your own BaZi & Ziwei chart →
        </Link>
      </div>
    </main>
  );
}
