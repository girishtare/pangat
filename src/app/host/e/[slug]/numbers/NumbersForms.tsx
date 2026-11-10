"use client";

import { useActionState } from "react";
import { freezePredicted, saveActuals, saveBaselines, type FormState } from "./actions";

const num = "w-24 rounded-lg border-2 border-haldi/60 bg-white px-2 py-1 text-right";
const primary = "rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-kumkum/10 text-kumkum"}`}>
      {state.message}
    </p>
  );
}

interface Fn {
  id: string;
  name: string;
}

export function BaselineForm({ slug, functions, values }: { slug: string; functions: Fn[]; values: Record<string, number | null> }) {
  const [state, action, pending] = useActionState(saveBaselines.bind(null, slug), null);
  return (
    <form action={action} className="space-y-3">
      <table className="text-sm">
        <tbody>
          {functions.map((f) => (
            <tr key={f.id}>
              <td className="py-1 pr-4 font-semibold">{f.name}</td>
              <td className="py-1">
                <input name={`baseline_${f.id}`} inputMode="numeric" defaultValue={values[f.id] ?? ""} className={num} aria-label={`${f.name} baseline`} />{" "}
                people
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save baseline"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function FreezeButton({ slug, frozenBefore }: { slug: string; frozenBefore: boolean }) {
  const [state, action, pending] = useActionState(freezePredicted.bind(null, slug), null);
  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        const msg = frozenBefore
          ? "Freeze again? This replaces the tool's frozen numbers with today's."
          : "Freeze the tool's numbers now? The plan is to do this on 14 December.";
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Freezing…" : frozenBefore ? "Freeze again with today's numbers" : "Freeze the tool's numbers"}
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
  return (
    <form action={action} className="space-y-3">
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="py-1 pr-4 text-left">Function</th>
              <th className="px-2 py-1 text-left">Total</th>
              <th className="px-2 py-1 text-left">Veg</th>
              <th className="px-2 py-1 text-left">Non-veg</th>
            </tr>
          </thead>
          <tbody>
            {functions.map((f) => (
              <tr key={f.id}>
                <td className="py-1 pr-4 font-semibold">{f.name}</td>
                <td className="px-2 py-1">
                  <input name={`actual_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.actual ?? ""} className={num} aria-label={`${f.name} actual total`} />
                </td>
                <td className="px-2 py-1">
                  <input name={`actualVeg_${f.id}`} inputMode="numeric" defaultValue={values[f.id]?.veg ?? ""} className={num} aria-label={`${f.name} actual veg`} />
                </td>
                <td className="px-2 py-1">
                  <input
                    name={`actualNonveg_${f.id}`}
                    inputMode="numeric"
                    defaultValue={values[f.id]?.nonveg ?? ""}
                    className={num}
                    aria-label={`${f.name} actual non-veg`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save actual counts"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}
