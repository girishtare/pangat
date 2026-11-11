import "server-only";
import type { HostContext } from "./host";
import { formatDay } from "./i18n";
import { DEFAULT_TEXT, displayPhone, fillMessage, guestLink, whatsappLink, type MessageKind } from "./outreach";
import type { Bilingual, Side } from "./types";

interface Recipient {
  nameEn: string;
  nameMr: string | null;
  side: Side;
  token: string;
  mobile: string | null;
  /** The household's slip language; also picks which invitation card to link. */
  slipLang?: "both" | "en" | "mr";
}

/** The event's invitation or reminder text, filled in for one household. */
export function householdMessage(host: HostContext, base: string, g: Recipient, kind: MessageKind): string {
  const name: Bilingual = host.event.name;
  return withCardLinks(host, base, g, fillMessage(host.event.messageText[kind] ?? DEFAULT_TEXT[kind], {
    name: g.nameEn,
    nameMr: g.nameMr,
    event: name.en,
    eventMr: name.mr,
    date: formatDay(host.event.cutoffAt, "en"),
    dateMr: formatDay(host.event.cutoffAt, "mr"),
    phone: displayPhone(host.event.contactPhone[g.side]),
    link: guestLink(base, g.token, "link"),
  }));
}

/**
 * WhatsApp links can't carry a file, so the invitation card goes as a link:
 * Marathi, English or both, by the household's slip language, for each of
 * its side's cards the owner has uploaded.
 */
function withCardLinks(host: HostContext, base: string, g: Recipient, text: string): string {
  const lang = g.slipLang ?? "both";
  const root = base.replace(/\/+$/, "");
  const lines: string[] = [];
  const cards = host.event.cards[g.side]; // the household's own side's card
  if (cards.mr && lang !== "en") lines.push(`निमंत्रण पत्रिका: ${root}/r/${g.token}/card?l=mr`);
  if (cards.en && lang !== "mr") lines.push(`Invitation card: ${root}/r/${g.token}/card?l=en`);
  return lines.length ? `${text}\n\n${lines.join("\n")}` : text;
}

/** wa.me link with that message, or null if the household has no usable mobile. */
export function householdWhatsApp(host: HostContext, base: string, g: Recipient, kind: MessageKind): string | null {
  return whatsappLink(g.mobile, householdMessage(host, base, g, kind));
}
