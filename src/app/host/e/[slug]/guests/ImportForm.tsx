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

  const step = (k: number) => (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kumkum font-display text-base text-white" aria-hidden="true">
      {k}
    </span>
  );
  const problems = current ? current.rows.filter((r) => r.errors.length > 0 || r.warnings.length > 0) : [];

  return (
    <div className="mt-4 space-y-4">
      <ol className="space-y-4">
        <li className="flex items-start gap-3">
          {step(1)}
          <div className="min-w-0">
            <p>
              <b>Download the template.</b> It already lists this event&apos;s functions, with drop-downs.
            </p>
            <a href={`/host/e/${slug}/guests/template`} className="btn btn-secondary mt-2">
              <Download className="h-5 w-5" aria-hidden="true" />
              Download template (.xlsx)
            </a>
          </div>
        </li>
        <li className="flex items-start gap-3">
          {step(2)}
          <p>
            <b>Fill it in</b> in Excel or Google Sheets. One row per household.
          </p>
        </li>
        <li className="flex items-start gap-3">
          {step(3)}
          <div className="min-w-0 flex-1">
            <p>
              <b>Choose the file.</b> Pangat checks every row before anything is added.
            </p>
            <label className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-sand-deep/60 bg-paper px-4 py-3 text-center">
              <span className="inline-flex items-center gap-2 font-bold text-ink">
                <Upload className="h-5 w-5 shrink-0 text-haldi-deep" aria-hidden="true" />
                {pending ? "Reading…" : source ? `Loaded ${source}` : "Choose file"}
              </span>
              <span className="text-sm text-ink-soft">Excel (.xlsx) or CSV</span>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={pending}
                onChange={(e) => onFile(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
            <details className="mt-2 text-sm" open={!source && text !== ""}>
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-kumkum">
                Or paste cells copied from your sheet (header row included)
              </summary>
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
          </div>
        </li>
      </ol>

      {message && <Alert tone={message.kind === "ok" ? "success" : "error"}>{message.text}</Alert>}

      {current?.problem && <Alert tone="error">{current.problem}</Alert>}

      {current && !current.problem && (
        <div className="border-t border-dashed border-line pt-4">
          <p className="font-bold">
            {source ?? "Pasted cells"} · checked {current.rows.length} row{current.rows.length === 1 ? "" : "s"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge badge-yes text-sm">{current.counts.new} new</span>
            <span className="badge badge-no text-sm">{current.counts.exists} already on the list</span>
            {current.counts.error > 0 && (
              <span className="badge badge-bride text-sm">
                {current.counts.error} problem{current.counts.error === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {problems.length > 0 && (
            <ul className="mt-3 max-h-72 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
              {problems.flatMap((r) => [
                ...r.errors.map((e) => (
                  <li key={`${r.line}e${e}`} className="text-kumkum-dark">
                    Row {r.line}: {e}
                  </li>
                )),
                ...r.warnings.map((w) => (
                  <li key={`${r.line}w${w}`} className="text-ink-soft">
                    Row {r.line}: {w}
                  </li>
                )),
              ])}
            </ul>
          )}
          {current.counts.error > 0 && <p className="hint mt-2">Fix those rows in your sheet, then choose the file again.</p>}
        </div>
      )}

      <button type="button" onClick={onSave} disabled={pending || !canSave} className="btn btn-primary min-h-[52px] w-full text-lg sm:w-auto">
        <Check className="h-5 w-5" aria-hidden="true" />
        {current && current.counts.new > 0 ? `Add ${current.counts.new} household${current.counts.new === 1 ? "" : "s"}` : "Add households"}
      </button>
    </div>
  );
}
