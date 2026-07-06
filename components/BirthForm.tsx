"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SHI_CHEN = [
  { label: "子时 (23:00-01:00)", hour: 0 },
  { label: "丑时 (01:00-03:00)", hour: 2 },
  { label: "寅时 (03:00-05:00)", hour: 4 },
  { label: "卯时 (05:00-07:00)", hour: 6 },
  { label: "辰时 (07:00-09:00)", hour: 8 },
  { label: "巳时 (09:00-11:00)", hour: 10 },
  { label: "午时 (11:00-13:00)", hour: 12 },
  { label: "未时 (13:00-15:00)", hour: 14 },
  { label: "申时 (15:00-17:00)", hour: 16 },
  { label: "酉时 (17:00-19:00)", hour: 18 },
  { label: "戌时 (19:00-21:00)", hour: 20 },
  { label: "亥时 (21:00-23:00)", hour: 22 },
];

export default function BirthForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    year: "1992",
    month: "3",
    day: "14",
    shichen: "4",
    gender: "male",
    isLunar: false,
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
          year: Number(form.year),
          month: Number(form.month),
          day: Number(form.day),
          hour: Number(form.shichen),
          minute: 0,
          gender: form.gender === "male" ? "男" : "女",
          isLunar: form.isLunar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate chart");

      router.push(`/reading/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">年</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="1992"
            min="1900"
            max="2100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">月</label>
          <input
            type="number"
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="3"
            min="1"
            max="12"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">日</label>
          <input
            type="number"
            value={form.day}
            onChange={(e) => setForm({ ...form, day: e.target.value })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            placeholder="14"
            min="1"
            max="31"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">时辰</label>
        <select
          value={form.shichen}
          onChange={(e) => setForm({ ...form, shichen: e.target.value })}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          {SHI_CHEN.map((s) => (
            <option key={s.hour} value={s.hour}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-stone-600 mb-1">性别</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, gender: "male" })}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition ${
                form.gender === "male"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
              }`}
            >
              男
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, gender: "female" })}
              className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition ${
                form.gender === "female"
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
              }`}
            >
              女
            </button>
          </div>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isLunar}
              onChange={(e) => setForm({ ...form, isLunar: e.target.checked })}
              className="rounded border-stone-300"
            />
            <span className="text-sm text-stone-600">农历</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            排盘中...
          </>
        ) : (
          "生成命盘"
        )}
      </button>
    </form>
  );
}
