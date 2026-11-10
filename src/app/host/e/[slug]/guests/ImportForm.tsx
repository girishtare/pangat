"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { SheetCheck } from "@/lib/guestlist";
import { Check, Download, Upload } from "lucide-react";
import { Alert } from "../../../../ui/kit";
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
    <div className="mt-4 space-y-4">
      <ol className="space-y-2">
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-haldi-soft font-bold text-haldi-deep">1</span>
          <span>
            <a href={`/host/e/${slug}/guests/template`} className="btn btn-secondary btn-sm">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download the Excel template
            </a>
            <span className="hint mt-1 block">It already lists this event&apos;s functions, with dropdowns.</span>
          </span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-haldi-soft font-bold text-haldi-deep">2</span>
          <span>Fill it in, in Excel or Google Sheets. One row per household.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-haldi-soft font-bold text-haldi-deep">3</span>
          <span className="min-w-0 flex-1">
            Choose the file. Pangat checks every row before adding anything.
            <label className="mt-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-haldi bg-haldi-soft/40 px-4 py-3 font-semibold text-ink">
              <Upload className="h-5 w-5 shrink-0 text-haldi-deep" aria-hidden="true" />
              <span className="min-w-0 truncate">{pending ? "Reading…" : source ? `Loaded ${source}` : "Choose an Excel or CSV file"}</span>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={pending}
                onChange={(e) => onFile(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
          </span>
        </li>
      </ol>

      <details className="rounded-xl border border-line px-3 py-2 text-sm" open={!source && text !== ""}>
        <summary className="min-h-10 cursor-pointer py-2 font-semibold">Or paste cells copied from a sheet (header row included)</summary>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSource(null);
          }}
          rows={7}
          aria-label="Pasted guest list"
          placeholder={"Name\tMarathi name\tSide\tMobile\tFunctions\tCap\nShri. A. Joshi & family\tश्री. अ. जोशी सहपरिवार\tbride\t98765 43210\t\t6"}
          className="input mt-1 font-mono text-sm"
        />
        <button type="button" onClick={onCheck} disabled={pending || !text.trim()} className="btn btn-secondary btn-sm mt-2">
          {pending ? "Checking…" : "Check"}
        </button>
      </details>

      {message && <Alert tone={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {current?.problem && <Alert tone="error">{current.problem}</Alert>}

      {current && !current.problem && (
        <div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="badge badge-yes">{current.counts.new} new</span>
            <span className="badge badge-no">{current.counts.exists} already on the list</span>
            {current.counts.error > 0 && <span className="badge badge-bride">{current.counts.error} with problems</span>}
          </div>
          <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto pr-1 text-sm">
            {current.rows.map((r) => (
              <li
                key={r.line}
                className={`rounded-lg border px-3 py-2 ${
                  r.status === "error" ? "border-kumkum/30 bg-kumkum-soft" : r.status === "exists" ? "border-line bg-paper-deep/60" : "border-leaf/20 bg-leaf-soft/60"
                }`}
              >
                <span className="font-mono text-xs text-ink-soft">Row {r.line}</span> · <b className="wrap-names">{r.label}</b>
                {r.draft && ` · ${r.draft.side}${r.draft.mobile ? ` · ${r.draft.mobile}` : ""}`}
                {r.errors.map((e) => (
                  <div key={e} className="text-kumkum-dark">
                    {e}
                  </div>
                ))}
                {r.warnings.map((w) => (
                  <div key={w} className="text-ink-soft">
                    {w}
                  </div>
                ))}
              </li>
            ))}
          </ul>
          {current.counts.error > 0 && <p className="hint mt-2">Fix those rows in your sheet, then choose the file again.</p>}
        </div>
      )}

      <button type="button" onClick={onSave} disabled={pending || !canSave} className="btn btn-primary w-full sm:w-auto">
        <Check className="h-5 w-5" aria-hidden="true" />
        {current && current.counts.new > 0 ? `Add ${current.counts.new} household${current.counts.new === 1 ? "" : "s"}` : "Add households"}
      </button>
    </div>
  );
}
