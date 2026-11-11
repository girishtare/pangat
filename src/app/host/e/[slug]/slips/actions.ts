"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hostGate } from "@/lib/host";
import { setSlipLang } from "@/lib/store/admin";

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
