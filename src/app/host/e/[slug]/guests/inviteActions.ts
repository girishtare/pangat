"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hostGate } from "@/lib/host";
import { setInviteSent } from "@/lib/store/admin";

const input = z.object({
  id: z.uuid(),
  via: z.enum(["card", "whatsapp", "both"]).nullable(),
});

/** Marks one household's invitation sent (and how) or not sent. Any host, for households on their side (the owner: both). */
export async function saveInviteSent(slug: string, id: string, via: string | null): Promise<{ ok: boolean; message?: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const parsed = input.safeParse({ id, via });
  if (!parsed.success) return { ok: false, message: "Choose card, WhatsApp or both." };
  const changed = await setInviteSent(gate.host.event.id, parsed.data.id, parsed.data.via, gate.host.side);
  if (changed === 0) return { ok: false, message: "That household isn't on your side of the list." };
  revalidatePath(`/host/e/${slug}/guests`);
  return { ok: true };
}
