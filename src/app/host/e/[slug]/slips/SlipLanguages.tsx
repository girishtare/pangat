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
  /** Where they stay ("Borivali, Mumbai"): helps choose the language. */
  location: string | null;
  lang: SlipLang;
}

const CHOICES: { value: SlipLang; label: string; short: string; title: string; lang?: "mr" }[] = [
  { value: "en", label: "English", short: "En", title: "English only" },
  { value: "mr", label: "मराठी", short: "म", title: "Marathi only", lang: "mr" },
  { value: "both", label: "Both", short: "Both", title: "English and Marathi" },
];

const SIDES: { value: Side; label: string }[] = [
  { value: "bride", label: "Bride's side" },
  { value: "groom", label: "Groom's side" },
];

/** Places compare without case or outer spaces ("borivali " = "Borivali"). */
const placeKey = (s: string | null) => (s ?? "").trim().toLowerCase();
const NO_PLACE = "-";

/**
 * The language each household's slip is printed in, saved on the household.
 * Search, or filter by side (owner), location and language, each a drop-down
 * with counts (owner, 12 Nov); one tap changes one
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
  // A place key, NO_PLACE for households with no location, or null for every location.
  const [place, setPlace] = useState<string | null>(null);
  const langOf = (r: SlipLangRow) => local[r.id] ?? r.lang;

  // Each drop-down counts within the filters before it: side, then location, then language.
  const sideCount = (s: Side) => rows.filter((r) => r.side === s).length;
  const bySide = side ? rows.filter((r) => r.side === side) : rows;
  const places = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const r of bySide) {
      const k = placeKey(r.location);
      if (!k) continue;
      const e = m.get(k);
      if (e) e.n += 1;
      else m.set(k, { label: r.location!.trim(), n: 1 });
    }
    return [...m.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label, "en", { sensitivity: "base" }));
  }, [bySide]);
  const noPlace = bySide.filter((r) => !placeKey(r.location)).length;
  const inPlace = (r: SlipLangRow) => !place || placeKey(r.location) === (place === NO_PLACE ? "" : place);
  const byPlace = bySide.filter(inPlace);
  const counts = useMemo(() => {
    const c: Record<SlipLang, number> = { en: 0, mr: 0, both: 0 };
    for (const r of byPlace) c[local[r.id] ?? r.lang] += 1;
    return c;
  }, [byPlace, local]);

  const q = query.trim().toLowerCase();
  const shown = byPlace.filter(
    (r) =>
      (!only || langOf(r) === only) &&
      (!q || r.nameEn.toLowerCase().includes(q) || (r.nameMr ?? "").includes(query.trim()) || (r.location ?? "").toLowerCase().includes(q)),
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

  // Location is its own column from 640 px; on phones it sits under the names.
  const cols = showSide ? 5 : 4;

  return (
    <div>
      {/* Search on the left; side, location and language as drop-downs with counts (owner, 12 Nov). */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="relative block lg:w-80">
          <span className="sr-only">Search households by name or location</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or place" className="input pl-10" />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {showSide && (
            <label className="block sm:w-44">
              <span className="label">Side</span>
              <select
                value={side ?? ""}
                onChange={(e) => {
                  setSide(e.target.value === "bride" || e.target.value === "groom" ? e.target.value : null);
                  setPlace(null);
                }}
                className="input"
              >
                <option value="">Both sides ({rows.length})</option>
                {SIDES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({sideCount(s.value)})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block sm:w-56">
            <span className="label">Location</span>
            <select value={place ?? ""} onChange={(e) => setPlace(e.target.value || null)} className="input">
              <option value="">Every location ({bySide.length})</option>
              {places.map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label} ({p.n})
                </option>
              ))}
              {noPlace > 0 && <option value={NO_PLACE}>No location given ({noPlace})</option>}
            </select>
          </label>
          <label className={`block sm:w-48 ${showSide ? "col-span-2 sm:col-span-1" : ""}`}>
            <span className="label">Language</span>
            <select value={only ?? ""} onChange={(e) => setOnly(CHOICES.find((c) => c.value === e.target.value)?.value ?? null)} className="input">
              <option value="">Every language ({byPlace.length})</option>
              {CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.title} ({counts[c.value]})
                </option>
              ))}
            </select>
          </label>
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
            <col className="max-sm:hidden" />
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
              <th className="max-sm:hidden">Location</th>
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
                      {r.location && <span className="block text-xs text-ink-soft sm:hidden">{r.location}</span>}
                    </td>
                    <td className="wrap-names text-sm max-sm:hidden">{r.location ?? <span className="text-ink-soft">—</span>}</td>
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
