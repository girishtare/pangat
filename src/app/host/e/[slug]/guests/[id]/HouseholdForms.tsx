"use client";

import InviteByField from "../InviteByField";
import PhoneInput from "../../../../../ui/PhoneInput";
import { useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMarathiSuggest } from "../../../../../ui/useMarathiSuggest";
import { announceSaved, closeIfOpenedAsTab } from "../../../../../ui/tabSync";
import { Check, ChevronLeft, Copy, Languages, Save, Trash } from "lucide-react";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../../ui/kit";
import { recordReply, removeHousehold, saveHousehold, type FormState } from "./actions";
import { useFormAction } from "../../../../../ui/useFormAction";

const MAX = 30;

/** After a save: refresh the Guest list in the other tab, and close this one if it was opened as a new tab (owner, 19 Nov). */
function useAfterSave(slug: string, state: FormState | null) {
  useEffect(() => {
    if (!state?.ok) return;
    announceSaved(slug);
    // A moment to see "Saved" before the tab goes.
    const t = setTimeout(closeIfOpenedAsTab, 600);
    return () => clearTimeout(t);
  }, [slug, state]);
}

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
  // A new reply starts at 0 non-veg (everyone veg), as on the guest page (owner, 20 Nov).
  const [veg, setVeg] = useState(f.current?.status === "yes" ? f.current.veg : 2);
  const num = "input min-h-12 w-full min-w-0 px-3 text-base font-bold tabular-nums sm:w-20";
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
                  // The non-veg count stays; the veg count takes the change.
                  setVeg((old) => Math.max(0, v - (heads - old)));
                  setHeads(v);
                }}
                className={num}
              />
            </label>
            {f.catered && !f.vegOnly && (
              // Non-veg is asked, veg follows (owner, 20 Nov); the form still sends the veg count.
              <label className="flex min-w-0 items-center gap-2.5">
                <span className="text-ink-soft">Non-veg</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={heads}
                  value={heads - veg}
                  onChange={(e) => setVeg(heads - Math.min(heads, Math.max(0, Number(e.target.value) || 0)))}
                  className={num}
                />
                <input type="hidden" name={`veg_${f.id}`} value={veg} />
                <span className="hidden text-sm text-ink-soft sm:inline">veg {veg}</span>
              </label>
            )}
          </div>
          {f.catered && !f.vegOnly && <p className="text-sm text-ink-soft sm:hidden">Veg: {veg}</p>}
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
  const [state, action, pending] = useFormAction(recordReply.bind(null, slug, id), { keep: true });
  useAfterSave(slug, state);
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
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full text-base">
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
  location: string | null;
  notes: string | null;
  lang: "both" | "en" | "mr";
  inviteBy: { card: boolean; wa: boolean };
  functions: { id: string; name: string; invited: boolean; replied: boolean }[];
  /** The event's places as typed, and their Marathi (Places in Marathi). */
  places: string[];
  placesMr: Record<string, string>;
  isOwner: boolean;
}) {
  const [state, action, pending] = useFormAction(saveHousehold.bind(null, props.slug, props.id), { keep: true });
  const router = useRouter();
  const then = useRef<"stay" | "back">("stay");
  const form = useRef<HTMLFormElement>(null);
  const s = useMarathiSuggest();
  const listId = useId();
  const field = (n: string) => form.current?.elements.namedItem(n) as HTMLInputElement | null;

  // After a save: refresh the Guest list elsewhere; close this tab if it was opened from the list;
  // "Save and back" in the same tab goes back to the list.
  useEffect(() => {
    if (!state?.ok) return;
    announceSaved(props.slug);
    const back = then.current === "back";
    const t = setTimeout(() => {
      if (!closeIfOpenedAsTab() && back) router.push(`/host/e/${props.slug}/guests`);
    }, back ? 300 : 600);
    return () => clearTimeout(t);
    // Once per save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    then.current = submitter instanceof HTMLButtonElement && submitter.value === "back" ? "back" : "stay";
    action(e);
  };

  // A place already used in this event: fill its Marathi, if the box is empty.
  const fillPlace = () => {
    const en = field("location")?.value.trim() ?? "";
    const mr = field("locationMr");
    if (en && mr && !mr.value.trim() && props.placesMr[en]) mr.value = props.placesMr[en];
  };
  const suggestBoth = () =>
    s.suggest(
      [
        { kind: "household", english: field("nameEn")?.value ?? "", input: field("nameMr") },
        { kind: "place", english: field("location")?.value ?? "", input: field("locationMr") },
      ],
      { onlyEmpty: true, emptyMessage: "Type the English name or location first." },
    );
  const sub = "mb-1 block text-sm text-ink-soft";
  const forget = (e: FormEvent<HTMLInputElement>) => e.nativeEvent.isTrusted && s.canUndo && s.forgetUndo();

  return (
    <form id="household-details" ref={form} onSubmit={onSubmit} className="space-y-3">
      <fieldset className="min-w-0">
        <legend className="label">Name</legend>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <label className="block">
            <span className={sub}>In English</span>
            <input name="nameEn" required maxLength={120} defaultValue={props.nameEn} aria-label="Name in English" className="input" />
          </label>
          <label className="block">
            <span className={sub}>In Marathi</span>
            <input name="nameMr" lang="mr" maxLength={120} defaultValue={props.nameMr ?? ""} aria-label="Name in Marathi" className="input" onInput={forget} />
          </label>
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="label">
          Location <span className="font-normal text-ink-soft">(where they stay)</span>
        </legend>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <label className="block">
            <span className={sub}>In English</span>
            <input
              name="location"
              maxLength={80}
              list={listId}
              autoComplete="off"
              defaultValue={props.location ?? ""}
              aria-label="Location in English"
              className="input"
              placeholder="e.g. Borivali, Mumbai"
              onChange={fillPlace}
              onBlur={fillPlace}
            />
            <datalist id={listId}>
              {props.places.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className={sub}>In Marathi</span>
            <input
              name="locationMr"
              lang="mr"
              maxLength={80}
              defaultValue={props.location ? (props.placesMr[props.location] ?? "") : ""}
              aria-label="Location in Marathi"
              className="input"
              placeholder="उदा. बोरिवली, मुंबई"
              onInput={forget}
            />
            {!props.isOwner && <span className="hint mt-1 block">Only the owner can save a new Marathi place.</span>}
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <span className="hint hidden sm:block">Fills both Marathi boxes from the English. Check before you save.</span>
        <button type="button" onClick={suggestBoth} disabled={s.pending} className="btn btn-secondary min-h-11 w-full shrink-0 sm:w-auto">
          <Languages className="h-5 w-5" aria-hidden="true" />
          {s.pending ? "Suggesting…" : "Suggest Marathi"}
        </button>
      </div>
      {s.note && (
        <p role={s.note.ok ? "status" : "alert"} className={`text-sm sm:text-right ${s.note.ok ? "text-ink-soft" : "text-kumkum"}`}>
          {s.note.text}{" "}
          {s.note.ok && s.canUndo && (
            <button type="button" onClick={s.undo} className="inline-flex min-h-11 items-center font-bold text-kumkum underline underline-offset-2">
              Undo
            </button>
          )}
        </p>
      )}

      <hr className="border-line" />

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {props.hostSide ? (
          <div>
            <p className="label">Side</p>
            <p className="flex min-h-11 items-center">{props.side === "bride" ? "Bride's side" : "Groom's side"}</p>
          </div>
        ) : (
          <fieldset className="min-w-0">
            <legend className="label">Side</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="choice relative min-h-11">
                <input type="radio" name="side" value="bride" defaultChecked={props.side === "bride"} /> Bride&apos;s side
              </label>
              <label className="choice relative min-h-11">
                <input type="radio" name="side" value="groom" defaultChecked={props.side === "groom"} /> Groom&apos;s side
              </label>
            </div>
          </fieldset>
        )}
        <label className="block min-w-0">
          <span className="label">
            Mobile <span className="font-normal text-ink-soft">(for WhatsApp; blank if none)</span>
          </span>
          <PhoneInput name="mobile" label="Mobile" defaultValue={props.mobile} />
        </label>

        <fieldset className="min-w-0">
          <legend className="label">
            Language <span className="font-normal text-ink-soft">(slip, WhatsApp, reply page)</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["mr", "मराठी", "mr"],
                ["en", "English", undefined],
                ["both", "Both", undefined],
              ] as const
            ).map(([value, label, l]) => (
              <label key={value} className="choice relative min-h-11">
                <input type="radio" name="lang" value={value} defaultChecked={props.lang === value} /> <span lang={l}>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <InviteByField card={props.inviteBy.card} wa={props.inviteBy.wa} hint={false} />
      </div>

      <fieldset className="min-w-0">
        <legend className="label">Invited to</legend>
        <div className="flex flex-wrap gap-2">
          {props.functions.map((f) => (
            <label key={f.id} className="choice choice-check min-h-11" title={f.replied ? "They have replied for this function" : undefined}>
              <input type="checkbox" name="functions" value={f.id} defaultChecked={f.invited} disabled={f.replied} />
              {f.name}
              {f.replied && <span className="text-xs font-normal">(replied)</span>}
            </label>
          ))}
        </div>
        {props.functions.some((f) => f.replied) && <p className="hint mt-1">Functions they have replied to stay ticked.</p>}
      </fieldset>

      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <label className="block">
          <span className="label">
            Guest Count <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input name="cap" type="number" min={1} max={30} defaultValue={props.softCap ?? ""} className="input" />
        </label>
        <label className="block min-w-0">
          <span className="label">
            Comments / Notes <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <input name="notes" maxLength={500} defaultValue={props.notes ?? ""} className="input" />
        </label>
      </div>

      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-11 w-full sm:w-auto">
        <Save className="h-5 w-5" aria-hidden="true" />
        {pending && then.current === "stay" ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}

/**
 * The link back to the Guest list, at the top of the household page (owner,
 * 19 Nov): it saves the details first, like "Save details", then goes back
 * (or closes this tab when it was opened from the list).
 */
export function SaveAndBack() {
  return (
    <button
      type="submit"
      form="household-details"
      name="then"
      value="back"
      className="inline-flex min-h-11 items-center gap-1 font-bold text-kumkum hover:text-kumkum-dark"
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      Save and back to Guest list
    </button>
  );
}

export function DeleteHousehold({ slug, id, name, replied }: { slug: string; id: string; name: string; replied: boolean }) {
  const [state, action, pending] = useActionState(removeHousehold.bind(null, slug, id), null);
  return (
    <form
      action={action}
      className="space-y-3 rounded-[1.25rem] border-2 border-dashed border-line p-[18px] sm:p-[22px]"
      onSubmit={(e) => {
        // Slips are printed and with guests (owner, 12 Nov): a deleted household's QR and code stop working for good,
        // and adding them again makes a new code that isn't on their slip.
        if (
          !confirm(
            `Delete ${name} from the guest list?\n\nIf they have a printed slip, its QR code and short code stop working for good. Adding them again makes a new code that isn't on their slip.\n\nTo correct a name, mobile or functions, use Edit instead: the slip keeps working.`,
          )
        )
          e.preventDefault();
      }}
    >
      <h2 className="text-base font-bold">Delete household</h2>
      <p className="text-[0.9375rem] text-ink-soft">
        {replied
          ? "Not possible: they have replied, so they can't be deleted. Mark them as not coming instead."
          : "Their link, printed QR code and short code stop working for good. To correct details, use Details and invitations above: their slip keeps working."}
      </p>
      <button type="submit" disabled={pending || replied} className="btn btn-secondary">
        <Trash className="h-5 w-5" aria-hidden="true" />
        {pending ? "Deleting…" : "Delete household"}
      </button>
      <Message state={state} />
    </form>
  );
}
