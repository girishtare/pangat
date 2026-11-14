"use client";

import { useEffect, useRef } from "react";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../ui/kit";
import { MarathiInput } from "../../../../ui/MarathiInput";
import { addHousehold } from "./actions";
import { useFormAction } from "../../../../ui/useFormAction";

export default function AddHouseholdForm({ slug, hostSide, functions }: { slug: string; hostSide: Side | null; functions: { id: string; name: string }[] }) {
  const [state, action, pending] = useFormAction(addHousehold.bind(null, slug));
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={action} className="mt-4 space-y-4">
      <label className="block">
        <span className="label">Name in English</span>
        <input name="name" required maxLength={120} className="input" placeholder="Shri. A. Joshi & family" />
      </label>
      <MarathiInput
        label={
          <>
            Name in Marathi <span className="font-normal text-ink-soft">(optional)</span>
          </>
        }
        kind="household"
        from="name"
        placeholder="श्री. अ. जोशी सहपरिवार"
      />
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
      <label className="block">
        <span className="label">
          Mobile <span className="font-normal text-ink-soft">(for WhatsApp)</span>
        </span>
        <input name="mobile" inputMode="tel" autoComplete="off" className="input" placeholder="98765 43210" />
        <span className="hint mt-1 block">The number that should get the WhatsApp link. Leave blank if they have none.</span>
      </label>
      <label className="block">
        <span className="label">
          Location <span className="font-normal text-ink-soft">(where they stay, optional)</span>
        </span>
        <input name="location" maxLength={80} className="input" placeholder="e.g. Borivali, Mumbai" />
      </label>
      <fieldset>
        <legend className="label">Language</legend>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["mr", "मराठी", "mr"],
              ["en", "English", undefined],
              ["both", "Both", undefined],
            ] as const
          ).map(([value, label, l]) => (
            <label key={value} className="choice relative">
              <input type="radio" name="lang" value={value} defaultChecked={"both" === value} /> <span lang={l}>{label}</span>
            </label>
          ))}
        </div>
        <span className="hint mt-1 block">Their slip, WhatsApp message and reply page use it. Both opens in Marathi; guests can switch.</span>
      </fieldset>
      <fieldset>
        <legend className="label">Send the invitation by</legend>
        <div className="flex flex-wrap gap-2">
          <label className="choice choice-check">
            <input type="checkbox" name="inviteBy" value="card" defaultChecked={true} /> Card
          </label>
          <label className="choice choice-check">
            <input type="checkbox" name="inviteBy" value="whatsapp" defaultChecked={false} /> WhatsApp
          </label>
        </div>
        <span className="hint mt-1 block">Tick one or both. The Guest list shows an icon for each, with a tick box for &quot;sent&quot;.</span>
      </fieldset>
      <fieldset>
        <legend className="label">Invited to</legend>
        <div className="flex flex-wrap gap-2">
          {functions.map((f) => (
            <label key={f.id} className="choice choice-check">
              <input type="checkbox" name="functions" value={f.name} defaultChecked /> {f.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label">
          Guest Count <span className="font-normal text-ink-soft">(most people on this card, optional)</span>
        </span>
        <input name="cap" type="number" min={1} max={30} className="input max-w-[10rem]" placeholder="e.g. 6" />
      </label>
      <label className="block">
        <span className="label">
          Comments / Notes <span className="font-normal text-ink-soft">(optional)</span>
        </span>
        <textarea name="notes" maxLength={500} rows={2} className="input" />
      </label>

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
          Added {state.codes[0]?.name}. Short code <span className="font-display tracking-[0.2em]">{state.codes[0]?.shortCode}</span>.
        </Alert>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full text-base">
        {pending ? "Adding…" : "Add household"}
      </button>
    </form>
  );
}
