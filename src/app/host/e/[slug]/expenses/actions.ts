"use server";

import { revalidatePath } from "next/cache";
import {
  CATEGORIES,
  checkAmountCoversPayments,
  formatRupees,
  MAX_PAISE,
  METHODS,
  parsePct,
  parseRupees,
  splitShares,
  type Category,
  type Method,
  type SplitInput,
} from "@/lib/expenses";
import { normaliseMobile } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { deleteExpense, findExpense, saveExpense, type NewPayment } from "@/lib/store/expenses";

export type FormState = { ok: boolean; message: string } | null;

async function owner(slug: string): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { error: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  if (!gate.host.canManage) return { error: "Only the event's owner can see and change expenses." };
  return { host: gate.host };
}

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A payment sent by the pop-up: an existing one (id) or a new one. */
interface SentPayment {
  id?: string;
  paidOn: string;
  amount: number;
  paidBy: "bride" | "groom";
  method: Method;
  note: string | null;
}

function readPayments(raw: string): SentPayment[] | null {
  let list: unknown;
  try {
    list = JSON.parse(raw || "[]");
  } catch {
    return null;
  }
  if (!Array.isArray(list) || list.length > 200) return null;
  const out: SentPayment[] = [];
  for (const p of list) {
    if (!p || typeof p !== "object") return null;
    const r = p as Record<string, unknown>;
    const amount = Number(r.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_PAISE) return null;
    if (typeof r.paidOn !== "string" || !DATE.test(r.paidOn)) return null;
    if (r.paidBy !== "bride" && r.paidBy !== "groom") return null;
    if (!METHODS.includes(r.method as Method)) return null;
    const note = typeof r.note === "string" && r.note.trim() ? r.note.trim().slice(0, 200) : null;
    const id = typeof r.id === "string" && r.id ? r.id : undefined;
    out.push({ id, paidOn: r.paidOn, amount, paidBy: r.paidBy, method: r.method as Method, note });
  }
  return out;
}

/** Add an expense (`id` null) or save changes to one, with its payments. */
export async function saveExpenseAction(slug: string, id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await owner(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const { host } = who;

  const title = text(fd, "title");
  if (!title) return { ok: false, message: "Say what the expense is (for example: Catering)." };
  if (title.length > 120) return { ok: false, message: "Keep the name to 120 characters." };
  const vendor = text(fd, "vendor") || null;
  if (vendor && vendor.length > 120) return { ok: false, message: "Keep the vendor's name to 120 characters." };
  const phone = normaliseMobile(text(fd, "vendorPhone"));
  if (!phone.ok) return { ok: false, message: "The vendor's phone number doesn't look right. Check the country and the number." };

  const fnRaw = text(fd, "functionId");
  const functionId = fnRaw ? (host.functions.find((f) => f.id === fnRaw)?.id ?? null) : null;
  if (fnRaw && !functionId) return { ok: false, message: "Pick a function from the list." };
  const category = text(fd, "category") as Category;
  if (!CATEGORIES.includes(category)) return { ok: false, message: "Pick a category." };

  const amt = parseRupees(fd.get("amount"));
  if (!amt.ok || amt.paise === null || amt.paise <= 0) return { ok: false, message: "Enter the total amount in rupees, for example 1,20,000." };
  if (amt.paise > MAX_PAISE) return { ok: false, message: "That amount is too large." };
  const amount = amt.paise;

  const who2 = text(fd, "split");
  let split: SplitInput;
  if (who2 === "bride" || who2 === "groom") split = { split: who2 };
  else if (who2 === "shared") {
    if (text(fd, "splitBy") === "amount") {
      const b = parseRupees(fd.get("bride"));
      const g = parseRupees(fd.get("groom"));
      if (!b.ok || !g.ok) return { ok: false, message: "Enter each side's share in rupees." };
      split = { split: "shared_amount", bride: b.paise ?? 0, groom: g.paise ?? 0 };
    } else {
      const bp = parsePct(fd.get("bridePct"));
      if (bp === null) return { ok: false, message: "Enter the bride's side's share as a percentage from 0 to 100 (up to two decimals)." };
      split = { split: "shared_pct", bridePctBp: bp };
    }
  } else return { ok: false, message: "Choose who pays for it." };
  const shares = splitShares(amount, split);
  if (!shares.ok) return { ok: false, message: shares.message };

  const dueRaw = text(fd, "dueDate");
  if (dueRaw && !DATE.test(dueRaw)) return { ok: false, message: "Enter the date the rest is due, or leave it blank." };
  const notes = text(fd, "notes") || null;
  if (notes && notes.length > 1000) return { ok: false, message: "Keep the notes to 1,000 characters." };

  const sent = readPayments(String(fd.get("payments") ?? ""));
  if (!sent) return { ok: false, message: "A payment wasn't readable. Close the pop-up, reload the page and try again." };

  // Payments already saved stay as they were; only their ids come back from the pop-up.
  let keep: { id: string; amount: number }[] = [];
  if (id) {
    const current = await findExpense(host.event.id, id);
    if (!current) return { ok: false, message: "That expense is no longer there. Reload the page." };
    const ids = new Set(sent.filter((p) => p.id).map((p) => p.id));
    keep = current.payments.filter((p) => ids.has(p.id)).map((p) => ({ id: p.id, amount: p.amount }));
  }
  const add: NewPayment[] = sent.filter((p) => !p.id).map(({ paidOn, amount: a, paidBy, method, note }) => ({ paidOn, amount: a, paidBy, method, note }));
  const paid = keep.reduce((s, p) => s + p.amount, 0) + add.reduce((s, p) => s + p.amount, 0);
  const over = checkAmountCoversPayments(amount, paid);
  if (over) return { ok: false, message: over };

  const s = shares.shares;
  const r = await saveExpense(
    host.event.id,
    id,
    host.userId,
    {
      title,
      vendor,
      vendorPhone: phone.value,
      functionId,
      category,
      amount,
      split: split.split,
      brideShare: s.bride,
      groomShare: s.groom,
      bridePctBp: s.bridePctBp,
      dueDate: dueRaw || null,
      notes,
    },
    keep.map((p) => p.id),
    add,
  );
  if (!r.ok) return { ok: false, message: `The payments come to more than ${formatRupees(amount)}. Remove one and try again.` };
  revalidatePath(`/host/e/${slug}/expenses`);
  return { ok: true, message: id ? "Expense saved." : `Added ${title}.` };
}

export async function deleteExpenseAction(slug: string, id: string): Promise<FormState> {
  const who = await owner(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const gone = await deleteExpense(who.host.event.id, id);
  revalidatePath(`/host/e/${slug}/expenses`);
  return gone ? { ok: true, message: "Expense deleted." } : { ok: false, message: "That expense was already deleted." };
}
