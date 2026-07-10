import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BaZi & Ziwei Chart — Chinese Astrology Birth Chart Calculator",
  description:
    "Generate your BaZi (Four Pillars of Destiny) and Zi Wei Dou Shu birth chart. AI-powered Chinese astrology reading with career, wealth, relationship, and life path predictions.",
  openGraph: {
    title: "Chinese Astrology Birth Chart — BaZi & Ziwei Reading",
    description:
      "Discover your destiny through traditional Chinese astrology. Birth chart calculator with AI-powered deep reading.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "BaZi & Ziwei — Chinese Astrology Chart",
    description:
      "Birth chart calculator with AI-powered deep reading.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "BaZi & Ziwei Chart",
              description:
                "Free Chinese astrology birth chart calculator. Generate your BaZi (Four Pillars of Destiny) and Zi Wei Dou Shu chart with AI-powered reading.",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
