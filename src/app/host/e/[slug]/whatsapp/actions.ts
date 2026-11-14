"use server";

import { revalidatePath } from "next/cache";
import { hostGate } from "@/lib/host";
import { DEFAULT_TEXT, type MessageKind } from "@/lib/outreach";
import { readCount } from "@/lib/pilot";
import { addEffort, loadHousehold, recordNudge, saveMessageText, setInviteModes, setInviteSent } from "@/lib/store/admin";

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
