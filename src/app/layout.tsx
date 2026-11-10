import type { Metadata, Viewport } from "next";
import { paletteEFonts } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pangat",
  description: "Know who is really coming.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#790d16" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={paletteEFonts}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
