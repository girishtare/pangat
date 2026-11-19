"use client";

import InviteByField from "./InviteByField";
import PhoneInput from "../../../../ui/PhoneInput";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Languages, X } from "lucide-react";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../ui/kit";
import { useMarathiSuggest } from "../../../../ui/useMarathiSuggest";
import { addHousehold } from "./actions";
import { useFormAction } from "../../../../ui/useFormAction";

/** Which box an error is about, so it can be brought into view. */
function fieldFor(message: string): string | null {
  if (/function/i.test(message)) return "functions";
  if (/phone|mobile|whatsapp/i.test(message)) return "mobile";
  if (/invitation/i.test(message)) return "inviteBy";
  if (/side/i.test(message)) return "side";
  if (/guest count|cap/i.test(message)) return "cap";
  if (/location/i.test(message)) return "location";
  if (/name/i.test(message)) return "name";
  return null;
}

/**
 * Add one household (owner, 19 Nov: compact). English and Marathi side by side,
 * one Suggest Marathi button for the name and the place, and two saves:
 * "add new" (Enter) keeps Side, Language, invitation and functions for the
 * next household; "close" closes the pop-up. The place's Marathi is kept per
 * event (Places in Marathi), so a known place fills itself.
 */
export default function AddHouseholdForm({
  slug,
  hostSide,
  functions,
  places,
  placesMr,
  isOwner,
}: {
  slug: string;
  hostSide: Side | null;
  functions: { id: string; name: string }[];
  /** The event's locations as typed, for the suggestions list (the Marathi map is keyed by the exact text). */
  places: string[];
  placesMr: Record<string, string>;
  isOwner: boolean;
}) {
  const [state, action, pending] = useFormAction(addHousehold.bind(null, slug), { keep: true });
  const form = useRef<HTMLFormElement>(null);
  const then = useRef<"new" | "close">("new");
  const [saving, setSaving] = useState<"new" | "close" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const s = useMarathiSuggest();
  const listId = useId();

  const field = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | null;
  const nameEn = () => field("name");
  const nameMr = () => field("nameMr");
  const locEn = () => field("location");
  const locMr = () => field("locationMr");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    then.current = submitter instanceof HTMLButtonElement && submitter.value === "close" ? "close" : "new";
    setSaving(then.current);
    action(e);
  };

  const added = state?.ok ? `Added ${state.codes[0]?.name ?? "the household"} · code ${state.codes[0]?.shortCode ?? ""}${state.placeNote ? `. ${state.placeNote}` : ""}` : null;

  useEffect(() => {
    if (!state) return;
    setSaving(null);
    const f = form.current;
    if (!f) return;
    if (!state.ok) {
      // Bring the box the error is about into view.
      const name = fieldFor(state.error);
      const el = name ? (f.querySelector(`[name="${name}"]`) as HTMLElement | null) : null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
      return;
    }
    // Clear what belongs to one household; keep Side, Language, invitation and functions for the next.
    for (const n of ["name", "nameMr", "location", "locationMr", "mobile", "cap", "notes"]) {
      const el = f.elements.namedItem(n);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = "";
    }
    f.dispatchEvent(new Event("input", { bubbles: true })); // the WhatsApp tick follows the (now empty) mobile
    s.clearNote();
    if (then.current === "close") {
      f.closest("dialog")?.close();
      setToast(added);
    } else {
      f.querySelector<HTMLInputElement>('[name="name"]')?.focus();
    }
    // Runs once per save result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  // A place already used in this event: fill its Marathi, if the box is empty.
  const fillPlace = () => {
    const en = locEn()?.value.trim() ?? "";
    const mr = locMr();
    if (en && mr && !mr.value.trim() && placesMr[en]) mr.value = placesMr[en];
  };

  const suggestBoth = () =>
    s.suggest(
      [
        { kind: "household", english: nameEn()?.value ?? "", input: nameMr() },
        { kind: "place", english: locEn()?.value ?? "", input: locMr() },
      ],
      { onlyEmpty: true, emptyMessage: "Type the English name or location first." },
    );

  const sub = "mb-1 block text-sm text-ink-soft";
  const group = "min-w-0 rounded-[14px] max-sm:border max-sm:border-line max-sm:px-3 max-sm:pb-3";
  const legend = "label max-sm:px-1";

  return (
    <>
      <form ref={form} onSubmit={onSubmit} className="mt-3 space-y-3">
        <fieldset className={group}>
          <legend className={legend}>Name</legend>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <label className="block">
              <span className={sub}>In English</span>
              <input name="name" required maxLength={120} aria-label="Name in English" className="input" placeholder="Shri. A. Joshi & family" />
            </label>
            <label className="block">
              <span className={sub}>In Marathi (optional)</span>
              <input
                name="nameMr"
                lang="mr"
                maxLength={120}
                aria-label="Name in Marathi (optional)"
                className="input"
                placeholder="श्री. अ. जोशी सहपरिवार"
                onInput={(e) => e.isTrusted && s.canUndo && s.forgetUndo()}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className={group}>
          <legend className={legend}>
            Location <span className="font-normal text-ink-soft">(where they stay, optional)</span>
          </legend>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <label className="block">
              <span className={sub}>In English</span>
              <input
                name="location"
                maxLength={80}
                list={listId}
                autoComplete="off"
                aria-label="Location in English"
                className="input"
                placeholder="e.g. Borivali, Mumbai"
                onChange={fillPlace}
                onBlur={fillPlace}
              />
              <datalist id={listId}>
                {places.map((p) => (
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
                aria-label="Location in Marathi"
                className="input"
                placeholder="उदा. बोरिवली, मुंबई"
                onInput={(e) => e.isTrusted && s.canUndo && s.forgetUndo()}
              />
              {!isOwner && <span className="hint mt-1 block">Only the owner can save a new Marathi place.</span>}
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <span className="hint hidden sm:block">Fills both Marathi boxes from the English. Check before you save.</span>
          <button type="button" onClick={suggestBoth} disabled={s.pending} className="btn btn-secondary min-h-11 w-full shrink-0 sm:w-auto">
            <Languages className="h-5 w-5" aria-hidden="true" />
            {s.pending ? "Suggesting…" : (
              <>
                <span className="sm:hidden">Suggest Marathi for both</span>
                <span className="hidden sm:inline">Suggest Marathi</span>
              </>
            )}
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
          {hostSide ? (
            <div>
              <input type="hidden" name="side" value={hostSide} />
              <p className="label">Side</p>
              <p className="flex min-h-11 items-center">{hostSide === "bride" ? "Bride's side" : "Groom's side"} (yours)</p>
            </div>
          ) : (
            <fieldset className="min-w-0">
              <legend className="label">Side</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="choice relative min-h-11">
                  <input type="radio" name="side" value="bride" required /> Bride&apos;s side
                </label>
                <label className="choice relative min-h-11">
                  <input type="radio" name="side" value="groom" /> Groom&apos;s side
                </label>
              </div>
            </fieldset>
          )}
          <label className="block min-w-0">
            <span className="label">
              Mobile <span className="font-normal text-ink-soft">(for WhatsApp; blank if none)</span>
            </span>
            <PhoneInput name="mobile" label="Mobile" />
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
                  <input type="radio" name="lang" value={value} defaultChecked={"both" === value} /> <span lang={l}>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <InviteByField card={true} wa={false} hint={false} />
        </div>

        <fieldset className="min-w-0">
          <legend className="label">Invited to</legend>
          <div className="flex flex-wrap gap-2">
            {functions.map((f) => (
              <label key={f.id} className="choice choice-check min-h-11">
                <input type="checkbox" name="functions" value={f.name} defaultChecked /> {f.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <label className="block">
            <span className="label">
              Guest Count <span className="font-normal text-ink-soft">(optional)</span>
            </span>
            <input name="cap" type="number" min={1} max={30} className="input" placeholder="e.g. 6" />
          </label>
          <label className="block min-w-0">
            <span className="label">
              Comments / Notes <span className="font-normal text-ink-soft">(optional)</span>
            </span>
            <input name="notes" maxLength={500} className="input" placeholder="e.g. Vegetarian only; call before visiting" />
          </label>
        </div>

        {/* Always in view at the bottom of the pop-up. "Add new" comes first, so Enter in a box picks it. */}
        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-4 flex flex-col gap-2 border-t border-line bg-card px-5 py-3 sm:flex-row sm:items-center">
          <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm font-semibold">
            {state && !state.ok ? (
              <span className="text-kumkum" role="alert">
                {state.error}
                {state.check?.rows.flatMap((r) => r.errors).map((e) => (
                  <span key={e} className="block font-normal">
                    {e}
                  </span>
                ))}
              </span>
            ) : added ? (
              <span className="flex items-start gap-1 text-leaf">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {added}
              </span>
            ) : null}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" name="then" value="new" disabled={pending} className="btn btn-secondary order-2 min-h-11 sm:order-1">
              {pending && saving === "new" ? "Saving…" : "Save household and add new"}
            </button>
            <button type="submit" name="then" value="close" disabled={pending} className="btn btn-primary order-1 min-h-11 sm:order-2">
              {pending && saving === "close" ? "Saving…" : "Save household and close"}
            </button>
          </div>
        </div>
      </form>

      {/* After "close": the message stays on the Guest list for a few seconds. */}
      {toast &&
        createPortal(
          <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg">
            <Alert tone="success">
              <span className="flex items-start justify-between gap-3">
                <span>{toast}</span>
                <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="-m-2 inline-flex h-10 w-10 shrink-0 items-center justify-center">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </Alert>
          </div>,
          document.body,
        )}
    </>
  );
}
