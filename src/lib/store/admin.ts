import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../supabase/config";
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
  fields: { nameEn: string; nameMr: string | null; cutoffAt: string; yesShowRate: number; pendingShowRate: number },
): Promise<void> {
  const { error } = await admin()
    .from("events")
    .update({
      name_en: fields.nameEn,
      name_mr: fields.nameMr,
      cutoff_at: fields.cutoffAt,
      yes_show_rate: fields.yesShowRate,
      pending_show_rate: fields.pendingShowRate,
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
  lastSignInAt: string | null;
}

export async function listHosts(eventId: string): Promise<HostRow[]> {
  const { data, error } = await admin().rpc("event_hosts", { p_event: eventId });
  if (error) throw new Error(`hosts lookup failed: ${error.message}`);
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[]).map((r) => ({ userId: r.user_id, email: r.email, side: r.side, lastSignInAt: r.last_sign_in_at }));
}

/**
 * Makes someone a host. Creates their sign-in account if it doesn't exist yet
 * (password required then); otherwise links the existing account.
 */
export async function addHost(
  eventId: string,
  email: string,
  side: Side | null,
  password: string | null,
): Promise<{ created: boolean } | { error: "needs_password" | "weak_password" | "failed" }> {
  const db = admin();
  const { data: existingId, error: lookupErr } = await db.rpc("user_id_by_email", { p_email: email });
  if (lookupErr) throw new Error(`user lookup failed: ${lookupErr.message}`);

  let userId = existingId as string | null;
  let created = false;
  if (!userId) {
    if (!password) return { error: "needs_password" };
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      console.error("createUser failed", error.status, error.code);
      return { error: error.code === "weak_password" ? "weak_password" : "failed" };
    }
    userId = data.user.id;
    created = true;
  }
  const { error } = await db.from("hosts").upsert({ event_id: eventId, user_id: userId, side }, { onConflict: "event_id,user_id" });
  if (error) throw new Error(`add host failed: ${error.message}`);
  return { created };
}

export async function removeHost(eventId: string, userId: string): Promise<void> {
  const { error } = await admin().from("hosts").delete().eq("event_id", eventId).eq("user_id", userId);
  if (error) throw new Error(`remove host failed: ${error.message}`);
}
