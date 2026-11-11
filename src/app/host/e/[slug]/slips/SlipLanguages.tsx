"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { SlipLang } from "@/lib/store/supabase";
import { saveSlipLang } from "./actions";

export interface SlipLangRow {
  id: string;
  nameEn: string;
  nameMr: string | null;
  sideLabel: string | null; // shown when both sides are listed
  lang: SlipLang;
}

const CHOICES: { value: SlipLang; label: string; short: string; title: string; lang?: "mr" }[] = [
  { value: "en", label: "English", short: "En", title: "English only" },
  { value: "mr", label: "मराठी", short: "म", title: "Marathi only", lang: "mr" },
  { value: "both", label: "Both", short: "Both", title: "English and Marathi" },
];

/**
 * The language each household's slip is printed in, saved on the household.
 * Search or filter the list; one tap changes one household; tick several (or
 * every one shown) to change them at once.
 */
export default function SlipLanguages({ slug, rows }: { slug: string; rows: SlipLangRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shown at once; the server copy follows on refresh.
  const [local, setLocal] = useState<Record<string, SlipLang>>({});
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<SlipLang | null>(null);
  const langOf = (r: SlipLangRow) => local[r.id] ?? r.lang;

  const counts = useMemo(() => {
    const c: Record<SlipLang, number> = { en: 0, mr: 0, both: 0 };
    for (const r of rows) c[local[r.id] ?? r.lang] += 1;
    return c;
  }, [rows, local]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) => (!only || langOf(r) === only) && (!q || r.nameEn.toLowerCase().includes(q) || (r.nameMr ?? "").includes(query.trim())),
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

  return (
    <div>
      {/* Search and filter */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-80">
          <span className="sr-only">Search households</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className="input pl-10" />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          <button type="button" onClick={() => setOnly(null)} aria-pressed={only === null} className={chip(only === null)}>
            All {rows.length}
          </button>
          {CHOICES.map((c) => (
            <button key={c.value} type="button" onClick={() => setOnly(c.value)} aria-pressed={only === c.value} className={chip(only === c.value)}>
              <span lang={c.lang}>{c.label}</span> {counts[c.value]}
            </button>
          ))}
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

      {/* The list: scrolls inside its box, header row pinned */}
      <div className="table-scroll mt-4 rounded-[1.25rem] border border-line bg-card" aria-busy={pending}>
        <table className="table-p">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  type="checkbox"
                  checked={allShownTicked}
                  onChange={toggleShown}
                  disabled={shown.length === 0}
                  aria-label={allShownTicked ? "Untick every household shown" : "Tick every household shown"}
                  className="h-5 w-5 align-middle accent-kumkum"
                />
              </th>
              <th className="text-left!">Household</th>
              <th>Slip language</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center! text-ink-soft">
                  No households match.
                </td>
              </tr>
            ) : (
              shown.map((r) => {
                const now = langOf(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={ticked.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Tick ${r.nameEn}`}
                        className="h-5 w-5 align-middle accent-kumkum"
                      />
                    </td>
                    <td className="text-left!">
                      <span className="block font-semibold">{r.nameEn}</span>
                      {(r.nameMr || r.sideLabel) && (
                        <span className="block text-sm text-ink-soft">
                          {r.nameMr && <span lang="mr">{r.nameMr}</span>}
                          {r.nameMr && r.sideLabel ? " · " : ""}
                          {r.sideLabel}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap max-sm:px-1.5!">
                      <span role="group" aria-label={`Slip language for ${r.nameEn}`} className="inline-flex gap-0.5 rounded-lg bg-paper-deep p-0.5">
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
                              className={`min-h-10 min-w-9 rounded-md px-2 text-sm font-bold sm:px-3.5 ${on ? "bg-kumkum text-white" : "text-ink hover:bg-card/70"}`}
                            >
                              {/* Phones: En / म / Both, so the row fits without scrolling sideways. */}
                              <span lang={c.lang} className="sm:hidden">
                                {c.short}
                              </span>
                              <span lang={c.lang} className="hidden sm:inline">
                                {c.label}
                              </span>
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
