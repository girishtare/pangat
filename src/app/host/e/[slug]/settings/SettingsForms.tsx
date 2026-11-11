"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Save, Send, Trash, UserPlus, X } from "lucide-react";
import { Alert, WhatsAppIcon } from "../../../../ui/kit";
import { MarathiInput } from "../../../../ui/MarathiInput";
import { createFunction, dropHost, editHost, inviteHost, removeFunction, resendHostInvite, saveEvent, saveFunction, type FormState } from "./actions";
import { useFormAction } from "../../../../ui/useFormAction";

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
  const [state, action, pending] = useFormAction(saveEvent.bind(null, props.slug));
  const missing = "border-kumkum";
  return (
    <form onSubmit={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="label">Event name in English</span>
          <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} className="input" />
        </label>
        <MarathiInput label="Event name in Marathi" kind="event" from="nameEn" defaultValue={props.nameMr} />
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

/** Which of the three food choices a function has; new functions start on "veg and non-veg". */
const foodOf = (p: { catered?: boolean; vegOnly?: boolean }) => (p.catered === false ? "none" : p.vegOnly ? "veg" : "both");

function FunctionFields(props: {
  nameEn?: string;
  nameMr?: string | null;
  startsAt?: string;
  venue?: string | null;
  mapUrl?: string | null;
  catered?: boolean;
  vegOnly?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="block">
        <span className="label">Name in English</span>
        <input name="nameEn" required maxLength={60} defaultValue={props.nameEn ?? ""} className="input" placeholder="Sangeet" />
      </label>
      <MarathiInput label="Name in Marathi" kind="function" from="nameEn" defaultValue={props.nameMr} placeholder="संगीत" />
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
      <fieldset className="sm:col-span-2 xl:col-span-3">
        <legend className="label">Food</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["both", "Veg and non-veg", "Guests say how many are vegetarian"],
              ["veg", "Veg only", "No veg question; everyone counts as veg"],
              ["none", "No food", "Headcount only"],
            ] as const
          ).map(([value, label, hint]) => (
            <label key={value} className="choice relative flex-col items-start! gap-0 text-left">
              <input type="radio" name="food" value={value} defaultChecked={foodOf(props) === value} />
              <span>{label}</span>
              <span className="text-sm font-normal opacity-80">{hint}</span>
            </label>
          ))}
        </div>
        <p className="hint mt-1.5">Changing this later doesn&apos;t change replies already in; veg-only counts everyone as veg.</p>
      </fieldset>
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
  vegOnly: boolean;
  invites: number;
  replies: number;
}) {
  const [state, action, pending] = useFormAction(saveFunction.bind(null, props.slug, props.id));
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
            {!props.catered ? " · no food" : props.vegOnly ? " · veg only" : " · veg and non-veg"}
          </span>
        </span>
        <span className="btn btn-secondary btn-sm shrink-0 group-open:hidden">Edit</span>
        <span className="btn btn-quiet btn-sm hidden shrink-0 group-open:inline-flex">Close</span>
      </summary>
      <div className="border-t border-line p-4">
        <form onSubmit={action} className="space-y-4">
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
  const [state, action, pending] = useFormAction(createFunction.bind(null, slug));
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
      <form ref={form} onSubmit={action} className="space-y-4 border-t border-dashed border-line p-4">
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

type Full = { bride: boolean; groom: boolean };

/** "Invite co-owner" button; the form opens in a dialog, fresh and empty each time. */
export function InviteCoOwner({ slug, full }: { slug: string; full: Full }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const bothFull = full.bride && full.groom;
  const open = () => {
    setFormKey((k) => k + 1);
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
        className="card m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-0 outline-none open:flex open:flex-col"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close(); // click on the backdrop
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-deep px-5 py-4">
          <h3 id="invite-title" className="font-display text-[1.375rem] leading-tight text-kumkum">
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

type SideChoice = "both" | "bride" | "groom";

/** Name, email, mobile and side: shared by Invite a co-owner and Edit co-owner. */
function HostFields({
  full,
  values,
  isOwner = false,
}: {
  full: Full;
  /** Edit: the person's current details (their email can't change). */
  values?: { fullName: string | null; email: string; phone: string | null; side: "bride" | "groom" | null };
  isOwner?: boolean;
}) {
  // A full side can't be chosen, unless this person is already counted on it.
  const current: SideChoice | null = values ? (values.side ?? "both") : null;
  const countedOn = (s: "bride" | "groom") => current === s || current === "both";
  const blocked: Record<SideChoice, boolean> = {
    both: (full.bride && !countedOn("bride")) || (full.groom && !countedOn("groom")),
    bride: full.bride && !countedOn("bride"),
    groom: full.groom && !countedOn("groom"),
  };
  const choices: [SideChoice, string][] = [
    ["both", "Both sides"],
    ["bride", "Bride's side"],
    ["groom", "Groom's side"],
  ];
  const picked = current ?? choices.map(([k]) => k).find((k) => !blocked[k]);
  return (
    <>
      <label className="block">
        <span className="label">Full name</span>
        <input name="fullName" required maxLength={120} autoComplete="off" autoFocus defaultValue={values?.fullName ?? ""} className="input" placeholder="Sunita Kale" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        {values ? (
          <>
            <input type="email" value={values.email} readOnly disabled className="input bg-paper-deep/60 text-ink-soft" />
            <span className="hint mt-1 block">The address they sign in with. To use another, remove them and invite the new address.</span>
          </>
        ) : (
          <input name="email" type="email" required autoComplete="off" className="input" placeholder="name@example.com" />
        )}
      </label>
      <label className="block">
        <span className="label">
          Mobile <span className="font-normal text-ink-soft">(for WhatsApp)</span>
        </span>
        <input name="phone" type="tel" inputMode="tel" required autoComplete="off" defaultValue={values?.phone ?? ""} className="input" placeholder="98765 43210" />
      </label>
      {isOwner ? (
        <div>
          <p className="label">Side</p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="badge badge-no">Both sides</span>
            <span className="hint">The owner always has both sides.</span>
          </p>
        </div>
      ) : (
        <fieldset>
          <legend className="label">Side</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {choices.map(([value, label]) => (
              <label key={value} className="choice relative">
                <input type="radio" name="side" value={value} required defaultChecked={picked === value} disabled={blocked[value]} />
                {label}
                {blocked[value] ? " (full)" : ""}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}

function InviteForm({ slug, full, onDone }: { slug: string; full: Full; onDone: () => void }) {
  const [state, action, pending] = useFormAction(inviteHost.bind(null, slug));
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Message state={state} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDone} className="btn btn-secondary">
            Done
          </button>
          {state.whatsapp && (
            <a href={state.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
              <WhatsAppIcon className="h-5 w-5" />
              Tell them on WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={action} className="space-y-4">
      <HostFields full={full} />
      <p className="hint">
        Pangat emails them: a link to set a password if they are new to Pangat, or a note that they&apos;ve been added. They can also
        sign in with Google using this address. A co-owner of one side sees and works on that side only; of both sides, on everything
        except Event settings and the caterer numbers.
      </p>
      <Message state={state} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Send className="h-5 w-5" aria-hidden="true" />
          {pending ? "Inviting…" : "Send invitation"}
        </button>
      </div>
    </form>
  );
}

/** Inside "Edit co-owner" (or "Edit owner"): the invite form, filled in. */
export function EditHostForm({
  slug,
  full,
  host,
}: {
  slug: string;
  full: Full;
  host: { userId: string; fullName: string | null; email: string; phone: string | null; side: "bride" | "groom" | null; role: "owner" | "co_owner" };
}) {
  const [state, action, pending] = useFormAction(editHost.bind(null, slug, host.userId));
  return (
    <form onSubmit={action} className="mt-4 space-y-4">
      <HostFields full={full} values={host} isOwner={host.role === "owner"} />
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save changes"}
      </button>
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
        if (
          !confirm(
            `Remove ${email} as a co-owner?

They lose access to this event and get an email saying so. If they have no other Pangat events, their account is deleted too.`,
          )
        )
          e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className="btn btn-quiet btn-sm align-middle">
        {pending ? "Removing…" : "Remove"}
      </button>
      {state && !state.ok && <span className="text-sm text-kumkum">{state.message}</span>}
    </form>
  );
}

/** "Send again": a fresh invitation link for a co-owner who hasn't signed in yet. */
export function ResendInviteButton({ slug, userId }: { slug: string; userId: string }) {
  const [state, action, pending] = useActionState(resendHostInvite.bind(null, slug, userId), null);
  return (
    <form action={action} className="inline-flex flex-col items-center gap-0.5">
      <button type="submit" disabled={pending || !!state?.ok} className="btn btn-quiet btn-sm min-h-9 py-0 text-sm">
        {pending ? "Sending…" : state?.ok ? "Sent" : "Send again"}
      </button>
      {state && !state.ok && <span className="max-w-[14rem] text-xs text-kumkum">{state.message}</span>}
    </form>
  );
}
