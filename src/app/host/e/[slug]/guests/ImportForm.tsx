"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { SheetCheck } from "@/lib/guestlist";
import { checkImport, readSpreadsheet, saveImport } from "./actions";

const MAX_UPLOAD_BYTES = 900_000;

export default function ImportForm({ slug }: { slug: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ text: string; check: SheetCheck } | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const current = checked && checked.text === text ? checked.check : null;
  const canSave = !!current && !current.problem && current.counts.error === 0 && current.counts.new > 0;

  const runCheck = async (value: string) => {
    const r = await checkImport(slug, value);
    if (!r.ok) setMessage({ kind: "error", text: r.error });
    else setChecked({ text: value, check: r.check });
  };

  const onCheck = () =>
    start(async () => {
      setMessage(null);
      await runCheck(text);
    });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      setMessage(null);
      setChecked(null);
      if (file.size > MAX_UPLOAD_BYTES) {
        setMessage({ kind: "error", text: "That file is too large. Keep it under 900 KB (about 5,000 rows)." });
        return;
      }
      const name = file.name.toLowerCase();
      let value: string;
      if (/\.(csv|tsv|txt)$/.test(name)) {
        value = await file.text();
      } else {
        const fd = new FormData();
        fd.set("file", file);
        const r = await readSpreadsheet(slug, fd);
        if (!r.ok) {
          setMessage({ kind: "error", text: r.error });
          return;
        }
        value = r.text;
      }
      setText(value);
      setSource(file.name);
      await runCheck(value);
    });
    if (fileInput.current) fileInput.current.value = "";
  };

  const onSave = () =>
    start(async () => {
      const r = await saveImport(slug, text);
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
      setSource(null);
      setChecked(null);
      router.refresh();
    });

  return (
    <div className="mt-4 space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>
          <a href={`/host/e/${slug}/guests/template`} className="font-semibold text-kumkum underline">
            Download the Excel template
          </a>{" "}
          (it already lists this event&apos;s functions).
        </li>
        <li>Fill it in, in Excel or Google Sheets. One row per household.</li>
        <li>Choose the file below. Pangat checks every row before adding anything.</li>
      </ol>

      <label className="block">
        <span className="sr-only">Choose an Excel or CSV file</span>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:rounded-xl file:border-2 file:border-kumkum file:bg-white file:px-4 file:py-2 file:font-semibold file:text-kumkum"
        />
      </label>
      {source && <p className="text-sm">Loaded {source}.</p>}

      <details className="text-sm" open={!source && text !== ""}>
        <summary className="cursor-pointer">Or paste cells copied from a sheet (header row included)</summary>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSource(null);
          }}
          rows={8}
          placeholder={"Name\tMarathi name\tSide\tMobile\tFunctions\tCap\nShri. A. Joshi & family\tश्री. अ. जोशी सहपरिवार\tbride\t98765 43210\t\t6"}
          className="mt-2 block w-full rounded-xl border-2 border-haldi/60 px-3 py-2 font-mono text-sm"
        />
        <button
          type="button"
          onClick={onCheck}
          disabled={pending || !text.trim()}
          className="mt-2 rounded-xl border-2 border-kumkum px-4 py-2 font-semibold text-kumkum disabled:opacity-50"
        >
          {pending ? "Checking…" : "Check"}
        </button>
      </details>

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
          {current.counts.error > 0 && <p className="mt-2 text-sm">Fix those rows in your sheet, then choose the file again.</p>}
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={pending || !canSave}
        className="rounded-xl bg-kumkum px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {current && current.counts.new > 0 ? `Add ${current.counts.new} household${current.counts.new === 1 ? "" : "s"}` : "Add households"}
      </button>
    </div>
  );
}
