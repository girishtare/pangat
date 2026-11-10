import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../supabase/config";
import type { MessageKind } from "../outreach";
import type { FunctionNumbers } from "../pilot";
import type { Side } from "../types";

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
      { name_en: fn.nameEn, name_mr: fn.nameMr, starts_at: fn.startsAt, venue: fn.venue, map_url: fn.mapUrl ?? null, catered: fn.catered },
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
  side: Side | null;
  role: "owner" | "co_owner";
  lastSignInAt: string | null;
  /** False until they have confirmed their email (accepted the invitation, or signed in with Google). */
  confirmed: boolean;
}

export async function listHosts(eventId: string): Promise<HostRow[]> {
  const { data, error } = await admin().rpc("event_hosts", { p_event: eventId });
  if (error) throw new Error(`hosts lookup failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
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
  | { ok: false; error: "owner" | "limit" | "invite_failed" | "rate_limited" };

/**
 * Makes someone a co-owner of one side. If they have no Pangat account yet,
 * Supabase emails them an invitation (they can also just sign in with Google
 * using that email). Never touches the owner's row.
 */
export async function addCoOwner(eventId: string, email: string, side: Side, inviteRedirect: string): Promise<AddCoOwnerResult> {
  const db = admin();
  const { data: existingId, error: lookupErr } = await db.rpc("user_id_by_email", { p_email: email });
  if (lookupErr) throw new Error(`user lookup failed: ${lookupErr.message}`);

  let userId = existingId as string | null;
  let invited = false;
  if (!userId) {
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: inviteRedirect });
    if (error) {
      console.error("invite failed", error.status, error.code);
      return { ok: false, error: error.code === "over_email_send_rate_limit" ? "rate_limited" : "invite_failed" };
    }
    userId = data.user.id;
    invited = true;
  }

  const { data: current } = await db.from("hosts").select("role").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  if (current?.role === "owner") return { ok: false, error: "owner" };
  const { error } = current
    ? await db.from("hosts").update({ side }).eq("event_id", eventId).eq("user_id", userId)
    : await db.from("hosts").insert({ event_id: eventId, user_id: userId, side, role: "co_owner" });
  if (error) {
    if (error.code === "23514") return { ok: false, error: "limit" }; // check_violation from the 3-per-side trigger
    throw new Error(`add co-owner failed: ${error.message}`);
  }
  return { ok: true, invited };
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
    .select("id, event_id, side, name_en, name_mr, mobile, short_code, token, soft_cap, invites(function_id), responses(*)")
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
  fields: { side: Side; nameEn: string; nameMr: string | null; mobile: string | null; softCap: number | null },
  functionIds: string[],
): Promise<void> {
  const db = admin();
  const { error } = await db
    .from("households")
    .update({ side: fields.side, name_en: fields.nameEn, name_mr: fields.nameMr, mobile: fields.mobile, soft_cap: fields.softCap })
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

/** Replies recorded by a host (phone call, in person): source on_behalf, signed with the host's id. */
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
  const { error } = await admin().from("responses").upsert(rows, { onConflict: "household_id,function_id" });
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
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
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
