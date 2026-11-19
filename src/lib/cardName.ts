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
}

/** Where to start: the lines on the bride's side cards, measured 19 Nov (the owner adjusts and saves). */
export const DEFAULT_LAYOUT: Record<CardLang, NameLayout> = {
  en: { x: 0.28, w: 0.47, y1: 0.512, gap: 0.047, size: 0.022 },
  mr: { x: 0.35, w: 0.39, y1: 0.499, gap: 0.041, size: 0.022 },
};

/** The card's brown, for the written name. */
export const CARD_INK = "#4a2a16";

const LIMITS: Record<keyof NameLayout, [number, number]> = {
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
  const out = {} as NameLayout;
  for (const k of Object.keys(LIMITS) as (keyof NameLayout)[]) {
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

/** What goes on the lines: the name in the card's language (English if there's no Marathi name), then the place. */
export function cardLines(lang: CardLang, h: { nameEn: string; nameMr: string | null; location: string | null }): string[] {
  const name = lang === "mr" && h.nameMr?.trim() ? h.nameMr.trim() : h.nameEn.trim();
  return [name, (h.location ?? "").trim()].filter((s, i) => i === 0 || s !== "");
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
