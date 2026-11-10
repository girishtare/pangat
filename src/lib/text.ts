import type { Lang } from "./types";

/**
 * Splits a message after its first sentence, so a screen can show it as a
 * heading and a line below ("Sorry about that. Enter…" → ["Sorry about that.", "Enter…"]).
 * The wording is unchanged; a message with one sentence comes back whole.
 */
export function splitLead(text: string): [string, string] {
  const m = /^([\s\S]+?[.!?।])\s+([\s\S]+)$/.exec(text.trim());
  return m ? [m[1], m[2]] : [text.trim(), ""];
}

/** The day, or span of days, the given functions fall on (India time): "Sunday, 28 December" or "27–28 December". */
export function eventDays(startTimes: string[], lang: Lang): string | null {
  if (startTimes.length === 0) return null;
  const sorted = startTimes.map((s) => new Date(s)).sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const locale = lang === "mr" ? "mr-IN" : "en-IN";
  const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  if (dayKey(first) === dayKey(last)) {
    return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(first);
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).formatRange(first, last);
}
