/**
 * Supabase settings, read at request time from the host's environment
 * (Cloudflare: Worker → Settings → Variables and Secrets).
 *
 * None of these use the NEXT_PUBLIC_ prefix: no browser code talks to
 * Supabase, and NEXT_PUBLIC_ values are baked in at build time.
 */
export interface SupabaseConfig {
  url: string;
  /** Publishable (anon) key. Used only for host sign-in sessions; RLS applies. */
  publishableKey: string | null;
  /** Service-role key. Server-only, bypasses RLS. Store it as a secret. */
  serviceRoleKey: string;
}

export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || null };
}

/** Event the host dashboard shows. */
export function eventSlug(): string {
  return process.env.PANGAT_EVENT_SLUG || "demo-wedding";
}
