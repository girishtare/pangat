"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { defaultCutoff, defaultFunctions, istInputToIso, isValidDate, makeSlug } from "@/lib/events";
import { signedInUser } from "@/lib/host";
import { createEvent, MAX_OWNED_EVENTS, ownedEventCount, slugTaken } from "@/lib/store/admin";

export type NewEventState = { error: string } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const tail = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function createEventAction(_prev: NewEventState, formData: FormData): Promise<NewEventState> {
  const who = await signedInUser();
  if (!who.ok) return { error: who.reason === "demo" ? "Events can't be created in demo mode." : "Please sign in again." };

  if (text(formData.get("kind")) !== "wedding") return { error: "Choose the kind of event." };
  if ((await ownedEventCount(who.userId)) >= MAX_OWNED_EVENTS) {
    return { error: `You already run ${MAX_OWNED_EVENTS} events. Write to us if you need more.` };
  }

  const nameEn = text(formData.get("nameEn"));
  const nameMr = text(formData.get("nameMr")) || null;
  const weddingDate = text(formData.get("weddingDate"));
  const cutoffRaw = text(formData.get("cutoff"));

  if (!nameEn || nameEn.length > 120) return { error: "Enter the event's name (up to 120 characters)." };
  if (nameMr && nameMr.length > 120) return { error: "The Marathi name is too long (up to 120 characters)." };
  if (!isValidDate(weddingDate)) return { error: "Choose the wedding date." };
  const cutoffAt = istInputToIso(cutoffRaw || defaultCutoff(weddingDate));
  if (!cutoffAt) return { error: "The reply cut-off isn't a valid date and time." };

  let slug = makeSlug(nameEn, tail);
  for (let i = 0; i < 5 && (await slugTaken(slug)); i++) slug = makeSlug(nameEn, tail);

  try {
    await createEvent({
      userId: who.userId,
      slug,
      nameEn,
      nameMr,
      cutoffAt,
      functions: defaultFunctions(weddingDate).map((f) => ({ ...f, venue: null })),
    });
  } catch (err) {
    console.error("createEventAction failed", err);
    return { error: "Creating the event failed. Please try again." };
  }
  redirect(`/host/e/${slug}/settings`);
}
