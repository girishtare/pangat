"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Side } from "@/lib/types";
import { addHousehold } from "./actions";

const input = "mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-3 py-2";

export default function AddHouseholdForm({ hostSide, functions }: { hostSide: Side | null; functions: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addHousehold, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="font-semibold">Name (English)</span>
        <input name="name" required maxLength={120} className={input} placeholder="Shri. A. Joshi & family" />
      </label>
      <label className="block">
        <span className="font-semibold">Name (Marathi)</span>
        <input name="nameMr" maxLength={120} className={input} placeholder="श्री. अ. जोशी सहपरिवार" />
      </label>
      {hostSide ? (
        <input type="hidden" name="side" value={hostSide} />
      ) : (
        <fieldset>
          <legend className="font-semibold">Side</legend>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="side" value="bride" required /> Bride
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="side" value="groom" /> Groom
            </label>
          </div>
        </fieldset>
      )}
      <label className="block">
        <span className="font-semibold">Mobile</span>
        <input name="mobile" inputMode="tel" className={input} placeholder="98765 43210" />
      </label>
      <fieldset>
        <legend className="font-semibold">Invited to</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {functions.map((f) => (
            <label key={f.id} className="flex items-center gap-2">
              <input type="checkbox" name="functions" value={f.name} defaultChecked /> {f.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="font-semibold">Cap (optional)</span>
        <input name="cap" type="number" min={1} max={30} className={input} placeholder="Most people on this card" />
      </label>

      {state && !state.ok && (
        <div role="alert" className="rounded-xl bg-kumkum/10 px-3 py-2 text-kumkum">
          <p>{state.error}</p>
          {state.check?.rows.flatMap((r) => r.errors).map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}
      {state?.ok && (
        <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-green-900">
          Added {state.codes[0]?.name}. Short code <span className="font-mono font-semibold">{state.codes[0]?.shortCode}</span>.
        </p>
      )}

      <button type="submit" disabled={pending} className="rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "Adding…" : "Add household"}
      </button>
    </form>
  );
}
