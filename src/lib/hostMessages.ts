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
}

/** The event's invitation or reminder text, filled in for one household. */
export function householdMessage(host: HostContext, base: string, g: Recipient, kind: MessageKind): string {
  const name: Bilingual = host.event.name;
  return fillMessage(host.event.messageText[kind] ?? DEFAULT_TEXT[kind], {
    name: g.nameEn,
    nameMr: g.nameMr,
    event: name.en,
    eventMr: name.mr,
    date: formatDay(host.event.cutoffAt, "en"),
    dateMr: formatDay(host.event.cutoffAt, "mr"),
    phone: displayPhone(host.event.contactPhone[g.side]),
    link: guestLink(base, g.token, "link"),
  });
}

/** wa.me link with that message, or null if the household has no usable mobile. */
export function householdWhatsApp(host: HostContext, base: string, g: Recipient, kind: MessageKind): string | null {
  return whatsappLink(g.mobile, householdMessage(host, base, g, kind));
}
