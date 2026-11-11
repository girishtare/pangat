import { Noto_Sans, Noto_Sans_Devanagari, Playfair_Display } from "next/font/google";

// The app's fonts, set on <html> in the root layout, for every page (guest
// screens, host pages, forms, tables, buttons and printed slips):
//   Noto Sans               text, English and Marathi (400, 600, 700)
//   Noto Sans Devanagari    Marathi in headings (700)
//   Playfair Display        large English headings (bold only)
// How Marathi is drawn (checked on the live site, 11 Nov):
// - In text, Google's Noto Sans carries its own Devanagari subset, so Marathi
//   comes from Noto Sans itself (the same Noto design).
// - In headings, Playfair has no Devanagari, so Marathi falls through to
//   Noto Sans Devanagari, the next font in the heading list (globals.css).
// Latin files are preloaded; Devanagari files load only when Marathi appears.
const notoSans = Noto_Sans({ weight: ["400", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-noto-sans" });
const notoDeva = Noto_Sans_Devanagari({ weight: "700", subsets: ["devanagari"], display: "swap", variable: "--font-noto-sans-deva" });
const playfair = Playfair_Display({ weight: "700", subsets: ["latin"], display: "swap", variable: "--font-playfair-display" });

/** The font variables; the root layout puts them on <html>. */
export const paletteEFonts = `${notoSans.variable} ${notoDeva.variable} ${playfair.variable}`;
