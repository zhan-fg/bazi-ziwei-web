import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bazi & Ziwei — Chinese Astrology Chart",
  description: "Generate your Bazi (Four Pillars) and Ziwei (Purple Star) astrology chart. Get a detailed reading and shareable poster.",
  openGraph: {
    title: "Bazi & Ziwei Chart",
    description: "Discover your destiny through traditional Chinese astrology",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 text-stone-900 flex flex-col">{children}</body>
    </html>
  );
}
