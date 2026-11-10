import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Serif, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";

// Self-hosted at build time. Latin and Devanagari pairs, so English and
// Marathi sit side by side in matching sans (text) and serif (headings).
const sans = Noto_Sans({ subsets: ["latin"], variable: "--font-noto-sans", display: "swap" });
const sansDeva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-noto-sans-deva", display: "swap" });
const serif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif", display: "swap" });
const serifDeva = Noto_Serif_Devanagari({ subsets: ["devanagari"], variable: "--font-noto-serif-deva", display: "swap" });

export const metadata: Metadata = {
  title: "Pangat",
  description: "Know who is really coming.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#8c1c13" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${sansDeva.variable} ${serif.variable} ${serifDeva.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
