"use server";

import { revalidatePath } from "next/cache";
import { hostGate } from "@/lib/host";
import { DEFAULT_TEXT, type MessageKind } from "@/lib/outreach";
import { readCount } from "@/lib/pilot";
import { cardLines, cardTypeOf, type CardLang, type NameLayout } from "@/lib/cardName";
import { addEffort, cardSignedUrl, loadHousehold, namedCardForGuest, recordNudge, saveMessageText, setInviteModes, setInviteSent } from "@/lib/store/admin";

export type FormState = { ok: boolean; message: string } | null;

/** Called when a host taps "Open in WhatsApp" for a household. */
export async function recordSend(slug: string, householdId: string, kind: MessageKind): Promise<{ ok: boolean }> {
  if (kind !== "invite" && kind !== "reminder") return { ok: false };
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false };
  const hh = await loadHousehold(gate.host.event.id, householdId);
  if (!hh || (gate.host.side && gate.host.side !== hh.side)) return { ok: false };
  await recordNudge(hh.id, kind, gate.host.userId);
  // An invitation sent here counts as the WhatsApp invitation going out (owner, 14 Nov): WhatsApp becomes one of
  // their modes if it wasn't, and is ticked as sent on the Guest list.
  if (kind === "invite") {
    if (!hh.inviteBy.wa) await setInviteModes(gate.host.event.id, hh.id, { card: hh.inviteBy.card, wa: true }, gate.host.side);
    await setInviteSent(gate.host.event.id, hh.id, "wa", true, gate.host.side);
    revalidatePath(`/host/e/${slug}/guests`);
  }
  revalidatePath(`/host/e/${slug}/whatsapp`);
  return { ok: true };
}

export interface CardToShare {
  /** A link to the card file that works for an hour. */
  url: string;
  type: string;
  lang: CardLang;
  /** Where the name goes (null: send the plain card) and the lines to write. */
  layout: NameLayout | null;
  lines: string[];
  /** For the file name: "Invitation card - <name>.pdf". */
  name: string;
}

/**
 * The household's invitation card(s) for Share card (owner, 19 Nov): their side's card in their language
 * (Both: Marathi and English), with the lines to write on it.
 */
export async function cardsToShare(slug: string, householdId: string): Promise<{ ok: true; cards: CardToShare[] } | { ok: false; message: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const hh = await loadHousehold(gate.host.event.id, householdId);
  if (!hh || (gate.host.side && gate.host.side !== hh.side)) return { ok: false, message: "That household isn't on your list." };
  const langs: CardLang[] = hh.slipLang === "both" ? ["mr", "en"] : [hh.slipLang];
  const cards: CardToShare[] = [];
  for (const lang of langs) {
    const c = await namedCardForGuest(hh.token, lang);
    if (!c) continue;
    cards.push({
      url: await cardSignedUrl(c.path),
      type: cardTypeOf(c.path),
      lang,
      layout: c.layout,
      lines: c.layout ? cardLines(lang, c, { family: c.layout.family, placesMr: c.placesMr }) : [],
      name: langs.length > 1 ? `${c.nameEn} (${lang === "mr" ? "Marathi" : "English"})` : c.nameEn,
    });
  }
  if (!cards.length) {
    const side = hh.side === "bride" ? "bride's side" : "groom's side";
    return { ok: false, message: `No invitation card is uploaded for the ${side} in this language yet (Event settings, Invitation card).` };
  }
  return { ok: true, cards };
}

export async function saveText(slug: string, kind: MessageKind, _prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  if (!gate.host.canManage) return { ok: false, message: "Only the event's owner can change the messages." };
  const reset = fd.get("reset") === "1";
  const text = String(fd.get("text") ?? "").replace(/\r\n/g, "\n").trim();
  if (!reset) {
    if (!text) return { ok: false, message: "The message can't be empty." };
    if (text.length > 1500) return { ok: false, message: "Keep the message under 1,500 characters." };
    if (!text.includes("{link}")) return { ok: false, message: "Keep {link} in the message: it becomes the household's own reply link." };
  }
  await saveMessageText(gate.host.event.id, kind, reset || text === DEFAULT_TEXT[kind] ? null : text);
  revalidatePath(`/host/e/${slug}/whatsapp`);
  return { ok: true, message: reset ? "Back to the standard message." : "Message saved." };
}

export async function logEffort(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const loggedOn = String(fd.get("loggedOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(loggedOn)) return { ok: false, message: "Choose the date." };
  const minutes = readCount(fd.get("minutes"), 1440);
  const calls = readCount(fd.get("calls"), 500);
  if (!minutes.ok || !calls.ok) return { ok: false, message: "Minutes and calls must be whole numbers." };
  if (!minutes.value && !calls.value) return { ok: false, message: "Enter the minutes spent, the number of calls, or both." };
  const note = String(fd.get("note") ?? "").replace(/\s+/g, " ").trim().slice(0, 300) || null;
  await addEffort(gate.host.event.id, gate.host.userId, { loggedOn, minutes: minutes.value ?? 0, calls: calls.value ?? 0, note });
  revalidatePath(`/host/e/${slug}/whatsapp`);
  return { ok: true, message: "Logged. Thank you: this is what tells us whether Pangat saves effort." };
}
