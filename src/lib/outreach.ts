/**
 * Getting the link to each household: printed slips (QR + short code) and
 * WhatsApp messages sent from a family member's own phone via wa.me links.
 * Pure helpers; no database.
 */

export type MessageKind = "invite" | "reminder";

/** Placeholders hosts can use in the message texts. */
export const PLACEHOLDERS = ["{name}", "{name_mr}", "{event}", "{event_mr}", "{date}", "{date_mr}", "{phone}", "{link}"] as const;

// Marathi first-draft wording: have a native reader check it, like src/lib/i18n.ts.
export const DEFAULT_TEXT: Record<MessageKind, string> = {
  invite:
    "नमस्कार {name_mr}!\n" +
    "{event_mr} साठी आपणांस सस्नेह निमंत्रण. कृपया {date_mr} पर्यंत कोण कोण येणार ते या लिंकवर कळवा.\n\n" +
    "Namaskar {name}!\n" +
    "You are warmly invited to {event}. Please tell us who's coming by {date}, using this link:\n\n" +
    "{link}",
  reminder:
    "नमस्कार {name_mr}!\n" +
    "{event_mr} साठी आपले उत्तर अजून आलेले नाही. कृपया {date_mr} पर्यंत या लिंकवर कळवा.\n\n" +
    "Namaskar {name}!\n" +
    "A gentle reminder: please tell us who's coming to {event} by {date}. It takes a minute:\n\n" +
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
    "{name}": v.name,
    "{name_mr}": v.nameMr || v.name,
    "{event}": v.event,
    "{event_mr}": v.eventMr || v.event,
    "{date}": v.date,
    "{date_mr}": v.dateMr,
    "{phone}": v.phone ?? "",
    "{link}": v.link,
  };
  return template.replace(/\{[a-z_]+\}/g, (m) => map[m] ?? m);
}

/** https://wa.me/<digits>?text=… for an E.164 mobile; null without a usable number. */
export function whatsappLink(mobile: string | null, text: string): string | null {
  const digits = (mobile ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** A guest's personal link. QR codes on slips carry ?s=q so the reply records the channel. */
export function guestLink(base: string, token: string, channel: "qr" | "link"): string {
  return `${base.replace(/\/+$/, "")}/r/${token}${channel === "qr" ? "?s=q" : ""}`;
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
