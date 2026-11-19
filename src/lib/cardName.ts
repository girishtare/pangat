// The guest's name and place written on their invitation card (owner, 19 Nov).
// The card's first page is the envelope front, with blank lines after "To," /
// "श्री / सौ.". Line 1 = the household's name, line 2 = where they stay.
//
// Positions are fractions of the page, so they work for any page size:
//   x, w   where the lines start, and how wide they are (of the page width)
//   y1     the baseline of line 1 (of the page height, from the top)
//   gap    from one line's baseline to the next (of the page height)
//   size   the letters' size (of the page height); a long name is made smaller to fit w

import type { Side } from "./types";

export type CardLang = "en" | "mr";
export type CardKey = `${Side}-${CardLang}`;

export interface NameLayout {
  x: number;
  w: number;
  y1: number;
  gap: number;
  size: number;
  /** Add "सहपरिवार" (Marathi card) or "and family" (English card) after the name (owner, 19 Nov). */
  family?: boolean;
}

/** Where to start: the lines on the bride's side cards, measured 19 Nov (the owner adjusts and saves). */
export const DEFAULT_LAYOUT: Record<CardLang, NameLayout> = {
  en: { x: 0.28, w: 0.47, y1: 0.512, gap: 0.047, size: 0.022, family: false },
  mr: { x: 0.35, w: 0.39, y1: 0.499, gap: 0.041, size: 0.022, family: true },
};

/** The card's brown, for the written name. */
export const CARD_INK = "#4a2a16";

const LIMITS: Record<Exclude<keyof NameLayout, "family">, [number, number]> = {
  x: [0, 0.95],
  w: [0.05, 1],
  y1: [0.02, 0.98],
  gap: [0.01, 0.2],
  size: [0.008, 0.08],
};

/** A layout from the database or a form, checked; null if it isn't one. */
export function parseLayout(v: unknown): NameLayout | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const out = { family: r.family === true } as NameLayout;
  for (const k of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const n = Number(r[k]);
    if (!Number.isFinite(n) || n < LIMITS[k][0] || n > LIMITS[k][1]) return null;
    out[k] = Math.round(n * 10_000) / 10_000;
  }
  if (out.x + out.w > 1.001) return null;
  return out;
}

/** The saved layouts of an event (events.card_name_layout), the valid ones only. */
export function readLayouts(json: unknown): Partial<Record<CardKey, NameLayout>> {
  const out: Partial<Record<CardKey, NameLayout>> = {};
  if (!json || typeof json !== "object") return out;
  for (const side of ["bride", "groom"] as const) {
    for (const lang of ["en", "mr"] as const) {
      const l = parseLayout((json as Record<string, unknown>)[`${side}-${lang}`]);
      if (l) out[`${side}-${lang}`] = l;
    }
  }
  return out;
}

/** "सहपरिवार" / "and family", unless the name already says it. */
export const FAMILY_WORD: Record<CardLang, string> = { mr: "सहपरिवार", en: "and family" };
const SAYS_FAMILY = /सहपरिवार|परिवार|कुटुंब|famil/i;

/**
 * What goes on the lines: the name in the card's language (English if there's
 * no Marathi name), with "सहपरिवार" / "and family" when the card asks for it;
 * then the place, in Marathi on the Marathi card when the event has it
 * (Places in Marathi), else as typed.
 */
export function cardLines(
  lang: CardLang,
  h: { nameEn: string; nameMr: string | null; location: string | null },
  opts: { family?: boolean; placesMr?: Record<string, string> } = {},
): string[] {
  let name = lang === "mr" && h.nameMr?.trim() ? h.nameMr.trim() : h.nameEn.trim();
  if (opts.family && !SAYS_FAMILY.test(name)) name = `${name} ${FAMILY_WORD[lang]}`;
  const place = (h.location ?? "").trim();
  const shown = lang === "mr" && place ? (opts.placesMr?.[place]?.trim() || place) : place;
  return [name, shown].filter((s, i) => i === 0 || s !== "");
}

/** The event's Marathi place names ({ "Borivali, Mumbai": "बोरिवली, मुंबई" }), the sensible ones only. */
export function readPlaces(json: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!json || typeof json !== "object") return out;
  for (const [en, mr] of Object.entries(json as Record<string, unknown>)) {
    if (typeof mr === "string" && mr.trim() && en.trim() && en.length <= 80 && mr.length <= 80) out[en] = mr.trim();
  }
  return out;
}

/** A tidy file name for a guest's card: "Invitation card - Anita Tare.pdf". */
export function cardFileName(name: string, ext: string): string {
  const clean = name.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "Guest";
  return `Invitation card - ${clean}.${ext}`;
}

/** The card's file type from its stored path. */
export function cardTypeOf(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}

/**
 * A name too long for one line goes on to a second (owner, 19 Nov): the first
 * line takes as many words as fit, the rest go below. `width` measures text in
 * the card's font. One word, or a name that fits, stays on one line.
 */
export function wrapName(name: string, width: (s: string) => number, max: number): string[] {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || width(words.join(" ")) <= max) return [words.join(" ")];
  let i = words.length - 1;
  while (i > 1 && width(words.slice(0, i).join(" ")) > max) i--;
  return [words.slice(0, i).join(" "), words.slice(i).join(" ")];
}
