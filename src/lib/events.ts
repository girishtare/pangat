/**
 * Event setup helpers. All times are Indian Standard Time (UTC+05:30); the
 * pages use <input type="datetime-local"> values like "2026-12-28T11:30".
 */

export interface FunctionTemplate {
  nameEn: string;
  nameMr: string;
  /** Days relative to the wedding date. */
  dayOffset: number;
  time: string; // HH:MM, IST
  catered: boolean;
}

/** What a new wedding starts with. Hosts can rename, re-time, delete or add. */
export const DEFAULT_FUNCTIONS: FunctionTemplate[] = [
  { nameEn: "Haldi", nameMr: "हळद", dayOffset: -1, time: "10:00", catered: true },
  { nameEn: "Wedding", nameMr: "विवाह", dayOffset: 0, time: "11:30", catered: true },
  { nameEn: "Reception", nameMr: "स्वागत समारंभ", dayOffset: 0, time: "19:00", catered: true },
];

/** Replies close this many days before the wedding by default (caterer's count needs time). */
export const DEFAULT_CUTOFF_DAYS = 15;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && !Number.isNaN(new Date(`${date}T00:00:00Z`).getTime()) && shiftDate(date, 0) === date;
}

/** "2026-12-28T11:30" (IST) → "2026-12-28T11:30:00+05:30", or null if malformed. */
export function istInputToIso(value: string): string | null {
  const m = LOCAL_RE.exec(value.trim());
  if (!m || !isValidDate(m[1])) return null;
  const [h, min] = m[2].split(":").map(Number);
  if (h > 23 || min > 59) return null;
  return `${m[1]}T${m[2]}:00+05:30`;
}

/** Any ISO timestamp → "YYYY-MM-DDTHH:MM" in IST, for a datetime-local input. */
export function isoToIstInput(iso: string): string {
  const t = new Date(iso).getTime() + 330 * 60_000;
  return new Date(t).toISOString().slice(0, 16);
}

export function defaultFunctions(weddingDate: string) {
  return DEFAULT_FUNCTIONS.map((f, i) => ({
    nameEn: f.nameEn,
    nameMr: f.nameMr,
    startsAt: `${shiftDate(weddingDate, f.dayOffset)}T${f.time}:00+05:30`,
    catered: f.catered,
    sortOrder: i + 1,
  }));
}

export function defaultCutoff(weddingDate: string): string {
  return `${shiftDate(weddingDate, -DEFAULT_CUTOFF_DAYS)}T23:59`;
}

/** URL name for an event: readable part from the English name plus a random tail. */
export function makeSlug(nameEn: string, random: () => string): string {
  const base =
    nameEn
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "event";
  return `${base}-${random()}`;
}
