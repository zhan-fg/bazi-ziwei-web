"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SHI_CHEN = [
  { label: "Zi (23:00-01:00)", hour: 0 },
  { label: "Chou (01:00-03:00)", hour: 2 },
  { label: "Yin (03:00-05:00)", hour: 4 },
  { label: "Mao (05:00-07:00)", hour: 6 },
  { label: "Chen (07:00-09:00)", hour: 8 },
  { label: "Si (09:00-11:00)", hour: 10 },
  { label: "Wu (11:00-13:00)", hour: 12 },
  { label: "Wei (13:00-15:00)", hour: 14 },
  { label: "Shen (15:00-17:00)", hour: 16 },
  { label: "You (17:00-19:00)", hour: 18 },
  { label: "Xu (19:00-21:00)", hour: 20 },
  { label: "Hai (21:00-23:00)", hour: 22 },
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    year: "1992", month: "3", day: "14",
    shichen: "4", gender: "male", isLunar: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: Number(form.year), month: Number(form.month), day: Number(form.day),
          hour: Number(form.shichen), minute: 0,
          gender: form.gender === "male" ? "男" : "女",
          isLunar: form.isLunar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate chart");

      router.push(`/result/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="text-center px-4 pt-20 pb-12 bg-gradient-to-b from-amber-50 to-white">
        <h1 className="text-5xl font-bold text-stone-800 mb-4 tracking-tight">
          Discover Your Destiny
        </h1>
        <p className="text-xl text-stone-500 max-w-lg mx-auto mb-2">
          Ancient Chinese astrology meets modern design
        </p>
        <p className="text-sm text-stone-400 max-w-md mx-auto">
          Get your personalized Bazi (Four Pillars) & Ziwei (Purple Star) chart — a stunning poster you can share, plus a deep AI-powered reading.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 bg-white border border-stone-200 rounded-full px-5 py-2 text-sm text-stone-500 shadow-sm">
          <span className="text-amber-600 font-bold">Chart Free</span>
          <span>·</span>
          <span>AI Reading $1.99</span>
        </div>
      </section>

      {/* Form */}
      <section className="px-4 pb-20">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-stone-200 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-10 w-10 text-amber-600 mx-auto mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-stone-600 font-medium">Calculating your chart...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-stone-800">Enter Your Birth Details</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Year</label>
                  <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="1900" max="2100" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Month</label>
                  <input type="number" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="1" max="12" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Day</label>
                  <input type="number" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    min="1" max="31" required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Birth Hour (Chinese 2-hour period)</label>
                <select value={form.shichen} onChange={(e) => setForm({ ...form, shichen: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent">
                  {SHI_CHEN.map((s) => (
                    <option key={s.hour} value={s.hour}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Gender</label>
                  <div className="flex gap-2">
                    {["male", "female"].map((g) => (
                      <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                          form.gender === g
                            ? "bg-stone-800 text-white border-stone-800"
                            : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                        }`}>
                        {g === "male" ? "Male" : "Female"}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 pb-1 cursor-pointer">
                  <input type="checkbox" checked={form.isLunar} onChange={(e) => setForm({ ...form, isLunar: e.target.checked })}
                    className="rounded border-stone-300" />
                  <span className="text-xs text-stone-500">Lunar</span>
                </label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white font-medium rounded-lg transition">
                Calculate My Chart
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 text-xs text-stone-400">
        For cultural and entertainment purposes only · Not professional advice
      </footer>
    </main>
  );
}
