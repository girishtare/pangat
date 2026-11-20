"use server";

import { revalidatePath } from "next/cache";
import { normaliseMobile } from "@/lib/guestlist";
import { getStore, isDemo } from "@/lib/store";
import { cardFileName, cardLines, cardTypeOf, type CardLang, type NameLayout } from "@/lib/cardName";
import { cardSignedUrl, createLookupRequest, namedCardForGuest } from "@/lib/store/admin";
import { isPlausibleToken } from "@/lib/token";
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

export type NotUsResult = { ok: true } | { ok: false; error: "bad_mobile" | "failed" };

/**
 * "This isn't us": the guest leaves their mobile so a host can send them their
 * own link. Always answers the same way whether or not a household matched,
 * so the guest list can't be probed through this form.
 */
export async function reportNotUs(token: unknown, mobile: unknown): Promise<NotUsResult> {
  if (typeof token !== "string" || !isPlausibleToken(token) || typeof mobile !== "string" || mobile.length > 30) {
    return { ok: false, error: "failed" };
  }
  const m = normaliseMobile(mobile);
  if (!m.ok || !m.value) return { ok: false, error: "bad_mobile" };
  if (isDemo()) return { ok: true }; // nothing to store in demo mode

  const view = await getStore().getHouseholdByToken(token);
  if (!view) return { ok: false, error: "failed" };
  try {
    await createLookupRequest(view.event.id, view.household.id, m.value);
  } catch (err) {
    console.error("reportNotUs failed", err);
    return { ok: false, error: "failed" };
  }
  revalidatePath("/host", "layout");
  return { ok: true };
}

export interface GuestCard {
  /** The plain card, a link that works for an hour. */
  url: string;
  type: string;
  /** The household's name lines, and where they go; no layout = the plain card. */
  lines: string[];
  layout: NameLayout | null;
  fileName: string;
}

/**
 * The card a guest's phone makes with their name on it, right on the reply page
 * (owner, 20 Nov: no separate card page). Keyed by the household's token, like
 * the reply itself; null when that card isn't uploaded.
 */
export async function guestCard(token: unknown, lang: unknown): Promise<GuestCard | null> {
  if (typeof token !== "string" || !isPlausibleToken(token) || (lang !== "en" && lang !== "mr") || isDemo()) return null;
  try {
    const card = await namedCardForGuest(token, lang as CardLang);
    if (!card) return null;
    const type = cardTypeOf(card.path);
    return {
      url: await cardSignedUrl(card.path),
      type,
      lines: card.layout ? cardLines(lang as CardLang, card, { family: card.layout.family, placesMr: card.placesMr }) : [],
      layout: card.layout,
      fileName: cardFileName(card.nameEn, type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg"),
    };
  } catch (err) {
    console.error("guestCard failed", err);
    return null;
  }
}
