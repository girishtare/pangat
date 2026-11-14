import "server-only";
import { cache } from "react";
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
  /** Number guests on each side can call (printed on slips). */
  contactPhone: Record<Side, string | null>;
  /** Custom WhatsApp texts; null = the built-in default. */
  messageText: { invite: string | null; reminder: string | null };
  /** When the caterer needs the first count, and the last day it can change (YYYY-MM-DD). */
  catererDueOn: string | null;
  catererFinalOn: string | null;
  /** Storage paths of the invitation card PDFs, per side and language (null: not uploaded). */
  cards: Record<Side, { en: string | null; mr: string | null }>;
}

export interface HostContext {
  /** Acts as the host: row-level security applies. */
  client: SupabaseClient;
  userId: string;
  email: string;
  /** null = both sides. */
  side: Side | null;
  role: "owner" | "co_owner";
  /** Only the owner manages the event: details, functions, co-owners, caterer numbers. */
  canManage: boolean;
  event: HostEvent;
  functions: (FunctionRef & { startsAt: string; venue: string | null; mapUrl: string | null; catered: boolean; vegOnly: boolean; icon: string | null })[];
}

export type SignedIn =
  | { ok: true; client: SupabaseClient; userId: string; email: string }
  | { ok: false; reason: "demo" | "not_configured" | "signed_out" };

/**
 * Who is signed in. Once per request (React cache).
 *
 * getClaims() checks the session token's signature locally (the project signs
 * with ES256, public key cached), so there is no round trip to Supabase Auth
 * here. src/proxy.ts still calls getUser() on every /host request, which
 * refreshes the session and catches a signed-out or deleted account.
 * (Before 12 Nov this called getUser() too: a second auth round trip per page.)
 */
export const signedInUser = cache(async (): Promise<SignedIn> => {
  if (isDemo()) return { ok: false, reason: "demo" };
  const client = await hostClient();
  if (!client) return { ok: false, reason: "not_configured" };
  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { ok: false, reason: "signed_out" };
  return { ok: true, client, userId: claims.sub, email: typeof claims.email === "string" && claims.email ? claims.email : "you" };
});

export type HostGate =
  | { ok: true; host: HostContext }
  | { ok: false; reason: "demo" | "not_configured" | "signed_out" }
  | { ok: false; reason: "not_host"; email: string };

/**
 * Who is signed in, and are they a host of this event? Used by every host page
 * and action. Once per request (React cache). The host role and the event
 * (with its functions embedded) are fetched together, in parallel: two
 * database round trips became one (owner, 12 Nov: speed).
 */
export const hostGate = cache(async (slug: string): Promise<HostGate> => {
  const who = await signedInUser();
  if (!who.ok) return who;
  const { client } = who;

  const [access, evRes] = await Promise.all([
    loadHostAccess(client, slug),
    client
      .from("events")
      .select(
        "id, slug, name_en, name_mr, cutoff_at, yes_show_rate, pending_show_rate, contact_phone_bride, contact_phone_groom, wa_invite_text, wa_reminder_text, caterer_due_on, caterer_final_on, card_bride_en_path, card_bride_mr_path, card_groom_en_path, card_groom_mr_path, functions(id, name_en, name_mr, starts_at, venue, map_url, catered, veg_only, sort_order, icon)",
      )
      .eq("slug", slug)
      .maybeSingle(),
  ]);
  if (!access) return { ok: false, reason: "not_host", email: who.email };
  if (evRes.error) throw new Error(`event lookup failed: ${evRes.error.message}`);
  const ev = evRes.data;
  if (!ev) return { ok: false, reason: "not_host", email: who.email };
  // Same order as before: by start time, then the host's order.
  const fns = [...((ev.functions ?? []) as { starts_at: string; sort_order: number | null }[])].sort(
    (a, b) => a.starts_at.localeCompare(b.starts_at) || (a.sort_order ?? 0) - (b.sort_order ?? 0),
  ) as unknown as {
    id: string;
    name_en: string;
    name_mr: string | null;
    starts_at: string;
    venue: string | null;
    map_url: string | null;
    catered: boolean;
    veg_only: boolean | null;
    icon: string | null;
  }[];

  return {
    ok: true,
    host: {
      client,
      userId: who.userId,
      email: who.email,
      side: access.side,
      role: access.role,
      canManage: access.role === "owner",
      event: {
        id: ev.id,
        slug: ev.slug,
        name: { en: ev.name_en, mr: ev.name_mr },
        cutoffAt: ev.cutoff_at,
        yesShowRate: Number(ev.yes_show_rate),
        pendingShowRate: Number(ev.pending_show_rate),
        contactPhone: { bride: ev.contact_phone_bride, groom: ev.contact_phone_groom },
        messageText: { invite: ev.wa_invite_text, reminder: ev.wa_reminder_text },
        catererDueOn: ev.caterer_due_on,
        catererFinalOn: ev.caterer_final_on,
        cards: {
          bride: { en: ev.card_bride_en_path ?? null, mr: ev.card_bride_mr_path ?? null },
          groom: { en: ev.card_groom_en_path ?? null, mr: ev.card_groom_mr_path ?? null },
        },
      },
      functions: (fns ?? []).map((f) => ({
        id: f.id,
        name: { en: f.name_en, mr: f.name_mr },
        startsAt: f.starts_at,
        venue: f.venue,
        mapUrl: f.map_url,
        catered: f.catered,
        vegOnly: !!f.veg_only,
        icon: f.icon ?? null,
      })),
    },
  };
});

export interface MyEvent {
  slug: string;
  name: Bilingual;
  side: Side | null;
  role: "owner" | "co_owner";
  firstStartsAt: string | null;
}

/** Events the signed-in user hosts (RLS: only their own host rows). */
export async function listMyEvents(client: SupabaseClient): Promise<MyEvent[]> {
  const { data, error } = await client
    .from("hosts")
    .select("side, role, events(slug, name_en, name_mr, created_at, functions(starts_at))");
  if (error) throw new Error(`events lookup failed: ${error.message}`);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return ((data ?? []) as any[])
    .filter((h) => h.events)
    .map((h) => {
      const starts = ((h.events.functions ?? []) as any[]).map((f) => f.starts_at as string).sort();
      return {
        slug: h.events.slug,
        name: { en: h.events.name_en, mr: h.events.name_mr },
        side: h.side,
        role: (h.role === "owner" ? "owner" : "co_owner") as MyEvent["role"],
        firstStartsAt: starts[0] ?? null,
      };
    })
    .sort((a, b) => (a.firstStartsAt ?? "9").localeCompare(b.firstStartsAt ?? "9"));
}
