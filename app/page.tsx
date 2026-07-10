"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
          gender: form.gender,
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
      <section className="text-center px-4 pt-20 pb-10 bg-gradient-to-b from-amber-50 to-white">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-800 mb-4 tracking-tight">
          Chinese Astrology Birth Chart
        </h1>
        <p className="text-lg sm:text-xl text-stone-500 max-w-xl mx-auto mb-2">
          BaZi · Four Pillars of Destiny · Zi Wei Dou Shu
        </p>
        <p className="text-sm text-stone-400 max-w-md mx-auto">
          Discover your career path, wealth potential, relationships, and life purpose
          through traditional Eastern astrology — free chart calculator with AI-powered deep reading.
        </p>
      </section>

      {/* Form */}
      <section className="px-4 pb-12">
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
              <p className="text-stone-600 font-medium">Calculating your birth chart...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-stone-800">Enter Your Birth Details</h2>
                <p className="text-xs text-stone-400 mt-1">Instant chart generation · No sign-up required</p>
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
                <label className="block text-xs font-medium text-stone-500 mb-1">Birth Hour</label>
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
                Generate Birth Chart
              </button>
            </form>
          )}
        </div>
      </section>

      {/* SEO content section */}
      <section className="max-w-3xl mx-auto px-4 pb-16 text-sm text-stone-600 leading-relaxed space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">What is BaZi (Four Pillars of Destiny)?</h2>
          <p>
            BaZi, also known as the Four Pillars of Destiny, is a traditional Chinese astrology system
            that maps your birth year, month, day, and hour into four pairs of Heavenly Stems and
            Earthly Branches. Each pillar reveals a different aspect of your life — from your core
            personality (Day Master) to your career trajectory, wealth potential, and relationship
            patterns. Unlike Western astrology which charts planetary positions, BaZi analyzes the
            Five Elements (Wood, Fire, Earth, Metal, Water) interacting at the moment of your birth.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">What is Zi Wei Dou Shu?</h2>
          <p>
            Zi Wei Dou Shu, or Purple Star Astrology, maps 12 life palaces — Career, Wealth, Health,
            Relationships, Children, and more — based on your birth time and the position of stars
            in the Chinese celestial chart. Each palace is ruled by major and minor stars that
            influence every area of your life. Together with BaZi, it forms the most comprehensive
            destiny reading system in Chinese metaphysics.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">How It Works</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter your birth date, time, and gender above</li>
            <li>Get your free birth chart instantly — BaZi four pillars with Five Elements analysis and Ziwei 12-palace star map</li>
            <li>Unlock an AI-powered deep reading covering career, wealth, relationships, health, and life path predictions</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-2">Why Chinese Astrology?</h2>
          <p>
            While Western astrology focuses on sun signs and planetary transits, Chinese astrology
            reveals the elemental blueprint of your life — your innate strengths, hidden challenges,
            and the timing of major life events through 10-year luck cycles. Whether you're exploring
            career changes, relationship decisions, or personal growth, your BaZi and Ziwei chart
            offers a unique Eastern perspective that complements any spiritual practice.
          </p>
        </div>

        <p className="text-xs text-stone-400 pt-4">
          <Link href="/chinese-astrology" className="hover:text-stone-600 underline">
            Learn more about Chinese astrology →
          </Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 px-4 space-y-2">
        <div className="flex justify-center gap-4 text-xs text-stone-400">
          <Link href="/terms" className="hover:text-stone-600 underline">Terms</Link>
          <Link href="/privacy" className="hover:text-stone-600 underline">Privacy</Link>
          <Link href="/refund" className="hover:text-stone-600 underline">Refunds</Link>
          <Link href="/disclaimer" className="hover:text-stone-600 underline">Disclaimer</Link>
        </div>
        <p className="text-xs text-stone-400">
          For entertainment only · Not professional advice
        </p>
      </footer>
    </main>
  );
}
