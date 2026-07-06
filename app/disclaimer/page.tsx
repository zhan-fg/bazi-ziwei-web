import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
      <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm mb-6 inline-block">← Back</Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Disclaimer</h1>
      <p className="text-stone-500 text-sm mb-8">Last updated: July 2026</p>

      <div className="prose prose-stone max-w-none text-sm leading-relaxed space-y-6">
        <section>
          <h2 className="text-base font-semibold text-stone-800">For Entertainment Purposes Only</h2>
          <p>All content provided by this Service — including Bazi charts, Ziwei Doushu charts, readings, and poster designs — is intended for <strong>entertainment and cultural education purposes only</strong>. It does not constitute professional advice of any kind.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Not Professional Advice</h2>
          <p>The content on this website is <strong>not</strong> a substitute for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Medical advice, diagnosis, or treatment from a licensed healthcare provider</li>
            <li>Financial, investment, or tax advice from a qualified professional</li>
            <li>Legal advice from a licensed attorney</li>
            <li>Mental health counseling or therapy</li>
            <li>Career counseling or employment decisions</li>
          </ul>
          <p className="mt-3">Never disregard professional medical advice or delay seeking it because of something you read on this website. In case of emergency, call your doctor or emergency services immediately.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">No Guarantees</h2>
          <p>Bazi and Ziwei Doushu are traditional Chinese metaphysical systems. Their interpretive frameworks are not scientifically validated. We make no claims about the accuracy, reliability, or predictive power of any chart or reading. Results vary and should not be used as the sole basis for any life decision.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Automated Analysis</h2>
          <p>Our readings are produced using automated analytical systems based on traditional Chinese metaphysical frameworks. They may reflect probabilistic interpretations and should be treated as entertainment output, not authoritative analysis.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Personal Responsibility</h2>
          <p>By using this Service, you acknowledge that you are solely responsible for your own decisions and actions. The website, its operators, and its technology providers assume no liability for any consequences arising from your use of the Service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Jurisdiction</h2>
          <p>This disclaimer is governed by applicable laws. If any provision is found to be unenforceable, the remaining provisions remain in full effect.</p>
        </section>
      </div>
    </main>
  );
}
