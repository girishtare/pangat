// Short English dates and times for the host screens, in India time:
// "Sun 28 Dec" and "Sun 28 Dec · 11:30 am" (whole hours drop ":00").

function parts(iso: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: "Asia/Kolkata" }).formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

export function shortDay(iso: string): string {
  const p = parts(iso, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday} ${p.day} ${p.month}`;
}

export function shortTime(iso: string): string {
  const p = parts(iso, { hour: "numeric", minute: "2-digit", hour12: true });
  const period = (p.dayPeriod ?? "").toLowerCase().replace(/\./g, "");
  return `${p.hour}${p.minute === "00" ? "" : `:${p.minute}`} ${period}`.trim();
}

export function shortWhen(iso: string): string {
  return `${shortDay(iso)} · ${shortTime(iso)}`;
}

/** "14 Dec, 9:12 pm", for freeze times. */
export function shortStamp(iso: string): string {
  const p = parts(iso, { day: "numeric", month: "short" });
  return `${p.day} ${p.month}, ${shortTime(iso)}`;
}
