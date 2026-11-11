"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { cardRemove, cardUploadDone, cardUploadStart } from "./actions";

/**
 * One invitation card slot (English or Marathi): upload a PDF, see it, replace
 * or remove it. The file goes straight from the browser to Pangat's private
 * Storage through a one-time link, then the server records it.
 */
export default function CardUpload({ slug, lang, has }: { slug: string; lang: "en" | "mr"; has: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const label = lang === "en" ? "English card" : "Marathi card";

  const upload = (file: File) =>
    start(async () => {
      setStatus({ ok: true, text: "Uploading…" });
      const s = await cardUploadStart(slug, lang, file.size, file.type);
      if (!s.ok) return setStatus({ ok: false, text: s.message });
      const put = await fetch(s.url, { method: "PUT", body: file, headers: { "content-type": "application/pdf", "x-upsert": "false" } });
      if (!put.ok) return setStatus({ ok: false, text: "The upload didn't go through. Check your connection and try again." });
      const d = await cardUploadDone(slug, lang, s.path);
      setStatus(d ? { ok: d.ok, text: d.message } : null);
      router.refresh();
    });

  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-bold">
          <FileText className="h-5 w-5 text-kumkum" aria-hidden="true" />
          <span>
            {label}
            {lang === "mr" && <span lang="mr"> · मराठी</span>}
          </span>
        </p>
        {has ? (
          <span className="badge badge-yes">Uploaded</span>
        ) : (
          <span className="badge badge-no">Not uploaded</span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        className="sr-only"
        aria-label={`Choose the ${label} PDF`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn btn-secondary btn-sm">
          <Upload className="h-4 w-4" aria-hidden="true" />
          {busy ? "Uploading…" : has ? "Replace PDF" : "Upload PDF"}
        </button>
        {has && (
          <>
            <a href={`/host/e/${slug}/card?l=${lang}`} target="_blank" rel="noopener noreferrer" className="btn btn-quiet btn-sm">
              View
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!confirm(`Remove the ${label}? Guests will no longer see it.`)) return;
                start(async () => {
                  const r = await cardRemove(slug, lang);
                  setStatus(r ? { ok: r.ok, text: r.message } : null);
                  router.refresh();
                });
              }}
              className="btn btn-quiet btn-sm"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          </>
        )}
      </div>
      {status && <p className={`mt-2 text-sm font-semibold ${status.ok ? "text-leaf" : "text-kumkum"}`}>{status.text}</p>}
    </div>
  );
}
