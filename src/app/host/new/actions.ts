"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { defaultCutoff, defaultFunctions, istInputToIso, isValidDate, makeSlug } from "@/lib/events";
import { signedInUser } from "@/lib/host";
import { createEvent, slugTaken } from "@/lib/store/admin";

export type NewEventState = { error: string } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const tail = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export async function createEventAction(_prev: NewEventState, formData: FormData): Promise<NewEventState> {
  const who = await signedInUser();
  if (!who.ok) return { error: who.reason === "demo" ? "Events can't be created in demo mode." : "Please sign in again." };

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
