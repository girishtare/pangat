import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Supabase client acting as the signed-in host, from their session cookies.
 * Uses the publishable key, so row-level security decides what they can read.
 * Returns null when host sign-in is not configured.
 */
export async function hostClient(): Promise<SupabaseClient | null> {
  const cfg = supabaseConfig();
  if (!cfg?.publishableKey) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies. src/proxy.ts refreshes
          // the session on every /host request, so this is safe to ignore.
        }
      },
    },
  });
}
