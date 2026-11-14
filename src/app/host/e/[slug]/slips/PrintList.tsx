"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Printer, X } from "lucide-react";
import type { Side } from "@/lib/types";
import { savePrintRequest } from "./actions";

export interface PrintListRow {
  id: string;
  nameEn: string;
  nameMr: string | null;
  side: Side;
  location: string | null;
  lang: "both" | "en" | "mr";
  sent: boolean;
}

const LANG: Record<PrintListRow["lang"], string> = { both: "Both", en: "English", mr: "मराठी" };

/**
 * Slips → Print list (owner, 14 Nov): the households put on it with Print /
 * Print Again on the Guest list. Print them all from here, take one off, or
 * clear the list once they're printed.
 */
export default function PrintList({ slug, rows, showSide }: { slug: string; rows: PrintListRow[]; showSide: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const shown = rows.filter((r) => !gone.has(r.id));

  const remove = (ids: string[]) => {
    if (ids.length === 0) return;
    setGone((g) => new Set([...g, ...ids]));
    start(async () => {
      const r = await savePrintRequest(slug, ids, false);
      if (!r.ok) {
        setGone((g) => new Set([...g].filter((id) => !ids.includes(id))));
        setError(r.message ?? "Couldn't save. Please try again.");
      } else setError(null);
      router.refresh();
    });
  };

  const n = shown.length;
  return (
    <div aria-busy={pending}>
      <div className="flex flex-col gap-3 rounded-xl bg-paper-deep px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">
          {n === 0 ? "Nothing on the print list" : `${n} slip${n === 1 ? "" : "s"} on the print list · ${Math.ceil(n / 8)} A4 sheet${Math.ceil(n / 8) === 1 ? "" : "s"}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {n > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => confirm(`Take all ${n} off the print list? Do this once they're printed.`) && remove(shown.map((r) => r.id))}
              className="btn btn-quiet btn-sm min-h-10"
            >
              Clear the list
            </button>
          )}
          {n > 0 ? (
            <Link href={`/host/e/${slug}/slips?tab=print&list=1`} className="btn btn-primary btn-sm min-h-10">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print these {n} slip{n === 1 ? "" : "s"}
            </Link>
          ) : null}
        </div>
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-kumkum">{error}</p>}

      {n === 0 ? (
        <p className="mt-4 text-ink-soft">
          Use <b>Print</b> or <b>Print Again</b> in the Slips column of the{" "}
          <Link href={`/host/e/${slug}/guests`} className="font-semibold text-kumkum underline">
            Guest list
          </Link>{" "}
          to add households here.
        </p>
      ) : (
        <div className="table-scroll mt-4 rounded-[1.25rem] border border-line bg-card">
          <table className="table-p max-sm:text-sm">
            <thead>
              <tr>
                <th className="text-left!">Household</th>
                <th className="max-sm:hidden">Location</th>
                {showSide && <th className="max-sm:hidden">Side</th>}
                <th>Language</th>
                <th className="max-sm:hidden">Invitation</th>
                <th>
                  <span className="sr-only">Take off</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="wrap-names text-left!">
                    <span className="block font-semibold">{r.nameEn}</span>
                    {r.nameMr && (
                      <span lang="mr" className="block text-sm text-ink-soft">
                        {r.nameMr}
                      </span>
                    )}
                    {r.location && <span className="block text-xs text-ink-soft sm:hidden">{r.location}</span>}
                  </td>
                  <td className="text-sm max-sm:hidden">{r.location ?? <span className="text-ink-soft">—</span>}</td>
                  {showSide && (
                    <td className="max-sm:hidden">
                      <span className={`badge ${r.side === "bride" ? "badge-bride" : "badge-groom"}`}>{r.side === "bride" ? "Bride's side" : "Groom's side"}</span>
                    </td>
                  )}
                  <td lang={r.lang === "mr" ? "mr" : undefined}>{LANG[r.lang]}</td>
                  <td className="text-sm max-sm:hidden">{r.sent ? "Sent" : "Not sent"}</td>
                  <td>
                    <button type="button" disabled={pending} onClick={() => remove([r.id])} className="btn btn-quiet btn-sm min-h-10" title="Take off the print list">
                      <X className="h-4 w-4" aria-hidden="true" />
                      <span className="max-sm:sr-only">Take off</span>
                      <span className="sr-only"> {r.nameEn}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
