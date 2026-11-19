import { Tiro_Devanagari_Marathi } from "next/font/google";

/**
 * The font the guest's name is written in on their invitation card: a printed
 * serif with Devanagari and Latin, close to the card's own lettering. Italic
 * for English (like the card's script), upright for Marathi. Loaded only on
 * the pages that make a named card.
 */
export const cardFont = Tiro_Devanagari_Marathi({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["devanagari", "latin"],
  display: "swap",
  preload: false,
});
