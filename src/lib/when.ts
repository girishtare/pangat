// Short English dates and times for the host screens, in India time.
// Times are always hh:mm am/pm: "Sun 28 Dec · 03:00 pm".

function parts(iso: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "Asia/Kolkata" }).formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

export function shortDay(iso: string): string {
  const p = parts(iso, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "03:00 pm": two-digit hour, minutes, lower-case am/pm. Used for every time the app shows. */
export function shortTime(iso: string): string {
  const p = parts(iso, { hour: "2-digit", minute: "2-digit", hour12: true });
  const period = (p.dayPeriod ?? "").toLowerCase().replace(/\./g, "");
  return `${p.hour.padStart(2, "0")}:${p.minute} ${period}`.trim();
}

export function shortWhen(iso: string): string {
  return `${shortDay(iso)} · ${shortTime(iso)}`;
}

/** "14 Dec, 09:12 pm", for freeze and send times. */
export function shortStamp(iso: string): string {
  const p = parts(iso, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}, ${shortTime(iso)}`;
}

/** "10 Nov 2026, 03:19 pm", where the year matters (sign-ins, log entries). */
export function longStamp(iso: string): string {
  const p = parts(iso, { day: "numeric", month: "short", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}, ${shortTime(iso)}`;
}

/** "24th December 2026" and "२४ डिसेंबर २०२६": the reply-by date printed on slips. */
export function slipDate(iso: string): { en: string; mr: string } {
  const en = parts(iso, { day: "numeric", month: "long", year: "numeric" });
  const d = Number(en.day);
  const suffix = d % 100 >= 11 && d % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[d % 10] ?? "th";
  const mr: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("mr-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).formatToParts(new Date(iso)))
    mr[p.type] = p.value;
  return { en: `${d}${suffix} ${en.month} ${en.year}`, mr: `${mr.day} ${mr.month} ${mr.year}` };
}

/** "10 Feb 2027", for event dates in lists. */
export function dayMonthYear(iso: string): string {
  const p = parts(iso, { day: "numeric", month: "short", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}`;
}
