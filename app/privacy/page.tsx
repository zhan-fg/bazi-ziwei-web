import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
      <Link href="/" className="text-amber-600 hover:text-amber-700 text-sm mb-6 inline-block">← Back</Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Privacy Policy</h1>
      <p className="text-stone-500 text-sm mb-8">Last updated: July 2026</p>

      <div className="prose prose-stone max-w-none text-sm leading-relaxed space-y-6">
        <section>
          <h2 className="text-base font-semibold text-stone-800">1. Information We Collect</h2>
          <p>We collect only the information you voluntarily provide:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Birth information</strong>: date, time, and gender — used solely to generate your astrology chart</li>
            <li><strong>Payment information</strong>: processed entirely by Stripe; we never see or store your full credit card details</li>
            <li><strong>Usage data</strong>: anonymous analytics (page views, feature usage) via standard web analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">2. How We Use Your Information</h2>
          <p>Birth information is used exclusively to calculate and generate your Bazi and Ziwei chart. It is stored temporarily (up to 7 days) to allow you to revisit your reading via a shared link. Payment information is handled by Stripe and subject to their privacy policy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">3. Data Storage and Security</h2>
          <p>Chart data is stored on secure servers and automatically deleted after 7 days. We implement reasonable security measures to protect your data. No sensitive personal information is permanently retained.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">4. Cookies</h2>
          <p>We use essential cookies required for the website to function. We do not use tracking cookies for advertising purposes. You can disable cookies in your browser settings, though this may affect website functionality.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">5. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Stripe</strong> — payment processing (<a href="https://stripe.com/privacy" className="text-amber-600 hover:underline" target="_blank">Privacy Policy</a>)</li>
            <li><strong>Vercel</strong> — website hosting (<a href="https://vercel.com/legal/privacy-policy" className="text-amber-600 hover:underline" target="_blank">Privacy Policy</a>)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">6. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. Since we only retain birth information temporarily and do not link it to personally identifiable information, most data is automatically deleted within 7 days. For specific requests, contact us.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">7. Children's Privacy</h2>
          <p>This Service is not directed at children under 13. We do not knowingly collect information from children.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">8. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-stone-800">9. Contact</h2>
          <p>For privacy-related inquiries, please contact us through the channels provided on our website.</p>
        </section>
      </div>
    </main>
  );
}
