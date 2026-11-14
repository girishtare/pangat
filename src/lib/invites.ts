/**
 * How a household is invited, and what has gone out (owner, 14 Nov; migration
 * 0025): by printed card, by WhatsApp, or both, each ticked as sent on its own.
 */
export interface InviteModes {
  card: boolean;
  wa: boolean;
  cardSent: boolean;
  waSent: boolean;
}

export type InviteMode = "card" | "wa";

/** Every chosen mode sent: the row turns green. */
export function allSent(m: InviteModes): boolean {
  return (m.card || m.wa) && (!m.card || m.cardSent) && (!m.wa || m.waSent);
}

/** Share of the chosen modes sent, for sorting: 0 none, 1 all. */
export function sentShare(m: InviteModes): number {
  const chosen = (m.card ? 1 : 0) + (m.wa ? 1 : 0);
  if (!chosen) return 0;
  return ((m.card && m.cardSent ? 1 : 0) + (m.wa && m.waSent ? 1 : 0)) / chosen;
}

/** "Card, WhatsApp" etc. from a sheet cell; null = blank (defaults); undefined = unreadable. */
export function parseInviteBy(raw: string): { card: boolean; wa: boolean } | null | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  let card = false;
  let wa = false;
  for (const part of v.split(/\s*(?:,|&|\+|\/|\band\b)\s*/).filter(Boolean)) {
    if (["card", "cards", "printed card", "physical card", "physical", "पत्रिका"].includes(part)) card = true;
    else if (["whatsapp", "wa", "whats app", "व्हॉट्सॲप"].includes(part)) wa = true;
    else if (part === "both") card = wa = true;
    else return undefined;
  }
  return card || wa ? { card, wa } : undefined;
}
