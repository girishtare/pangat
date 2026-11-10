import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FunctionRef } from "./guestlist";
import { isDemo } from "./store";
import { loadHostAccess } from "./store/supabase";
import { eventSlug } from "./supabase/config";
import { hostClient } from "./supabase/session";
import type { Bilingual, Side } from "./types";

export interface HostContext {
  /** Acts as the host: row-level security applies. */
  client: SupabaseClient;
  userId: string;
  email: string;
  /** null = both sides. */
  side: Side | null;
  event: { id: string; slug: string; name: Bilingual };
  functions: FunctionRef[];
}

export type HostGate =
  | { ok: true; host: HostContext }
  | { ok: false; reason: "demo" | "not_configured" | "signed_out" }
  | { ok: false; reason: "not_host"; email: string };

/** Who is signed in, and are they a host of this event? Used by host pages and actions. */
export async function hostGate(): Promise<HostGate> {
  if (isDemo()) return { ok: false, reason: "demo" };
  const client = await hostClient();
  if (!client) return { ok: false, reason: "not_configured" };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, reason: "signed_out" };
  const email = user.email ?? "you";

  const slug = eventSlug();
  const access = await loadHostAccess(client, slug);
  if (!access) return { ok: false, reason: "not_host", email };

  const { data: ev, error } = await client.from("events").select("id, slug, name_en, name_mr").eq("slug", slug).single();
  if (error) throw new Error(`event lookup failed: ${error.message}`);
  const { data: fns, error: fnErr } = await client
    .from("functions")
    .select("id, name_en, name_mr")
    .eq("event_id", ev.id)
    .order("sort_order")
    .order("starts_at");
  if (fnErr) throw new Error(`functions lookup failed: ${fnErr.message}`);

  return {
    ok: true,
    host: {
      client,
      userId: user.id,
      email,
      side: access.side,
      event: { id: ev.id, slug: ev.slug, name: { en: ev.name_en, mr: ev.name_mr } },
      functions: (fns ?? []).map((f) => ({ id: f.id, name: { en: f.name_en, mr: f.name_mr } })),
    },
  };
}
