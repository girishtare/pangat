"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { MARATHI_MAX, type SuggestKind } from "@/lib/marathi";
import { suggestMarathiAction } from "../host/suggestActions";

/**
 * A Marathi name field with a "Suggest" button: it reads the English field of
 * the same form (`from`), asks Claude for the Marathi and fills this field.
 * Nothing is saved until the host saves the form, so they can check and edit
 * the suggestion first; Undo puts back what was there.
 */
export function MarathiInput(props: {
  label: ReactNode;
  kind: SuggestKind;
  /** Name of the English input in the same form. */
  from: string;
  name?: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [before, setBefore] = useState<string | null>(null);

  function suggest() {
    const input = ref.current;
    const source = input?.form?.elements.namedItem(props.from);
    const english = source instanceof HTMLInputElement ? source.value.trim() : "";
    if (!input) return;
    if (!english) {
      setNote({ ok: false, text: "Type the English first." });
      return;
    }
    setNote(null);
    start(async () => {
      const r = await suggestMarathiAction(props.kind, english);
      if (!r.ok) {
        setNote({ ok: false, text: r.message });
        return;
      }
      setBefore(input.value);
      input.value = r.text;
      setNote({ ok: true, text: "Suggested. Check it before you save." });
    });
  }

  function undo() {
    if (ref.current && before !== null) ref.current.value = before;
    setBefore(null);
    setNote(null);
  }

  return (
    <div className={props.className ?? "block"}>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      {/* Phones: Suggest sits under the field, so the field gets the full width (Codex test, 12 Nov). */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          ref={ref}
          name={props.name ?? "nameMr"}
          lang="mr"
          maxLength={MARATHI_MAX[props.kind]}
          defaultValue={props.defaultValue ?? ""}
          placeholder={props.placeholder}
          className="input min-w-0 flex-1"
          aria-describedby={note ? `${id}-note` : undefined}
          onInput={() => before !== null && setBefore(null)}
        />
        <button
          type="button"
          onClick={suggest}
          disabled={pending}
          className="btn btn-secondary shrink-0 self-start px-3 sm:self-auto"
          title="Suggest the Marathi from the English"
        >
          <Languages className="h-5 w-5" aria-hidden="true" />
          <span>{pending ? "…" : "Suggest"}</span>
          <span className="sr-only"> Marathi from the English</span>
        </button>
      </div>
      {note && (
        <p id={`${id}-note`} role={note.ok ? "status" : "alert"} className={`mt-1 text-sm ${note.ok ? "text-ink-soft" : "text-kumkum"}`}>
          {note.text}{" "}
          {note.ok && before !== null && (
            <button type="button" onClick={undo} className="font-bold text-kumkum underline underline-offset-2">
              Undo
            </button>
          )}
        </p>
      )}
    </div>
  );
}
