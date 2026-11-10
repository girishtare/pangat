"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Save, Send, Trash, UserPlus, X } from "lucide-react";
import { Alert } from "../../../../ui/kit";
import { createFunction, dropHost, inviteHost, removeFunction, saveEvent, saveFunction, type FormState } from "./actions";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

/* ---------- Event details ---------- */

export function EventForm(props: {
  slug: string;
  nameEn: string;
  nameMr: string | null;
  cutoff: string;
  yesShowRate: number;
  pendingShowRate: number;
  contactBride: string | null;
  contactGroom: string | null;
  catererDueOn: string | null;
  catererFinalOn: string | null;
}) {
  const [state, action, pending] = useActionState(saveEvent.bind(null, props.slug), null);
  const missing = "border-kumkum";
  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="label">Event name in English</span>
          <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} className="input" />
        </label>
        <label className="block">
          <span className="label">Event name in Marathi</span>
          <input name="nameMr" lang="mr" maxLength={120} defaultValue={props.nameMr ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Replies close on</span>
          <input name="cutoff" type="datetime-local" required defaultValue={props.cutoff} className="input" />
          <span className="hint mt-1 block">After this, only hosts can change replies.</span>
        </label>
      </div>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-1 text-lg font-bold">The caterer&apos;s dates</legend>
        <label className="block">
          <span className="label">Caterer needs the first count by</span>
          <input name="catererDueOn" type="date" defaultValue={props.catererDueOn ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Caterer accepts changes until</span>
          <input name="catererFinalOn" type="date" defaultValue={props.catererFinalOn ?? ""} className="input" />
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold">How &quot;Expected&quot; is worked out</legend>
        <p className="hint mb-3">Your family&apos;s experience beats our guess. Leave these alone unless you know better.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label">Of those who say yes, how many come?</span>
            <span className="flex items-center gap-2">
              <input name="yesShowRate" type="number" min={0} max={100} required defaultValue={Math.round(props.yesShowRate * 100)} className="input w-28 text-lg font-bold" />
              <span className="text-lg text-ink-soft">%</span>
            </span>
          </label>
          <label className="block">
            <span className="label">Of households that never reply, how many come?</span>
            <span className="flex items-center gap-2">
              <input name="pendingShowRate" type="number" min={0} max={100} required defaultValue={Math.round(props.pendingShowRate * 100)} className="input w-28 text-lg font-bold" />
              <span className="text-lg text-ink-soft">%</span>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold">Contact numbers printed on slips</legend>
        <p className="hint mb-3">For guests without a smartphone: they call this number and give their code.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="label">Bride&apos;s side</span>
            <input
              name="contactBride"
              inputMode="tel"
              defaultValue={props.contactBride ?? ""}
              className={`input ${props.contactBride ? "" : missing}`}
              placeholder="Not set: slips will have no call-us line"
            />
          </label>
          <label className="block">
            <span className="label">Groom&apos;s side</span>
            <input
              name="contactGroom"
              inputMode="tel"
              defaultValue={props.contactGroom ?? ""}
              className={`input ${props.contactGroom ? "" : missing}`}
              placeholder="Not set: slips will have no call-us line"
            />
          </label>
        </div>
      </fieldset>

      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save event details"}
      </button>
    </form>
  );
}

/* ---------- Functions ---------- */

function FunctionFields(props: { nameEn?: string; nameMr?: string | null; startsAt?: string; venue?: string | null; mapUrl?: string | null; catered?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="block">
        <span className="label">Name in English</span>
        <input name="nameEn" required maxLength={60} defaultValue={props.nameEn ?? ""} className="input" placeholder="Sangeet" />
      </label>
      <label className="block">
        <span className="label">Name in Marathi</span>
        <input name="nameMr" lang="mr" maxLength={60} defaultValue={props.nameMr ?? ""} className="input" placeholder="संगीत" />
      </label>
      <label className="block">
        <span className="label">Date and time</span>
        <input name="startsAt" type="datetime-local" required defaultValue={props.startsAt ?? ""} className="input" />
      </label>
      <label className="block">
        <span className="label">Venue</span>
        <input name="venue" maxLength={200} defaultValue={props.venue ?? ""} className="input" />
      </label>
      <label className="block xl:col-span-2">
        <span className="label">
          Map link <span className="font-normal text-ink-soft">(optional)</span>
        </span>
        <input name="mapUrl" type="url" defaultValue={props.mapUrl ?? ""} className="input" placeholder="https://maps.app.goo.gl/…" />
      </label>
      <label className="flex min-h-11 items-center gap-3 sm:col-span-2 xl:col-span-3">
        <input type="checkbox" name="catered" defaultChecked={props.catered ?? true} className="h-6 w-6 accent-kumkum" />
        <span className="font-bold">Food served (asks the veg question)</span>
      </label>
    </div>
  );
}

export function FunctionEditor(props: {
  slug: string;
  id: string;
  nameEn: string;
  nameMr: string | null;
  startsAt: string;
  when: string;
  venue: string | null;
  mapUrl: string | null;
  catered: boolean;
  invites: number;
  replies: number;
}) {
  const [state, action, pending] = useActionState(saveFunction.bind(null, props.slug, props.id), null);
  const [delState, delAction, deleting] = useActionState(removeFunction.bind(null, props.slug, props.id), null);
  return (
    <details className="group rounded-[14px] border border-line bg-card">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <b>{props.nameEn}</b>
          {props.nameMr && (
            <b lang="mr">
              {" · "}
              {props.nameMr}
            </b>
          )}
          <span className="text-ink-soft">
            {" · "}
            {props.when}
            {props.venue ? ` · ${props.venue}` : ""}
            {props.catered ? " · food served" : " · no food"}
          </span>
        </span>
        <span className="btn btn-secondary btn-sm shrink-0 group-open:hidden">Edit</span>
        <span className="btn btn-quiet btn-sm hidden shrink-0 group-open:inline-flex">Close</span>
      </summary>
      <div className="border-t border-line p-4">
        <form action={action} className="space-y-4">
          <FunctionFields {...props} />
          <p className="text-sm text-ink-soft">
            {props.invites} households invited · {props.replies} replied{props.replies > 0 ? " · can't be deleted" : ""}
          </p>
          <Message state={state} />
          <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
            <Save className="h-5 w-5" aria-hidden="true" />
            {pending ? "Saving…" : "Save function"}
          </button>
        </form>
        <form
          action={delAction}
          className="mt-2"
          onSubmit={(e) => {
            const warn = props.invites
              ? `Delete ${props.nameEn}? ${props.invites} households will no longer be invited to it.`
              : `Delete ${props.nameEn}?`;
            if (!confirm(warn)) e.preventDefault();
          }}
        >
          <button type="submit" disabled={deleting || props.replies > 0} className="btn btn-quiet btn-sm -ml-2">
            <Trash className="h-4 w-4" aria-hidden="true" />
            {deleting ? "Deleting…" : "Delete function"}
          </button>
          <Message state={delState} />
        </form>
      </div>
    </details>
  );
}

/** "+ Add a function" in the Functions header: opens the new-function form below the list. */
export function AddFunctionButton() {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => {
        const d = document.getElementById("new-function") as HTMLDetailsElement | null;
        if (!d) return;
        d.open = true;
        d.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
    >
      + Add a function
    </button>
  );
}

export function NewFunctionForm({ slug, households }: { slug: string; households: number }) {
  const [state, action, pending] = useActionState(createFunction.bind(null, slug), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <details id="new-function" className="rounded-[14px] border-2 border-dashed border-line">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-4 font-bold text-kumkum [&::-webkit-details-marker]:hidden">
        <Plus className="h-5 w-5" aria-hidden="true" />
        Add a function <span className="font-normal text-ink-soft">(for example Sangeet or Mehendi)</span>
      </summary>
      <form ref={form} action={action} className="space-y-4 border-t border-dashed border-line p-4">
        <FunctionFields />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="inviteAll" defaultChecked={households > 0} disabled={households === 0} className="h-6 w-6 accent-kumkum" />
          <span>{households > 0 ? `Invite all ${households} households already on the list` : "No households on the list yet"}</span>
        </label>
        <Message state={state} />
        <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
          <Plus className="h-5 w-5" aria-hidden="true" />
          {pending ? "Adding…" : "Add function"}
        </button>
      </form>
    </details>
  );
}

/* ---------- Co-owners ---------- */

/** "Invite co-owner" button; the form opens in a dialog. */
export function InviteCoOwner({ slug, full }: { slug: string; full: { bride: boolean; groom: boolean } }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const bothFull = full.bride && full.groom;
  const open = () => {
    setFormKey((k) => k + 1); // a fresh, empty form every time
    dialog.current?.showModal();
  };
  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={bothFull}
        title={bothFull ? "Both sides have 3 co-owners. Remove one to invite someone else." : undefined}
        className="btn btn-secondary"
      >
        <UserPlus className="h-5 w-5" aria-hidden="true" />
        Invite co-owner
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="invite-title"
        className="card m-auto w-[calc(100%-2rem)] max-w-lg p-0 open:flex open:flex-col"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close(); // click on the backdrop
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-deep/70 px-5 py-4">
          <h3 id="invite-title" className="font-display text-xl text-kumkum">
            Invite a co-owner
          </h3>
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-quiet btn-sm" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">
          <InviteForm key={formKey} slug={slug} full={full} onDone={() => dialog.current?.close()} />
        </div>
      </dialog>
    </>
  );
}

function InviteForm({ slug, full, onDone }: { slug: string; full: { bride: boolean; groom: boolean }; onDone: () => void }) {
  const [state, action, pending] = useActionState(inviteHost.bind(null, slug), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-4">
      <label className="block">
        <span className="label">Their email</span>
        <input name="email" type="email" required autoComplete="off" autoFocus className="input" placeholder="name@example.com" />
      </label>
      <fieldset>
        <legend className="label">Side</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="choice relative">
            <input type="radio" name="side" value="bride" required defaultChecked={!full.bride} disabled={full.bride} />
            Bride&apos;s side{full.bride ? " (full)" : ""}
          </label>
          <label className="choice relative">
            <input type="radio" name="side" value="groom" defaultChecked={full.bride && !full.groom} disabled={full.groom} />
            Groom&apos;s side{full.groom ? " (full)" : ""}
          </label>
        </div>
      </fieldset>
      <p className="hint">
        They get an email to set a password, or can sign in with Google using this address. A co-owner sees and works on their side only.
      </p>
      <Message state={state} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className="btn btn-secondary">
          {state?.ok ? "Done" : "Cancel"}
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Send className="h-5 w-5" aria-hidden="true" />
          {pending ? "Inviting…" : "Send invitation"}
        </button>
      </div>
    </form>
  );
}

export function RemoveHostButton({ slug, userId, email }: { slug: string; userId: string; email: string }) {
  const [state, action, pending] = useActionState(dropHost.bind(null, slug, userId), null);
  return (
    <form
      action={action}
      className="inline-flex flex-wrap items-center justify-center gap-2"
      onSubmit={(e) => {
        if (!confirm(`Remove ${email} as a co-owner? Their account stays, but they lose access to this event.`)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className="btn btn-quiet btn-sm align-middle">
        {pending ? "Removing…" : "Remove"}
      </button>
      {state && !state.ok && <span className="text-sm text-kumkum">{state.message}</span>}
    </form>
  );
}
