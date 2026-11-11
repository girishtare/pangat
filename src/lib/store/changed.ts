import type { SupabaseClient } from "@supabase/supabase-js";
import { replyChanged, type SavedReply } from "../validate";

/**
 * Keeps only the replies that differ from what is already saved for the
 * household. Saving a whole form used to rewrite every function's row, so an
 * unchanged reply got a new source (a host correcting one function turned the
 * guest's QR replies into "on behalf") and a history row that looked like a
 * change. The pilot review counts replies by channel and how many changed, so
 * only real changes are written.
 */
export async function onlyChangedReplies<T extends SavedReply & { function_id: string }>(
  db: SupabaseClient,
  householdId: string,
  rows: T[],
): Promise<T[]> {
  const { data, error } = await db.from("responses").select("function_id, status, heads, veg, nonveg, arrival_slot").eq("household_id", householdId);
  if (error) throw new Error(`responses lookup failed: ${error.message}`);
  const saved = new Map((data ?? []).map((r) => [r.function_id as string, r as SavedReply]));
  return rows.filter((r) => replyChanged(saved.get(r.function_id), r));
}
