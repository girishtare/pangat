/**
 * Getting the link to each household: printed slips (QR + short code) and
 * WhatsApp messages sent from a family member's own phone via wa.me links.
 * Pure helpers; no database.
 */

export type MessageKind = "invite" | "reminder";

/**
 * Placeholders hosts can use in the message texts. Every language has its own
 * suffix (_en, _mr) so more languages can be added later. The old unsuffixed
 * {name}, {event} and {date} still work in texts saved before (same as _en).
 */
export const PLACEHOLDERS = ["{name_en}", "{name_mr}", "{event_en}", "{event_mr}", "{date_en}", "{date_mr}", "{phone}", "{link}", "{card_mr}", "{card_en}"] as const;

/** The invitation card links (owner, 19 Nov). A line holding one is left out when that card isn't there. */
export const CARD_PLACEHOLDERS = { mr: "{card_mr}", en: "{card_en}" } as const;

// Marathi first-draft wording: have a native reader check it, like src/lib/i18n.ts.
export const DEFAULT_TEXT: Record<MessageKind, string> = {
  // The card link first, then the reply link, in each language (owner, 19 Nov).
  invite:
    "नमस्कार {name_mr}!\n" +
    "{event_mr} साठी आपणांस सस्नेह निमंत्रण.\n" +
    "निमंत्रण पत्रिका: {card_mr}\n" +
    "कृपया {date_mr} पर्यंत कोण कोण येणार ते या लिंकवर कळवा: {link}\n\n" +
    "Namaskar {name_en}!\n" +
    "You are warmly invited to {event_en}.\n" +
    "Invitation card: {card_en}\n" +
    "Please tell us who's coming by {date_en}, using this link: {link}",
  reminder:
    "नमस्कार {name_mr}!\n" +
    "{event_mr} साठी आपले उत्तर अजून आलेले नाही. कृपया {date_mr} पर्यंत या लिंकवर कळवा.\n\n" +
    "Namaskar {name_en}!\n" +
    "A gentle reminder: please tell us who's coming to {event_en} by {date_en}. It takes a minute:\n\n" +
    "{link}",
};

export interface MessageVars {
  name: string;
  nameMr: string | null;
  event: string;
  eventMr: string | null;
  date: string;
  dateMr: string;
  phone: string | null;
  link: string;
  /** The invitation card links; null or missing when that card isn't uploaded (or not for this household). */
  cardMr?: string | null;
  cardEn?: string | null;
}

/** Fills {placeholders}; Marathi ones fall back to English when missing. Unknown braces are left alone. */
export function fillMessage(template: string, v: MessageVars): string {
  // A line with a card link that isn't there goes, label and all ("Invitation card: ").
  const lines = template.split("\n").filter((l) => !(l.includes(CARD_PLACEHOLDERS.mr) && !v.cardMr) && !(l.includes(CARD_PLACEHOLDERS.en) && !v.cardEn));
  template = lines.join("\n");
  const map: Record<string, string> = {
    "{name_en}": v.name,
    "{name_mr}": v.nameMr || v.name,
    "{event_en}": v.event,
    "{event_mr}": v.eventMr || v.event,
    "{date_en}": v.date,
    "{date_mr}": v.dateMr,
    // Older names, kept so texts saved before still fill in.
    "{name}": v.name,
    "{event}": v.event,
    "{date}": v.date,
    "{phone}": v.phone ?? "",
    "{link}": v.link,
    "{card_mr}": v.cardMr ?? "",
    "{card_en}": v.cardEn ?? "",
  };
  return template.replace(/\{[a-z_]+\}/g, (m) => map[m] ?? m);
}

/**
 * A household's message in its language (owner, 14 Nov): the texts are written
 * Marathi paragraph(s), then English. Paragraphs (split at blank lines) with
 * Devanagari are Marathi; those with other words (placeholders aside) are
 * English; the rest (the {link} line) always stays. English households get the
 * English paragraphs, Marathi ones the Marathi; Both, or a text that isn't
 * split that way, gets everything.
 */
export function textForLanguage(template: string, lang: "both" | "en" | "mr"): string {
  if (lang === "both") return template;
  const paras = template.split(/\n[ \t]*\n/);
  const kind = (p: string) => (/[\u0900-\u097F]/.test(p) ? "mr" : /[A-Za-z]/.test(p.replace(/\{[a-z_]+\}/g, "")) ? "en" : "any");
  const kept = paras.filter((p) => {
    const k = kind(p);
    return k === "any" || k === lang;
  });
  // Nothing in that language (e.g. a custom text in one language only): send it as written.
  if (!kept.some((p) => kind(p) === lang)) return template;
  return kept.join("\n\n");
}

/** https://wa.me/<digits>?text=… for an E.164 mobile; null without a usable number. */
export function whatsappLink(mobile: string | null, text: string): string | null {
  const digits = (mobile ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** A guest's personal link. QR codes on slips carry ?s=q so the reply records the channel. */
export function guestLink(base: string, token: string, channel: "qr" | "link", lang?: "en" | "mr"): string {
  const q = new URLSearchParams();
  if (channel === "qr") q.set("s", "q");
  if (lang) q.set("l", lang); // a one-language slip opens the reply page in that language
  const qs = q.toString();
  return `${base.replace(/\/+$/, "")}/r/${token}${qs ? `?${qs}` : ""}`;
}

/**
 * The short links in WhatsApp messages (owner, 19 Nov; migration 0032): /i/<code> opens the reply page,
 * /i/<code>/mr or /en the invitation card. Ten letters and digits instead of the 22-character token.
 */
export function shortLink(base: string, linkCode: string, card?: "en" | "mr"): string {
  return `${base.replace(/\/+$/, "")}/i/${linkCode}${card ? `/${card}` : ""}`;
}

export function isLinkCode(value: string): boolean {
  return /^[A-Za-z0-9]{10}$/.test(value);
}

/** Shows a stored +91 mobile the way people write it: 98765 43210. */
export function displayPhone(mobile: string | null): string | null {
  if (!mobile) return null;
  const m = /^\+91(\d{5})(\d{5})$/.exec(mobile);
  return m ? `${m[1]} ${m[2]}` : mobile;
}

/** Splits a list into pages of n (8 slips per A4 sheet). */
export function chunk<T>(items: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}
