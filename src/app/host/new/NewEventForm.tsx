"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { DEFAULT_FUNCTIONS, defaultFunctions } from "@/lib/events";
import { shortWhen } from "@/lib/when";
import { createEventAction } from "./actions";
import { useFormAction } from "../../ui/useFormAction";

export default function NewEventForm() {
  const [state, action, pending] = useFormAction(createEventAction);
  const [weddingDate, setWeddingDate] = useState("");
  // The starting functions with their real dates once the wedding date is chosen.
  const fns = /^\d{4}-\d{2}-\d{2}$/.test(weddingDate) ? defaultFunctions(weddingDate) : null;

  return (
    <form onSubmit={action} className="space-y-5">
      <fieldset>
        <legend className="label">Kind of event</legend>
        {/* Weddings only for now; more kinds come later. */}
        <label className="choice relative w-full sm:w-1/2">
          <input type="radio" name="kind" value="wedding" defaultChecked />
          <Check className="h-5 w-5" aria-hidden="true" />
          Wedding
        </label>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label">Event name in English</span>
          <input name="nameEn" required maxLength={120} className="input" placeholder="e.g. Riya & Arjun's Wedding" />
        </label>
        <label className="block">
          <span className="label">Event name in Marathi</span>
          <input name="nameMr" lang="mr" maxLength={120} className="input" placeholder="उदा. रिया आणि अर्जुन यांचा विवाह सोहळा" />
        </label>
        <label className="block">
          <span className="label">Wedding date</span>
          <input name="weddingDate" type="date" required className="input" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">
            Replies close on <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input name="cutoff" type="datetime-local" className="input" />
          <span className="hint mt-1 block">Standard: 15 days before the wedding, 11:59 pm. You can change it later.</span>
        </label>
      </div>

      <section className="rounded-[1.25rem] bg-sand p-4 sm:p-5" aria-labelledby="starts-with">
        <h2 id="starts-with" className="mb-3 font-bold">
          It starts with three functions
        </h2>
        <ul className="space-y-2">
          {DEFAULT_FUNCTIONS.map((f, i) => (
            <li key={f.nameEn} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-xl bg-card px-4 py-3">
              <span className="font-bold">
                {f.nameEn} <span lang="mr" className="font-normal text-ink-soft">· {f.nameMr}</span>
              </span>
              <span className="text-ink-soft">
                {fns
                  ? shortWhen(fns[i].startsAt)
                  : `${f.dayOffset === -1 ? "The day before" : f.dayOffset === 0 ? "Wedding day" : `${f.dayOffset} days after`}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.9375rem] text-ink-soft">Change times and venues, or add Sangeet and others, in Event settings.</p>
      </section>

      {state?.error && (
        <p role="alert" className="text-[0.9375rem] text-kumkum">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[3.25rem] w-full text-lg">
        {pending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
