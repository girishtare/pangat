"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { METHOD_LABEL, METHODS, formatRupees, rupeesInput, SIDE_NAME } from "@/lib/expenses";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../ui/kit";
import { useFormAction } from "../../../../ui/useFormAction";
import { addSettlementAction, removeSettlementAction } from "./actions";

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

/**
 * Record money one side hands the other to square up. Starts filled in with
 * what is owed (who owes whom, and how much), as of the last save.
 */
export function SettlementForm({ slug, from, amount }: { slug: string; from: Side; amount: number | null }) {
  const [state, action, pending] = useFormAction(addSettlementAction.bind(null, slug));
  // A new balance after each save: start again from it.
  return (
    <form key={`${from}-${amount ?? ""}`} onSubmit={action} className="mt-4 space-y-4">
      <fieldset className="min-w-0">
        <legend className="label">Who paid whom</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["groom", "bride"] as const).map((s) => (
            <label key={s} className="choice relative min-h-12 text-[0.9375rem]">
              <input type="radio" name="fromSide" value={s} defaultChecked={from === s} required />
              {SIDE_NAME[s]} paid {SIDE_NAME[s === "bride" ? "groom" : "bride"]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Amount</span>
          <span className="relative block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true">
              ₹
            </span>
            <input name="amount" required inputMode="decimal" autoComplete="off" defaultValue={amount ? rupeesInput(amount) : ""} className="input pl-8 font-semibold" />
          </span>
        </label>
        <label className="block">
          <span className="label">Date</span>
          <input name="paidOn" type="date" required defaultValue={todayIst()} className="input" />
        </label>
        <label className="block">
          <span className="label">How</span>
          <select name="method" defaultValue="upi" className="input">
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">
            Note <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input name="note" maxLength={200} className="input" placeholder="Handed over after the sangeet" />
        </label>
      </div>
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full text-base">
        {pending ? "Saving…" : "Record settlement"}
      </button>
    </form>
  );
}

/** Remove one settlement, after a confirmation. */
export function RemoveSettlement({ slug, id, amount }: { slug: string; id: string; amount: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove the settlement of ${formatRupees(amount)}?`)) return;
          start(async () => {
            const r = await removeSettlementAction(slug, id);
            setError(r && !r.ok ? r.message : null);
            router.refresh();
          });
        }}
        className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-kumkum underline"
        aria-label={`Remove the settlement of ${formatRupees(amount)}`}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <span className="text-xs text-kumkum">{error}</span>}
    </span>
  );
}
