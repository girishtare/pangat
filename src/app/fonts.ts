import { Mukta, Rozha_One } from "next/font/google";

// Palette E fonts, for the public pages (landing and guest reply) only.
// Host screens stay on Noto (root layout). Latin is preloaded; the
// Devanagari files load on demand when Marathi text appears.
const rozha = Rozha_One({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-rozha-one" });
const mukta = Mukta({ weight: ["400", "600", "700"], subsets: ["latin"], display: "swap", variable: "--font-mukta-sans" });

/** Put on the outermost element of a palette E page, with `font-body-e`. */
export const paletteEFonts = `${rozha.variable} ${mukta.variable}`;
