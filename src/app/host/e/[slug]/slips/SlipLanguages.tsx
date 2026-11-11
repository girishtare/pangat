"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { SlipLang } from "@/lib/store/supabase";
import type { Side } from "@/lib/types";
import { saveSlipLang } from "./actions";

export interface SlipLangRow {
  id: string;
  nameEn: string;
  nameMr: string | null;
  side: Side;
  lang: SlipLang;
}

const CHOICES: { value: SlipLang; label: string; title: string; lang?: "mr" }[] = [
  { value: "en", label: "English", title: "English only" },
  { value: "mr", label: "मराठी", title: "Marathi only", lang: "mr" },
  { value: "both", label: "Both", title: "English and Marathi" },
];

const SIDES: { value: Side; label: string; short: string }[] = [
  { value: "bride", label: "Bride's side", short: "Bride" },
  { value: "groom", label: "Groom's side", short: "Groom" },
];

/**
 * The language each household's slip is printed in, saved on the household.
 * Search, or filter by language and (for the owner) side; one tap changes one
 * household; tick several (or every one shown) to change them at once.
 * Phones get smaller text and a drop-down per row instead of three buttons.
 */
export default function SlipLanguages({ slug, rows, showSide }: { slug: string; rows: SlipLangRow[]; showSide: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shown at once; the server copy follows on refresh.
  const [local, setLocal] = useState<Record<string, SlipLang>>({});
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<SlipLang | null>(null);
  const [side, setSide] = useState<Side | null>(null);
  const langOf = (r: SlipLangRow) => local[r.id] ?? r.lang;

  // Language counts follow the side filter; side counts are for every household.
  const counts = useMemo(() => {
    const c: Record<SlipLang, number> = { en: 0, mr: 0, both: 0 };
    for (const r of rows) if (!side || r.side === side) c[local[r.id] ?? r.lang] += 1;
    return c;
  }, [rows, local, side]);
  const sideCount = (s: Side) => rows.filter((r) => r.side === s).length;
  const inSide = side ? rows.filter((r) => r.side === side).length : rows.length;

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!side || r.side === side) &&
      (!only || langOf(r) === only) &&
      (!q || r.nameEn.toLowerCase().includes(q) || (r.nameMr ?? "").includes(query.trim())),
  );

  const save = (ids: string[], lang: SlipLang) => {
    if (ids.length === 0) return;
    setLocal((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, lang])) }));
    start(async () => {
      const r = await saveSlipLang(slug, ids, lang);
      setError(r.ok ? null : (r.message ?? "Couldn't save. Please try again."));
      if (r.ok) setTicked(new Set());
      router.refresh();
    });
  };

  const shownTicked = shown.filter((r) => ticked.has(r.id));
  const allShownTicked = shown.length > 0 && shownTicked.length === shown.length;
  const toggle = (id: string) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleShown = () =>
    setTicked((t) => {
      const n = new Set(t);
      for (const r of shown) {
        if (allShownTicked) n.delete(r.id);
        else n.add(r.id);
      }
      return n;
    });

  const chip = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold ${active ? "bg-kumkum text-white" : "bg-paper-deep text-ink hover:bg-sand"}`;
  const cols = showSide ? 4 : 3;

  return (
    <div>
      {/* Search and filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <label className="relative block lg:w-80">
          <span className="sr-only">Search households</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className="input pl-10" />
        </label>
        <div className="space-y-2 lg:text-right">
          {showSide && (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end" role="group" aria-label="Side">
              <span className="w-[4.5rem] text-sm font-semibold text-ink-soft lg:w-auto">Side</span>
              <button type="button" onClick={() => setSide(null)} aria-pressed={side === null} className={chip(side === null)}>
                Both {rows.length}
              </button>
              {SIDES.map((s) => (
                <button key={s.value} type="button" onClick={() => setSide(s.value)} aria-pressed={side === s.value} className={chip(side === s.value)}>
                  {s.short} {sideCount(s.value)}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end" role="group" aria-label="Language">
            <span className="w-[4.5rem] text-sm font-semibold text-ink-soft lg:w-auto">Language</span>
            <button type="button" onClick={() => setOnly(null)} aria-pressed={only === null} className={chip(only === null)}>
              All {inSide}
            </button>
            {CHOICES.map((c) => (
              <button key={c.value} type="button" onClick={() => setOnly(c.value)} aria-pressed={only === c.value} className={chip(only === c.value)}>
                <span lang={c.lang}>{c.label}</span> {counts[c.value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Change many at once */}
      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-paper-deep px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-semibold">
          {ticked.size ? `${ticked.size} ticked: set them to` : "Tick households to change several at once"}
        </span>
        <div className="grid grid-cols-3 gap-1.5 sm:flex">
          {CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={pending || ticked.size === 0}
              onClick={() => save([...ticked], c.value)}
              aria-label={`Set ticked households to ${c.title}`}
              className="btn btn-secondary btn-sm min-h-10 px-3 text-sm"
            >
              <span lang={c.lang}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-kumkum">{error}</p>}

      {/* The list: scrolls inside its box, header row pinned. Columns after the tick-box share the width evenly.
          The box is a size container: the three language buttons show only when the table is wide enough for
          them (56rem); narrower (phone, tablet, a narrow window) each row gets a drop-down, so it never scrolls sideways. */}
      <div className="table-scroll @container mt-4 rounded-[1.25rem] border border-line bg-card" aria-busy={pending}>
        <table className="table-p table-fixed max-sm:text-sm">
          <colgroup>
            <col className="w-11 sm:w-14" />
            <col />
            {showSide && <col className="max-sm:w-[4.75rem]" />}
            <col className="max-sm:w-[6.5rem]" />
          </colgroup>
          <thead>
            <tr>
              <th className="max-sm:pl-3!">
                <input
                  type="checkbox"
                  checked={allShownTicked}
                  onChange={toggleShown}
                  disabled={shown.length === 0}
                  aria-label={allShownTicked ? "Untick every household shown" : "Tick every household shown"}
                  className="h-5 w-5 align-middle accent-kumkum"
                />
              </th>
              <th className="text-left! max-sm:px-1.5!">Household</th>
              {showSide && <th className="max-sm:px-1!">Side</th>}
              <th className="max-sm:px-1.5!">
                <span className="sm:hidden">Language</span>
                <span className="hidden sm:inline">Slip language</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={cols} className="py-6 text-center! text-ink-soft">
                  No households match.
                </td>
              </tr>
            ) : (
              shown.map((r) => {
                const now = langOf(r);
                const sideInfo = SIDES.find((s) => s.value === r.side)!;
                return (
                  <tr key={r.id}>
                    <td className="max-sm:pl-3!">
                      <input
                        type="checkbox"
                        checked={ticked.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Tick ${r.nameEn}`}
                        className="h-5 w-5 align-middle accent-kumkum"
                      />
                    </td>
                    <td className="wrap-names text-left! max-sm:px-1.5!">
                      <span className="block font-semibold">{r.nameEn}</span>
                      {r.nameMr && (
                        <span lang="mr" className="block text-sm text-ink-soft max-sm:text-xs">
                          {r.nameMr}
                        </span>
                      )}
                    </td>
                    {showSide && (
                      <td className="max-sm:px-1!">
                        <span className={`badge ${r.side === "bride" ? "badge-bride" : "badge-groom"} max-sm:px-2 max-sm:text-xs`}>
                          <span className="sm:hidden">{sideInfo.short}</span>
                          <span className="hidden sm:inline">{sideInfo.label}</span>
                        </span>
                      </td>
                    )}
                    <td className="max-sm:px-1.5!">
                      {/* Narrow table: a drop-down, so the row keeps room for the name. */}
                      <select
                        value={now}
                        disabled={pending}
                        onChange={(e) => save([r.id], e.target.value as SlipLang)}
                        aria-label={`Slip language for ${r.nameEn}`}
                        className="min-h-10 w-full max-w-40 rounded-lg border-2 border-line bg-white px-1.5 text-sm font-semibold text-ink @4xl:hidden"
                      >
                        {CHOICES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      {/* Wide table: three buttons, one tap. */}
                      <span
                        role="group"
                        aria-label={`Slip language for ${r.nameEn}`}
                        className="hidden gap-0.5 rounded-lg bg-paper-deep p-0.5 @4xl:inline-flex"
                      >
                        {CHOICES.map((c) => {
                          const on = now === c.value;
                          return (
                            <button
                              key={c.value}
                              type="button"
                              aria-pressed={on}
                              disabled={pending && !on}
                              onClick={() => !on && save([r.id], c.value)}
                              title={c.title}
                              className={`min-h-10 rounded-md px-3.5 text-sm font-bold ${on ? "bg-kumkum text-white" : "text-ink hover:bg-card/70"}`}
                            >
                              <span lang={c.lang}>{c.label}</span>
                            </button>
                          );
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {shown.length === rows.length ? `${rows.length} households` : `${shown.length} of ${rows.length} households shown`}
      </p>
    </div>
  );
}
