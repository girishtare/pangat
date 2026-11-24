"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hostGate } from "@/lib/host";
import { clearReply } from "@/lib/store/replies";

export type ClearState = { ok: boolean; message: string } | null;

/** Owner only: the household goes back to waiting and can reply again with the same link. */
export async function clearHouseholdReply(slug: string, householdId: string): Promise<ClearState> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { ok: false, message: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  if (gate.host.role !== "owner") return { ok: false, message: "Only the event's owner can clear a reply." };
  if (!z.uuid().safeParse(householdId).success) return { ok: false, message: "That household isn't on this event." };

  let result: Awaited<ReturnType<typeof clearReply>>;
  try {
    result = await clearReply(gate.host.event.id, householdId);
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Couldn't clear that reply. Please try again." };
  }
  if (!result) return { ok: false, message: "That household isn't on this event." };

  revalidatePath("/host", "layout");
  revalidatePath("/r/[token]", "page");
  return result.removed === 0
    ? { ok: true, message: `${result.name} had no reply to clear.` }
    : { ok: true, message: `Cleared ${result.name}'s reply. They are back to waiting and can reply again.` };
}
