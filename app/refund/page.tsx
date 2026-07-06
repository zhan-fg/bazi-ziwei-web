import Link from "next/link";

export default function RefundPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
      <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm mb-6 inline-block">← Back</Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Refund Policy</h1>
      <p className="text-stone-500 text-sm mb-8">Last updated: July 2026</p>

      <div className="prose prose-stone max-w-none text-sm leading-relaxed space-y-6">
        <section>
          <h2 className="text-base font-semibold text-stone-800">Our Guarantee</h2>
          <p>We stand behind our service. If you are not satisfied with your AI reading, we offer a straightforward refund process. Our goal is to make this risk-free for you.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Eligibility</h2>
          <p>You may request a full refund within <strong>7 days</strong> of purchase if:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The AI reading failed to generate (technical error)</li>
            <li>The reading content is materially different from what was advertised</li>
            <li>You are unsatisfied with the quality of the reading for any reason</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">How to Request a Refund</h2>
          <p>Contact us with your order reference (found in the URL of your reading page). We process refunds within 3-5 business days. Refunds are issued to the original payment method via Stripe.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Non-Refundable Situations</h2>
          <p>Refunds are generally not available for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Requests made more than 7 days after purchase</li>
            <li>Disagreement with the astrological interpretation itself (readings reflect traditional frameworks, not objective predictions)</li>
            <li>Multiple refund requests from the same user suggesting abuse</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Free Chart Generation</h2>
          <p>Basic chart generation and poster viewing are completely free and do not involve any payment. The refund policy applies only to purchased AI readings.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">Contact</h2>
          <p>For refund requests, please contact us directly. Include your reading URL for faster processing.</p>
        </section>
      </div>
    </main>
  );
}
