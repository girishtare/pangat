"use server";

import { revalidatePath } from "next/cache";
import { isFunctionIcon } from "@/lib/functionIcons";
import { z } from "zod";
import { istInputToIso, isValidDate } from "@/lib/events";
import { normaliseMobile } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { sendCardMail } from "@/lib/mail";
import { whatsappLink } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import type { Side } from "@/lib/types";
import {
  addFunction,
  addCoOwner,
  CARD_MAX_BYTES,
  cardExists,
  cardUploadTarget,
  type CardLang,
  deleteAccountIfUnused,
  deleteEvent,
  deleteFunction,
  functionUsage,
  hostTaskCount,
  listHosts,
  MAX_CO_OWNERS_PER_SIDE,
  removeHost,
  resendInvite,
  setCard,
  updateEvent,
  updateHost,
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
  // Food: "none", "veg" (vegetarian only) or "both" (veg and non-veg).
  const food = String(fd.get("food") ?? "both");
  if (!["none", "veg", "both"].includes(food)) return "Choose what food is served.";
  // Icon: one of the fixed list, or none picked (a new function then gets one from its name).
  const iconRaw = String(fd.get("icon") ?? "");
  if (iconRaw && !isFunctionIcon(iconRaw)) return "Choose an icon from the list.";
  return { nameEn, nameMr, startsAt, venue, mapUrl, catered: food !== "none", vegOnly: food === "veg", icon: iconRaw || null };
}

/** No two functions of one event share an icon (owner, 14 Nov). */
function iconTaken(host: HostContext, icon: string | null | undefined, self: string | null): string | null {
  if (!icon) return null;
  const other = host.functions.find((f) => f.icon === icon && f.id !== self);
  return other ? `${other.name.en} already uses that icon. Pick another.` : null;
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
  const taken = iconTaken(who.host, fn.icon, functionId);
  if (taken) return { ok: false, message: taken };
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
  const taken = iconTaken(who.host, fn.icon, null);
  if (taken) return { ok: false, message: taken };
  const invited = await addFunction(who.host.event.id, fn, fd.get("inviteAll") === "on");
  return done(`Added ${fn.nameEn}${invited ? ` and invited ${invited} household${invited === 1 ? "" : "s"}` : ""}.`);
}

/* ---------- Hosts ---------- */

/** The name invitations go out under: the signed-in owner's name, else their email. */
async function ownerName(host: HostContext): Promise<string> {
  const me = (await listHosts(host.event.id)).find((h) => h.userId === host.userId);
  return me?.displayName ?? host.email;
}

/** "both" is stored as side null: the co-owner covers both sides. */
const sideField = z.enum(["both", "bride", "groom"]).transform((v) => (v === "both" ? null : v));
const roleLabelFor = (side: Side | null) => `Co-owner · ${side === "bride" ? "Bride's side" : side === "groom" ? "Groom's side" : "Both sides"}`;
const sideWords = (side: Side | null) => (side === "bride" ? "the bride's side" : side === "groom" ? "the groom's side" : "both sides");

/** Name, mobile (and for a co-owner, side): all required. */
function readHostFields(fd: FormData, withSide: boolean): { fullName: string; phone: string; side: Side | null } | string {
  const fullName = text(fd.get("fullName"));
  if (!fullName) return "Enter their full name.";
  if (fullName.length > 120) return "That name is too long.";
  const mobile = normaliseMobile(text(fd.get("phone")));
  if (!mobile.ok) return "That mobile number doesn't look right. Use 10 digits, or + and the country code.";
  if (!mobile.value) return "Enter their mobile number.";
  if (!withSide) return { fullName, phone: mobile.value, side: null };
  const side = sideField.safeParse(fd.get("side"));
  if (!side.success) return "Choose a side: both, the bride's or the groom's.";
  return { fullName, phone: mobile.value, side: side.data };
}

export type InviteState = (NonNullable<FormState> & { whatsapp?: string | null }) | null;

export async function inviteHost(slug: string, _prev: InviteState, fd: FormData): Promise<InviteState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const fields = readHostFields(fd, true);
  if (typeof fields === "string") return { ok: false, message: fields };
  const email = z.string().trim().toLowerCase().pipe(z.email().max(254)).safeParse(fd.get("email"));
  if (!email.success) return { ok: false, message: "Enter their email address." };
  if (email.data === who.host.email.toLowerCase()) return { ok: false, message: "You are the owner of this event already." };
  const { fullName, phone, side } = fields;

  const base = await publicBaseUrl();
  const signIn = `${base}/host`;
  const details = { eventName: who.host.event.name.en, invitedBy: await ownerName(who.host), siteUrl: base };
  const r = await addCoOwner(who.host.event.id, email.data, side, fullName, phone, signIn, details);
  if (!r.ok) {
    const message = {
      owner: "That person is the event's owner.",
      already: "That person is a co-owner already. Use the pencil next to their name to change their details.",
      limit:
        side === null
          ? `A side already has ${MAX_CO_OWNERS_PER_SIDE} co-owners, and someone on both sides counts on each. Remove one first, or choose one side.`
          : `The ${side === "bride" ? "bride's" : "groom's"} side already has ${MAX_CO_OWNERS_PER_SIDE} co-owners. Remove one first.`,
      rate_limited: "Too many invitations just now. Please try again in an hour.",
      invite_failed: "The invitation email couldn't be sent. Check the email address, or try again later.",
    }[r.error];
    return { ok: false, message };
  }

  const eventName = who.host.event.name.en;
  const whatsapp = whatsappLink(
    phone,
    `Hello ${fullName}, I've added you as a co-owner of ${eventName} on Pangat, for ${sideWords(side)}. ` +
      `Sign in at ${signIn} with ${email.data}${r.invited ? " (check your email to set a password, or use Google)" : ""}.`,
  );
  revalidatePath("/host", "layout");
  if (r.invited) {
    return {
      ok: true,
      whatsapp,
      message: `Invited ${fullName}. Pangat has emailed ${email.data} a link to set a password (check Spam or Promotions if it doesn't arrive); they can also sign in with Google using this address.`,
    };
  }
  // They already have an account, so Supabase sends nothing: we send a note ourselves.
  const mail = await sendCardMail(email.data, `You've been added to ${eventName} on Pangat`, {
    badge: "Co-owner",
    heading: "You've been added to an event",
    greeting: `Hi ${fullName},`,
    paragraphs: [
      `${details.invitedBy} has made you a co-owner of ${eventName} on Pangat.`,
      "You already have a Pangat account, so there's nothing to set up: sign in and the event is there.",
    ],
    event: { name: eventName, role: roleLabelFor(side) },
    button: { label: "Open Pangat", url: signIn },
    afterButton: `Sign in with ${email.data}, by password or with Google.`,
    footnote: `If you weren't expecting this, check with ${details.invitedBy}.`,
    siteUrl: base,
  });
  const note =
    mail === "sent"
      ? `We've emailed ${email.data} to let them know.`
      : mail === "not_set_up"
        ? "Pangat's own email isn't set up yet, so no email went out: let them know on WhatsApp."
        : "The email to let them know couldn't be sent: let them know on WhatsApp.";
  return { ok: true, whatsapp, message: `Added ${fullName}. They already have a Pangat account and will see this event when they sign in. ${note}` };
}

/** Edit a host: name and mobile; a co-owner's side too. */
export async function editHost(slug: string, userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const hosts = await listHosts(who.host.event.id);
  const target = hosts.find((h) => h.userId === userId);
  if (!target) return { ok: false, message: "That person is no longer a host of this event." };
  const isOwner = target.role === "owner";
  const fields = readHostFields(fd, !isOwner);
  if (typeof fields === "string") return { ok: false, message: fields };
  const r = await updateHost(who.host.event.id, userId, isOwner ? { fullName: fields.fullName, phone: fields.phone } : fields);
  if (!r.ok) {
    return { ok: false, message: `That would put more than ${MAX_CO_OWNERS_PER_SIDE} co-owners on one side (someone on both sides counts on each).` };
  }
  revalidatePath(`/host/e/${slug}/todo`);
  return done("Saved.");
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
    return { ok: false, message: `${target.displayName} has ${tasks} task${tasks === 1 ? "" : "s"} on the To-do list. Give them to someone else first.` };
  }
  await removeHost(who.host.event.id, userId);

  // Tell them, then delete their account if nothing else needs it.
  const eventName = who.host.event.name.en;
  const mail = await sendCardMail(target.email, `You've been removed from ${eventName} on Pangat`, {
    badge: "Event access",
    heading: "You're no longer a co-owner",
    greeting: `Hi ${target.fullName ?? target.displayName},`,
    paragraphs: [
      `You are no longer a co-owner of ${eventName} on Pangat, so you can't open it any more.`,
      "If you think this is a mistake, please speak to the family.",
    ],
    footnote: "Thank you for helping.",
    siteUrl: await publicBaseUrl(),
  });
  const account = await deleteAccountIfUnused(userId);
  const told =
    mail === "sent"
      ? `We've emailed ${target.email} to let them know.`
      : mail === "not_set_up"
        ? "No email went out: Pangat's own email isn't set up yet (SMTP_USER and SMTP_PASS in Vercel)."
        : "The email to let them know couldn't be sent.";
  const kept = {
    deleted: "Their Pangat account is deleted.",
    other_events: "Their Pangat account stays: they are a host of another event.",
    has_records:
      "Their Pangat account stays, with no access to anything: it is linked to work they recorded (WhatsApp sends, effort log, tasks or caterer numbers), which the pilot review needs.",
  }[account];
  return done(`Removed ${target.displayName}. ${told} ${kept}`);
}

/** A fresh invitation link for a co-owner who has never signed in. */
export async function resendHostInvite(slug: string, userId: string, _prev: FormState): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const base = await publicBaseUrl();
  const r = await resendInvite(who.host.event.id, userId, `${base}/host`, {
    eventName: who.host.event.name.en,
    invitedBy: await ownerName(who.host),
    siteUrl: base,
  });
  if (!r.ok) {
    const message = {
      not_host: "That person is no longer a co-owner of this event.",
      signed_in: "They have signed in already, so they don't need a new link.",
      rate_limited: "Too many emails just now. Please try again in an hour.",
      invite_failed: "The email couldn't be sent. Please try again later.",
    }[r.error];
    return { ok: false, message };
  }
  return done("Sent a fresh invitation link.");
}

/* ---------- Deleting the event ---------- */

/** The owner deletes the whole event, after the pop-up's warning and 5-second countdown. */
export async function removeEvent(slug: string): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  await deleteEvent(who.host.event.id);
  revalidatePath("/host", "layout");
  return { ok: true, message: "Deleted." };
}

/* ---------- Invitation card (PDF) ---------- */

const cardLang = (v: string): CardLang | null => (v === "en" || v === "mr" ? v : null);
const cardSide = (v: string): Side | null => (v === "bride" || v === "groom" ? v : null);

/** Step 1 of an upload: a one-time link the browser sends the PDF to (owner only). */
export async function cardUploadStart(
  slug: string,
  side: string,
  lang: string,
  size: number,
  type: string,
): Promise<{ ok: true; url: string; path: string } | { ok: false; message: string }> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const l = cardLang(lang);
  const sd = cardSide(side);
  if (!l || !sd) return { ok: false, message: "Choose a side, and English or Marathi." };
  if (type !== "application/pdf") return { ok: false, message: "Please choose a PDF file." };
  if (!(size > 0 && size <= CARD_MAX_BYTES)) return { ok: false, message: "The PDF must be under 20 MB." };
  const t = await cardUploadTarget(who.host.event.id, sd, l);
  return { ok: true, url: t.url, path: t.path };
}

/** Step 2: the browser has uploaded it; record it on the event (the old file is deleted). */
export async function cardUploadDone(slug: string, side: string, lang: string, path: string): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const l = cardLang(lang);
  const sd = cardSide(side);
  if (!l || !sd || !path.startsWith(`${who.host.event.id}/${sd}-${l}-`) || !path.endsWith(".pdf")) {
    return { ok: false, message: "That upload doesn't belong to this event." };
  }
  if (!(await cardExists(path))) return { ok: false, message: "The upload didn't arrive. Please try again." };
  await setCard(who.host.event.id, sd, l, path);
  return done(l === "en" ? "English card saved." : "Marathi card saved.");
}

export async function cardRemove(slug: string, side: string, lang: string): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const l = cardLang(lang);
  const sd = cardSide(side);
  if (!l || !sd) return { ok: false, message: "Choose a side, and English or Marathi." };
  await setCard(who.host.event.id, sd, l, null);
  return done("Card removed.");
}
