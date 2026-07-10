"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const strokes = "天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated background characters */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden opacity-[0.04]">
        <div className="absolute inset-0 flex flex-wrap content-start">
          {strokes.split("").map((c, i) => (
            <span
              key={i}
              className="text-[120px] font-serif"
              style={{
                animation: `floatChar ${6 + (i % 4) * 2}s ease-in-out infinite`,
                animationDelay: `${i * 0.4}s`,
                transform: `translate(${(i % 5) * 15}px, ${Math.floor(i / 5) * 15}px)`,
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-4 text-center">
        {/* Animated tag */}
        <div
          className={`mb-8 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs tracking-widest uppercase">
            Eastern Astrology &amp; Naming
          </span>
        </div>

        {/* Main title */}
        <h1
          className={`text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6 transition-all duration-1000 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <span className="bg-gradient-to-r from-amber-400 via-red-400 to-purple-400 bg-clip-text text-transparent">
            Discover
          </span>
          <br />
          <span className="text-white/90">Your Destiny</span>
        </h1>

        <p
          className={`text-lg sm:text-xl text-white/50 max-w-xl mb-12 transition-all duration-1000 delay-400 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
        >
          Ancient Chinese wisdom meets AI. Explore your BaZi birth chart, Zi Wei Dou Shu
          star map, or find a Chinese name that carries your story.
        </p>

        {/* Service cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full transition-all duration-1000 delay-600 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* BaZi card */}
          <Link
            href="/bazi"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-left hover:bg-white/[0.06] hover:border-amber-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-4xl mb-4">☯️</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                BaZi &amp; Ziwei
              </h2>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                Four Pillars of Destiny · Purple Star Astrology. Generate your birth chart
                and unlock an AI-powered deep reading of your career, wealth, relationships
                and life path.
              </p>
              <span className="text-amber-400 text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">
                Generate Chart →
              </span>
            </div>
          </Link>

          {/* Name card */}
          <Link
            href="/name"
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-left hover:bg-white/[0.06] hover:border-purple-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="text-4xl mb-4">✨</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Chinese Name
              </h2>
              <p className="text-sm text-white/40 leading-relaxed mb-4">
                Find a name rooted in classical poetry and philosophy. Each name tells
                a story — chosen from thousands of years of Chinese literature and
                tailored to your identity.
              </p>
              <span className="text-purple-400 text-sm font-medium group-hover:translate-x-1 inline-block transition-transform">
                Find Your Name →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8 text-xs text-white/20 space-x-4">
        <Link href="/terms" className="hover:text-white/40 transition">Terms</Link>
        <Link href="/privacy" className="hover:text-white/40 transition">Privacy</Link>
        <Link href="/disclaimer" className="hover:text-white/40 transition">Disclaimer</Link>
        <span className="block mt-2">For entertainment purposes only</span>
      </footer>

      <style jsx global>{`
        @keyframes floatChar {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 0.6; transform: translateY(-10px); }
        }
        html { background: #0a0a0f; }
      `}</style>
    </main>
  );
}
