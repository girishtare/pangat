"use client";

import { useActionState } from "react";
import { Lock, Save } from "lucide-react";
import { Alert } from "../../../../ui/kit";
import { freezePredicted, freezeRevised, saveActuals, saveBaselines, type FormState } from "./actions";

const num = "input text-right font-display text-2xl font-bold tabular-nums";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

interface Fn {
  id: string;
  name: string;
}

export function BaselineForm({ slug, functions, values }: { slug: string; functions: Fn[]; values: Record<string, number | null> }) {
  const [state, action, pending] = useActionState(saveBaselines.bind(null, slug), null);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {functions.map((f) => (
          <label key={f.id} className="block rounded-xl border border-line bg-haldi-soft/40 p-4">
            <span className="label">{f.name}</span>
            <span className="flex items-center gap-2">
              <input name={`baseline_${f.id}`} inputMode="numeric" defaultValue={values[f.id] ?? ""} className={num} />
              <span className="text-sm text-ink-soft">people</span>
            </span>
          </label>
        ))}
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save baseline"}
      </button>
    </form>
  );
}

export function FreezeButton({
  slug,
  kind,
  frozenBefore,
  label,
  confirmText,
}: {
  slug: string;
  kind: "first" | "revised";
  frozenBefore: boolean;
  label: string;
  confirmText: string;
}) {
  const [state, action, pending] = useActionState((kind === "first" ? freezePredicted : freezeRevised).bind(null, slug), null);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (!confirm(frozenBefore ? `${confirmText} This replaces the numbers frozen earlier.` : confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className={`btn w-full ${kind === "first" ? "btn-primary" : "btn-secondary"}`}>
        <Lock className="h-5 w-5" aria-hidden="true" />
        {pending ? "Freezing…" : label}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ActualForm({
  slug,
  functions,
  values,
}: {
  slug: string;
  functions: Fn[];
  values: Record<string, { actual: number | null; veg: number | null; nonveg: number | null }>;
}) {
  const [state, action, pending] = useActionState(saveActuals.bind(null, slug), null);
  const small = "input text-right text-lg font-semibold tabular-nums";
  return (
    <form action={action} className="space-y-4">
      <div className="hidden grid-cols-[minmax(0,1fr)_repeat(3,8.5rem)] gap-3 px-1 text-sm font-semibold text-ink-soft md:grid">
        <span>Function</span>
        <span className="text-right">Total</span>
        <span className="text-right">Veg</span>
        <span className="text-right">Non-veg</span>
      </div>
      <ul className="space-y-3">
        {functions.map((f) => (
          <li key={f.id} className="grid grid-cols-3 gap-3 rounded-xl border border-line p-3 md:grid-cols-[minmax(0,1fr)_repeat(3,8.5rem)] md:items-center md:border-0 md:p-0">
            <span className="col-span-3 font-semibold md:col-span-1">{f.name}</span>
            <label className="block">
              <span className="hint mb-1 block md:sr-only">Total</span>
              <input name={`actual_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.actual ?? ""} className={small} aria-label={`${f.name} actual total`} />
            </label>
            <label className="block">
              <span className="hint mb-1 block md:sr-only">Veg</span>
              <input name={`actualVeg_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.veg ?? ""} className={small} aria-label={`${f.name} actual veg`} />
            </label>
            <label className="block">
              <span className="hint mb-1 block md:sr-only">Non-veg</span>
              <input
                name={`actualNonveg_${f.id}`}
                inputMode="numeric"
                defaultValue={values[f.id]?.nonveg ?? ""}
                className={small}
                aria-label={`${f.name} actual non-veg`}
              />
            </label>
          </li>
        ))}
      </ul>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save actual counts"}
      </button>
    </form>
  );
}
