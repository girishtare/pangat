"use client";

import { useActionState, useState } from "react";
import { Check, Plus, Save } from "lucide-react";
import type { MessageKind } from "@/lib/outreach";
import { Alert, WhatsAppIcon } from "../../../../ui/kit";
import { logEffort, recordSend, saveText, type FormState } from "./actions";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

/** Opens WhatsApp with the message filled in, and records that it was opened for this household. */
export function SendButton({
  slug,
  householdId,
  kind,
  href,
  sentBefore,
  full = false,
}: {
  slug: string;
  householdId: string;
  kind: MessageKind;
  href: string;
  sentBefore: boolean;
  full?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const label = opened ? "Opened in WhatsApp" : sentBefore ? "Send again" : kind === "invite" ? "Send invitation" : "Send reminder";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        setOpened(true);
        void recordSend(slug, householdId, kind);
      }}
      className={`btn btn-sm whitespace-nowrap ${full ? "w-full" : ""} ${
        opened ? "bg-leaf-soft text-leaf" : sentBefore ? "btn-secondary" : "btn-whatsapp"
      }`}
    >
      {opened ? <Check className="h-5 w-5" aria-hidden="true" /> : <WhatsAppIcon className="h-5 w-5" />}
      {label}
    </a>
  );
}

export function TextEditor({ slug, kind, text, canEdit, isDefault }: { slug: string; kind: MessageKind; text: string; canEdit: boolean; isDefault: boolean }) {
  const [state, action, pending] = useActionState(saveText.bind(null, slug, kind), null);
  if (!canEdit) {
    return <pre className="wrap-names whitespace-pre-wrap rounded-xl border border-line bg-paper-deep/50 p-3 font-sans text-sm">{text}</pre>;
  }
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="label">Message</span>
        <textarea name="text" defaultValue={text} rows={10} maxLength={1500} className="input text-[0.9375rem]" />
      </label>
      <Message state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Save className="h-5 w-5" aria-hidden="true" />
          {pending ? "Saving…" : "Save message"}
        </button>
        {!isDefault && (
          <button type="submit" name="reset" value="1" disabled={pending} className="btn btn-quiet btn-sm">
            Back to the standard message
          </button>
        )}
      </div>
    </form>
  );
}

export function EffortForm({ slug, today }: { slug: string; today: string }) {
  const [state, action, pending] = useActionState(logEffort.bind(null, slug), null);
  return (
    <form action={action} className="space-y-3">
      <p className="label">Log a follow-up</p>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[10rem_8rem_8rem_minmax(0,1fr)]">
        <label className="block">
          <span className="hint mb-1 block">Date</span>
          <input type="date" name="loggedOn" defaultValue={today} required className="input" />
        </label>
        <label className="block">
          <span className="hint mb-1 block">Minutes</span>
          <input name="minutes" inputMode="numeric" className="input" placeholder="30" />
        </label>
        <label className="block">
          <span className="hint mb-1 block">Calls</span>
          <input name="calls" inputMode="numeric" className="input" placeholder="5" />
        </label>
        <label className="block sm:col-span-3 lg:col-span-1">
          <span className="hint mb-1 block">Note (optional)</span>
          <input name="note" maxLength={300} className="input" placeholder="Called pending relatives" />
        </label>
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <Plus className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Add to the log"}
      </button>
    </form>
  );
}
