import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResponseSource, Side } from "../types";
import { admin } from "./admin";

export interface StoredReply {
  functionId: string;
  status: "yes" | "no";
  heads: number;
  veg: number;
  nonveg: number;
  source: ResponseSource;
  updatedAt: string;
}

export interface RepliedHousehold {
  id: string;
  nameEn: string;
  nameMr: string | null;
  side: Side;
  location: string | null;
  mobile: string | null;
  shortCode: string;
  replies: StoredReply[];
}

interface Row {
  id: string;
  name_en: string;
  name_mr: string | null;
  side: Side;
  location: string | null;
  mobile: string | null;
  short_code: string;
  responses: {
    function_id: string;
    status: "yes" | "no";
    heads: number;
    veg: number;
    nonveg: number;
    source: ResponseSource;
    updated_at: string;
  }[];
}

/** Households with at least one reply, in name order. Read as the signed-in host, so row-level security applies. */
export async function loadRepliedHouseholds(client: SupabaseClient, eventId: string): Promise<RepliedHousehold[]> {
  const { data, error } = await client
    .from("households")
    .select("id, name_en, name_mr, side, location, mobile, short_code, responses!inner(function_id, status, heads, veg, nonveg, source, updated_at)")
    .eq("event_id", eventId)
    .order("name_en");
  if (error) throw new Error(`loading replies failed: ${error.message}`);
  return (data as unknown as Row[]).map((h) => ({
    id: h.id,
    nameEn: h.name_en,
    nameMr: h.name_mr,
    side: h.side,
    location: h.location,
    mobile: h.mobile,
    shortCode: h.short_code,
    replies: h.responses.map((r) => ({
      functionId: r.function_id,
      status: r.status,
      heads: r.heads,
      veg: r.veg,
      nonveg: r.nonveg,
      source: r.source,
      updatedAt: r.updated_at,
    })),
  }));
}

/**
 * Removes a household's whole reply and its history, so it counts as waiting
 * again. The household, its link, QR code and short code are untouched.
 * History goes first: if the second step fails the reply is still listed and
 * can be cleared again. Returns null when the household isn't on this event.
 */
export async function clearReply(eventId: string, householdId: string): Promise<{ name: string; removed: number } | null> {
  const db = admin();
  const { data: household, error: findError } = await db
    .from("households")
    .select("name_en")
    .eq("id", householdId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (findError) throw new Error(`finding household failed: ${findError.message}`);
  if (!household) return null;

  const { error: historyError } = await db.from("response_history").delete().eq("household_id", householdId);
  if (historyError) throw new Error(`clearing reply history failed: ${historyError.message}`);
  const { count, error } = await db.from("responses").delete({ count: "exact" }).eq("household_id", householdId);
  if (error) throw new Error(`clearing reply failed: ${error.message}`);
  return { name: household.name_en as string, removed: count ?? 0 };
}
