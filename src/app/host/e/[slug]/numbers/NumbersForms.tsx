"use client";

import { useActionState } from "react";
import { Lock, Save } from "lucide-react";
import { Alert } from "../../../../ui/kit";
import { freezePredicted, freezeRevised, saveActuals, saveBaselines, type FormState } from "./actions";
import { useFormAction } from "../../../../ui/useFormAction";

const num = "input min-h-[52px] text-[1.125rem] tabular-nums";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

interface Fn {
  id: string;
  name: string;
  /** Food served (asks veg / non-veg). */
  catered?: boolean;
  vegOnly?: boolean;
}

export function BaselineForm({ slug, functions, values }: { slug: string; functions: Fn[]; values: Record<string, number | null> }) {
  const [state, action, pending] = useFormAction(saveBaselines.bind(null, slug));
  return (
    <form onSubmit={action} className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        {functions.map((f) => (
          <label key={f.id} className="block">
            <span className="mb-1.5 block font-bold">{f.name}</span>
            <input name={`baseline_${f.id}`} inputMode="numeric" defaultValue={values[f.id] ?? ""} className={num} />
          </label>
        ))}
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save the family's guess"}
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
  const [state, action, pending] = useFormAction(saveActuals.bind(null, slug));
  const box = "input mt-1 min-h-12 px-2 text-[1.0625rem] tabular-nums";
  return (
    <form onSubmit={action} className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        {functions.map((f) => (
          <fieldset key={f.id} className="min-w-0 rounded-[14px] border border-line px-3.5 pb-3.5 pt-2">
            <legend className="px-1.5 font-bold">{f.name}</legend>
            <div className={`grid gap-2 text-sm ${f.catered === false || f.vegOnly ? "grid-cols-1" : "grid-cols-3"}`}>
              <label className="block min-w-0">
                Total
                <input name={`actual_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.actual ?? ""} className={`${box} font-bold`} />
              </label>
              {f.catered === false || f.vegOnly ? (
                <p className="text-ink-soft">{f.vegOnly ? "Veg only, so no veg / non-veg split." : "No food served, so no veg / non-veg split."}</p>
              ) : (
                <>
                  <label className="block min-w-0">
                    Veg
                    <input name={`actualVeg_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.veg ?? ""} className={box} />
                  </label>
                  <label className="block min-w-0">
                    Non-veg
                    <input name={`actualNonveg_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.nonveg ?? ""} className={box} />
                  </label>
                </>
              )}
            </div>
          </fieldset>
        ))}
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full px-7 text-lg sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save counts"}
      </button>
    </form>
  );
}
