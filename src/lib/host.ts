import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FunctionRef } from "./guestlist";
import { isDemo } from "./store";
import { loadHostAccess } from "./store/supabase";
import { hostClient } from "./supabase/session";
import type { Bilingual, Side } from "./types";

export interface HostEvent {
  id: string;
  slug: string;
  name: Bilingual;
  cutoffAt: string;
  yesShowRate: number;
  pendingShowRate: number;
}

export interface HostContext {
  /** Acts as the host: row-level security applies. */
  client: SupabaseClient;
  userId: string;
  email: string;
  /** null = both sides. */
  side: Side | null;
  /** Hosts of both sides manage the event: details, functions, other hosts. */
  canManage: boolean;
  event: HostEvent;
  functions: (FunctionRef & { startsAt: string; venue: string | null; mapUrl: string | null; catered: boolean })[];
}

export type SignedIn =
  | { ok: true; client: SupabaseClient; userId: string; email: string }
  | { ok: false; reason: "demo" | "not_configured" | "signed_out" };

export async function signedInUser(): Promise<SignedIn> {
  if (isDemo()) return { ok: false, reason: "demo" };
  const client = await hostClient();
  if (!client) return { ok: false, reason: "not_configured" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, reason: "signed_out" };
  return { ok: true, client, userId: user.id, email: user.email ?? "you" };
}

export type HostGate =
  | { ok: true; host: HostContext }
  | { ok: false; reason: "demo" | "not_configured" | "signed_out" }
  | { ok: false; reason: "not_host"; email: string };

/** Who is signed in, and are they a host of this event? Used by every host page and action. */
export async function hostGate(slug: string): Promise<HostGate> {
  const who = await signedInUser();
  if (!who.ok) return who;
  const { client } = who;

  const access = await loadHostAccess(client, slug);
  if (!access) return { ok: false, reason: "not_host", email: who.email };

  const { data: ev, error } = await client
    .from("events")
    .select("id, slug, name_en, name_mr, cutoff_at, yes_show_rate, pending_show_rate")
    .eq("slug", slug)
    .single();
  if (error) throw new Error(`event lookup failed: ${error.message}`);
  const { data: fns, error: fnErr } = await client
    .from("functions")
    .select("id, name_en, name_mr, starts_at, venue, map_url, catered")
    .eq("event_id", ev.id)
    .order("starts_at")
    .order("sort_order");
  if (fnErr) throw new Error(`functions lookup failed: ${fnErr.message}`);

  return {
    ok: true,
    host: {
      client,
      userId: who.userId,
      email: who.email,
      side: access.side,
      canManage: access.side === null,
      event: {
        id: ev.id,
        slug: ev.slug,
        name: { en: ev.name_en, mr: ev.name_mr },
        cutoffAt: ev.cutoff_at,
        yesShowRate: Number(ev.yes_show_rate),
        pendingShowRate: Number(ev.pending_show_rate),
      },
      functions: (fns ?? []).map((f) => ({
        id: f.id,
        name: { en: f.name_en, mr: f.name_mr },
        startsAt: f.starts_at,
        venue: f.venue,
        mapUrl: f.map_url,
        catered: f.catered,
      })),
    },
  };
}

export interface MyEvent {
  slug: string;
  name: Bilingual;
  side: Side | null;
  firstStartsAt: string | null;
}

/** Events the signed-in user hosts (RLS: only their own host rows). */
export async function listMyEvents(client: SupabaseClient): Promise<MyEvent[]> {
  const { data, error } = await client
    .from("hosts")
    .select("side, events(slug, name_en, name_mr, created_at, functions(starts_at))");
  if (error) throw new Error(`events lookup failed: ${error.message}`);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[])
    .filter((h) => h.events)
    .map((h) => {
      const starts = ((h.events.functions ?? []) as any[]).map((f) => f.starts_at as string).sort();
      return { slug: h.events.slug, name: { en: h.events.name_en, mr: h.events.name_mr }, side: h.side, firstStartsAt: starts[0] ?? null };
    })
    .sort((a, b) => (a.firstStartsAt ?? "9").localeCompare(b.firstStartsAt ?? "9"));
}
