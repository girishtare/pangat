import "server-only";
import type { HostContext } from "./host";
import { formatDay } from "./i18n";
import { DEFAULT_TEXT, displayPhone, fillMessage, guestLink, shortLink, textForLanguage, whatsappLink, type MessageKind } from "./outreach";
import type { Bilingual, Side } from "./types";

interface Recipient {
  nameEn: string;
  nameMr: string | null;
  side: Side;
  token: string;
  /** The short key for /i/ links (migration 0032); the long token links are used without it. */
  linkCode?: string | null;
  mobile: string | null;
  /** The household's slip language; also picks which invitation card to link. */
  slipLang?: "both" | "en" | "mr";
}

/**
 * The event's invitation or reminder text, filled in for one household, in its
 * language (owner, 14 Nov): English or Marathi only, or both. Its link opens
 * the reply page in that language (Both: Marathi, the guest can switch).
 */
export function householdMessage(host: HostContext, base: string, g: Recipient, kind: MessageKind): string {
  const name: Bilingual = host.event.name;
  const lang = g.slipLang ?? "both";
  const template = host.event.messageText[kind] ?? DEFAULT_TEXT[kind];
  const cards = cardLinks(host, base, g);
  return fillMessage(textForLanguage(template, lang), {
    name: g.nameEn,
    nameMr: g.nameMr,
    event: name.en,
    eventMr: name.mr,
    date: formatDay(host.event.cutoffAt, "en"),
    dateMr: formatDay(host.event.cutoffAt, "mr"),
    phone: displayPhone(host.event.contactPhone[g.side]),
    // /i/<code> opens the reply page in the household's language, like ?l= on the long link.
    link: g.linkCode ? shortLink(base, g.linkCode) : guestLink(base, g.token, "link", lang === "both" ? undefined : lang),
    cardMr: cards.mr,
    cardEn: cards.en,
  });
}

/**
 * The card links for {card_mr} and {card_en}, when a text uses them (the reply
 * page shows the cards, so the standard text doesn't): Marathi, English or both,
 * by the household's slip language, for each of its side's cards the owner has
 * uploaded (null where there is none). Nothing is added to a text without them.
 */
function cardLinks(host: HostContext, base: string, g: Recipient): { mr: string | null; en: string | null } {
  const lang = g.slipLang ?? "both";
  const root = base.replace(/\/+$/, "");
  const cards = host.event.cards[g.side]; // the household's own side's card
  const link = (l: "mr" | "en") => (g.linkCode ? shortLink(base, g.linkCode, l) : `${root}/r/${g.token}/card?l=${l}`);
  return {
    mr: cards.mr && lang !== "en" ? link("mr") : null,
    en: cards.en && lang !== "mr" ? link("en") : null,
  };
}

/** wa.me link with that message, or null if the household has no usable mobile. */
export function householdWhatsApp(host: HostContext, base: string, g: Recipient, kind: MessageKind): string | null {
  return whatsappLink(g.mobile, householdMessage(host, base, g, kind));
}
