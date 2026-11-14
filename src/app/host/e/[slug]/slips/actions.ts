"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hostGate } from "@/lib/host";
import { setPrintRequested, setSlipLang } from "@/lib/store/admin";

const input = z.object({
  ids: z.array(z.uuid()).min(1).max(2000),
  lang: z.enum(["both", "en", "mr"]),
});

/** Any host may set the slip language of the households on their side (the owner: both sides). */
export async function saveSlipLang(slug: string, ids: string[], lang: string): Promise<{ ok: boolean; message?: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const parsed = input.safeParse({ ids, lang });
  if (!parsed.success) return { ok: false, message: "Choose English, Marathi or both." };
  await setSlipLang(gate.host.event.id, parsed.data.ids, parsed.data.lang, gate.host.side);
  revalidatePath(`/host/e/${slug}/slips`);
  return { ok: true };
}

const printInput = z.object({ ids: z.array(z.uuid()).min(1).max(2000), on: z.boolean() });

/** Puts households on the print list, or takes them off (owner, 14 Nov). Any host, their side only. */
export async function savePrintRequest(slug: string, ids: string[], on: boolean): Promise<{ ok: boolean; message?: string; changed?: number }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: "Please sign in again." };
  const parsed = printInput.safeParse({ ids, on });
  if (!parsed.success) return { ok: false, message: "Couldn't read which households." };
  const changed = await setPrintRequested(gate.host.event.id, parsed.data.ids, parsed.data.on, gate.host.side);
  if (changed === 0) return { ok: false, message: "Those households aren't on your side of the list." };
  revalidatePath(`/host/e/${slug}/slips`);
  revalidatePath(`/host/e/${slug}/guests`);
  return { ok: true, changed };
}
