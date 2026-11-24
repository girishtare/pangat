"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Alert } from "../../../../ui/kit";
import { clearHouseholdReply, type ClearState } from "./actions";

export interface ReplyRow {
  id: string;
  nameEn: string;
  nameMr: string | null;
  sideLabel: string;
  location: string | null;
  placeMr: string | null;
  mobile: string | null;
  shortCode: string;
  /** One line per function, e.g. "Haldi: Yes · 3 (1 non-veg, 2 veg)". */
  lines: string[];
  /** How and when they last replied, e.g. "QR code · 20 Nov, 08:00 am". */
  last: string;
}

export function ClearReplies({ slug, rows }: { slug: string; rows: ReplyRow[] }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ClearState>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startClear] = useTransition();

  const q = query.trim();
  const ql = q.toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const shown = q
    ? rows.filter(
        (r) =>
          r.nameEn.toLowerCase().includes(ql) ||
          (r.nameMr ?? "").includes(q) ||
          (r.location ?? "").toLowerCase().includes(ql) ||
          (r.placeMr ?? "").includes(q) ||
          r.shortCode.toLowerCase() === ql ||
          (qDigits.length >= 4 && (r.mobile ?? "").replace(/\D/g, "").includes(qDigits)),
      )
    : rows;

  function clear(r: ReplyRow) {
    const ok = confirm(
      `Clear ${r.nameEn}'s reply?\n\n${r.lines.join("\n")}\n\nThe reply and its history are deleted and they go back to waiting. Their link, QR code and short code keep working. This can't be undone.`,
    );
    if (!ok) return;
    setBusy(r.id);
    setState(null);
    startClear(async () => {
      try {
        setState(await clearHouseholdReply(slug, r.id));
      } catch {
        setState({ ok: false, message: "Couldn't clear that reply. Check your connection and try again." });
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {state && (
        <Alert tone={state.ok ? "success" : "error"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </Alert>
      )}
      {rows.length === 0 ? (
        <p className="text-ink-soft">No household has replied yet, so there is nothing to clear.</p>
      ) : (
        <>
          <label className="relative block max-w-md">
            <span className="sr-only">Search by name, place, mobile or code</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, place, mobile or code"
              className="input pl-10"
            />
          </label>
          <p className="text-[0.8125rem] text-ink-soft" aria-live="polite">
            {shown.length} of {rows.length} {rows.length === 1 ? "household" : "households"} with a reply
          </p>
          {shown.length === 0 ? (
            <p className="text-ink-soft">No replied household matches that search.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {shown.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {r.nameEn}
                      {r.nameMr && <span className="ml-2 font-normal text-ink-soft">{r.nameMr}</span>}
                    </p>
                    <p className="text-[0.8125rem] text-ink-soft">{[r.sideLabel, r.location, r.shortCode].filter(Boolean).join(" · ")}</p>
                    <ul className="mt-2 space-y-0.5 text-sm">
                      {r.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[0.8125rem] text-ink-soft">{r.last}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => clear(r)}
                    disabled={busy !== null}
                    className="btn btn-secondary btn-sm shrink-0 self-start"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {busy === r.id ? "Clearing…" : "Clear reply"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
