import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "What is Chinese Astrology? BaZi & Zi Wei Dou Shu Explained",
  description:
    "Learn about BaZi (Four Pillars of Destiny) and Zi Wei Dou Shu — the two pillars of Chinese astrology. How birth charts work, Five Elements, 12 palaces, and life path prediction.",
};

export default function ChineseAstrologyPage() {
  return (
    <main className="flex-1 max-w-3xl mx-auto px-4 py-12 space-y-10 text-stone-700 leading-relaxed">
      <header>
        <h1 className="text-3xl font-bold text-stone-800 mb-3">
          What is Chinese Astrology? BaZi & Zi Wei Dou Shu Explained
        </h1>
        <p className="text-stone-500">
          A complete guide to the two most powerful destiny reading systems in Eastern metaphysics.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-stone-800 mb-3">BaZi — The Four Pillars of Destiny</h2>
        <p>
          BaZi (八字), literally "Eight Characters," is a Chinese astrological system that maps your
          birth year, month, day, and hour into four pairs of Heavenly Stems and Earthly Branches.
          Each pillar represents a different dimension of your life:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Year Pillar</strong> — Ancestry, family background, early childhood</li>
          <li><strong>Month Pillar</strong> — Parents, career foundation, social environment</li>
          <li><strong>Day Pillar</strong> — You (Day Master), spouse, marriage</li>
          <li><strong>Hour Pillar</strong> — Children, legacy, later life</li>
        </ul>
        <p className="mt-3">
          The Day Master — the Heavenly Stem of your Day Pillar — represents your core self.
          Its relationship with the other seven characters, filtered through the Five Elements
          (Wood, Fire, Earth, Metal, Water) and Ten Gods (正官, 七杀, 正财, etc.), reveals your
          personality, strengths, challenges, and life trajectory.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-stone-800 mb-3">The Five Elements (Wu Xing)</h2>
        <p>
          The Five Elements are the foundation of all Chinese metaphysics. Each element has
          generating (生) and controlling (克) relationships:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          {[
            { el: "Wood 木", traits: "Growth, creativity, flexibility", color: "bg-green-50 border-green-200" },
            { el: "Fire 火", traits: "Passion, energy, transformation", color: "bg-red-50 border-red-200" },
            { el: "Earth 土", traits: "Stability, nurturing, grounding", color: "bg-amber-50 border-amber-200" },
            { el: "Metal 金", traits: "Structure, discipline, precision", color: "bg-gray-50 border-gray-200" },
            { el: "Water 水", traits: "Wisdom, adaptability, intuition", color: "bg-blue-50 border-blue-200" },
          ].map((e) => (
            <div key={e.el} className={`rounded-lg border p-3 text-sm ${e.color}`}>
              <div className="font-semibold text-stone-800">{e.el}</div>
              <div className="text-stone-500 text-xs mt-1">{e.traits}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-stone-800 mb-3">Zi Wei Dou Shu — Purple Star Astrology</h2>
        <p>
          Zi Wei Dou Shu (紫微斗數) maps 12 life palaces onto a circular chart based on your birth
          time. Each palace governs a specific life domain and is influenced by major stars (主星)
          and minor stars (輔星):
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Life Palace (命宮)</strong> — Core personality and life direction</li>
          <li><strong>Career Palace (官祿宮)</strong> — Professional path and achievements</li>
          <li><strong>Wealth Palace (財帛宮)</strong> — Income, assets, financial patterns</li>
          <li><strong>Spouse Palace (夫妻宮)</strong> — Marriage, partnerships, relationship dynamics</li>
          <li><strong>Children Palace (子女宮)</strong> — Offspring, creativity, pleasures</li>
          <li><strong>Health Palace (疾厄宮)</strong> — Physical wellbeing and medical predispositions</li>
          <li><strong>Property Palace (田宅宮)</strong> — Home, real estate, family roots</li>
          <li><strong>Travel Palace (遷移宮)</strong> — External environment, opportunities abroad</li>
          <li><strong>Friends Palace (交友宮)</strong> — Social circle, colleagues, subordinates</li>
          <li><strong>Parents Palace (父母宮)</strong> — Relationship with parents and authority</li>
          <li><strong>Fortune Palace (福德宮)</strong> — Inner happiness, spiritual fulfillment</li>
          <li><strong>Siblings Palace (兄弟宮)</strong> — Siblings, peers, competition</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-stone-800 mb-3">BaZi vs. Western Astrology</h2>
        <p>
          While Western astrology focuses on planetary positions, sun signs, and transits, Chinese
          astrology maps the elemental forces present at your birth moment. Key differences:
        </p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-2 pr-4 font-semibold">Aspect</th>
                <th className="text-left py-2 pr-4 font-semibold">Western Astrology</th>
                <th className="text-left py-2 font-semibold">Chinese Astrology</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-4">Basis</td>
                <td className="py-2 pr-4">Planetary positions</td>
                <td className="py-2">Five Elements + Stems & Branches</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-4">Chart Type</td>
                <td className="py-2 pr-4">Circular wheel</td>
                <td className="py-2">Four pillars + 12 palaces</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-4">Time Cycles</td>
                <td className="py-2 pr-4">Transits, progressions</td>
                <td className="py-2">10-year luck cycles (大運)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Best For</td>
                <td className="py-2 pr-4">Personality, timing, relationships</td>
                <td className="py-2">Life path, career, wealth, destiny patterns</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-stone-800 mb-3">Ready to Discover Your Chart?</h2>
        <p>
          Generate your free BaZi and Zi Wei Dou Shu birth chart in seconds. No sign-up required.
          Unlock an AI-powered deep reading to understand your career path, wealth potential,
          relationships, and life purpose through the lens of traditional Chinese astrology.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Generate Your Free Birth Chart →
        </Link>
      </section>
    </main>
  );
}
