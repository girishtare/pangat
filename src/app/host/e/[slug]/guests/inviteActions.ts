"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hostGate } from "@/lib/host";
import { setInviteModes, setInviteSent } from "@/lib/store/admin";

const sentInput = z.object({ id: z.uuid(), mode: z.enum(["card", "wa"]), sent: z.boolean() });

/** Ticks one household's card or WhatsApp invitation as sent, or not. Any host, for households on their side. */
export async function saveInviteSent(slug: string, id: string, mode: string, sent: boolean): Promise<{ ok: boolean; message?: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const parsed = sentInput.safeParse({ id, mode, sent });
  if (!parsed.success) return { ok: false, message: "Couldn't read that." };
  const changed = await setInviteSent(gate.host.event.id, parsed.data.id, parsed.data.mode, parsed.data.sent, gate.host.side);
  if (changed === 0) return { ok: false, message: "That household isn't on your side of the list." };
  revalidatePath(`/host/e/${slug}/guests`);
  revalidatePath(`/host/e/${slug}/whatsapp`);
  return { ok: true };
}

const modesInput = z.object({ id: z.uuid(), card: z.boolean(), wa: z.boolean() }).refine((v) => v.card || v.wa);

/** Sets how one household is to be invited (at least one of card and WhatsApp). */
export async function saveInviteModes(slug: string, id: string, card: boolean, wa: boolean): Promise<{ ok: boolean; message?: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const parsed = modesInput.safeParse({ id, card, wa });
  if (!parsed.success) return { ok: false, message: "Choose card, WhatsApp or both." };
  const changed = await setInviteModes(gate.host.event.id, parsed.data.id, { card: parsed.data.card, wa: parsed.data.wa }, gate.host.side);
  if (changed === 0) return { ok: false, message: "That household isn't on your side of the list." };
  revalidatePath(`/host/e/${slug}/guests`);
  revalidatePath(`/host/e/${slug}/whatsapp`);
  return { ok: true };
}
