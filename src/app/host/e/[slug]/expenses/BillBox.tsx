"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ExternalLink, Paperclip, Trash2, Upload } from "lucide-react";
import { billRemove, billUploadDone, billUploadStart } from "./actions";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const TYPES = ACCEPT.split(",");
const MAX = 20 * 1024 * 1024;

/** Checks a chosen file before anything is sent. Null = fine. */
export function billFileProblem(f: File): string | null {
  if (!TYPES.includes(f.type)) return "Please choose a PDF, or a JPG, PNG or WebP image.";
  if (f.size > MAX) return "The bill must be under 20 MB.";
  return null;
}

/** Sends a bill straight from the browser to private Storage through a one-time link, then records it on the expense. */
export async function uploadBill(slug: string, expenseId: string, file: File): Promise<{ ok: boolean; text: string }> {
  const s = await billUploadStart(slug, expenseId, file.size, file.type);
  if (!s.ok) return { ok: false, text: s.message };
  const put = await fetch(s.url, { method: "PUT", body: file, headers: { "content-type": file.type, "x-upsert": "false" } });
  if (!put.ok) return { ok: false, text: "The bill didn't upload. Check your connection and try again." };
  const d = await billUploadDone(slug, expenseId, s.path);
  return d ? { ok: d.ok, text: d.message } : { ok: false, text: "Something went wrong. Please try again." };
}

/**
 * The bill or receipt of one expense. Editing: upload, view, replace or remove
 * straight away. Adding (no expense yet): the file waits in `pending` and is
 * uploaded once the expense is saved.
 */
export function BillBox({
  slug,
  expenseId,
  hasBill,
  pending,
  onPending,
}: {
  slug: string;
  expenseId?: string;
  hasBill: boolean;
  pending?: File | null;
  onPending?: (f: File | null) => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const chosen = (f: File) => {
    const problem = billFileProblem(f);
    if (problem) return setStatus({ ok: false, text: problem });
    if (!expenseId) {
      onPending?.(f);
      setStatus(null);
      return;
    }
    start(async () => {
      setStatus({ ok: true, text: "Uploading…" });
      setStatus(await uploadBill(slug, expenseId, f));
      router.refresh();
    });
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      aria-label="Choose the bill or receipt: a PDF or an image"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) chosen(f);
      }}
    />
  );
  const message = status && <p className={`mt-2 text-sm font-semibold ${status.ok ? "text-leaf" : "text-kumkum"}`}>{status.text}</p>;

  if (hasBill && expenseId) {
    return (
      <div className="flex min-h-28 flex-col justify-center rounded-[14px] border border-line bg-paper px-4 py-4">
        {fileInput}
        <p className="flex items-center gap-2 font-semibold">
          <Paperclip className="h-5 w-5 text-kumkum" aria-hidden="true" /> Bill attached
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={`/host/e/${slug}/expenses/bill?id=${expenseId}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm min-h-11">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> View
          </a>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn btn-quiet btn-sm min-h-11">
            <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? "Uploading…" : "Replace"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!confirm("Remove the bill from this expense? The file is deleted.")) return;
              start(async () => {
                const r = await billRemove(slug, expenseId);
                setStatus(r ? { ok: r.ok, text: r.message } : null);
                router.refresh();
              });
            }}
            className="btn btn-quiet btn-sm min-h-11"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
          </button>
        </div>
        {message}
      </div>
    );
  }

  return (
    <div>
      {fileInput}
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="flex min-h-28 w-full flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-line bg-paper px-4 py-5 text-center hover:border-kumkum"
      >
        <Paperclip className="h-5 w-5 text-ink-soft" aria-hidden="true" />
        {pending ? (
          <>
            <span className="mt-1 font-semibold [overflow-wrap:anywhere]">{pending.name}</span>
            <span className="hint">Attached when you add the expense. Tap to choose another.</span>
          </>
        ) : (
          <>
            <span className="mt-1 font-semibold">{busy ? "Uploading…" : "Attach the bill or receipt"}</span>
            <span className="hint">PDF, JPG, PNG or WebP · up to 20 MB · a phone photo is fine</span>
          </>
        )}
      </button>
      {pending && (
        <button type="button" onClick={() => onPending?.(null)} className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-kumkum underline">
          Don&apos;t attach it
        </button>
      )}
      {message}
    </div>
  );
}
