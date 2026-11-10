"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Save, Trash } from "lucide-react";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../../ui/kit";
import Stepper from "../../../../../ui/Stepper";
import { recordReply, removeHousehold, saveHousehold, type FormState } from "./actions";

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
      className="btn btn-primary"
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
  current: { status: "yes" | "no"; heads: number; veg: number; arrivalSlot: string | null } | null;
}

function ReplyRow({ f }: { f: ReplyFn }) {
  const [coming, setComing] = useState<"yes" | "no" | "">(f.current?.status ?? "");
  const [heads, setHeads] = useState(f.current?.status === "yes" ? f.current.heads : 2);
  const [veg, setVeg] = useState(f.current?.status === "yes" ? f.current.veg : 0);
  return (
    <fieldset className="rounded-xl border border-line bg-card">
      <legend className="sr-only">{f.name}</legend>
      <div className="rounded-t-xl border-b border-line bg-paper-deep/70 px-4 py-2">
        <p className="font-display text-lg font-bold text-kumkum">{f.name}</p>
        <p className="text-sm text-ink-soft">{f.when}</p>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="choice relative">
            <input type="radio" name={`coming_${f.id}`} value="yes" checked={coming === "yes"} onChange={() => setComing("yes")} />
            Coming
          </label>
          <label className="choice relative">
            <input type="radio" name={`coming_${f.id}`} value="no" checked={coming === "no"} onChange={() => setComing("no")} />
            Not coming
          </label>
        </div>
        {coming === "yes" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label">People</span>
              <Stepper
                label="People"
                name={`heads_${f.id}`}
                value={heads}
                min={1}
                max={MAX}
                onChange={(v) => {
                  setHeads(v);
                  setVeg((old) => (old === heads ? v : Math.min(old, v)));
                }}
              />
            </div>
            {f.catered && (
              <div>
                <span className="label">Vegetarian</span>
                <Stepper label="Vegetarian" name={`veg_${f.id}`} value={veg} min={0} max={heads} onChange={setVeg} />
                <p className="hint mt-1">Non-veg: {heads - veg}</p>
              </div>
            )}
            <label className="block sm:col-span-2">
              <span className="label">Arrival</span>
              <select name={`arrival_${f.id}`} defaultValue={f.current?.arrivalSlot ?? ""} className="input">
                <option value="">Not asked</option>
                <option value="early">Early</option>
                <option value="on_time">On time</option>
                <option value="late">A little late</option>
              </select>
            </label>
          </div>
        )}
      </div>
    </fieldset>
  );
}

export function ReplyForm({ slug, id, functions }: { slug: string; id: string; functions: ReplyFn[] }) {
  const [state, action, pending] = useActionState(recordReply.bind(null, slug, id), null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-4">
        {functions.map((f) => (
          <ReplyRow key={f.id} f={f} />
        ))}
      </div>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        <Check className="h-5 w-5" aria-hidden="true" />
        {pending ? "Saving…" : "Save reply"}
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
  const [state, action, pending] = useActionState(saveHousehold.bind(null, props.slug, props.id), null);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Name (English)</span>
        <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} className="input" />
      </label>
      <label className="block">
        <span className="label">Name (Marathi)</span>
        <input name="nameMr" lang="mr" maxLength={120} defaultValue={props.nameMr ?? ""} className="input" />
      </label>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <label className="block">
          <span className="label">Mobile</span>
          <input name="mobile" inputMode="tel" defaultValue={props.mobile ?? ""} className="input" placeholder="98765 43210" />
        </label>
        <label className="block">
          <span className="label">Cap (optional)</span>
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
            <label key={f.id} className="choice relative px-4" title={f.replied ? "They have replied for this function" : undefined}>
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
      className="flex flex-col items-center gap-2 text-center"
      onSubmit={(e) => {
        if (!confirm(`Delete ${name} from the guest list? Their link and short code will stop working.`)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending || replied} className="btn btn-quiet">
        <Trash className="h-5 w-5" aria-hidden="true" />
        {pending ? "Deleting…" : "Delete household"}
      </button>
      {replied && <p className="hint">They have replied, so they can&apos;t be deleted. Mark them as not coming instead.</p>}
      <Message state={state} />
    </form>
  );
}
