import { Mukta, Rozha_One } from "next/font/google";

// The app's two fonts, set on <html> in the root layout. Rozha One (display,
// weight 400 only, 20 px and up) and Mukta (text). Both cover Devanagari:
// Latin is preloaded, the Devanagari files load when Marathi text appears.
const rozha = Rozha_One({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-rozha-one" });
const mukta = Mukta({ weight: ["400", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-mukta-sans" });

/** The font variables; the root layout puts them on <html>. */
export const paletteEFonts = `${rozha.variable} ${mukta.variable}`;
