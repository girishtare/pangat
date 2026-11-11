"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { SlipLang } from "@/lib/store/supabase";
import { saveSlipLang } from "./actions";

export interface SlipLangRow {
  id: string;
  nameEn: string;
  nameMr: string | null;
  sideLabel: string | null; // shown when both sides are listed
  lang: SlipLang;
}

const CHOICES: { value: SlipLang; label: string; lang?: "mr" }[] = [
  { value: "en", label: "English" },
  { value: "mr", label: "मराठी", lang: "mr" },
  { value: "both", label: "Both" },
];

/**
 * The language each household's slip is printed in, saved on the household.
 * One tap changes one household; tick several (or all) to change them at once.
 */
export default function SlipLanguages({ slug, rows }: { slug: string; rows: SlipLangRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shown at once; the server copy follows on refresh.
  const [local, setLocal] = useState<Record<string, SlipLang>>({});
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const langOf = (r: SlipLangRow) => local[r.id] ?? r.lang;

  const counts = useMemo(() => {
    const c: Record<SlipLang, number> = { en: 0, mr: 0, both: 0 };
    for (const r of rows) c[local[r.id] ?? r.lang] += 1;
    return c;
  }, [rows, local]);

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

  const allTicked = rows.length > 0 && ticked.size === rows.length;
  const toggle = (id: string) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <p className="text-[0.9375rem] text-ink-soft">
        English <b className="text-ink">{counts.en}</b> · <span lang="mr">मराठी</span> <b className="text-ink">{counts.mr}</b> · Both{" "}
        <b className="text-ink">{counts.both}</b>
      </p>

      {/* Change many at once */}
      <div className="mt-3 rounded-xl bg-paper-deep p-2.5">
        <label className="flex min-h-10 items-center gap-2.5 px-1 font-semibold">
          <input
            type="checkbox"
            checked={allTicked}
            onChange={() => setTicked(allTicked ? new Set() : new Set(rows.map((r) => r.id)))}
            className="h-5 w-5 accent-kumkum"
          />
          {ticked.size ? `${ticked.size} ticked` : "Tick all"}
        </label>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={pending || ticked.size === 0}
              onClick={() => save([...ticked], c.value)}
              className="btn btn-secondary btn-sm min-h-10 px-1.5 text-sm"
            >
              <span lang={c.lang}>{c.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 px-1 text-xs text-ink-soft">Tick households, then choose a language for all of them.</p>
      </div>

      {error && <p className="mt-2 text-sm font-semibold text-kumkum">{error}</p>}

      <ul className="mt-3 max-h-[26rem] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-card" aria-busy={pending}>
        {rows.map((r) => {
          const now = langOf(r);
          return (
            <li key={r.id} className="flex items-center gap-2 px-2.5 py-2">
              <input
                type="checkbox"
                checked={ticked.has(r.id)}
                onChange={() => toggle(r.id)}
                aria-label={`Tick ${r.nameEn}`}
                className="h-5 w-5 shrink-0 accent-kumkum"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold" title={r.nameEn}>
                  {r.nameEn}
                </span>
                {(r.nameMr || r.sideLabel) && (
                  <span className="block truncate text-xs text-ink-soft">
                    {r.nameMr && <span lang="mr">{r.nameMr}</span>}
                    {r.nameMr && r.sideLabel ? " · " : ""}
                    {r.sideLabel}
                  </span>
                )}
              </span>
              <span role="group" aria-label={`Slip language for ${r.nameEn}`} className="inline-flex shrink-0 gap-0.5 rounded-lg bg-paper-deep p-0.5">
                {CHOICES.map((c) => {
                  const on = now === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={on}
                      disabled={pending && !on}
                      onClick={() => !on && save([r.id], c.value)}
                      title={c.value === "en" ? "English only" : c.value === "mr" ? "Marathi only" : "English and Marathi"}
                      className={`min-h-9 rounded-md px-2 text-xs font-bold ${on ? "bg-kumkum text-white" : "text-ink hover:bg-card/70"}`}
                    >
                      <span lang={c.lang}>{c.value === "en" ? "En" : c.value === "mr" ? "म" : "Both"}</span>
                    </button>
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
