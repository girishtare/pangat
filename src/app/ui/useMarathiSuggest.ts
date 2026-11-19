"use client";

import { useState, useTransition } from "react";
import type { SuggestKind } from "@/lib/marathi";
import { suggestMarathiAction } from "../host/suggestActions";

/** One Marathi box to fill from its English. */
export interface SuggestTarget {
  kind: SuggestKind;
  english: string;
  input: HTMLInputElement | null;
}

/**
 * "Suggest Marathi" for one or more boxes (shared by MarathiInput and the Add
 * household pop-up). Asks for every box at once; fills the boxes, keeps what
 * was there so Undo can put it back, and says what happened in one line.
 * `onlyEmpty`: fill only the empty boxes, unless every box already has text,
 * then replace them all (Undo restores them).
 */
export function useMarathiSuggest() {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [before, setBefore] = useState<{ input: HTMLInputElement; value: string }[] | null>(null);

  const setValue = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  function suggest(targets: SuggestTarget[], opts: { onlyEmpty?: boolean; emptyMessage?: string } = {}) {
    const usable = targets.filter((t): t is SuggestTarget & { input: HTMLInputElement } => !!t.input && t.english.trim() !== "");
    if (usable.length === 0) {
      setNote({ ok: false, text: opts.emptyMessage ?? "Type the English first." });
      return;
    }
    const empty = usable.filter((t) => t.input.value.trim() === "");
    const chosen = opts.onlyEmpty && empty.length > 0 ? empty : usable;
    setNote(null);
    start(async () => {
      const results = await Promise.all(chosen.map((t) => suggestMarathiAction(t.kind, t.english.trim())));
      const replaced: { input: HTMLInputElement; value: string }[] = [];
      const errors: string[] = [];
      results.forEach((r, i) => {
        const t = chosen[i];
        if (r.ok) {
          replaced.push({ input: t.input, value: t.input.value });
          setValue(t.input, r.text);
        } else errors.push(r.message);
      });
      setBefore(replaced.length ? replaced : null);
      if (replaced.length === 0) setNote({ ok: false, text: errors[0] ?? "Couldn't get a suggestion. Try again." });
      else
        setNote({
          ok: true,
          text: `Suggested. Check ${replaced.length > 1 ? "them" : "it"} before you save.${errors.length ? ` (One couldn't be suggested: ${errors[0]})` : ""}`,
        });
    });
  }

  function undo() {
    before?.forEach((b) => setValue(b.input, b.value));
    setBefore(null);
    setNote(null);
  }

  return {
    pending,
    note,
    canUndo: before !== null,
    suggest,
    undo,
    /** Typing in a box after a suggestion: there's nothing to undo any more. */
    forgetUndo: () => setBefore(null),
    clearNote: () => setNote(null),
  };
}
