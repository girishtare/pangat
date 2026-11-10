"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../ui/kit";
import { addHousehold } from "./actions";

export default function AddHouseholdForm({ slug, hostSide, functions }: { slug: string; hostSide: Side | null; functions: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(addHousehold.bind(null, slug), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name (English)</span>
          <input name="name" required maxLength={120} className="input" placeholder="Shri. A. Joshi & family" />
        </label>
        <label className="block">
          <span className="label">Name (Marathi)</span>
          <input name="nameMr" lang="mr" maxLength={120} className="input" placeholder="श्री. अ. जोशी सहपरिवार" />
        </label>
      </div>
      {hostSide ? (
        <input type="hidden" name="side" value={hostSide} />
      ) : (
        <fieldset>
          <legend className="label">Side</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="choice relative">
              <input type="radio" name="side" value="bride" required /> Bride&apos;s side
            </label>
            <label className="choice relative">
              <input type="radio" name="side" value="groom" /> Groom&apos;s side
            </label>
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <label className="block">
          <span className="label">Mobile</span>
          <input name="mobile" inputMode="tel" autoComplete="off" className="input" placeholder="98765 43210" />
          <span className="hint mt-1 block">The number that should get the WhatsApp link. Leave blank if they have none.</span>
        </label>
        <label className="block">
          <span className="label">Cap (optional)</span>
          <input name="cap" type="number" min={1} max={30} className="input" placeholder="e.g. 6" />
        </label>
      </div>
      <fieldset>
        <legend className="label">Invited to</legend>
        <div className="flex flex-wrap gap-2">
          {functions.map((f) => (
            <label key={f.id} className="choice relative px-4">
              <input type="checkbox" name="functions" value={f.name} defaultChecked /> {f.name}
            </label>
          ))}
        </div>
      </fieldset>

      {state && !state.ok && (
        <Alert tone="error">
          <p>{state.error}</p>
          {state.check?.rows.flatMap((r) => r.errors).map((e) => (
            <p key={e}>{e}</p>
          ))}
        </Alert>
      )}
      {state?.ok && (
        <Alert tone="success">
          Added {state.codes[0]?.name}. Short code <span className="font-mono font-semibold">{state.codes[0]?.shortCode}</span>.
        </Alert>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <UserPlus className="h-5 w-5" aria-hidden="true" />
        {pending ? "Adding…" : "Add household"}
      </button>
    </form>
  );
}
