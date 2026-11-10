"use client";

import { useActionState, useState } from "react";
import type { MessageKind } from "@/lib/outreach";
import { logEffort, recordSend, saveText, type FormState } from "./actions";

const primary = "rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50";
const input = "mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-3 py-2";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-kumkum/10 text-kumkum"}`}>
      {state.message}
    </p>
  );
}

/** Opens WhatsApp with the message filled in, and records that it was opened for this household. */
export function SendButton({ slug, householdId, kind, href, sentBefore }: { slug: string; householdId: string; kind: MessageKind; href: string; sentBefore: boolean }) {
  const [opened, setOpened] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        setOpened(true);
        void recordSend(slug, householdId, kind);
      }}
      className={`inline-block whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${
        opened ? "bg-green-100 text-green-900" : sentBefore ? "border-2 border-kumkum text-kumkum" : "bg-[#1f8f4e] text-white"
      }`}
    >
      {opened ? "Opened ✓" : sentBefore ? "Send again" : kind === "invite" ? "Send invitation" : "Send reminder"}
    </a>
  );
}

export function TextEditor({ slug, kind, text, canEdit, isDefault }: { slug: string; kind: MessageKind; text: string; canEdit: boolean; isDefault: boolean }) {
  const [state, action, pending] = useActionState(saveText.bind(null, slug, kind), null);
  if (!canEdit) {
    return <pre className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 font-sans text-sm">{text}</pre>;
  }
  return (
    <form action={action} className="space-y-2">
      <textarea name="text" defaultValue={text} rows={9} maxLength={1500} className={`${input} font-sans text-sm`} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save message"}
        </button>
        {!isDefault && (
          <button type="submit" name="reset" value="1" disabled={pending} className="text-sm text-kumkum underline">
            Back to the standard message
          </button>
        )}
        <Message state={state} />
      </div>
    </form>
  );
}

export function EffortForm({ slug, today }: { slug: string; today: string }) {
  const [state, action, pending] = useActionState(logEffort.bind(null, slug), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <label className="block">
        <span className="text-sm font-semibold">Date</span>
        <input type="date" name="loggedOn" defaultValue={today} required className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Minutes spent</span>
        <input name="minutes" inputMode="numeric" className={input} placeholder="30" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Phone calls</span>
        <input name="calls" inputMode="numeric" className={input} placeholder="5" />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Note (optional)</span>
        <input name="note" maxLength={300} className={input} placeholder="Called pending relatives" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Log it"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}
