"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { istInputToIso, isValidDate } from "@/lib/events";
import { normaliseMobile } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { publicBaseUrl } from "@/lib/site";
import {
  addFunction,
  addCoOwner,
  deleteFunction,
  functionUsage,
  hostTaskCount,
  listHosts,
  MAX_CO_OWNERS_PER_SIDE,
  removeHost,
  setHostName,
  updateEvent,
  updateFunction,
  type FunctionInput,
} from "@/lib/store/admin";

export type FormState = { ok: boolean; message: string } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();

async function manager(slug: string): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { error: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  if (!gate.host.canManage) return { error: "Only the event's owner can change this." };
  return { host: gate.host };
}

const done = (message: string): FormState => {
  revalidatePath("/host", "layout");
  return { ok: true, message };
};

function readFunction(fd: FormData): FunctionInput | string {
  const nameEn = text(fd.get("nameEn"));
  const nameMr = text(fd.get("nameMr")) || null;
  const startsAt = istInputToIso(text(fd.get("startsAt")));
  const venue = text(fd.get("venue")) || null;
  const mapUrl = text(fd.get("mapUrl")) || null;
  if (!nameEn || nameEn.length > 60) return "Enter the function's name (up to 60 characters).";
  if (nameMr && nameMr.length > 60) return "The Marathi name is too long (up to 60 characters).";
  if (!startsAt) return "Choose the date and time.";
  if (venue && venue.length > 200) return "The venue is too long.";
  if (mapUrl && !/^https:\/\/\S{4,500}$/.test(mapUrl)) return "The map link must start with https://";
  return { nameEn, nameMr, startsAt, venue, mapUrl, catered: fd.get("catered") === "on" };
}

/* ---------- Event details ---------- */

export async function saveEvent(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const nameEn = text(fd.get("nameEn"));
  const nameMr = text(fd.get("nameMr")) || null;
  const cutoffAt = istInputToIso(text(fd.get("cutoff")));
  const rates = z
    .object({ yes: z.coerce.number().int().min(0).max(100), pending: z.coerce.number().int().min(0).max(100) })
    .safeParse({ yes: fd.get("yesShowRate"), pending: fd.get("pendingShowRate") });
  if (!nameEn || nameEn.length > 120) return { ok: false, message: "Enter the event's name (up to 120 characters)." };
  if (!cutoffAt) return { ok: false, message: "Choose when replies close." };
  if (!rates.success) return { ok: false, message: "Show rates must be whole percentages from 0 to 100." };
  const bride = normaliseMobile(text(fd.get("contactBride")));
  const groom = normaliseMobile(text(fd.get("contactGroom")));
  if (!bride.ok || !groom.ok) return { ok: false, message: "A contact number doesn't look like a phone number." };
  const dueOn = text(fd.get("catererDueOn")) || null;
  const finalOn = text(fd.get("catererFinalOn")) || null;
  if ((dueOn && !isValidDate(dueOn)) || (finalOn && !isValidDate(finalOn))) return { ok: false, message: "Choose valid caterer dates." };
  if (dueOn && finalOn && finalOn < dueOn) return { ok: false, message: "The caterer's last-change date can't be before the first-count date." };
  await updateEvent(who.host.event.id, {
    nameEn,
    nameMr,
    cutoffAt,
    yesShowRate: rates.data.yes / 100,
    pendingShowRate: rates.data.pending / 100,
    contactBride: bride.value,
    contactGroom: groom.value,
    catererDueOn: dueOn,
    catererFinalOn: finalOn,
  });
  return done("Saved.");
}

/* ---------- Functions ---------- */

export async function saveFunction(slug: string, functionId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const fn = readFunction(fd);
  if (typeof fn === "string") return { ok: false, message: fn };
  await updateFunction(who.host.event.id, functionId, fn);
  return done("Saved.");
}

export async function removeFunction(slug: string, functionId: string, _prev: FormState): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const usage = await functionUsage(who.host.event.id, functionId);
  if (usage.replies > 0) {
    return {
      ok: false,
      message: `${usage.replies} household${usage.replies === 1 ? " has" : "s have"} already replied for this function, so it can't be deleted.`,
    };
  }
  await deleteFunction(who.host.event.id, functionId);
  return done("Deleted.");
}

export async function createFunction(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const fn = readFunction(fd);
  if (typeof fn === "string") return { ok: false, message: fn };
  if (who.host.functions.length >= 15) return { ok: false, message: "An event can have at most 15 functions." };
  const invited = await addFunction(who.host.event.id, fn, fd.get("inviteAll") === "on");
  return done(`Added ${fn.nameEn}${invited ? ` and invited ${invited} household${invited === 1 ? "" : "s"}` : ""}.`);
}

/* ---------- Hosts ---------- */

const coOwnerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  side: z.enum(["bride", "groom"]),
});

export async function inviteHost(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const parsed = coOwnerSchema.safeParse({ email: fd.get("email"), side: fd.get("side") });
  if (!parsed.success) return { ok: false, message: "Enter their email address and choose a side." };
  const { email, side } = parsed.data;
  if (email === who.host.email.toLowerCase()) return { ok: false, message: "You are the owner of this event already." };
  const fullName = text(fd.get("fullName"));
  if (!fullName) return { ok: false, message: "Enter their full name." };
  if (fullName.length > 120) return { ok: false, message: "That name is too long." };

  const base = await publicBaseUrl();
  const r = await addCoOwner(who.host.event.id, email, side, fullName, `${base}/host`);
  if (!r.ok) {
    const message = {
      owner: "That person is the event's owner.",
      limit: `The ${side === "bride" ? "bride's" : "groom's"} side already has ${MAX_CO_OWNERS_PER_SIDE} co-owners. Remove one first.`,
      rate_limited: "Too many invitations just now. Please try again in an hour.",
      invite_failed: "The invitation email couldn't be sent. Check the email address, or try again later.",
    }[r.error];
    return { ok: false, message };
  }
  return done(
    r.invited
      ? `Invited ${email}. They'll get an email to set a password, or they can sign in with Google using this address.`
      : `Added ${email}. They already have a Pangat account and will see this event when they sign in.`,
  );
}

export async function dropHost(slug: string, userId: string, _prev: FormState): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const hosts = await listHosts(who.host.event.id);
  const target = hosts.find((h) => h.userId === userId);
  if (!target) return { ok: false, message: "That co-owner is no longer on this event." };
  if (target.role === "owner") return { ok: false, message: "The owner can't be removed." };
  const tasks = await hostTaskCount(who.host.event.id, userId);
  if (tasks > 0) {
    return { ok: false, message: `${target.fullName ?? target.email} has ${tasks} task${tasks === 1 ? "" : "s"} on the To-do list. Give them to someone else first.` };
  }
  await removeHost(who.host.event.id, userId);
  return done(`Removed ${target.email}.`);
}

/** The owner names any host (themself included). Their To-do entry follows. */
export async function renameHost(slug: string, userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const hosts = await listHosts(who.host.event.id);
  if (!hosts.some((h) => h.userId === userId)) return { ok: false, message: "That person is no longer a host of this event." };
  const fullName = text(fd.get("fullName"));
  if (!fullName) return { ok: false, message: "Enter their full name." };
  if (fullName.length > 120) return { ok: false, message: "That name is too long." };
  await setHostName(who.host.event.id, userId, fullName);
  revalidatePath(`/host/e/${slug}/todo`);
  return done("Name saved.");
}
