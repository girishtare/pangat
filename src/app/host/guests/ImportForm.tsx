"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SheetCheck } from "@/lib/guestlist";
import { checkImport, saveImport } from "./actions";

export default function ImportForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<{ text: string; check: SheetCheck } | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const current = checked && checked.text === text ? checked.check : null;
  const canSave = !!current && !current.problem && current.counts.error === 0 && current.counts.new > 0;

  const onCheck = () =>
    start(async () => {
      setMessage(null);
      const r = await checkImport(text);
      if (!r.ok) setMessage({ kind: "error", text: r.error });
      else setChecked({ text, check: r.check });
    });

  const onSave = () =>
    start(async () => {
      const r = await saveImport(text);
      if (!r.ok) {
        setMessage({ kind: "error", text: r.error });
        if (r.check) setChecked({ text, check: r.check });
        return;
      }
      setMessage({
        kind: "ok",
        text: `Added ${r.added} household${r.added === 1 ? "" : "s"}${r.skipped ? `; ${r.skipped} already in the list were skipped` : ""}.`,
      });
      setText("");
      setChecked(null);
      router.refresh();
    });

  return (
    <div className="mt-4 space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={"Name\tMarathi name\tSide\tMobile\tFunctions\tCap\nShri. A. Joshi & family\tश्री. अ. जोशी सहपरिवार\tbride\t98765 43210\t\t6"}
        className="block w-full rounded-xl border-2 border-haldi/60 px-3 py-2 font-mono text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCheck}
          disabled={pending || !text.trim()}
          className="rounded-xl border-2 border-kumkum px-4 py-2 font-semibold text-kumkum disabled:opacity-50"
        >
          {pending && !canSave ? "Checking…" : "Check"}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !canSave}
          className="rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {current && current.counts.new > 0 ? `Add ${current.counts.new} household${current.counts.new === 1 ? "" : "s"}` : "Add households"}
        </button>
      </div>

      {message && (
        <p role="status" className={`rounded-xl px-3 py-2 ${message.kind === "ok" ? "bg-green-50 text-green-900" : "bg-kumkum/10 text-kumkum"}`}>
          {message.text}
        </p>
      )}

      {current?.problem && <p className="rounded-xl bg-kumkum/10 px-3 py-2 text-kumkum">{current.problem}</p>}

      {current && !current.problem && (
        <div>
          <p className="text-sm">
            {current.counts.new} new · {current.counts.exists} already in the list · {current.counts.error} with problems
          </p>
          <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto text-sm">
            {current.rows.map((r) => (
              <li
                key={r.line}
                className={`rounded-lg px-2 py-1 ${r.status === "error" ? "bg-kumkum/10" : r.status === "exists" ? "bg-gray-100" : "bg-green-50"}`}
              >
                <span className="font-mono text-xs">Row {r.line}</span> · <b>{r.label}</b>
                {r.draft && ` · ${r.draft.side}${r.draft.mobile ? ` · ${r.draft.mobile}` : ""}`}
                {r.errors.map((e) => (
                  <div key={e} className="text-kumkum">
                    {e}
                  </div>
                ))}
                {r.warnings.map((w) => (
                  <div key={w} className="text-gray-700">
                    {w}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
