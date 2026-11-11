"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normaliseMobile, parseSide } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { deleteHousehold, loadHousehold, saveOnBehalf, updateHousehold, type HouseholdDetail } from "@/lib/store/admin";
import { loadHouseholdKeys } from "@/lib/store/supabase";
import type { ArrivalSlot, FunctionInfo } from "@/lib/types";
import { MAX_HEADS, normalise } from "@/lib/validate";

export type FormState = { ok: boolean; message: string } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();
const SIDE_NAMES = { bride: "bride's side", groom: "groom's side" } as const;

/** The signed-in host, and the household, if this host may see it (their side, or both). */
async function access(slug: string, id: string): Promise<{ host: HostContext; hh: HouseholdDetail } | { error: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { error: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  const hh = await loadHousehold(gate.host.event.id, id);
  if (!hh || (gate.host.side && gate.host.side !== hh.side)) return { error: "That household isn't on your list." };
  return { host: gate.host, hh };
}

const done = (message: string): FormState => {
  revalidatePath("/host", "layout");
  return { ok: true, message };
};

/** A reply taken over the phone or in person. Allowed after the guests' cut-off. */
export async function recordReply(slug: string, id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await access(slug, id);
  if ("error" in who) return { ok: false, message: who.error };
  const { host, hh } = who;

  const invited: FunctionInfo[] = host.functions
    .filter((f) => hh.functionIds.includes(f.id))
    .map((f) => ({ id: f.id, name: f.name, startsAt: f.startsAt, venue: f.venue, mapUrl: f.mapUrl, catered: f.catered }));
  const answers = [];
  for (const f of invited) {
    const coming = text(fd.get(`coming_${f.id}`));
    if (coming !== "yes" && coming !== "no") return { ok: false, message: `${f.name.en}: choose Coming or Not coming.` };
    const heads = Number(text(fd.get(`heads_${f.id}`)) || "0");
    const veg = Number(text(fd.get(`veg_${f.id}`)) || "0");
    if (!Number.isInteger(heads) || !Number.isInteger(veg) || heads < 0 || veg < 0 || heads > MAX_HEADS || veg > MAX_HEADS) {
      return { ok: false, message: `${f.name.en}: people and vegetarian must be whole numbers up to ${MAX_HEADS}.` };
    }
    const slot = text(fd.get(`arrival_${f.id}`));
    const arrivalSlot = (["early", "on_time", "late"] as const).includes(slot as ArrivalSlot) ? (slot as ArrivalSlot) : null;
    answers.push({ functionId: f.id, coming: coming === "yes", heads, veg, arrivalSlot });
  }

  const result = normalise(answers, invited);
  if (!result.ok) {
    const message =
      result.error === "heads_required"
        ? "For a function they are coming to, enter at least 1 person."
        : result.error === "veg_exceeds_heads"
          ? "Vegetarian can't be more than the number of people."
          : "Answer every function they are invited to.";
    return { ok: false, message };
  }
  await saveOnBehalf(hh.id, result.answers, host.userId);
  return done("Reply saved. What you changed is marked as entered by a host.");
}

export async function saveHousehold(slug: string, id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await access(slug, id);
  if ("error" in who) return { ok: false, message: who.error };
  const { host, hh } = who;

  const nameEn = text(fd.get("nameEn"));
  const nameMr = text(fd.get("nameMr")) || null;
  if (!nameEn || nameEn.length > 120) return { ok: false, message: "Enter the household's name (up to 120 characters)." };
  if (nameMr && nameMr.length > 120) return { ok: false, message: "The Marathi name is too long." };

  const side = host.side ?? parseSide(text(fd.get("side")));
  if (!side) return { ok: false, message: "Choose bride or groom." };

  const mob = normaliseMobile(text(fd.get("mobile")));
  if (!mob.ok) return { ok: false, message: "That mobile number doesn't look right." };

  const capRaw = text(fd.get("cap"));
  const cap = capRaw === "" ? null : Number(capRaw);
  if (cap !== null && (!Number.isInteger(cap) || cap < 1 || cap > MAX_HEADS)) return { ok: false, message: `Cap must be from 1 to ${MAX_HEADS}, or blank.` };

  const valid = new Set(host.functions.map((f) => f.id));
  const functionIds = fd.getAll("functions").map(String).filter((f) => valid.has(f));
  const replied = hh.responses.map((r) => r.functionId);
  for (const f of replied) if (!functionIds.includes(f)) functionIds.push(f); // can't uninvite after a reply
  if (functionIds.length === 0) return { ok: false, message: "Tick at least one function." };

  const others = (await loadHouseholdKeys(host.event.id)).filter((k) => k.id !== hh.id);
  const key = (s: string) => s.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  if (others.some((o) => o.side === side && key(o.nameEn) === key(nameEn))) {
    return { ok: false, message: "Another household on this side already has that name." };
  }
  const sameMobile = mob.value ? others.find((o) => o.mobile === mob.value) : undefined;
  if (sameMobile && sameMobile.side === side) return { ok: false, message: "Another household on this side already has that mobile." };

  await updateHousehold(host.event.id, hh.id, { side, nameEn, nameMr, mobile: mob.value, softCap: cap }, functionIds);
  return done(sameMobile ? `Saved. Note: this mobile is also on the ${SIDE_NAMES[sameMobile.side]}.` : "Saved.");
}

export async function removeHousehold(slug: string, id: string, _prev: FormState): Promise<FormState> {
  const who = await access(slug, id);
  if ("error" in who) return { ok: false, message: who.error };
  if (who.hh.responses.length > 0) {
    return { ok: false, message: "This household has replied, so it can't be deleted. Mark them as not coming instead." };
  }
  await deleteHousehold(who.host.event.id, who.hh.id);
  revalidatePath("/host", "layout");
  redirect(`/host/e/${slug}/guests`);
}
