"use client";

import { useActionState } from "react";
import { createEventAction } from "./actions";

const input = "mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-3 py-2 text-lg";

export default function NewEventForm() {
  const [state, action, pending] = useActionState(createEventAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <fieldset>
        <legend className="font-semibold">Kind of event</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border-2 border-kumkum bg-white px-4 py-3">
            <input type="radio" name="kind" value="wedding" defaultChecked /> <span className="font-semibold">Wedding</span>
          </label>
          <div className="rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-gray-500">More kinds coming soon</div>
        </div>
      </fieldset>
      <label className="block">
        <span className="font-semibold">Event name (English)</span>
        <input name="nameEn" required maxLength={120} className={input} placeholder="Riya & Arjun's Wedding" />
      </label>
      <label className="block">
        <span className="font-semibold">Event name (Marathi)</span>
        <input name="nameMr" maxLength={120} className={input} placeholder="रिया आणि अर्जुन यांचा विवाह सोहळा" />
      </label>
      <label className="block">
        <span className="font-semibold">Wedding date</span>
        <input name="weddingDate" type="date" required className={input} />
      </label>
      <label className="block">
        <span className="font-semibold">Replies close (optional)</span>
        <input name="cutoff" type="datetime-local" className={input} />
        <span className="mt-1 block text-sm">Leave blank for 15 days before the wedding, 11:59 pm. You can change it later.</span>
      </label>
      <p className="rounded-xl bg-haldi/15 px-4 py-3 text-sm">
        The event starts with <b>Haldi</b> (the day before, 10 am), <b>Wedding</b> (11:30 am) and <b>Reception</b> (7 pm). Next you
        can rename, re-time or delete them, and add others such as Sangeet.
      </p>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-kumkum/10 px-4 py-3 text-kumkum">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-xl bg-kumkum px-5 py-3 text-lg font-semibold text-white disabled:opacity-60">
        {pending ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
