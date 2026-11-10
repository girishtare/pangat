"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { istInputToIso } from "@/lib/events";
import { hostGate, type HostContext } from "@/lib/host";
import {
  addFunction,
  addHost,
  deleteFunction,
  functionUsage,
  listHosts,
  removeHost,
  updateEvent,
  updateFunction,
  type FunctionInput,
} from "@/lib/store/admin";

export type FormState = { ok: boolean; message: string } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();

async function manager(slug: string): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { error: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  if (!gate.host.canManage) return { error: "Only hosts of both sides can change the event." };
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
  await updateEvent(who.host.event.id, {
    nameEn,
    nameMr,
    cutoffAt,
    yesShowRate: rates.data.yes / 100,
    pendingShowRate: rates.data.pending / 100,
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

const hostSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  side: z.enum(["bride", "groom", "both"]),
  password: z.string().max(200),
});

export async function inviteHost(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const parsed = hostSchema.safeParse({ email: fd.get("email"), side: fd.get("side"), password: fd.get("password") ?? "" });
  if (!parsed.success) return { ok: false, message: "Enter their email address and choose a side." };
  const { email, side, password } = parsed.data;
  if (password && password.length < 10) return { ok: false, message: "Use a password of at least 10 characters." };
  if (email === who.host.email.toLowerCase()) return { ok: false, message: "You are already a host of this event." };

  const r = await addHost(who.host.event.id, email, side === "both" ? null : side, password || null);
  if ("error" in r) {
    const message =
      r.error === "needs_password"
        ? `${email} doesn't have a Pangat sign-in yet. Set a starting password for them (at least 10 characters).`
        : r.error === "weak_password"
          ? "That password is too weak. Use a longer one."
          : "Adding the host failed. Please try again.";
    return { ok: false, message };
  }
  return done(
    r.created
      ? `Added ${email}. Give them the password in person or by phone; they sign in at /host/login.`
      : `Added ${email}. They can sign in with their existing password.`,
  );
}

export async function dropHost(slug: string, userId: string, _prev: FormState): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const hosts = await listHosts(who.host.event.id);
  const target = hosts.find((h) => h.userId === userId);
  if (!target) return { ok: false, message: "That host is no longer on this event." };
  const managers = hosts.filter((h) => h.side === null);
  if (target.side === null && managers.length <= 1) {
    return { ok: false, message: "This is the only host of both sides. Add another before removing them." };
  }
  await removeHost(who.host.event.id, userId);
  if (userId === who.host.userId) redirect("/host?all=1");
  return done(`Removed ${target.email}.`);
}
