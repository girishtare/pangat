"use server";

import { signedInUser } from "@/lib/host";
import { ENGLISH_MAX, isSuggestKind } from "@/lib/marathi";
import { suggestMarathi } from "@/lib/suggest";

export type SuggestState = { ok: true; text: string } | { ok: false; message: string };

/** "Suggest Marathi" on any Marathi name field. Signed-in hosts only; nothing is saved here. */
export async function suggestMarathiAction(kind: string, english: string): Promise<SuggestState> {
  const who = await signedInUser();
  if (!who.ok) return { ok: false, message: "Please sign in again." };
  if (!isSuggestKind(kind)) return { ok: false, message: "Can't suggest for this field." };
  const text = String(english ?? "").replace(/\s+/g, " ").trim();
  if (!text) return { ok: false, message: "Type the English first." };
  if (text.length > ENGLISH_MAX) return { ok: false, message: "That's too long to suggest." };

  const r = await suggestMarathi(kind, text);
  if (r.ok) return r;
  if (r.reason === "not_set_up") return { ok: false, message: "Marathi suggestions aren't set up yet (GEMINI_API_KEY)." };
  if (r.reason === "unusable") return { ok: false, message: "No good suggestion this time. Type it in, or try again." };
  return { ok: false, message: "Couldn't get a suggestion. Try again." };
}
