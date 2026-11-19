"use client";

import { useId, useRef, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { MARATHI_MAX, type SuggestKind } from "@/lib/marathi";
import { useMarathiSuggest } from "./useMarathiSuggest";

/**
 * A Marathi name field with a "Suggest" button: it reads the English field of
 * the same form (`from`), asks for the Marathi and fills this field.
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
  const s = useMarathiSuggest();

  function suggest() {
    const source = ref.current?.form?.elements.namedItem(props.from);
    const english = source instanceof HTMLInputElement ? source.value : "";
    s.suggest([{ kind: props.kind, english, input: ref.current }]);
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
          aria-describedby={s.note ? `${id}-note` : undefined}
          onInput={(e) => e.isTrusted && s.canUndo && s.forgetUndo()}
        />
        <button
          type="button"
          onClick={suggest}
          disabled={s.pending}
          className="btn btn-secondary shrink-0 self-start px-3 sm:self-auto"
          title="Suggest the Marathi from the English"
        >
          <Languages className="h-5 w-5" aria-hidden="true" />
          <span>{s.pending ? "…" : "Suggest"}</span>
          <span className="sr-only"> Marathi from the English</span>
        </button>
      </div>
      {s.note && (
        <p id={`${id}-note`} role={s.note.ok ? "status" : "alert"} className={`mt-1 text-sm ${s.note.ok ? "text-ink-soft" : "text-kumkum"}`}>
          {s.note.text}{" "}
          {s.note.ok && s.canUndo && (
            <button type="button" onClick={s.undo} className="font-bold text-kumkum underline underline-offset-2">
              Undo
            </button>
          )}
        </p>
      )}
    </div>
  );
}
