"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFunction, dropHost, inviteHost, removeFunction, saveEvent, saveFunction, type FormState } from "./actions";

const input = "mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-3 py-2";
const primary = "rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50";
const secondary = "rounded-xl border-2 border-kumkum px-4 py-2 font-semibold text-kumkum disabled:opacity-50";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-kumkum/10 text-kumkum"}`}>
      {state.message}
    </p>
  );
}

/* ---------- Event details ---------- */

export function EventForm(props: {
  slug: string;
  nameEn: string;
  nameMr: string | null;
  cutoff: string;
  yesShowRate: number;
  pendingShowRate: number;
}) {
  const [state, action, pending] = useActionState(saveEvent.bind(null, props.slug), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="font-semibold">Name (English)</span>
        <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} className={input} />
      </label>
      <label className="block">
        <span className="font-semibold">Name (Marathi)</span>
        <input name="nameMr" maxLength={120} defaultValue={props.nameMr ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="font-semibold">Replies close</span>
        <input name="cutoff" type="datetime-local" required defaultValue={props.cutoff} className={input} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-semibold">Yes show rate %</span>
          <input name="yesShowRate" type="number" min={0} max={100} required defaultValue={Math.round(props.yesShowRate * 100)} className={input} />
        </label>
        <label className="block">
          <span className="font-semibold">Pending show rate %</span>
          <input name="pendingShowRate" type="number" min={0} max={100} required defaultValue={Math.round(props.pendingShowRate * 100)} className={input} />
        </label>
      </div>
      <p className="text-sm sm:col-span-2">
        Show rates feed the expected headcount: the share of people who said yes that turn up, and the share of silent households that come
        anyway. They are guesses until a real event has been counted.
      </p>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save event details"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

/* ---------- Functions ---------- */

function FunctionFields(props: { nameEn?: string; nameMr?: string | null; startsAt?: string; venue?: string | null; mapUrl?: string | null; catered?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="font-semibold">Name (English)</span>
        <input name="nameEn" required maxLength={60} defaultValue={props.nameEn ?? ""} className={input} placeholder="Sangeet" />
      </label>
      <label className="block">
        <span className="font-semibold">Name (Marathi)</span>
        <input name="nameMr" maxLength={60} defaultValue={props.nameMr ?? ""} className={input} placeholder="संगीत" />
      </label>
      <label className="block">
        <span className="font-semibold">Date and time</span>
        <input name="startsAt" type="datetime-local" required defaultValue={props.startsAt ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="font-semibold">Venue</span>
        <input name="venue" maxLength={200} defaultValue={props.venue ?? ""} className={input} />
      </label>
      <label className="block">
        <span className="font-semibold">Map link (optional)</span>
        <input name="mapUrl" type="url" defaultValue={props.mapUrl ?? ""} className={input} placeholder="https://maps.app.goo.gl/…" />
      </label>
      <label className="mt-7 flex items-center gap-2">
        <input type="checkbox" name="catered" defaultChecked={props.catered ?? true} /> Food served (ask veg / non-veg)
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
  venue: string | null;
  mapUrl: string | null;
  catered: boolean;
  invites: number;
  replies: number;
}) {
  const [state, action, pending] = useActionState(saveFunction.bind(null, props.slug, props.id), null);
  const [delState, delAction, deleting] = useActionState(removeFunction.bind(null, props.slug, props.id), null);
  return (
    <div className="rounded-xl border border-haldi/60 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{props.nameEn}</h3>
        <span className="text-sm">
          {props.invites} households invited · {props.replies} replied
        </span>
      </div>
      <form action={action} className="space-y-3">
        <FunctionFields {...props} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={primary}>
            {pending ? "Saving…" : "Save"}
          </button>
          <Message state={state} />
        </div>
      </form>
      <form
        action={delAction}
        className="mt-3 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          const warn = props.invites
            ? `Delete ${props.nameEn}? ${props.invites} households will no longer be invited to it.`
            : `Delete ${props.nameEn}?`;
          if (!confirm(warn)) e.preventDefault();
        }}
      >
        <button type="submit" disabled={deleting || props.replies > 0} className={secondary}>
          {deleting ? "Deleting…" : "Delete function"}
        </button>
        {props.replies > 0 && <span className="text-sm">Can't be deleted: households have replied.</span>}
        <Message state={delState} />
      </form>
    </div>
  );
}

export function NewFunctionForm({ slug, households }: { slug: string; households: number }) {
  const [state, action, pending] = useActionState(createFunction.bind(null, slug), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3 rounded-xl border-2 border-dashed border-haldi bg-white p-4">
      <h3 className="text-lg font-semibold">Add a function</h3>
      <FunctionFields />
      <label className="flex items-center gap-2">
        <input type="checkbox" name="inviteAll" defaultChecked={households > 0} disabled={households === 0} />
        {households > 0 ? `Invite all ${households} households already on the list` : "No households on the list yet"}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Adding…" : "Add function"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

/* ---------- Hosts ---------- */

export function AddHostForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(inviteHost.bind(null, slug), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3 rounded-xl border-2 border-dashed border-haldi bg-white p-4">
      <h3 className="text-lg font-semibold">Add a host</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-semibold">Email</span>
          <input name="email" type="email" required autoComplete="off" className={input} />
        </label>
        <label className="block">
          <span className="font-semibold">Side</span>
          <select name="side" required defaultValue="bride" className={input}>
            <option value="bride">Bride&apos;s side (sees only that side)</option>
            <option value="groom">Groom&apos;s side (sees only that side)</option>
            <option value="both">Both sides (can also change the event)</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="font-semibold">Starting password</span>
          <input name="password" type="password" autoComplete="new-password" minLength={10} className={input} />
          <span className="mt-1 block text-sm">
            Only needed if they don&apos;t have a Pangat sign-in yet. At least 10 characters. Tell it to them in person or by phone.
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Adding…" : "Add host"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function RemoveHostButton({ slug, userId, email }: { slug: string; userId: string; email: string }) {
  const [state, action, pending] = useActionState(dropHost.bind(null, slug, userId), null);
  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (!confirm(`Remove ${email} as a host of this event? Their sign-in stays, but they lose access to this event.`)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className="text-sm text-kumkum underline disabled:opacity-50">
        {pending ? "Removing…" : "Remove"}
      </button>
      {state && !state.ok && <span className="text-sm text-kumkum">{state.message}</span>}
    </form>
  );
}
