import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Expense, Method, Payment, Settlement, Split } from "../expenses";
import type { Side } from "../types";
import { admin } from "./admin";

// Expenses (owner only). Reads go through the owner's own session, so
// row-level security (migration 0029) applies; writes use the service role
// after the action has checked the owner.

/* eslint-disable @typescript-eslint/no-explicit-any */
const toPayment = (p: any): Payment => ({
  id: p.id,
  paidOn: p.paid_on,
  amount: Number(p.amount_paise),
  paidBy: p.paid_by as Side,
  method: p.method as Method,
  note: p.note ?? null,
});

const toExpense = (e: any): Expense => ({
  id: e.id,
  title: e.title,
  vendor: e.vendor ?? null,
  vendorPhone: e.vendor_phone ?? null,
  functionId: e.function_id ?? null,
  category: e.category as Category,
  amount: Number(e.amount_paise),
  split: e.split as Split,
  brideShare: Number(e.bride_share_paise),
  groomShare: Number(e.groom_share_paise),
  bridePctBp: e.bride_pct_bp ?? null,
  dueDate: e.due_date ?? null,
  billPath: e.bill_path ?? null,
  notes: e.notes ?? null,
  createdAt: e.created_at,
  payments: ((e.expense_payments ?? []) as any[])
    .map(toPayment)
    .sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.id.localeCompare(b.id)),
});

const toSettlement = (s: any): Settlement => ({
  id: s.id,
  fromSide: s.from_side,
  toSide: s.to_side,
  amount: Number(s.amount_paise),
  paidOn: s.paid_on,
  method: s.method,
  note: s.note ?? null,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Every expense of the event, with its payments, and the settlements: read as the owner (RLS). */
export async function loadExpenses(client: SupabaseClient, eventId: string): Promise<{ expenses: Expense[]; settlements: Settlement[] }> {
  const [ex, st] = await Promise.all([
    client
      .from("expenses")
      .select(
        "id, title, vendor, vendor_phone, function_id, category, amount_paise, split, bride_share_paise, groom_share_paise, bride_pct_bp, due_date, bill_path, notes, created_at, expense_payments(id, paid_on, amount_paise, paid_by, method, note)",
      )
      .eq("event_id", eventId),
    client.from("expense_settlements").select("id, from_side, to_side, amount_paise, paid_on, method, note").eq("event_id", eventId).order("paid_on"),
  ]);
  if (ex.error) throw new Error(`expenses lookup failed: ${ex.error.message}`);
  if (st.error) throw new Error(`settlements lookup failed: ${st.error.message}`);
  return { expenses: (ex.data ?? []).map(toExpense), settlements: (st.data ?? []).map(toSettlement) };
}

/** One expense with its payments (service role), for checking a save. */
export async function findExpense(eventId: string, id: string): Promise<Expense | null> {
  const { data, error } = await admin()
    .from("expenses")
    .select(
      "id, title, vendor, vendor_phone, function_id, category, amount_paise, split, bride_share_paise, groom_share_paise, bride_pct_bp, due_date, bill_path, notes, created_at, expense_payments(id, paid_on, amount_paise, paid_by, method, note)",
    )
    .eq("event_id", eventId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`expense lookup failed: ${error.message}`);
  return data ? toExpense(data) : null;
}

export interface ExpenseRow {
  title: string;
  vendor: string | null;
  vendorPhone: string | null;
  functionId: string | null;
  category: Category;
  amount: number;
  split: Split;
  brideShare: number;
  groomShare: number;
  bridePctBp: number | null;
  dueDate: string | null;
  notes: string | null;
}

export type NewPayment = Omit<Payment, "id">;

/**
 * Saves an expense (new when `id` is null) with its payments in one database
 * transaction: keeps the payments in `keep`, removes its others, adds `add`.
 * Returns "over" when the payments would come to more than the amount.
 */
export async function saveExpense(
  eventId: string,
  id: string | null,
  userId: string,
  e: ExpenseRow,
  keep: string[],
  add: NewPayment[],
): Promise<{ ok: true; id: string } | { ok: false; reason: "over" }> {
  const { data, error } = await admin().rpc("save_expense", {
    p_event: eventId,
    p_id: id,
    p_user: userId,
    p: {
      title: e.title,
      vendor: e.vendor,
      vendor_phone: e.vendorPhone,
      function_id: e.functionId,
      category: e.category,
      amount_paise: e.amount,
      split: e.split,
      bride_share_paise: e.brideShare,
      groom_share_paise: e.groomShare,
      bride_pct_bp: e.bridePctBp,
      due_date: e.dueDate,
      notes: e.notes,
    },
    p_keep: keep,
    p_new: add.map((p) => ({ paid_on: p.paidOn, amount_paise: p.amount, paid_by: p.paidBy, method: p.method, note: p.note })),
  });
  if (error) {
    if (error.message.includes("payments_exceed_amount")) return { ok: false, reason: "over" };
    throw new Error(`saving the expense failed: ${error.message}`);
  }
  return { ok: true, id: data as string };
}

/** Deletes an expense; its payments go with it (cascade). */
export async function deleteExpense(eventId: string, id: string): Promise<boolean> {
  const { data, error } = await admin().from("expenses").delete().eq("event_id", eventId).eq("id", id).select("id");
  if (error) throw new Error(`deleting the expense failed: ${error.message}`);
  return (data ?? []).length > 0;
}
