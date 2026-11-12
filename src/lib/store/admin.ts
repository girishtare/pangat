import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../supabase/config";
import type { MessageKind } from "../outreach";
import type { FunctionNumbers } from "../pilot";
import type { Side } from "../types";
import { coOwnerInviteCard } from "../emailDesign";
import { onlyChangedReplies } from "./changed";
import { mailConfigured, sendCardMail } from "../mail";

// Writes for event setup and host management. Service role: every caller must
// first check, with hostGate(), that the signed-in user may make the change.

let client: SupabaseClient | null = null;
function admin(): SupabaseClient {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured");
  client ??= createClient(cfg.url, cfg.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export interface FunctionInput {
  nameEn: string;
  nameMr: string | null;
  startsAt: string; // ISO
  venue: string | null;
  mapUrl?: string | null;
  catered: boolean;
  /** Vegetarian food only (no veg question). Only meaningful when catered. */
  vegOnly?: boolean;
  sortOrder?: number;
}

export async function slugTaken(slug: string): Promise<boolean> {
  const { count, error } = await admin().from("events").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (error) throw new Error(`slug check failed: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function createEvent(input: {
  userId: string;
  slug: string;
  nameEn: string;
  nameMr: string | null;
  cutoffAt: string;
  functions: FunctionInput[];
}): Promise<void> {
  const { error } = await admin().rpc("create_event", {
    p_user: input.userId,
    p_slug: input.slug,
    p_name_en: input.nameEn,
    p_name_mr: input.nameMr,
    p_cutoff: input.cutoffAt,
    p_functions: input.functions.map((f) => ({
      name_en: f.nameEn,
      name_mr: f.nameMr,
      starts_at: f.startsAt,
      venue: f.venue,
      catered: f.catered,
      sort_order: f.sortOrder ?? 0,
    })),
  });
  if (error) throw new Error(`create event failed: ${error.message}`);
}

export async function updateEvent(
  eventId: string,
  fields: {
    nameEn: string;
    nameMr: string | null;
    cutoffAt: string;
    yesShowRate: number;
    pendingShowRate: number;
    contactBride: string | null;
    contactGroom: string | null;
    catererDueOn: string | null;
    catererFinalOn: string | null;
  },
): Promise<void> {
  const { error } = await admin()
    .from("events")
    .update({
      name_en: fields.nameEn,
      name_mr: fields.nameMr,
      cutoff_at: fields.cutoffAt,
      yes_show_rate: fields.yesShowRate,
      pending_show_rate: fields.pendingShowRate,
      contact_phone_bride: fields.contactBride,
      contact_phone_groom: fields.contactGroom,
      caterer_due_on: fields.catererDueOn,
      caterer_final_on: fields.catererFinalOn,
    })
    .eq("id", eventId);
  if (error) throw new Error(`update event failed: ${error.message}`);
}

/** Adds a function; optionally invites every household already on the list. Returns invites created. */
export async function addFunction(eventId: string, fn: FunctionInput, inviteAll: boolean): Promise<number> {
  const db = admin();
  const { data, error } = await db
    .from("functions")
    .insert({
      event_id: eventId,
      name_en: fn.nameEn,
      name_mr: fn.nameMr,
      starts_at: fn.startsAt,
      venue: fn.venue,
      map_url: fn.mapUrl ?? null,
      catered: fn.catered,
      veg_only: fn.catered && !!fn.vegOnly,
    })
    .select("id")
    .single();
  if (error) throw new Error(`add function failed: ${error.message}`);
  if (!inviteAll) return 0;

  const { data: hh, error: hhErr } = await db.from("households").select("id").eq("event_id", eventId).range(0, 9999);
  if (hhErr) throw new Error(`households lookup failed: ${hhErr.message}`);
  const rows = (hh ?? []).map((h) => ({ household_id: h.id, function_id: data.id }));
  if (rows.length === 0) return 0;
  const { error: invErr } = await db.from("invites").insert(rows);
  if (invErr) throw new Error(`inviting households failed: ${invErr.message}`);
  return rows.length;
}

export async function updateFunction(eventId: string, functionId: string, fn: FunctionInput): Promise<void> {
  const { error, count } = await admin()
    .from("functions")
    .update(
      { name_en: fn.nameEn, name_mr: fn.nameMr, starts_at: fn.startsAt, venue: fn.venue, map_url: fn.mapUrl ?? null, catered: fn.catered, veg_only: fn.catered && !!fn.vegOnly },
      { count: "exact" },
    )
    .eq("id", functionId)
    .eq("event_id", eventId);
  if (error) throw new Error(`update function failed: ${error.message}`);
  if (!count) throw new Error("function not found in this event");
}

export async function functionUsage(eventId: string, functionId: string): Promise<{ invites: number; replies: number }> {
  const db = admin();
  const { data: fn } = await db.from("functions").select("id").eq("id", functionId).eq("event_id", eventId).maybeSingle();
  if (!fn) throw new Error("function not found in this event");
  const [inv, resp] = await Promise.all([
    db.from("invites").select("household_id", { count: "exact", head: true }).eq("function_id", functionId),
    db.from("responses").select("household_id", { count: "exact", head: true }).eq("function_id", functionId),
  ]);
  if (inv.error || resp.error) throw new Error("usage lookup failed");
  return { invites: inv.count ?? 0, replies: resp.count ?? 0 };
}

export async function deleteFunction(eventId: string, functionId: string): Promise<void> {
  const { error } = await admin().from("functions").delete().eq("id", functionId).eq("event_id", eventId);
  if (error) throw new Error(`delete function failed: ${error.message}`);
}

export interface HostRow {
  userId: string;
  email: string;
  /** Typed in by the owner; null until then. */
  fullName: string | null;
  /** What the app shows: the typed name, else their Google name, else their email (kept on their to-do entry). */
  displayName: string;
  /** Mobile, kept on their to-do entry (helpers.phone). */
  phone: string | null;
  /** Null: both sides (always for the owner; a co-owner may cover both too). */
  side: Side | null;
  role: "owner" | "co_owner";
  lastSignInAt: string | null;
  /** False until they have confirmed their email (accepted the invitation, or signed in with Google). */
  confirmed: boolean;
}

export async function listHosts(eventId: string): Promise<HostRow[]> {
  const [{ data, error }, names, shown] = await Promise.all([
    admin().rpc("event_hosts", { p_event: eventId }),
    admin().from("hosts").select("user_id, full_name").eq("event_id", eventId),
    admin().from("helpers").select("host_user_id, full_name, phone").eq("event_id", eventId).not("host_user_id", "is", null),
  ]);
  if (error) throw new Error(`hosts lookup failed: ${error.message}`);
  if (names.error) throw new Error(`host names lookup failed: ${names.error.message}`);
  if (shown.error) throw new Error(`host names lookup failed: ${shown.error.message}`);
  const nameOf = new Map((names.data ?? []).map((r) => [r.user_id as string, r.full_name as string | null]));
  const shownOf = new Map((shown.data ?? []).map((r) => [r.host_user_id as string, r.full_name as string]));
  const phoneOf = new Map((shown.data ?? []).map((r) => [r.host_user_id as string, r.phone as string | null]));
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    fullName: nameOf.get(r.user_id) ?? null,
    displayName: nameOf.get(r.user_id) ?? shownOf.get(r.user_id) ?? r.email,
    phone: phoneOf.get(r.user_id) ?? null,
    side: r.side,
    role: r.role === "owner" ? "owner" : "co_owner",
    lastSignInAt: r.last_sign_in_at,
    confirmed: !!r.confirmed,
  }));
}

export const MAX_CO_OWNERS_PER_SIDE = 3;
export const MAX_OWNED_EVENTS = 10;

export async function ownedEventCount(userId: string): Promise<number> {
  const { data, error } = await admin().rpc("owned_event_count", { p_user: userId });
  if (error) throw new Error(`event count failed: ${error.message}`);
  return Number(data ?? 0);
}

export type AddCoOwnerResult =
  | { ok: true; invited: boolean }
  | { ok: false; error: "owner" | "already" | "limit" | "invite_failed" | "rate_limited" };

/**
 * Makes someone a co-owner of one side, or of both (side null). If they are
 * new to Pangat, or were invited before but never signed in, Supabase emails
 * them an invitation (they can also just sign in with Google using that
 * email); `invited` says so. Someone who has signed in before gets no email
 * from Supabase: the caller sends one. Never touches the owner's row, nor an
 * existing co-owner's (edit them).
 */
/** What the invitation email says: filled into Supabase's template as .Data (supabase/templates/invite.html). */
export interface InviteDetails {
  eventName: string;
  invitedBy: string;
  /** The site's address, for the sign-in link and the logo. */
  siteUrl: string;
}

const roleLabel = (side: Side | null) => `Co-owner · ${side === "bride" ? "Bride's side" : side === "groom" ? "Groom's side" : "Both sides"}`;

export async function addCoOwner(
  eventId: string,
  email: string,
  side: Side | null,
  fullName: string,
  phone: string,
  inviteRedirect: string,
  details: InviteDetails,
): Promise<AddCoOwnerResult> {
  const db = admin();
  const { data: existingId, error: lookupErr } = await db.rpc("user_id_by_email", { p_email: email });
  if (lookupErr) throw new Error(`user lookup failed: ${lookupErr.message}`);
  let userId = existingId as string | null;

  // Every check that can fail comes before any email goes out.
  if (userId) {
    const { data: current } = await db.from("hosts").select("role").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
    if (current?.role === "owner") return { ok: false, error: "owner" };
    if (current) return { ok: false, error: "already" };
  }
  if (await sideIsFull(eventId, side)) return { ok: false, error: "limit" };

  // New to Pangat, or invited before but never signed in: Supabase emails a
  // (fresh) link to set a password. Someone who has signed in gets no email
  // from Supabase; the caller sends a note.
  let invited = false;
  if (!userId || !(await hasConfirmed(userId))) {
    const data = { full_name: fullName, invited_by: details.invitedBy, event_name: details.eventName, role_label: roleLabel(side) };
    const sent = await sendInvite(email, inviteRedirect, data, userId, details.siteUrl);
    if (!sent.ok) return sent;
    userId = sent.userId;
    invited = true;
  }

  const { error } = await db.from("hosts").insert({ event_id: eventId, user_id: userId, side, role: "co_owner", full_name: fullName });
  if (error) {
    if (error.code === "23514") return { ok: false, error: "limit" }; // check_violation from the 3-per-side trigger
    throw new Error(`add co-owner failed: ${error.message}`);
  }
  await setHostPhone(eventId, userId, phone); // their to-do entry was made by trigger on insert
  return { ok: true, invited };
}

/** True once they have confirmed their email (accepted an invitation, or signed in with Google). */
async function hasConfirmed(userId: string): Promise<boolean> {
  const { data, error } = await admin().auth.admin.getUserById(userId);
  if (error) throw new Error(`user lookup failed: ${error.message}`);
  return !!data.user?.email_confirmed_at;
}

/**
 * Supabase's invitation email: a link to set a password. Works for someone new
 * and, again, for someone invited earlier who never accepted (a fresh link).
 */
async function sendInvite(
  email: string,
  redirectTo: string,
  details: Record<string, string>,
  existingUserId: string | null,
  siteUrl: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: "invite_failed" | "rate_limited" }> {
  // Supabase's template reads these from the user's metadata, and only stores
  // them on a new user, so refresh them first for someone invited before.
  if (existingUserId) {
    const { error: metaError } = await admin().auth.admin.updateUserById(existingUserId, { user_metadata: details });
    if (metaError) console.error("invite details not saved", metaError.status, metaError.code);
  }

  // Normally Pangat sends the invitation itself, in its own design: Supabase
  // makes the sign-in link (no email) and Pangat emails it over SMTP.
  if (mailConfigured()) {
    const { data: link, error: linkError } = await admin().auth.admin.generateLink({ type: "invite", email, options: { data: details, redirectTo } });
    if (!linkError && link.properties?.hashed_token && link.user) {
      const base = siteUrl.replace(/\/+$/, "");
      const url = `${base}/auth/confirm?token_hash=${encodeURIComponent(link.properties.hashed_token)}&type=invite`;
      const card = coOwnerInviteCard({
        fullName: details.full_name || "there",
        invitedBy: details.invited_by || "The family",
        eventName: details.event_name || "an event",
        roleLabel: details.role_label || "Co-owner",
        email,
        url,
        siteUrl: base,
      });
      if ((await sendCardMail(email, "Your Pangat co-owner invitation", card)) === "sent") return { ok: true, userId: link.user.id };
      console.error("Pangat invitation email failed; falling back to Supabase's");
    } else if (linkError) {
      console.error("invite link failed", linkError.status, linkError.code);
    }
  }

  // Fallback: Supabase sends its own invitation email (template: supabase/templates/invite.html).
  const { data, error } = await admin().auth.admin.inviteUserByEmail(email, { redirectTo, data: details });
  if (error) {
    console.error("invite failed", error.status, error.code);
    return { ok: false, error: error.code === "over_email_send_rate_limit" ? "rate_limited" : "invite_failed" };
  }
  return { ok: true, userId: data.user.id };
}

/** Would one more co-owner on this side (null: both sides) go over the limit? Same rule as the database trigger. */
async function sideIsFull(eventId: string, side: Side | null): Promise<boolean> {
  const { data, error } = await admin().from("hosts").select("side").eq("event_id", eventId).eq("role", "co_owner");
  if (error) throw new Error(`co-owner count failed: ${error.message}`);
  const on = (s: Side) => (data ?? []).filter((h) => h.side === null || h.side === s).length;
  const sides: Side[] = side ? [side] : ["bride", "groom"];
  return sides.some((s) => on(s) >= MAX_CO_OWNERS_PER_SIDE);
}

/**
 * Sends a co-owner who has never signed in a fresh invitation link.
 * Refuses for the owner, for anyone not on this event, and for anyone who has
 * already signed in (they don't need one).
 */
export async function resendInvite(
  eventId: string,
  userId: string,
  redirectTo: string,
  details: InviteDetails,
): Promise<{ ok: true } | { ok: false; error: "not_host" | "signed_in" | "invite_failed" | "rate_limited" }> {
  const { data: host } = await admin().from("hosts").select("role, side, full_name").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  if (!host || host.role === "owner") return { ok: false, error: "not_host" };
  const { data, error } = await admin().auth.admin.getUserById(userId);
  if (error || !data.user?.email) throw new Error(`user lookup failed: ${error?.message ?? "no email"}`);
  if (data.user.email_confirmed_at) return { ok: false, error: "signed_in" };
  const meta = {
    full_name: (host.full_name as string | null) ?? "",
    invited_by: details.invitedBy,
    event_name: details.eventName,
    role_label: roleLabel(host.side as Side | null),
  };
  const sent = await sendInvite(data.user.email, redirectTo, meta, userId, details.siteUrl);
  return sent.ok ? { ok: true } : sent;
}

/**
 * Edits a host's name and mobile, and a co-owner's side (null = both sides).
 * The owner's side never changes. Their to-do entry follows (name and side by
 * trigger, mobile here).
 */
export async function updateHost(
  eventId: string,
  userId: string,
  v: { fullName: string; phone: string; side?: Side | null },
): Promise<{ ok: true } | { ok: false; error: "limit" }> {
  const { error } = await admin()
    .from("hosts")
    .update({ full_name: v.fullName, ...(v.side !== undefined ? { side: v.side } : {}) })
    .eq("event_id", eventId)
    .eq("user_id", userId);
  if (error) {
    if (error.code === "23514") return { ok: false, error: "limit" };
    throw new Error(`saving host failed: ${error.message}`);
  }
  await setHostPhone(eventId, userId, v.phone);
  return { ok: true };
}

async function setHostPhone(eventId: string, userId: string, phone: string | null) {
  const { error } = await admin().from("helpers").update({ phone }).eq("event_id", eventId).eq("host_user_id", userId);
  if (error) throw new Error(`saving host mobile failed: ${error.message}`);
}

/** Owner or co-owner, by user id (the to-do list labels hosts with it). */
export async function hostRoles(eventId: string): Promise<Map<string, "owner" | "co_owner">> {
  const { data, error } = await admin().from("hosts").select("user_id, role").eq("event_id", eventId);
  if (error) throw new Error(`host roles lookup failed: ${error.message}`);
  return new Map((data ?? []).map((r) => [r.user_id as string, r.role === "owner" ? "owner" : "co_owner"]));
}

/** A host's name (owner or co-owner). Their to-do list entry follows by trigger. */
export async function setHostName(eventId: string, userId: string, fullName: string | null) {
  const { error } = await admin().from("hosts").update({ full_name: fullName }).eq("event_id", eventId).eq("user_id", userId);
  if (error) throw new Error(`saving host name failed: ${error.message}`);
}

/** Tasks given to a host on this event (they must be reassigned before the host is removed). */
export async function hostTaskCount(eventId: string, userId: string): Promise<number> {
  const { data: helper, error } = await admin().from("helpers").select("id").eq("event_id", eventId).eq("host_user_id", userId).maybeSingle();
  if (error) throw new Error(`helper lookup failed: ${error.message}`);
  if (!helper) return 0;
  const { count, error: countError } = await admin().from("tasks").select("id", { count: "exact", head: true }).eq("helper_id", helper.id);
  if (countError) throw new Error(`task count failed: ${countError.message}`);
  return count ?? 0;
}

export async function removeHost(eventId: string, userId: string): Promise<void> {
  const { error } = await admin().from("hosts").delete().eq("event_id", eventId).eq("user_id", userId);
  if (error) throw new Error(`remove host failed: ${error.message}`);
}

/* ---------- Pilot record ---------- */


export async function loadNumbers(functionIds: string[]): Promise<Map<string, FunctionNumbers>> {
  const out = new Map<string, FunctionNumbers>();
  if (functionIds.length === 0) return out;
  const { data, error } = await admin().from("function_numbers").select("*").in("function_id", functionIds);
  if (error) throw new Error(`numbers lookup failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  for (const r of (data ?? []) as any[]) {
    out.set(r.function_id, {
      baseline: r.baseline,
      predicted: r.predicted,
      predictedVeg: r.predicted_veg,
      predictedNonveg: r.predicted_nonveg,
      predictedAt: r.predicted_at,
      revised: r.revised,
      revisedVeg: r.revised_veg,
      revisedNonveg: r.revised_nonveg,
      revisedAt: r.revised_at,
      actual: r.actual,
      actualVeg: r.actual_veg,
      actualNonveg: r.actual_nonveg,
    });
  }
  return out;
}

/** Upserts some columns of function_numbers for functions the caller has already checked belong to the event. */
export async function saveNumbers(rows: ({ functionId: string } & Record<string, number | string | null>)[], userId: string): Promise<void> {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  const payload = rows.map(({ functionId, ...cols }) => ({ function_id: functionId, ...cols, updated_by: userId, updated_at: now }));
  const { error } = await admin().from("function_numbers").upsert(payload, { onConflict: "function_id" });
  if (error) throw new Error(`saving numbers failed: ${error.message}`);
}

/* ---------- One household ---------- */

export interface HouseholdDetail {
  id: string;
  eventId: string;
  side: Side;
  nameEn: string;
  nameMr: string | null;
  mobile: string | null;
  shortCode: string;
  token: string;
  softCap: number | null;
  location: string | null;
  notes: string | null;
  functionIds: string[];
  responses: {
    functionId: string;
    status: "yes" | "no";
    heads: number;
    veg: number;
    nonveg: number;
    arrivalSlot: string | null;
    source: string;
    updatedAt: string;
  }[];
}

export async function loadHousehold(eventId: string, householdId: string): Promise<HouseholdDetail | null> {
  const { data, error } = await admin()
    .from("households")
    .select("id, event_id, side, name_en, name_mr, mobile, short_code, token, soft_cap, location, notes, invites(function_id), responses(*)")
    .eq("id", householdId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(`household lookup failed: ${error.message}`);
  if (!data) return null;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const r = data as any;
  return {
    id: r.id,
    eventId: r.event_id,
    side: r.side,
    nameEn: r.name_en,
    nameMr: r.name_mr,
    mobile: r.mobile,
    shortCode: r.short_code,
    token: r.token,
    softCap: r.soft_cap,
    location: r.location ?? null,
    notes: r.notes ?? null,
    functionIds: (r.invites ?? []).map((i: any) => i.function_id),
    responses: (r.responses ?? []).map((x: any) => ({
      functionId: x.function_id,
      status: x.status,
      heads: x.heads,
      veg: x.veg,
      nonveg: x.nonveg,
      arrivalSlot: x.arrival_slot,
      source: x.source,
      updatedAt: x.updated_at,
    })),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function findHouseholdByCode(eventId: string, code: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("households")
    .select("id")
    .eq("event_id", eventId)
    .eq("short_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error(`code lookup failed: ${error.message}`);
  return data?.id ?? null;
}

export async function updateHousehold(
  eventId: string,
  householdId: string,
  fields: { side: Side; nameEn: string; nameMr: string | null; mobile: string | null; softCap: number | null; location: string | null; notes: string | null },
  functionIds: string[],
): Promise<void> {
  const db = admin();
  const { error } = await db
    .from("households")
    .update({
      side: fields.side,
      name_en: fields.nameEn,
      name_mr: fields.nameMr,
      mobile: fields.mobile,
      soft_cap: fields.softCap,
      location: fields.location,
      notes: fields.notes,
    })
    .eq("id", householdId)
    .eq("event_id", eventId);
  if (error) throw new Error(`update household failed: ${error.message}`);

  const { data: current, error: invErr } = await db.from("invites").select("function_id").eq("household_id", householdId);
  if (invErr) throw new Error(`invites lookup failed: ${invErr.message}`);
  const have = new Set((current ?? []).map((i) => i.function_id as string));
  const want = new Set(functionIds);
  const add = functionIds.filter((id) => !have.has(id)).map((function_id) => ({ household_id: householdId, function_id }));
  const drop = [...have].filter((id) => !want.has(id));
  if (add.length) {
    const { error: e } = await db.from("invites").insert(add);
    if (e) throw new Error(`adding invites failed: ${e.message}`);
  }
  if (drop.length) {
    const { error: e } = await db.from("invites").delete().eq("household_id", householdId).in("function_id", drop);
    if (e) throw new Error(`removing invites failed: ${e.message}`);
  }
}

export async function deleteHousehold(eventId: string, householdId: string): Promise<void> {
  const { error } = await admin().from("households").delete().eq("id", householdId).eq("event_id", eventId);
  if (error) throw new Error(`delete household failed: ${error.message}`);
}

/** Replies recorded by a host (phone call, in person): what changed is saved with source on_behalf, signed with the host's id. */
export async function saveOnBehalf(
  householdId: string,
  answers: { functionId: string; status: "yes" | "no"; heads: number; veg: number; nonveg: number; arrivalSlot: string | null }[],
  hostUserId: string,
): Promise<void> {
  const updated_at = new Date().toISOString();
  const rows = answers.map((a) => ({
    household_id: householdId,
    function_id: a.functionId,
    status: a.status,
    heads: a.heads,
    veg: a.veg,
    nonveg: a.nonveg,
    arrival_slot: a.arrivalSlot,
    source: "on_behalf",
    updated_by: hostUserId,
    updated_at,
  }));
  // Only the functions the host actually changed become "on behalf"; the rest keep the guest's own channel.
  const changed = await onlyChangedReplies(admin(), householdId, rows);
  if (changed.length === 0) return;
  const { error } = await admin().from("responses").upsert(changed, { onConflict: "household_id,function_id" });
  if (error) throw new Error(`saving reply failed: ${error.message}`);
}

/* ---------- Outreach: message texts, WhatsApp sends ---------- */


export async function saveMessageText(eventId: string, kind: MessageKind, text: string | null): Promise<void> {
  const column = kind === "invite" ? "wa_invite_text" : "wa_reminder_text";
  const { error } = await admin().from("events").update({ [column]: text }).eq("id", eventId);
  if (error) throw new Error(`saving message failed: ${error.message}`);
}

export async function recordNudge(householdId: string, kind: MessageKind, userId: string): Promise<void> {
  const { error } = await admin().from("nudges").insert({ household_id: householdId, kind, sent_by: userId });
  if (error) throw new Error(`recording nudge failed: ${error.message}`);
}

export interface NudgeSummary {
  invite: string | null; // last time an invitation was opened for sending
  reminder: string | null;
  reminders: number;
}

export async function loadNudges(eventId: string): Promise<Map<string, NudgeSummary>> {
  const { data, error } = await admin()
    .from("nudges")
    .select("household_id, kind, sent_at, households!inner(event_id)")
    .eq("households.event_id", eventId)
    .order("sent_at")
    .range(0, 19999);
  if (error) throw new Error(`nudges lookup failed: ${error.message}`);
  const out = new Map<string, NudgeSummary>();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  for (const r of (data ?? []) as any[]) {
    const s = out.get(r.household_id) ?? { invite: null, reminder: null, reminders: 0 };
    if (r.kind === "invite") s.invite = r.sent_at;
    else {
      s.reminder = r.sent_at;
      s.reminders++;
    }
    out.set(r.household_id, s);
  }
  return out;
}

/* ---------- Evidence: effort log, dashboard views ---------- */

export interface EffortEntry {
  id: number;
  /** The host's name (typed in, Google name, else email). */
  who: string | null;
  email: string | null;
  loggedOn: string;
  minutes: number;
  calls: number;
  note: string | null;
}

export async function addEffort(eventId: string, userId: string, e: { loggedOn: string; minutes: number; calls: number; note: string | null }) {
  const { error } = await admin()
    .from("effort_log")
    .insert({ event_id: eventId, user_id: userId, logged_on: e.loggedOn, minutes: e.minutes, calls: e.calls, note: e.note });
  if (error) throw new Error(`saving effort failed: ${error.message}`);
}

export async function listEffort(eventId: string, hosts: HostRow[]): Promise<EffortEntry[]> {
  const { data, error } = await admin()
    .from("effort_log")
    .select("id, user_id, logged_on, minutes, calls, note")
    .eq("event_id", eventId)
    .order("logged_on", { ascending: false })
    .order("id", { ascending: false })
    .range(0, 999);
  if (error) throw new Error(`effort lookup failed: ${error.message}`);
  const email = new Map(hosts.map((h) => [h.userId, h.email]));
  const name = new Map(hosts.map((h) => [h.userId, h.displayName]));
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    who: name.get(r.user_id) ?? null,
    email: email.get(r.user_id) ?? null,
    loggedOn: r.logged_on,
    minutes: r.minutes,
    calls: r.calls,
    note: r.note,
  }));
}

/** One row per dashboard visit; repeat visits within 30 minutes count once. */
export async function recordDashboardView(eventId: string, userId: string): Promise<void> {
  const db = admin();
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { count } = await db
    .from("dashboard_views")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .gte("viewed_at", since);
  if (count) return;
  const { error } = await db.from("dashboard_views").insert({ event_id: eventId, user_id: userId });
  if (error) console.error("recording dashboard view failed", error.message);
}

export async function dashboardViewStats(eventId: string): Promise<Map<string, { count: number; last: string }>> {
  const { data, error } = await admin()
    .from("dashboard_views")
    .select("user_id, viewed_at")
    .eq("event_id", eventId)
    .order("viewed_at")
    .range(0, 19999);
  if (error) throw new Error(`views lookup failed: ${error.message}`);
  const out = new Map<string, { count: number; last: string }>();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  for (const r of (data ?? []) as any[]) {
    const s = out.get(r.user_id) ?? { count: 0, last: r.viewed_at };
    s.count++;
    s.last = r.viewed_at;
    out.set(r.user_id, s);
  }
  return out;
}

/* ---------- "Not us" lookup requests ---------- */

const LOOKUPS_PER_LINK_PER_DAY = 5;

/**
 * A guest says the link isn't theirs and leaves a mobile. Finds a household of
 * the event with that mobile (if any) for the host to review. The guest is
 * never told whether there was a match. At most 5 requests per link per day;
 * a repeat of a pending request is ignored.
 */
export async function createLookupRequest(eventId: string, openedHouseholdId: string, mobile: string): Promise<void> {
  const db = admin();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: recent, error: recentErr } = await db
    .from("lookup_requests")
    .select("mobile, status")
    .eq("opened_household_id", openedHouseholdId)
    .gte("created_at", since);
  if (recentErr) throw new Error(`lookup check failed: ${recentErr.message}`);
  if ((recent ?? []).length >= LOOKUPS_PER_LINK_PER_DAY) return;
  if ((recent ?? []).some((r) => r.mobile === mobile && r.status === "pending")) return;

  const { data: match, error: matchErr } = await db
    .from("households")
    .select("id")
    .eq("event_id", eventId)
    .eq("mobile", mobile)
    .limit(1)
    .maybeSingle();
  if (matchErr) throw new Error(`lookup match failed: ${matchErr.message}`);

  const { error } = await db.from("lookup_requests").insert({
    event_id: eventId,
    opened_household_id: openedHouseholdId,
    mobile,
    matched_household_id: match?.id ?? null,
  });
  if (error) throw new Error(`saving lookup failed: ${error.message}`);
}

export interface LookupHousehold {
  id: string;
  side: Side;
  nameEn: string;
  nameMr: string | null;
  mobile: string | null;
  token: string;
}

export interface LookupRequest {
  id: number;
  mobile: string;
  createdAt: string;
  opened: LookupHousehold;
  matched: LookupHousehold | null;
}

const HH_COLS = "id, side, name_en, name_mr, mobile, token";
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const toLookupHousehold = (r: any): LookupHousehold | null =>
  r ? { id: r.id, side: r.side, nameEn: r.name_en, nameMr: r.name_mr, mobile: r.mobile, token: r.token } : null;

export async function listPendingLookups(eventId: string): Promise<LookupRequest[]> {
  const { data, error } = await admin()
    .from("lookup_requests")
    .select(`id, mobile, created_at, opened:households!lookup_requests_opened_household_id_fkey(${HH_COLS}), matched:households!lookup_requests_matched_household_id_fkey(${HH_COLS})`)
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at")
    .range(0, 499);
  if (error) throw new Error(`lookups failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    mobile: r.mobile,
    createdAt: r.created_at,
    opened: toLookupHousehold(r.opened)!,
    matched: toLookupHousehold(r.matched),
  }));
}

export async function resolveLookup(eventId: string, id: number, status: "sent" | "dismissed", userId: string): Promise<void> {
  const { error } = await admin()
    .from("lookup_requests")
    .update({ status, resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("event_id", eventId)
    .eq("status", "pending");
  if (error) throw new Error(`resolving lookup failed: ${error.message}`);
}

/* ---------- To-do list writes (callers check the host's side first) ---------- */

export async function findHelper(
  eventId: string,
  id: string,
): Promise<{ id: string; side: Side | null; fullName: string; hostUserId: string | null } | null> {
  const { data, error } = await admin().from("helpers").select("id, side, full_name, host_user_id").eq("event_id", eventId).eq("id", id).maybeSingle();
  if (error) throw new Error(`helper lookup failed: ${error.message}`);
  return data ? { id: data.id, side: data.side, fullName: data.full_name, hostUserId: data.host_user_id } : null;
}

/** A host's own to-do entry: only the phone lives here (the name comes from hosts). */
export async function setHelperPhone(eventId: string, id: string, phone: string | null) {
  const { error } = await admin().from("helpers").update({ phone }).eq("event_id", eventId).eq("id", id);
  if (error) throw new Error(`saving phone failed: ${error.message}`);
}

export async function addHelper(eventId: string, userId: string, h: { fullName: string; phone: string | null; side: Side }) {
  const { error } = await admin().from("helpers").insert({ event_id: eventId, full_name: h.fullName, phone: h.phone, side: h.side, created_by: userId });
  if (error) throw new Error(`saving helper failed: ${error.message}`);
}

export async function updateHelper(eventId: string, id: string, h: { fullName: string; phone: string | null; side: Side }) {
  const { error } = await admin().from("helpers").update({ full_name: h.fullName, phone: h.phone, side: h.side }).eq("event_id", eventId).eq("id", id);
  if (error) throw new Error(`saving helper failed: ${error.message}`);
}

/** False when the helper still has tasks (they must be reassigned or deleted first). */
export async function deleteHelper(eventId: string, id: string): Promise<boolean> {
  const { count, error: countError } = await admin().from("tasks").select("id", { count: "exact", head: true }).eq("helper_id", id);
  if (countError) throw new Error(`task count failed: ${countError.message}`);
  if ((count ?? 0) > 0) return false;
  const { error } = await admin().from("helpers").delete().eq("event_id", eventId).eq("id", id);
  if (error) throw new Error(`deleting helper failed: ${error.message}`);
  return true;
}

export async function findTask(eventId: string, id: string): Promise<{ id: string; side: Side | null; title: string } | null> {
  const { data, error } = await admin().from("tasks").select("id, side, title").eq("event_id", eventId).eq("id", id).maybeSingle();
  if (error) throw new Error(`task lookup failed: ${error.message}`);
  return data ? { id: data.id, side: data.side, title: data.title } : null;
}

export interface TaskInput {
  helperId: string;
  title: string;
  note: string | null;
  functionId: string | null;
  dueOn: string;
  status: "todo" | "doing" | "done";
}

export async function addTask(eventId: string, userId: string, t: TaskInput) {
  const { error } = await admin()
    .from("tasks")
    .insert({
      event_id: eventId,
      helper_id: t.helperId,
      side: "bride", // replaced by the trigger with the helper's side
      title: t.title,
      note: t.note,
      function_id: t.functionId,
      due_on: t.dueOn,
      status: t.status,
      created_by: userId,
      updated_by: userId,
    });
  if (error) throw new Error(`saving task failed: ${error.message}`);
}

export async function updateTask(eventId: string, id: string, userId: string, t: Partial<TaskInput>) {
  const row: Record<string, unknown> = { updated_by: userId };
  if (t.helperId !== undefined) row.helper_id = t.helperId;
  if (t.title !== undefined) row.title = t.title;
  if (t.note !== undefined) row.note = t.note;
  if (t.functionId !== undefined) row.function_id = t.functionId;
  if (t.dueOn !== undefined) row.due_on = t.dueOn;
  if (t.status !== undefined) row.status = t.status;
  const { error } = await admin().from("tasks").update(row).eq("event_id", eventId).eq("id", id);
  if (error) throw new Error(`saving task failed: ${error.message}`);
}

export async function deleteTask(eventId: string, id: string) {
  const { error } = await admin().from("tasks").delete().eq("event_id", eventId).eq("id", id);
  if (error) throw new Error(`deleting task failed: ${error.message}`);
}

/* ---------- Slips ---------- */

/**
 * Sets the slip language of some households. Limited to the event, and to one
 * side when `side` is given (a co-owner's). Returns how many changed.
 */
export async function setSlipLang(eventId: string, ids: string[], lang: "both" | "en" | "mr", side: Side | null): Promise<number> {
  let changed = 0;
  // In batches: the ids go in the request URL.
  for (let i = 0; i < ids.length; i += 150) {
    let q = admin().from("households").update({ slip_lang: lang }, { count: "exact" }).eq("event_id", eventId).in("id", ids.slice(i, i + 150));
    if (side) q = q.eq("side", side);
    const { error, count } = await q;
    if (error) throw new Error(`saving slip language failed: ${error.message}`);
    changed += count ?? 0;
  }
  return changed;
}

/** Marks one household's invitation sent (card, WhatsApp or both) or not sent. A one-side host only reaches their side. */
export async function setInviteSent(eventId: string, id: string, via: "card" | "whatsapp" | "both" | null, side: Side | null): Promise<number> {
  let q = admin()
    .from("households")
    .update({ invite_via: via, invite_sent_at: via ? new Date().toISOString() : null }, { count: "exact" })
    .eq("event_id", eventId)
    .eq("id", id);
  if (side) q = q.eq("side", side);
  const { error, count } = await q;
  if (error) throw new Error(`saving invitation sent failed: ${error.message}`);
  return count ?? 0;
}

/**
 * After someone is removed from an event: deletes their Pangat account too,
 * unless they are still a host of another event, or the database still points
 * at them (WhatsApp sends, effort log, tasks or caterer numbers they recorded:
 * pilot evidence, so those win and the account stays, with no access).
 */
export async function deleteAccountIfUnused(userId: string): Promise<"deleted" | "other_events" | "has_records"> {
  const { count, error } = await admin().from("hosts").select("event_id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw new Error(`host lookup failed: ${error.message}`);
  if ((count ?? 0) > 0) return "other_events";
  const { error: delError } = await admin().auth.admin.deleteUser(userId);
  if (delError) {
    console.error("account delete refused", delError.status, delError.code);
    return "has_records";
  }
  return "deleted";
}

/* ---------- Deleting an event ---------- */

/**
 * Deletes an event and everything in it, in one statement: functions,
 * households, invitations, replies and their history (since migration 0018), slips' codes, WhatsApp
 * records, effort log, tasks, people helping, caterer numbers and host links
 * all go with it (foreign keys cascade; checked 11 Nov), and its invitation
 * card PDFs are deleted from Storage. Cannot be undone.
 * People's Pangat accounts stay.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  // Storage files don't cascade: note the invitation cards first, delete them after.
  const { data: ev } = await admin()
    .from("events")
    .select("card_bride_en_path, card_bride_mr_path, card_groom_en_path, card_groom_mr_path")
    .eq("id", eventId)
    .maybeSingle();
  const { error } = await admin().from("events").delete().eq("id", eventId);
  if (error) throw new Error(`deleting the event failed: ${error.message}`);
  const files = [ev?.card_bride_en_path, ev?.card_bride_mr_path, ev?.card_groom_en_path, ev?.card_groom_mr_path].filter(
    (p): p is string => !!p,
  );
  if (files.length) {
    const { error: fileError } = await admin().storage.from("cards").remove(files);
    if (fileError) console.error("card files not deleted", fileError.message);
  }
}

/* ---------- Invitation card (PDF) ---------- */

export type CardLang = "en" | "mr";
const CARDS = "cards"; // private Storage bucket (migration 0015)
export const CARD_MAX_BYTES = 20 * 1024 * 1024;

/** A one-time link the owner's browser uploads the PDF to, straight to Storage (no size limit from our server). */
export async function cardUploadTarget(eventId: string, side: Side, lang: CardLang): Promise<{ path: string; url: string }> {
  const path = `${eventId}/${side}-${lang}-${Date.now()}.pdf`;
  const { data, error } = await admin().storage.from(CARDS).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`card upload link failed: ${error?.message}`);
  return { path, url: data.signedUrl };
}

/** Records an uploaded card on the event, and deletes the file it replaces. */
export async function setCard(eventId: string, side: Side, lang: CardLang, path: string | null): Promise<void> {
  const column = `card_${side}_${lang}_path`;
  const { data: ev, error: readError } = await admin().from("events").select(column).eq("id", eventId).single();
  if (readError) throw new Error(`card lookup failed: ${readError.message}`);
  const old = (ev as unknown as Record<string, string | null>)[column];
  const { error } = await admin().from("events").update({ [column]: path }).eq("id", eventId);
  if (error) throw new Error(`saving card failed: ${error.message}`);
  if (old && old !== path) await admin().storage.from(CARDS).remove([old]);
}

/** Is there a file at this path? (The browser says it uploaded; check before recording it.) */
export async function cardExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const { data, error } = await admin().storage.from(CARDS).list(path.slice(0, slash), { search: path.slice(slash + 1) });
  if (error) throw new Error(`card check failed: ${error.message}`);
  return (data ?? []).some((f) => f.name === path.slice(slash + 1));
}

/** A link to the PDF that works for an hour. */
export async function cardSignedUrl(path: string): Promise<string> {
  const { data, error } = await admin().storage.from(CARDS).createSignedUrl(path, 3600);
  if (error || !data) throw new Error(`card link failed: ${error?.message}`);
  return data.signedUrl;
}

/** A guest's card, by their household's token: their own side's card in that language, if the event has it. */
export async function cardPathForGuest(token: string, lang: CardLang): Promise<string | null> {
  const { data, error } = await admin()
    .from("households")
    .select("side, events(card_bride_en_path, card_bride_mr_path, card_groom_en_path, card_groom_mr_path)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`card lookup failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const row = data as any;
  return row?.events?.[`card_${row.side}_${lang}_path`] ?? null;
}
