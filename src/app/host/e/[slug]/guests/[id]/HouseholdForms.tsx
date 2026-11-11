"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Save, Trash } from "lucide-react";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../../ui/kit";
import { recordReply, removeHousehold, saveHousehold, type FormState } from "./actions";
import { useFormAction } from "../../../../../ui/useFormAction";

const MAX = 30;

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied("yes");
        } catch {
          setCopied("failed");
        }
        setTimeout(() => setCopied(null), 2500);
      }}
    >
      {copied === "yes" ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
      <span aria-live="polite">{copied === "yes" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Copy guest link"}</span>
    </button>
  );
}

export interface ReplyFn {
  id: string;
  name: string;
  when: string;
  catered: boolean;
  vegOnly: boolean;
  current: { status: "yes" | "no"; heads: number; veg: number; arrivalSlot: string | null } | null;
}

function ReplyRow({ f }: { f: ReplyFn }) {
  const [coming, setComing] = useState<"yes" | "no" | "">(f.current?.status ?? "");
  const [heads, setHeads] = useState(f.current?.status === "yes" ? f.current.heads : 2);
  const [veg, setVeg] = useState(f.current?.status === "yes" ? f.current.veg : 0);
  const num = "input min-h-12 w-full min-w-0 px-3 text-lg font-bold tabular-nums sm:w-20";
  return (
    <fieldset className="min-w-0 rounded-[14px] border border-line px-4 pb-4 pt-1">
      <legend className="px-1.5 font-bold">
        {f.name} · {f.when}
      </legend>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <label className="choice relative min-h-12 px-3 sm:px-5">
          <input type="radio" name={`coming_${f.id}`} value="yes" checked={coming === "yes"} onChange={() => setComing("yes")} />
          {coming === "yes" && <Check className="h-4 w-4" aria-hidden="true" />}
          Coming
        </label>
        <label className="choice choice-no relative min-h-12 px-3 sm:px-5">
          <input type="radio" name={`coming_${f.id}`} value="no" checked={coming === "no"} onChange={() => setComing("no")} />
          {coming === "no" && <Check className="h-4 w-4" aria-hidden="true" />}
          Can&apos;t come
        </label>
      </div>
      {coming === "yes" && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap sm:gap-x-6">
            <label className="flex min-w-0 items-center gap-2.5">
              <span className="text-ink-soft">People</span>
              <input
                name={`heads_${f.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX}
                required
                value={heads}
                onChange={(e) => {
                  const v = Math.min(MAX, Math.max(1, Number(e.target.value) || 1));
                  setVeg((old) => (old === heads ? v : Math.min(old, v)));
                  setHeads(v);
                }}
                className={num}
              />
            </label>
            {f.catered && !f.vegOnly && (
              <label className="flex min-w-0 items-center gap-2.5">
                <span className="text-ink-soft">Veg</span>
                <input
                  name={`veg_${f.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={heads}
                  value={veg}
                  onChange={(e) => setVeg(Math.min(heads, Math.max(0, Number(e.target.value) || 0)))}
                  className={num}
                />
                <span className="hidden text-sm text-ink-soft sm:inline">non-veg {heads - veg}</span>
              </label>
            )}
          </div>
          {f.catered && !f.vegOnly && <p className="text-sm text-ink-soft sm:hidden">Non-veg: {heads - veg}</p>}
          {f.catered && f.vegOnly && <p className="text-sm text-ink-soft">Veg only: everyone counts as veg.</p>}
          <fieldset className="grid grid-cols-3 items-center gap-2 sm:flex sm:flex-wrap">
            <legend className="sr-only">Arrival</legend>
            <span className="col-span-3 text-ink-soft sm:mr-1" aria-hidden="true">
              Arrival:
            </span>
            {(
              [
                ["early", "Early"],
                ["on_time", "On time"],
                ["late", "A little late"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="choice choice-sky relative min-h-11 px-2 text-[0.9375rem] leading-tight sm:px-3.5">
                <input type="radio" name={`arrival_${f.id}`} value={value} defaultChecked={(f.current?.arrivalSlot ?? "on_time") === value} />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </fieldset>
  );
}

export function ReplyForm({ slug, id, functions }: { slug: string; id: string; functions: ReplyFn[] }) {
  const [state, action, pending] = useFormAction(recordReply.bind(null, slug, id));
  // React resets a form after its action runs, which would put the radios back to
  // the first-loaded reply. Keying the rows on the saved reply remounts them with
  // what the server now holds.
  const saved = functions.map((f) => `${f.id}:${f.current?.status ?? ""}:${f.current?.heads ?? ""}:${f.current?.veg ?? ""}:${f.current?.arrivalSlot ?? ""}`).join(",");
  return (
    <form onSubmit={action} className="space-y-4">
      <div key={saved} className="space-y-4">
        {functions.map((f) => (
          <ReplyRow key={f.id} f={f} />
        ))}
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full text-lg">
        {pending ? "Saving…" : "Save reply on their behalf"}
      </button>
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
  const [state, action, pending] = useFormAction(saveHousehold.bind(null, props.slug, props.id));
  return (
    <form onSubmit={action} className="space-y-4">
      <label className="block">
        <span className="label">Name in English</span>
        <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} className="input" />
      </label>
      <label className="block">
        <span className="label">Name in Marathi</span>
        <input name="nameMr" lang="mr" maxLength={120} defaultValue={props.nameMr ?? ""} className="input" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Mobile</span>
          <input name="mobile" inputMode="tel" defaultValue={props.mobile ?? ""} className="input" placeholder="98765 43210" />
        </label>
        <label className="block">
          <span className="label">
            Most people <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input name="cap" type="number" min={1} max={30} defaultValue={props.softCap ?? ""} className="input" />
        </label>
      </div>
      {!props.hostSide && (
        <fieldset>
          <legend className="label">Side</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="choice relative">
              <input type="radio" name="side" value="bride" defaultChecked={props.side === "bride"} /> Bride&apos;s side
            </label>
            <label className="choice relative">
              <input type="radio" name="side" value="groom" defaultChecked={props.side === "groom"} /> Groom&apos;s side
            </label>
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="label">Invited to</legend>
        <div className="flex flex-wrap gap-2">
          {props.functions.map((f) => (
            <label key={f.id} className="choice choice-check" title={f.replied ? "They have replied for this function" : undefined}>
              <input type="checkbox" name="functions" value={f.id} defaultChecked={f.invited} disabled={f.replied} />
              {f.name}
              {f.replied && <span className="text-xs font-normal">(replied)</span>}
            </label>
          ))}
        </div>
        {props.functions.some((f) => f.replied) && <p className="hint mt-1">Functions they have replied to stay ticked.</p>}
      </fieldset>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-secondary w-full sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

export function DeleteHousehold({ slug, id, name, replied }: { slug: string; id: string; name: string; replied: boolean }) {
  const [state, action, pending] = useActionState(removeHousehold.bind(null, slug, id), null);
  return (
    <form
      action={action}
      className="space-y-3 rounded-[1.25rem] border-2 border-dashed border-line p-[18px] sm:p-[22px]"
      onSubmit={(e) => {
        if (!confirm(`Delete ${name} from the guest list? Their link and short code will stop working.`)) e.preventDefault();
      }}
    >
      <h2 className="text-lg font-bold">Delete household</h2>
      <p className="text-[0.9375rem] text-ink-soft">
        {replied
          ? "Not possible: they have replied, so they can't be deleted. Mark them as not coming instead."
          : "Their link and short code will stop working."}
      </p>
      <button type="submit" disabled={pending || replied} className="btn btn-secondary">
        <Trash className="h-5 w-5" aria-hidden="true" />
        {pending ? "Deleting…" : "Delete household"}
      </button>
      <Message state={state} />
    </form>
  );
}
