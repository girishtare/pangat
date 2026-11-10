"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/store";
import { normalise, submissionSchema } from "@/lib/validate";

export type SubmitResult = { ok: true } | { ok: false; error: "invalid" | "not_found" | "closed" | "incomplete" | "failed" };

export async function submitReply(input: unknown): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const store = getStore();
  const view = await store.getHouseholdByToken(parsed.data.token);
  if (!view) return { ok: false, error: "not_found" };
  if (Date.now() > new Date(view.event.cutoffAt).getTime()) return { ok: false, error: "closed" };

  const result = normalise(parsed.data.answers, view.functions);
  if (!result.ok) return { ok: false, error: result.error === "missing_function" ? "incomplete" : "invalid" };

  try {
    await store.saveResponses(view.household.id, result.answers, parsed.data.source);
  } catch (err) {
    console.error("submitReply failed", err);
    return { ok: false, error: "failed" };
  }
  revalidatePath(`/r/${parsed.data.token}`);
  revalidatePath("/host", "layout");
  return { ok: true };
}
