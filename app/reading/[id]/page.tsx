"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

export default function ReadingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/reading?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        return res.json();
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

  if (loading) return <LoadingSpinner message="加载命盘数据..." />;
  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="text-amber-600 hover:underline">
          返回首页
        </Link>
      </main>
    );
  }

  const chart = data?.chart;
  const bz = chart?.bazi;
  const zw = chart?.ziwei;
  const bi = data?.birthInfo;

  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1">
          ← 返回首页
        </Link>
        <Link
          href={`/poster/${id}`}
          className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          查看英文海报
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-stone-800 mb-2">命盘解读</h1>
      <p className="text-stone-500 text-sm mb-8">
        {bi?.gender === "男" ? "男" : "女"} · {bi?.year}-{String(bi?.month).padStart(2, "0")}-{String(bi?.day).padStart(2, "0")} · {bi?.isLunar ? "农历" : "公历"}
      </p>

      {/* Chart Text */}
      <pre className="bg-stone-900 text-stone-200 p-6 rounded-xl text-xs leading-relaxed overflow-x-auto whitespace-pre font-mono">
        {data?.chartText || "暂无数据"}
      </pre>

      {/* Back to home */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-amber-600 hover:underline text-sm">
          为新用户生成命盘 →
        </Link>
      </div>

      <p className="mt-12 text-center text-xs text-stone-400">
        本命盘由算法层（Yiqi + enrichBazi）自动生成 · 仅供文化研究与娱乐参考
      </p>
    </main>
  );
}
