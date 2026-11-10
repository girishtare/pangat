"use client";

import { useActionState, useState } from "react";
import type { Side } from "@/lib/types";
import { recordReply, removeHousehold, saveHousehold, type FormState } from "./actions";

const input = "mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-3 py-2";
const small = "w-20 rounded-lg border-2 border-haldi/60 bg-white px-2 py-1 text-right";
const primary = "rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-green-50 text-green-900" : "bg-kumkum/10 text-kumkum"}`}>
      {state.message}
    </p>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-full border border-kumkum/40 px-3 py-1 text-sm text-kumkum"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy guest link"}
    </button>
  );
}

export interface ReplyFn {
  id: string;
  name: string;
  catered: boolean;
  current: { status: "yes" | "no"; heads: number; veg: number; arrivalSlot: string | null } | null;
}

function ReplyRow({ f }: { f: ReplyFn }) {
  const [coming, setComing] = useState<"yes" | "no" | "">(f.current?.status ?? "");
  return (
    <fieldset className="rounded-xl border border-haldi/60 p-3">
      <legend className="px-1 font-semibold">{f.name}</legend>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input type="radio" name={`coming_${f.id}`} value="yes" checked={coming === "yes"} onChange={() => setComing("yes")} /> Coming
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={`coming_${f.id}`} value="no" checked={coming === "no"} onChange={() => setComing("no")} /> Not coming
        </label>
      </div>
      {coming === "yes" && (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          <label>
            People <input name={`heads_${f.id}`} inputMode="numeric" defaultValue={f.current?.heads || 2} className={small} />
          </label>
          {f.catered && (
            <label>
              Vegetarian{" "}
              <input name={`veg_${f.id}`} inputMode="numeric" defaultValue={f.current?.status === "yes" ? f.current.veg : 0} className={small} />
            </label>
          )}
          <label>
            Arrival{" "}
            <select name={`arrival_${f.id}`} defaultValue={f.current?.arrivalSlot ?? ""} className="rounded-lg border-2 border-haldi/60 bg-white px-2 py-1">
              <option value="">Not asked</option>
              <option value="early">Early</option>
              <option value="on_time">On time</option>
              <option value="late">A little late</option>
            </select>
          </label>
        </div>
      )}
    </fieldset>
  );
}

export function ReplyForm({ slug, id, functions }: { slug: string; id: string; functions: ReplyFn[] }) {
  const [state, action, pending] = useActionState(recordReply.bind(null, slug, id), null);
  return (
    <form action={action} className="space-y-3">
      {functions.map((f) => (
        <ReplyRow key={f.id} f={f} />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save reply"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function DetailsForm(props: {
  slug: string;
  id: string;
  hostSide: Side | null;
  side: Side;
  nameEn: string;
  nameMr: string | null;
  mobile: string | null;
  softCap: number | null;
  functions: { id: string; name: string; invited: boolean; replied: boolean }[];
}) {
  const [state, action, pending] = useActionState(saveHousehold.bind(null, props.slug, props.id), null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-semibold">Name (English)</span>
          <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} className={input} />
        </label>
        <label className="block">
          <span className="font-semibold">Name (Marathi)</span>
          <input name="nameMr" maxLength={120} defaultValue={props.nameMr ?? ""} className={input} />
        </label>
        <label className="block">
          <span className="font-semibold">Mobile</span>
          <input name="mobile" inputMode="tel" defaultValue={props.mobile ?? ""} className={input} />
        </label>
        <label className="block">
          <span className="font-semibold">Cap (optional)</span>
          <input name="cap" type="number" min={1} max={30} defaultValue={props.softCap ?? ""} className={input} />
        </label>
      </div>
      {!props.hostSide && (
        <fieldset>
          <legend className="font-semibold">Side</legend>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="side" value="bride" defaultChecked={props.side === "bride"} /> Bride
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="side" value="groom" defaultChecked={props.side === "groom"} /> Groom
            </label>
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="font-semibold">Invited to</legend>
        <div className="mt-1 flex flex-wrap gap-4">
          {props.functions.map((f) => (
            <label key={f.id} className="flex items-center gap-2">
              <input type="checkbox" name="functions" value={f.id} defaultChecked={f.invited} disabled={f.replied} /> {f.name}
              {f.replied && <span className="text-xs">(replied)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : "Save details"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function DeleteHousehold({ slug, id, name, replied }: { slug: string; id: string; name: string; replied: boolean }) {
  const [state, action, pending] = useActionState(removeHousehold.bind(null, slug, id), null);
  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        if (!confirm(`Delete ${name} from the guest list? Their link and short code will stop working.`)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending || replied} className="rounded-xl border-2 border-kumkum px-4 py-2 font-semibold text-kumkum disabled:opacity-50">
        {pending ? "Deleting…" : "Delete household"}
      </button>
      {replied && <span className="text-sm">They have replied, so they can&apos;t be deleted. Mark them as not coming instead.</span>}
      <Message state={state} />
    </form>
  );
}
