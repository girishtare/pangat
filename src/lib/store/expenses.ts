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

/** Deletes an expense; its payments go with it (cascade), and its bill file after. */
export async function deleteExpense(eventId: string, id: string): Promise<boolean> {
  const { data, error } = await admin().from("expenses").delete().eq("event_id", eventId).eq("id", id).select("id, bill_path");
  if (error) throw new Error(`deleting the expense failed: ${error.message}`);
  const gone = data ?? [];
  await removeBillFiles(gone.map((r) => r.bill_path as string | null).filter((p): p is string => !!p));
  return gone.length > 0;
}

/* ---------- Settlements ---------- */

export async function addSettlement(
  eventId: string,
  userId: string,
  s: { fromSide: Side; toSide: Side; amount: number; paidOn: string; method: Method; note: string | null },
): Promise<void> {
  const { error } = await admin().from("expense_settlements").insert({
    event_id: eventId,
    from_side: s.fromSide,
    to_side: s.toSide,
    amount_paise: s.amount,
    paid_on: s.paidOn,
    method: s.method,
    note: s.note,
    created_by: userId,
  });
  if (error) throw new Error(`saving the settlement failed: ${error.message}`);
}

export async function deleteSettlement(eventId: string, id: string): Promise<boolean> {
  const { data, error } = await admin().from("expense_settlements").delete().eq("event_id", eventId).eq("id", id).select("id");
  if (error) throw new Error(`deleting the settlement failed: ${error.message}`);
  return (data ?? []).length > 0;
}

/* ---------- Bills (private bucket `bills`, migration 0029) ---------- */

const BILLS = "bills";
export const BILL_MAX_BYTES = 20 * 1024 * 1024;
/** What a bill can be, and the file ending it is stored with. */
export const BILL_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** A one-time link the owner's browser uploads a bill to, straight to Storage. Path: <event>/<expense>/<random>.<ext>. */
export async function billUploadTarget(eventId: string, expenseId: string, ext: string): Promise<{ path: string; url: string }> {
  const path = `${eventId}/${expenseId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await admin().storage.from(BILLS).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`bill upload link failed: ${error?.message}`);
  return { path, url: data.signedUrl };
}

/** Is there a file at this path? (The browser says it uploaded; check before recording it.) */
export async function billExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const { data, error } = await admin().storage.from(BILLS).list(path.slice(0, slash), { search: path.slice(slash + 1) });
  if (error) throw new Error(`bill check failed: ${error.message}`);
  return (data ?? []).some((f) => f.name === path.slice(slash + 1));
}

/** Records a bill on an expense (null = remove it), and deletes the file it replaces. */
export async function setBill(eventId: string, expenseId: string, path: string | null): Promise<boolean> {
  const { data: row, error: readError } = await admin().from("expenses").select("bill_path").eq("event_id", eventId).eq("id", expenseId).maybeSingle();
  if (readError) throw new Error(`bill lookup failed: ${readError.message}`);
  if (!row) return false;
  const { error } = await admin().from("expenses").update({ bill_path: path, updated_at: new Date().toISOString() }).eq("id", expenseId);
  if (error) throw new Error(`saving the bill failed: ${error.message}`);
  if (row.bill_path && row.bill_path !== path) await removeBillFiles([row.bill_path]);
  return true;
}

/** Deletes bill files from Storage (a failure is logged: the database is already right). */
export async function removeBillFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin().storage.from(BILLS).remove(paths);
  if (error) console.error("bill files not deleted", error.message);
}

/** A link to the bill that works for an hour. */
export async function billSignedUrl(path: string): Promise<string> {
  const { data, error } = await admin().storage.from(BILLS).createSignedUrl(path, 3600);
  if (error || !data) throw new Error(`bill link failed: ${error?.message}`);
  return data.signedUrl;
}
