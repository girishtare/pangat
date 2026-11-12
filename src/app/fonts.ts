import { IBM_Plex_Sans, Noto_Sans, Noto_Sans_Devanagari, Space_Grotesk } from "next/font/google";

// The app's fonts, set on <html> in the root layout, for every page (guest
// screens, host pages, forms, tables, buttons and printed slips). English
// matches the owner's Sutradhar app (owner, 12 Nov); Marathi is unchanged.
//   IBM Plex Sans           English text (400, 500, 600, 700)
//   Space Grotesk           English headings (500, 600, 700)
//   Noto Sans               Marathi in text: Google's Noto Sans carries a Devanagari
//                           subset, and Plex Sans has no Devanagari, so Marathi falls
//                           through to it (not preloaded: only Marathi uses it now)
//   Noto Sans Devanagari    Marathi in headings (700)
// Marathi is drawn at the same size as the English around it, so it scales with it.
const plexSans = IBM_Plex_Sans({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-plex-sans" });
const spaceGrotesk = Space_Grotesk({ weight: ["500", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-space-grotesk" });
const notoSans = Noto_Sans({ weight: ["400", "600", "700"], subsets: ["latin"], display: "swap", preload: false, variable: "--font-noto-sans" });
const notoDeva = Noto_Sans_Devanagari({ weight: "700", subsets: ["devanagari"], display: "swap", variable: "--font-noto-sans-deva" });

/** The font variables; the root layout puts them on <html>. */
export const paletteEFonts = `${plexSans.variable} ${spaceGrotesk.variable} ${notoSans.variable} ${notoDeva.variable}`;
