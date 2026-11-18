// Expenses (owner, 18 Nov): every cost of the event, split between the bride's
// side and the groom's side, who paid what, and who owes whom.
//
// All money is whole paise (integers). Never floats: products and divisions go
// through BigInt and round half up, so the two sides always add up exactly.

import type { Side } from "./types";

export const CATEGORIES = [
  "catering",
  "venue",
  "decor",
  "clothes",
  "jewellery",
  "gifts",
  "music",
  "photography",
  "printing",
  "travel_stay",
  "rituals",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  catering: "Catering",
  venue: "Venue",
  decor: "Decor",
  clothes: "Clothes",
  jewellery: "Jewellery",
  gifts: "Gifts",
  music: "Music",
  photography: "Photography",
  printing: "Printing",
  travel_stay: "Travel and stay",
  rituals: "Rituals",
  other: "Other",
};

export const SPLITS = ["bride", "groom", "shared_pct", "shared_amount"] as const;
export type Split = (typeof SPLITS)[number];

export const METHODS = ["upi", "cash", "bank", "cheque", "card"] as const;
export type Method = (typeof METHODS)[number];
export const METHOD_LABEL: Record<Method, string> = { upi: "UPI", cash: "Cash", bank: "Bank transfer", cheque: "Cheque", card: "Card" };

export const SIDE_NAME: Record<Side, string> = { bride: "Bride's side", groom: "Groom's side" };

/** ₹100 crore: far above any wedding cost, and keeps every product well inside BigInt-free territory for display. */
export const MAX_PAISE = 100_000_000_000;

/* ---------- Arithmetic ---------- */

/** round(a × b ÷ c), half up, for non-negative integers. Exact (BigInt). */
export function mulDivRound(a: number, b: number, c: number): number {
  if (c <= 0) throw new Error("division by zero");
  const A = BigInt(a);
  const B = BigInt(b);
  const C = BigInt(c);
  return Number((A * B * 2n + C) / (2n * C));
}

/* ---------- Reading and showing rupees ---------- */

/**
 * "1,20,000", "120000.50", "₹ 45,000" → paise. Up to two decimals.
 * Returns null for blank, or { error } for anything that isn't an amount.
 */
export function parseRupees(raw: unknown): { ok: true; paise: number | null } | { ok: false } {
  const s = String(raw ?? "")
    .trim()
    .replace(/^₹\s*/, "")
    .replace(/^rs\.?\s*/i, "")
    .replace(/[,\s]/g, "");
  if (s === "") return { ok: true, paise: null };
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false };
  const paise = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  if (!Number.isSafeInteger(paise)) return { ok: false };
  return { ok: true, paise };
}

const RUPEES = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const RUPEES_PAISE = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹10,93,000, or ₹333.63 when there are paise. Integer division only (no float maths on the amount). */
export function formatRupees(paise: number): string {
  const neg = paise < 0;
  const p = Math.abs(paise);
  const rupees = Math.floor(p / 100);
  const rest = p % 100;
  const text = rest === 0 ? RUPEES.format(rupees) : RUPEES_PAISE.format(rupees + rest / 100);
  return neg ? `−${text}` : text;
}

/** "1,20,000" or "333.63", for putting an amount back into a text box. */
export function rupeesInput(paise: number | null): string {
  if (paise === null) return "";
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  const whole = rupees.toLocaleString("en-IN");
  return rest === 0 ? whole : `${whole}.${String(rest).padStart(2, "0")}`;
}

/** "60", "33.33": basis points as a percentage. */
export function pctText(bp: number): string {
  const whole = Math.floor(bp / 100);
  const rest = bp % 100;
  return rest === 0 ? String(whole) : `${whole}.${String(rest).padStart(2, "0").replace(/0$/, "")}`;
}

/** "60" or "33.33" (0 to 100, up to two decimals) → basis points. */
export function parsePct(raw: unknown): number | null {
  const s = String(raw ?? "").trim().replace(/%$/, "").trim();
  const m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
  return bp <= 10_000 ? bp : null;
}

/* ---------- Split ---------- */

export type SplitInput =
  | { split: "bride" }
  | { split: "groom" }
  | { split: "shared_pct"; bridePctBp: number }
  | { split: "shared_amount"; bride: number; groom: number };

export type Shares = { bride: number; groom: number; bridePctBp: number | null };

/** Each side's share of an amount. Errors are the words shown to the owner. */
export function splitShares(amount: number, s: SplitInput): { ok: true; shares: Shares } | { ok: false; message: string } {
  switch (s.split) {
    case "bride":
      return { ok: true, shares: { bride: amount, groom: 0, bridePctBp: null } };
    case "groom":
      return { ok: true, shares: { bride: 0, groom: amount, bridePctBp: null } };
    case "shared_pct": {
      if (!Number.isInteger(s.bridePctBp) || s.bridePctBp < 0 || s.bridePctBp > 10_000) {
        return { ok: false, message: "Enter the bride's side's share as a percentage from 0 to 100." };
      }
      const bride = mulDivRound(amount, s.bridePctBp, 10_000);
      return { ok: true, shares: { bride, groom: amount - bride, bridePctBp: s.bridePctBp } };
    }
    case "shared_amount":
      if (s.bride < 0 || s.groom < 0 || s.bride + s.groom !== amount) {
        return { ok: false, message: `The two shares must add up to ${formatRupees(amount)}.` };
      }
      return { ok: true, shares: { bride: s.bride, groom: s.groom, bridePctBp: null } };
  }
}

/* ---------- Expenses, payments, settlements ---------- */

export interface Payment {
  id: string;
  paidOn: string; // YYYY-MM-DD
  amount: number; // paise
  paidBy: Side;
  method: Method;
  note: string | null;
}

export interface Expense {
  id: string;
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
  dueDate: string | null; // YYYY-MM-DD: when the rest is due
  billPath: string | null;
  notes: string | null;
  payments: Payment[];
  createdAt: string;
}

export interface Settlement {
  id: string;
  fromSide: Side;
  toSide: Side;
  amount: number;
  paidOn: string;
  method: Method;
  note: string | null;
}

export type Status = "paid" | "part" | "unpaid";
export const STATUS_LABEL: Record<Status, string> = { paid: "Paid", part: "Part paid", unpaid: "Not paid" };

export const paidOf = (e: Pick<Expense, "payments">): number => e.payments.reduce((s, p) => s + p.amount, 0);
export const dueOf = (e: Pick<Expense, "payments" | "amount">): number => e.amount - paidOf(e);

export function statusOf(e: Pick<Expense, "payments" | "amount">): Status {
  const paid = paidOf(e);
  return paid >= e.amount ? "paid" : paid > 0 ? "part" : "unpaid";
}

/** Who paid an expense's payments: one side, both, or nobody yet. */
export function paidBy(e: Pick<Expense, "payments">): Side | "both" | null {
  const sides = new Set(e.payments.map((p) => p.paidBy));
  return sides.size === 0 ? null : sides.size === 2 ? "both" : [...sides][0];
}

/**
 * A new payment may not take the total paid past the amount. `due` is what is
 * still due before this payment. Null = fine.
 */
export function checkPayment(due: number, amount: number): string | null {
  if (amount <= 0) return "Enter the amount paid.";
  if (amount > due) return due === 0 ? "This expense is already paid in full." : `That's more than the ${formatRupees(due)} still due.`;
  return null;
}

/** Payments already made can't be more than a changed amount. Null = fine. */
export function checkAmountCoversPayments(amount: number, paid: number): string | null {
  return paid > amount ? `${formatRupees(paid)} has already been paid, which is more than the new total of ${formatRupees(amount)}. Remove a payment first.` : null;
}

/* ---------- Settle up ---------- */

/**
 * The bride's side's share of what has been paid on one expense, rounded half
 * up to the whole rupee; the groom's side's is the rest.
 *
 * Rupees, not paise: the owner settles in rupees, and paise left over would
 * keep the balance from ever reaching "All square". (The design's sample:
 * ₹50,000 paid on a ₹70,000 / ₹50,000 split is ₹29,166.67 in paise; ₹29,167
 * here, which is what makes "owes ₹89,833" exact.)
 */
export function brideShareOfPaid(e: Pick<Expense, "amount" | "brideShare" | "payments">): number {
  const paid = paidOf(e);
  if (paid === 0 || e.amount === 0) return 0;
  const rupees = mulDivRound(paid, e.brideShare, e.amount * 100); // paise × share ÷ (amount × 100) = rupees
  return Math.min(paid, rupees * 100);
}

export interface SideTotals {
  /** Its share of the total, once everything is paid. */
  shareOfTotal: number;
  /** Its share of what has been paid so far. */
  shareOfPaid: number;
  /** Its payments to vendors, plus settlements it made, less settlements it received. */
  hasPaid: number;
  /** hasPaid − shareOfPaid: positive = paid extra, negative = short. */
  balance: number;
}

export interface Summary {
  total: number;
  paid: number;
  due: number;
  count: number;
  side: Record<Side, SideTotals>;
  /** Who owes whom for what has been paid so far; null = all square. */
  owes: { from: Side; to: Side; amount: number } | null;
}

export function summarise(expenses: Expense[], settlements: Settlement[] = []): Summary {
  let total = 0;
  let paid = 0;
  const share = { bride: 0, groom: 0 };
  const shareOfPaid = { bride: 0, groom: 0 };
  const hasPaid = { bride: 0, groom: 0 };
  for (const e of expenses) {
    total += e.amount;
    share.bride += e.brideShare;
    share.groom += e.groomShare;
    const p = paidOf(e);
    paid += p;
    const b = brideShareOfPaid(e);
    shareOfPaid.bride += b;
    shareOfPaid.groom += p - b;
    for (const pay of e.payments) hasPaid[pay.paidBy] += pay.amount;
  }
  for (const s of settlements) {
    hasPaid[s.fromSide] += s.amount;
    hasPaid[s.toSide] -= s.amount;
  }
  const side = (k: Side): SideTotals => ({
    shareOfTotal: share[k],
    shareOfPaid: shareOfPaid[k],
    hasPaid: hasPaid[k],
    balance: hasPaid[k] - shareOfPaid[k],
  });
  const bride = side("bride");
  const groom = side("groom");
  const owes = bride.balance === 0 ? null : bride.balance < 0 ? { from: "bride" as const, to: "groom" as const, amount: -bride.balance } : { from: "groom" as const, to: "bride" as const, amount: bride.balance };
  return { total, paid, due: total - paid, count: expenses.length, side: { bride, groom }, owes };
}

/* ---------- Lists ---------- */

/** Days from `today` to `date` (both YYYY-MM-DD); negative = past. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/**
 * Expenses with money due whose due date is in the next `days` days, overdue
 * ones first, then earliest first.
 */
export function dueSoon<T extends Pick<Expense, "amount" | "payments" | "dueDate" | "title">>(expenses: T[], today: string, days = 14): T[] {
  return expenses
    .filter((e) => dueOf(e) > 0 && e.dueDate && daysUntil(e.dueDate, today) <= days)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.title.localeCompare(b.title));
}

/** How an expense is split, in words: "Shared 50 / 50", "₹70,000 / ₹50,000", "Bride's side only". */
export function splitLabel(e: Pick<Expense, "split" | "bridePctBp" | "brideShare" | "groomShare">): string {
  switch (e.split) {
    case "bride":
      return "Bride's side only";
    case "groom":
      return "Groom's side only";
    case "shared_pct": {
      const bp = e.bridePctBp ?? 0;
      return `Shared ${pctText(bp)} / ${pctText(10_000 - bp)}`;
    }
    case "shared_amount":
      return `${formatRupees(e.brideShare)} / ${formatRupees(e.groomShare)}`;
  }
}

/** The bride's side's part of a bar, 0 to 100. */
export function brideBarPct(bride: number, total: number): number {
  return total > 0 ? Math.round((bride / total) * 1000) / 10 : 0;
}
