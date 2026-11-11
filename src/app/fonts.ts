import { Noto_Sans, Noto_Sans_Devanagari, Playfair_Display } from "next/font/google";

// The app's fonts, set on <html> in the root layout, for every page (guest
// screens, host pages, forms, tables, buttons and printed slips):
//   Noto Sans               English text (400, 600, 700)
//   Noto Sans Devanagari    Marathi, in text and in headings (400, 600, 700)
//   Playfair Display        large English headings (bold only)
// Noto Sans and Playfair have no Devanagari letters, so in mixed text the
// browser draws each Marathi letter from Noto Sans Devanagari, the next font
// in both lists (see globals.css). Latin files are preloaded; the Devanagari
// file loads when Marathi text appears.
const notoSans = Noto_Sans({ weight: ["400", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-noto-sans" });
const notoDeva = Noto_Sans_Devanagari({ weight: ["400", "600", "700"], subsets: ["devanagari"], display: "swap", variable: "--font-noto-sans-deva" });
const playfair = Playfair_Display({ weight: "700", subsets: ["latin"], display: "swap", variable: "--font-playfair-display" });

/** The font variables; the root layout puts them on <html>. */
export const paletteEFonts = `${notoSans.variable} ${notoDeva.variable} ${playfair.variable}`;
