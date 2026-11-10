"use server";

import { revalidatePath } from "next/cache";
import { hostGate } from "@/lib/host";
import { canNameMatch, canSeeLookup } from "@/lib/lookup";
import { listPendingLookups, recordNudge, resolveLookup } from "@/lib/store/admin";

/** A host deals with a "not us" request: sent the matched household its link, or dismissed it. */
export async function resolveLookupAction(slug: string, id: number, status: "sent" | "dismissed"): Promise<{ ok: boolean }> {
  if (status !== "sent" && status !== "dismissed") return { ok: false };
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false };
  const { host } = gate;
  const req = (await listPendingLookups(host.event.id)).find((r) => r.id === id);
  if (!req || !canSeeLookup(host.side, req.opened.side, req.matched?.side ?? null)) return { ok: false };
  if (status === "sent" && (!req.matched || !canNameMatch(host.side, req.matched.side))) return { ok: false };

  await resolveLookup(host.event.id, id, status, host.userId);
  if (status === "sent" && req.matched) await recordNudge(req.matched.id, "invite", host.userId);
  revalidatePath("/host", "layout");
  return { ok: true };
}
