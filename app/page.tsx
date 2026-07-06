import BirthForm from "@/components/BirthForm";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-stone-800 mb-3">
          八字 · 紫微斗数
        </h1>
        <p className="text-stone-500 text-lg max-w-md mx-auto">
          输入生辰，获取你的命盘解读与可分享海报
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <BirthForm />
      </div>

      <p className="mt-8 text-xs text-stone-400">
        仅供文化研究与娱乐参考 · 不构成任何决策依据
      </p>
    </main>
  );
}
