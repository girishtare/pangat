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
      {/* svh, not 100vh: on phones 100vh is the height without the address bar, so a page that fits the screen still scrolled (owner, 20 Nov). */}
      <body className="min-h-svh font-sans antialiased">{children}</body>
    </html>
  );
}
