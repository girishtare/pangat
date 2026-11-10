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
      .sort((a: any, b: any) => a.sort_order - b.sort_order || a.starts_at.localeCompare(b.starts_at))
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
    client.from("functions").select("*").eq("event_id", ev.id).order("sort_order").order("starts_at"),
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

export type HostAccess = { side: Side | null } | null;

/** The signed-in host's role for this event, or null if they are not a host of it. */
export async function loadHostAccess(client: SupabaseClient, eventSlug: string): Promise<HostAccess> {
  const { data, error } = await client.from("hosts").select("side, events!inner(slug)").eq("events.slug", eventSlug).maybeSingle();
  if (error) throw new Error(`host lookup failed: ${error.message}`);
  return data ? { side: (data as any).side ?? null } : null;
}
