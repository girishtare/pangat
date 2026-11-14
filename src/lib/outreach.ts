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
export const PLACEHOLDERS = ["{name_en}", "{name_mr}", "{event_en}", "{event_mr}", "{date_en}", "{date_mr}", "{phone}", "{link}"] as const;

// Marathi first-draft wording: have a native reader check it, like src/lib/i18n.ts.
export const DEFAULT_TEXT: Record<MessageKind, string> = {
  invite:
    "नमस्कार {name_mr}!\n" +
    "{event_mr} साठी आपणांस सस्नेह निमंत्रण. कृपया {date_mr} पर्यंत कोण कोण येणार ते या लिंकवर कळवा.\n\n" +
    "Namaskar {name_en}!\n" +
    "You are warmly invited to {event_en}. Please tell us who's coming by {date_en}, using this link:\n\n" +
    "{link}",
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
}

/** Fills {placeholders}; Marathi ones fall back to English when missing. Unknown braces are left alone. */
export function fillMessage(template: string, v: MessageVars): string {
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
