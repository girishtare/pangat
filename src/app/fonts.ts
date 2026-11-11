import { Libre_Baskerville, Playfair_Display, Tiro_Devanagari_Marathi } from "next/font/google";

// The app's fonts, set on <html> in the root layout, for every page:
//   Playfair Display         headings (bold)
//   Libre Baskerville        body text
//   Tiro Devanagari Marathi  every Marathi letter, in headings and text
// Playfair and Baskerville have no Devanagari, so the browser takes Marathi
// letters from Tiro, the next font in each list (see globals.css).
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap", variable: "--font-playfair-display" });
const baskerville = Libre_Baskerville({ weight: ["400", "700"], subsets: ["latin"], display: "swap", variable: "--font-libre-baskerville" });
const tiro = Tiro_Devanagari_Marathi({ weight: "400", subsets: ["devanagari"], display: "swap", variable: "--font-tiro-marathi" });

/** The font variables; the root layout puts them on <html>. */
export const paletteEFonts = `${playfair.variable} ${baskerville.variable} ${tiro.variable}`;
