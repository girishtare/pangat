"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Paperclip } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  checkPayment,
  formatRupees,
  METHOD_LABEL,
  METHODS,
  mulDivRound,
  parsePct,
  parseRupees,
  pctText,
  rupeesInput,
  SIDE_NAME,
  type Expense,
  type Method,
} from "@/lib/expenses";
import type { Side } from "@/lib/types";
import { dayOfDate } from "@/lib/when";
import PhoneInput from "../../../../ui/PhoneInput";
import { Alert } from "../../../../ui/kit";
import { useFormAction } from "../../../../ui/useFormAction";
import { Bar } from "./Bar";
import { deleteExpenseAction, saveExpenseAction, type FormState } from "./actions";

type Mode = "bride" | "groom" | "shared";
type SplitBy = "pct" | "amount";

/** A payment in the pop-up: saved ones have an id; new ones are saved with the expense. */
interface DraftPayment {
  key: string;
  id?: string;
  paidOn: string;
  amount: number;
  paidBy: Side;
  method: Method;
  note: string | null;
}

export interface FunctionChoice {
  id: string;
  name: string;
}

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

const fromSaved = (e?: Expense): DraftPayment[] => (e?.payments ?? []).map((p) => ({ key: p.id, ...p }));

function startSplit(e?: Expense) {
  const mode: Mode = !e ? "shared" : e.split === "bride" || e.split === "groom" ? e.split : "shared";
  const splitBy: SplitBy = e?.split === "shared_amount" ? "amount" : "pct";
  const bp = e?.split === "shared_pct" ? (e.bridePctBp ?? 5000) : 5000;
  return {
    mode,
    splitBy,
    bridePct: pctText(bp),
    groomPct: pctText(10_000 - bp),
    brideAmt: e ? rupeesInput(e.brideShare) : "",
    groomAmt: e ? rupeesInput(e.groomShare) : "",
  };
}

const rupeesOf = (s: string): number | null => {
  const r = parseRupees(s);
  return r.ok ? r.paise : null;
};

/** Add an expense (no `expense`) or edit one, with its payments. */
export function ExpenseForm({ slug, functions, expense, onDone }: { slug: string; functions: FunctionChoice[]; expense?: Expense; onDone?: () => void }) {
  const editing = !!expense;
  const [state, action, pending] = useFormAction(saveExpenseAction.bind(null, slug, expense?.id ?? null), { keep: editing });
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [amountText, setAmountText] = useState(expense ? rupeesInput(expense.amount) : "");
  const [split, setSplit] = useState(() => startSplit(expense));
  const [payments, setPayments] = useState<DraftPayment[]>(() => fromSaved(expense));
  const [draft, setDraft] = useState({ paidOn: todayIst(), amount: "", paidBy: "bride" as Side, method: "upi" as Method, note: "" });
  const [draftError, setDraftError] = useState<string | null>(null);

  // Once saved, the payments shown are the saved ones (with their ids), so a
  // second save doesn't add the same payment again.
  const savedSig = (expense?.payments ?? []).map((p) => p.id).join(",");
  useEffect(() => {
    if (editing) setPayments(fromSaved(expense));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSig, editing]);

  // An add form starts again empty after a successful add.
  useEffect(() => {
    if (state?.ok && !editing) {
      setAmountText("");
      setSplit(startSplit());
      setPayments([]);
      setDraftError(null);
    }
  }, [state, editing]);

  const amount = rupeesOf(amountText);
  const validAmount = amount !== null && amount > 0 ? amount : null;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const due = validAmount !== null ? validAmount - paid : null;

  // Each side's share as it stands, for the bar and the "adds up" line.
  const live = useMemo(() => {
    if (split.mode !== "shared") {
      return { bride: split.mode === "bride" ? validAmount : 0, groom: split.mode === "groom" ? validAmount : 0, error: null as string | null };
    }
    if (split.splitBy === "pct") {
      const bp = parsePct(split.bridePct);
      if (bp === null) return { bride: null, groom: null, error: "Enter the bride's side's share as a percentage from 0 to 100." };
      if (validAmount === null) return { bride: null, groom: null, error: null, bp };
      const b = mulDivRound(validAmount, bp, 10_000);
      return { bride: b, groom: validAmount - b, error: null, bp };
    }
    const b = rupeesOf(split.brideAmt);
    const g = rupeesOf(split.groomAmt);
    if (b === null && split.brideAmt.trim() !== "") return { bride: null, groom: null, error: "Enter the bride's side's share in rupees." };
    if (g === null && split.groomAmt.trim() !== "") return { bride: null, groom: null, error: "Enter the groom's side's share in rupees." };
    const bb = b ?? 0;
    const gg = g ?? 0;
    if (validAmount !== null && bb + gg !== validAmount) return { bride: bb, groom: gg, error: `The two shares must add up to ${formatRupees(validAmount)}.` };
    return { bride: bb, groom: gg, error: null };
  }, [split, validAmount]);

  const pctOf = (part: number | null) => (part !== null && validAmount ? `${pctText(Math.round((part * 10_000) / validAmount))}%` : "");
  const barPct = live.bride !== null && validAmount ? Math.min(100, (live.bride / validAmount) * 100) : split.mode === "groom" ? 0 : 50;

  const setBridePct = (v: string) => {
    const bp = parsePct(v);
    setSplit((s) => ({ ...s, bridePct: v, groomPct: bp === null ? s.groomPct : pctText(10_000 - bp) }));
  };
  const setGroomPct = (v: string) => {
    const bp = parsePct(v);
    setSplit((s) => ({ ...s, groomPct: v, bridePct: bp === null ? s.bridePct : pctText(10_000 - bp) }));
  };
  const setBrideAmt = (v: string) => {
    const p = rupeesOf(v);
    setSplit((s) => ({ ...s, brideAmt: v, groomAmt: p !== null && validAmount !== null && p <= validAmount ? rupeesInput(validAmount - p) : s.groomAmt }));
  };
  const setGroomAmt = (v: string) => {
    const p = rupeesOf(v);
    setSplit((s) => ({ ...s, groomAmt: v, brideAmt: p !== null && validAmount !== null && p <= validAmount ? rupeesInput(validAmount - p) : s.brideAmt }));
  };
  const switchSplitBy = (by: SplitBy) => {
    if (by === split.splitBy) return;
    if (by === "amount") {
      // Carry the percentage over as amounts, when there is a total.
      const bp = parsePct(split.bridePct);
      if (bp !== null && validAmount !== null) {
        const b = mulDivRound(validAmount, bp, 10_000);
        setSplit((s) => ({ ...s, splitBy: by, brideAmt: rupeesInput(b), groomAmt: rupeesInput(validAmount - b) }));
        return;
      }
    } else {
      const b = rupeesOf(split.brideAmt);
      if (b !== null && validAmount !== null && b <= validAmount) {
        const bp = Math.round((b * 10_000) / validAmount);
        setSplit((s) => ({ ...s, splitBy: by, bridePct: pctText(bp), groomPct: pctText(10_000 - bp) }));
        return;
      }
    }
    setSplit((s) => ({ ...s, splitBy: by }));
  };
  const halfEach = () => {
    if (split.splitBy === "pct" || validAmount === null) {
      setSplit((s) => ({ ...s, splitBy: validAmount === null ? "pct" : s.splitBy, bridePct: "50", groomPct: "50" }));
      return;
    }
    const b = mulDivRound(validAmount, 1, 2);
    setSplit((s) => ({ ...s, brideAmt: rupeesInput(b), groomAmt: rupeesInput(validAmount - b) }));
  };

  const addPayment = () => {
    const a = rupeesOf(draft.amount);
    if (a === null || a <= 0) return setDraftError("Enter the amount paid, in rupees.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.paidOn)) return setDraftError("Enter the date it was paid.");
    if (due === null) return setDraftError("Enter the total amount first.");
    const err = checkPayment(due, a);
    if (err) return setDraftError(err);
    setPayments((list) => [
      ...list,
      { key: `new-${Date.now()}-${list.length}`, paidOn: draft.paidOn, amount: a, paidBy: draft.paidBy, method: draft.method, note: draft.note.trim() || null },
    ]);
    setDraft((d) => ({ ...d, amount: "", note: "" }));
    setDraftError(null);
  };

  const sentPayments = JSON.stringify(
    payments.map((p) => (p.id ? { id: p.id, paidOn: p.paidOn, amount: p.amount, paidBy: p.paidBy, method: p.method, note: p.note } : { paidOn: p.paidOn, amount: p.amount, paidBy: p.paidBy, method: p.method, note: p.note })),
  );

  const close = (el: HTMLElement) => {
    el.closest("dialog")?.close();
    onDone?.();
  };

  return (
    <form onSubmit={action} className="mt-4 space-y-4">
      <label className="block">
        <span className="label">What is it?</span>
        <input name="title" required maxLength={120} defaultValue={expense?.title ?? ""} className="input" placeholder="Catering, hall hire, mandap decor…" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">
            Vendor <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input name="vendor" maxLength={120} defaultValue={expense?.vendor ?? ""} className="input" placeholder="Annapurna Caterers" />
        </label>
        <label className="block">
          <span className="label">
            Vendor&apos;s phone <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <PhoneInput name="vendorPhone" label="Vendor's phone" defaultValue={expense?.vendorPhone} />
        </label>
        <label className="block">
          <span className="label">Function</span>
          <select name="functionId" defaultValue={expense?.functionId ?? ""} className="input">
            <option value="">General (not one function)</option>
            {functions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Category</span>
          <select name="category" required defaultValue={expense?.category ?? ""} className="input">
            <option value="" disabled>
              Choose a category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Total amount</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true">
              ₹
            </span>
            <input
              name="amount"
              required
              inputMode="decimal"
              autoComplete="off"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={() => validAmount !== null && setAmountText(rupeesInput(validAmount))}
              className="input pl-8 font-semibold"
              placeholder="1,20,000"
            />
          </span>
          {amountText.trim() !== "" && validAmount === null && <span className="mt-1 block text-sm text-kumkum">Enter rupees, for example 1,20,000 or 45000.50.</span>}
        </label>
      </div>

      <fieldset className="min-w-0 rounded-[14px] border border-line px-4 pb-4 pt-1">
        <legend className="px-1 font-display text-base text-ink">Who pays for it</legend>
        <input type="hidden" name="split" value={split.mode} />
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(["bride", "groom", "shared"] as const).map((m) => (
            <label key={m} className="choice relative min-h-12">
              <input type="radio" name="splitMode" value={m} checked={split.mode === m} onChange={() => setSplit((s) => ({ ...s, mode: m }))} />
              {split.mode === m && <Check className="h-4 w-4" aria-hidden="true" />}
              {m === "shared" ? "Shared" : `${SIDE_NAME[m]} only`}
            </label>
          ))}
        </div>

        {split.mode === "shared" && (
          <div className="mt-4 space-y-3">
            <input type="hidden" name="splitBy" value={split.splitBy} />
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Split by</span>
              <div role="group" aria-label="Split by" className="inline-flex gap-1 rounded-xl bg-paper-deep p-1">
                {(["pct", "amount"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={split.splitBy === b}
                    onClick={() => switchSplitBy(b)}
                    className={`min-h-10 rounded-lg px-3.5 text-sm font-bold ${split.splitBy === b ? "bg-card text-kumkum shadow-sm" : "text-ink hover:bg-card/70"}`}
                  >
                    {b === "pct" ? "Percentage" : "Amount"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={halfEach} className="btn btn-secondary btn-sm min-h-11">
                Half each
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["bride", "groom"] as const).map((side) => {
                const pctMode = split.splitBy === "pct";
                const value = pctMode ? (side === "bride" ? split.bridePct : split.groomPct) : side === "bride" ? split.brideAmt : split.groomAmt;
                const onChange = pctMode ? (side === "bride" ? setBridePct : setGroomPct) : side === "bride" ? setBrideAmt : setGroomAmt;
                const part = side === "bride" ? live.bride : live.groom;
                const beside = pctMode ? (part !== null ? formatRupees(part) : "") : pctOf(part);
                return (
                  <label key={side} className="block">
                    <span className={`label ${side === "bride" ? "text-kumkum" : "text-haldi-deep"}`}>{SIDE_NAME[side]}</span>
                    <span className="relative block">
                      {!pctMode && (
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true">
                          ₹
                        </span>
                      )}
                      <input
                        name={pctMode ? (side === "bride" ? "bridePct" : undefined) : side}
                        inputMode="decimal"
                        autoComplete="off"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        aria-label={`${SIDE_NAME[side]}'s share${pctMode ? " (per cent)" : " (rupees)"}`}
                        className={`input font-semibold ${pctMode ? "pr-32" : "pl-8 pr-16"}`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
                        {pctMode ? `% ${beside ? `· ${beside}` : ""}` : beside}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Bar bridePct={barPct} />
            {live.error ? (
              <p className="text-sm font-semibold text-kumkum" role="alert">
                {live.error}
              </p>
            ) : validAmount !== null ? (
              <p className="flex items-center gap-1 text-sm font-semibold text-leaf">
                <Check className="h-4 w-4" aria-hidden="true" /> Adds up to {formatRupees(validAmount)}
              </p>
            ) : null}
          </div>
        )}
      </fieldset>

      <fieldset className="min-w-0 rounded-[14px] border border-line px-4 pb-4 pt-1">
        <legend className="px-1 font-display text-base text-ink">Payments</legend>
        <input type="hidden" name="payments" value={sentPayments} />
        {payments.length > 0 && (
          <div className="relative mt-2 overflow-x-auto">{/* relative: keeps the screen-reader-only header inside the scroll box */}
            <table className="table-p">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Paid by</th>
                  <th scope="col">How</th>
                  <th scope="col">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.key}>
                    <td className="whitespace-nowrap">{dayOfDate(p.paidOn)}</td>
                    <td className="whitespace-nowrap font-semibold">{formatRupees(p.amount)}</td>
                    <td>
                      <span className={`badge ${p.paidBy === "bride" ? "badge-bride" : "badge-groom"}`}>{SIDE_NAME[p.paidBy]}</span>
                    </td>
                    <td>
                      {METHOD_LABEL[p.method]}
                      {p.note ? ` · ${p.note}` : ""}
                      {!p.id && <span className="block text-xs text-ink-soft">not saved yet</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setPayments((list) => list.filter((x) => x.key !== p.key))}
                        className="inline-flex min-h-11 items-center px-2 font-bold text-kumkum underline"
                        aria-label={`Remove the payment of ${formatRupees(p.amount)} on ${dayOfDate(p.paidOn)}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-[9.5rem_8rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="block">
            <span className="label">Date</span>
            <input type="date" value={draft.paidOn} onChange={(e) => setDraft((d) => ({ ...d, paidOn: e.target.value }))} className="input" />
          </label>
          <label className="block">
            <span className="label">Amount</span>
            <span className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true">
                ₹
              </span>
              <input
                inputMode="decimal"
                autoComplete="off"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPayment();
                  }
                }}
                className="input pl-7"
              />
            </span>
          </label>
          <label className="block">
            <span className="label">Paid by</span>
            <select value={draft.paidBy} onChange={(e) => setDraft((d) => ({ ...d, paidBy: e.target.value as Side }))} className="input">
              <option value="bride">Bride&apos;s side</option>
              <option value="groom">Groom&apos;s side</option>
            </select>
          </label>
          <label className="block">
            <span className="label">How</span>
            <select value={draft.method} onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as Method }))} className="input">
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={addPayment} className="btn btn-secondary col-span-2 min-h-11 sm:col-span-1">
            Add
          </button>
          <label className="col-span-2 block sm:col-span-5">
            <span className="label">
              Note <span className="font-normal text-ink-soft">(optional)</span>
            </span>
            <input
              value={draft.note}
              maxLength={200}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              className="input"
              placeholder="advance, second instalment…"
            />
          </label>
        </div>
        {draftError && (
          <p className="mt-2 text-sm font-semibold text-kumkum" role="alert">
            {draftError}
          </p>
        )}
        {payments.some((p) => !p.id) && <p className="hint mt-2">New payments are saved when you save the expense.</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p>
            Paid <strong>{formatRupees(paid)}</strong>
            {due !== null && (
              <>
                {" "}
                · Still due <strong className={due > 0 ? "text-kumkum" : "text-leaf"}>{formatRupees(Math.max(0, due))}</strong>
              </>
            )}
          </p>
          {due !== null && due < 0 && (
            <p className="text-sm font-semibold text-kumkum" role="alert">
              The payments come to more than the total.
            </p>
          )}
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold">Rest due by</span>
            <input type="date" name="dueDate" defaultValue={expense?.dueDate ?? ""} className="input w-auto" />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-h-28 flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-line bg-paper px-4 py-5 text-center">
          <Paperclip className="h-5 w-5 text-ink-soft" aria-hidden="true" />
          <p className="mt-1 font-semibold">Bills: coming next</p>
          <p className="hint">Attaching a bill or receipt arrives in the next update.</p>
        </div>
        <label className="block">
          <span className="label">
            Notes <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <textarea name="notes" maxLength={1000} rows={4} defaultValue={expense?.notes ?? ""} className="input min-h-28" placeholder="Includes the stage and the entrance arch." />
        </label>
      </div>

      {state && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      {deleteError && <Alert tone="error">{deleteError}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {expense ? (
          <button
            type="button"
            disabled={deleting}
            onClick={(e) => {
              const el = e.currentTarget;
              const n = expense.payments.length;
              if (!confirm(`Delete "${expense.title}"${n ? ` and its ${n} payment${n === 1 ? "" : "s"}` : ""}? This can't be undone.`)) return;
              startDelete(async () => {
                const r = await deleteExpenseAction(slug, expense.id);
                if (r && !r.ok) {
                  setDeleteError(r.message);
                  return;
                }
                close(el);
                router.refresh();
              });
            }}
            className="inline-flex min-h-11 items-center font-bold text-kumkum underline"
          >
            {deleting ? "Deleting…" : "Delete expense"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <button type="button" onClick={(e) => close(e.currentTarget)} className="btn btn-secondary">
            {state?.ok ? "Close" : "Cancel"}
          </button>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? "Saving…" : editing ? "Save expense" : "Add expense"}
          </button>
        </div>
      </div>
    </form>
  );
}
