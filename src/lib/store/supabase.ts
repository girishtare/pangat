import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../supabase/config";
import type {
  DashboardData,
  EventInfo,
  FunctionInfo,
  HouseholdView,
  InviteFact,
  ResponseRecord,
  ResponseSource,
  Side,
} from "../types";
import type { Helper, Task } from "../todo";
import type { NormalisedAnswer } from "../validate";

// Guest reads and all writes use the service-role client (bypasses RLS).
// The host dashboard is loaded with the host's own session client instead,
// so row-level security limits it to their event and side.

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured");
  client ??= createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toEvent(row: any): EventInfo {
  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.name_en, mr: row.name_mr },
    cutoffAt: row.cutoff_at,
    yesShowRate: Number(row.yes_show_rate),
    pendingShowRate: Number(row.pending_show_rate),
  };
}

function toFunction(row: any): FunctionInfo {
  return {
    id: row.id,
    name: { en: row.name_en, mr: row.name_mr },
    startsAt: row.starts_at,
    venue: row.venue,
    mapUrl: row.map_url,
    catered: row.catered,
  };
}

function toResponse(row: any): ResponseRecord {
  return {
    functionId: row.function_id,
    status: row.status,
    heads: row.heads,
    veg: row.veg,
    nonveg: row.nonveg,
    arrivalSlot: row.arrival_slot,
    source: row.source,
    updatedAt: row.updated_at,
  };
}

export const supabaseStore = {
  async getHouseholdByToken(token: string): Promise<HouseholdView | null> {
    const { data, error } = await db()
      .from("households")
      .select("id, side, name_en, name_mr, soft_cap, events(*), invites(functions(*)), responses(*)")
      .eq("token", token)
      .maybeSingle();
    if (error) throw new Error(`households lookup failed: ${error.message}`);
    if (!data) return null;
    const row = data as any;
    const functions: FunctionInfo[] = (row.invites ?? [])
      .map((i: any) => i.functions)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime() || a.sort_order - b.sort_order)
      .map(toFunction);
    return {
      event: toEvent(row.events),
      household: { id: row.id, side: row.side, name: { en: row.name_en, mr: row.name_mr }, softCap: row.soft_cap },
      functions,
      responses: (row.responses ?? []).map(toResponse),
    };
  },

  async saveResponses(householdId: string, answers: NormalisedAnswer[], source: ResponseSource): Promise<void> {
    const updated_at = new Date().toISOString();
    const rows = answers.map((a) => ({
      household_id: householdId,
      function_id: a.functionId,
      status: a.status,
      heads: a.heads,
      veg: a.veg,
      nonveg: a.nonveg,
      arrival_slot: a.arrivalSlot,
      source,
      updated_at,
    }));
    const { error } = await db().from("responses").upsert(rows, { onConflict: "household_id,function_id" });
    if (error) throw new Error(`saving responses failed: ${error.message}`);
  },

  getDashboard(eventSlug: string): Promise<DashboardData | null> {
    return loadDashboard(db(), eventSlug);
  },
};

/** Dashboard data as `client` is allowed to see it (all of it for service role; one side for a host). */
export async function loadDashboard(client: SupabaseClient, eventSlug: string): Promise<DashboardData | null> {
  const { data: ev, error: evErr } = await client.from("events").select("*").eq("slug", eventSlug).maybeSingle();
  if (evErr) throw new Error(`event lookup failed: ${evErr.message}`);
  if (!ev) return null;

  const [fnRes, hhRes] = await Promise.all([
    client.from("functions").select("*").eq("event_id", ev.id).order("starts_at").order("sort_order"),
    client
      .from("households")
      .select("id, side, invites(function_id), responses(function_id, status, heads, veg, nonveg)")
      .eq("event_id", ev.id)
      .range(0, 4999),
  ]);
  if (fnRes.error) throw new Error(`functions lookup failed: ${fnRes.error.message}`);
  if (hhRes.error) throw new Error(`households lookup failed: ${hhRes.error.message}`);

  const facts: InviteFact[] = [];
  for (const h of (hhRes.data ?? []) as any[]) {
    for (const inv of h.invites ?? []) {
      const r = (h.responses ?? []).find((x: any) => x.function_id === inv.function_id);
      facts.push({
        householdId: h.id,
        side: h.side,
        functionId: inv.function_id,
        status: r ? r.status : "pending",
        heads: r?.heads ?? 0,
        veg: r?.veg ?? 0,
        nonveg: r?.nonveg ?? 0,
      });
    }
  }
  return { event: toEvent(ev), functions: (fnRes.data ?? []).map(toFunction), facts };
}

export type HostAccess = { side: Side | null; role: "owner" | "co_owner" } | null;

/** The signed-in host's role for this event, or null if they are not a host of it. */
export async function loadHostAccess(client: SupabaseClient, eventSlug: string): Promise<HostAccess> {
  const { data, error } = await client.from("hosts").select("side, role, events!inner(slug)").eq("events.slug", eventSlug).maybeSingle();
  if (error) throw new Error(`host lookup failed: ${error.message}`);
  return data ? { side: (data as any).side ?? null, role: (data as any).role === "owner" ? "owner" : "co_owner" } : null;
}

/* ---------- Guest list (stage 2.2) ---------- */

export interface HouseholdKey {
  id: string;
  side: Side;
  nameEn: string;
  mobile: string | null;
  shortCode: string;
}

/**
 * Every household of the event, both sides, for duplicate checks and short-code
 * uniqueness. Service role: a one-side host must not miss a clash with the
 * other side. Callers show only "also on the other side", never the details.
 */
export async function loadHouseholdKeys(eventId: string): Promise<HouseholdKey[]> {
  const { data, error } = await db()
    .from("households")
    .select("id, side, name_en, mobile, short_code")
    .eq("event_id", eventId)
    .range(0, 9999);
  if (error) throw new Error(`household keys lookup failed: ${error.message}`);
  return (data ?? []).map((r: any) => ({ id: r.id, side: r.side, nameEn: r.name_en, mobile: r.mobile, shortCode: r.short_code }));
}

export interface NewHousehold {
  side: Side;
  nameEn: string;
  nameMr: string | null;
  mobile: string | null;
  softCap: number | null;
  functionIds: string[];
  token: string;
  shortCode: string;
}

/** Inserts households and their invites in one transaction (see migration 0004). */
export async function insertHouseholds(eventId: string, rows: NewHousehold[]): Promise<number> {
  const payload = rows.map((r) => ({
    side: r.side,
    name_en: r.nameEn,
    name_mr: r.nameMr,
    mobile: r.mobile,
    token: r.token,
    short_code: r.shortCode,
    soft_cap: r.softCap,
    function_ids: r.functionIds,
  }));
  const { data, error } = await db().rpc("import_households", { p_event: eventId, p_households: payload });
  if (error) throw new Error(`import failed: ${error.message}`);
  return Number(data);
}

export interface GuestRow {
  id: string;
  side: Side;
  nameEn: string;
  nameMr: string | null;
  mobile: string | null;
  shortCode: string;
  token: string;
  softCap: number | null;
  createdAt: string;
  functionIds: string[];
  replied: string[]; // function ids with a reply
}

/** Households as the signed-in host may see them (RLS: their side only). */
export async function listGuests(client: SupabaseClient, eventId: string): Promise<GuestRow[]> {
  const { data, error } = await client
    .from("households")
    .select("id, side, name_en, name_mr, mobile, short_code, token, soft_cap, created_at, invites(function_id), responses(function_id)")
    .eq("event_id", eventId)
    .order("side")
    .order("created_at")
    .range(0, 9999);
  if (error) throw new Error(`guest list lookup failed: ${error.message}`);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    side: r.side,
    nameEn: r.name_en,
    nameMr: r.name_mr,
    mobile: r.mobile,
    shortCode: r.short_code,
    token: r.token,
    softCap: r.soft_cap,
    createdAt: r.created_at,
    functionIds: (r.invites ?? []).map((i: any) => i.function_id),
    replied: (r.responses ?? []).map((x: any) => x.function_id),
  }));
}

/* ---------- To-do list (read as the host: row-level security keeps co-owners to their side) ---------- */

export async function listHelpers(client: SupabaseClient, eventId: string): Promise<Helper[]> {
  const { data, error } = await client
    .from("helpers")
    .select("id, full_name, phone, side, host_user_id")
    .eq("event_id", eventId)
    .order("full_name")
    .range(0, 999);
  if (error) throw new Error(`helper lookup failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, fullName: r.full_name, phone: r.phone, side: r.side, hostUserId: r.host_user_id }));
}

export async function listTasks(client: SupabaseClient, eventId: string): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("id, helper_id, side, title, note, function_id, due_on, status, updated_at")
    .eq("event_id", eventId)
    .order("due_on")
    .range(0, 1999);
  if (error) throw new Error(`task lookup failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    helperId: r.helper_id,
    side: r.side,
    title: r.title,
    note: r.note,
    functionId: r.function_id,
    dueOn: r.due_on,
    status: r.status,
    updatedAt: r.updated_at,
  }));
}
