"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus } from "lucide-react";
import { cardLines, DEFAULT_LAYOUT, FAMILY_WORD, type CardLang, type NameLayout } from "@/lib/cardName";
import type { Side } from "@/lib/types";
import { makeNamedCard } from "../../../../ui/namedCard";
import { saveCardNameLayout } from "./actions";

const round = (n: number) => Math.round(n * 10_000) / 10_000;

/**
 * Where the guest's name (line 1) and place (line 2) go on one invitation card
 * (owner, 19 Nov). Shows page 1 with a real household's name written in; the
 * buttons move and size it; Save makes guests' card links show their name.
 */
export default function CardNamePlacer({
  slug,
  side,
  lang,
  type,
  sample,
  saved,
  family,
  fontClass,
  placesMr,
}: {
  slug: string;
  side: Side;
  lang: CardLang;
  type: string;
  sample: { nameEn: string; nameMr: string | null; location: string | null };
  saved: NameLayout | null;
  family: string;
  fontClass: string;
  placesMr: Record<string, string>;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<NameLayout>(saved ?? DEFAULT_LAYOUT[lang]);
  const [file, setFile] = useState<ArrayBuffer | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Whole page 1 fitted in the box, or a close-up of the lines (owner, 19 Nov: no scrolling after each nudge).
  const [view, setView] = useState<"page" | "close">("page");
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, start] = useTransition();
  const lastUrl = useRef<string | null>(null);
  const lines = cardLines(lang, sample, { family: layout.family, placesMr });
  const changed = !saved || (Object.keys(layout) as (keyof NameLayout)[]).some((k) => layout[k] !== saved[k]);

  useEffect(() => {
    fetch(`/host/e/${slug}/card?side=${side}&l=${lang}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(setFile)
      .catch(() => setProblem("The card couldn't be loaded. Reload the page to try again."));
  }, [slug, side, lang]);

  // Redraw the preview shortly after the last change.
  useEffect(() => {
    if (!file) return;
    const timer = setTimeout(async () => {
      try {
        const top = Math.max(0, layout.y1 - 0.08);
        const bottom = Math.min(1, layout.y1 + layout.gap * Math.max(1, lines.length - 1) + 0.08);
        const blob = await makeNamedCard(file, type, lines, layout, family, lang, { band: view === "close" ? [top, bottom] : undefined });
        const url = URL.createObjectURL(blob);
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = url;
        setPreview(url);
        setProblem(null);
      } catch {
        setProblem("The name couldn't be written on this card. Is it a PDF, JPG, PNG or WebP?");
      }
    }, 250);
    return () => clearTimeout(timer);
    // type/family font don't change while the page is open; lines follow the layout (family word)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, layout, view, placesMr]);
  useEffect(() => () => void (lastUrl.current && URL.revokeObjectURL(lastUrl.current)), []);

  type Num = Exclude<keyof NameLayout, "family">;
  const nudge = (k: Num, by: number) => setLayout((l) => ({ ...l, [k]: round(Math.min(1, Math.max(0, l[k] + by))) }));
  const save = (value: NameLayout | null) =>
    start(async () => {
      const r = await saveCardNameLayout(slug, side, lang, value);
      setStatus(r ? { ok: r.ok, text: r.message } : null);
      if (r?.ok && !value) setLayout(DEFAULT_LAYOUT[lang]);
      router.refresh();
    });

  // Plain buttons (not a nested component), so keyboard focus stays put while nudging.
  const btn = (onClick: () => void, label: string, children: ReactNode) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="btn btn-secondary btn-sm h-11 w-11 p-0">
      {children}
    </button>
  );
  const row = (title: string, k: Num, step: number, less: [string, ReactNode], more: [string, ReactNode]) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">{title}</span>
      <span className="flex gap-2">
        {btn(() => nudge(k, -step), less[0], less[1])}
        {btn(() => nudge(k, step), more[0], more[1])}
      </span>
    </div>
  );
  const icon = "h-4 w-4";

  return (
    <div className="rounded-[14px] border border-line bg-card p-4">
      <span aria-hidden="true" className={`${fontClass} invisible absolute`}>
        अ <i>a</i>
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">
          Name on the envelope · {lang === "en" ? "English card" : "Marathi card"}
        </p>
        <span className={`badge ${saved ? "badge-yes" : "badge-no"}`}>{saved ? "On" : "Off: plain card"}</span>
      </div>
      <p className="hint mt-1">
        Shown with {lines[0]}
        {lines[1] ? ` · ${lines[1]}` : ""}. Every guest&apos;s card link shows their own name and place here once you save.
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-2">
          {row("Up or down", "y1", 0.002, ["Move up", <ArrowUp key="u" className={icon} />], ["Move down", <ArrowDown key="d" className={icon} />])}
          {row("Left or right", "x", 0.003, ["Move left", <ArrowLeft key="l" className={icon} />], ["Move right", <ArrowRight key="r" className={icon} />])}
          {row("Letter size", "size", 0.001, ["Smaller", <Minus key="s" className={icon} />], ["Larger", <Plus key="b" className={icon} />])}
          {row("Space between lines", "gap", 0.002, ["Lines closer", <Minus key="c" className={icon} />], ["Lines further apart", <Plus key="f" className={icon} />])}
          {row("Line length", "w", 0.01, ["Shorter", <Minus key="n" className={icon} />], ["Longer", <Plus key="w" className={icon} />])}
          <p className="hint">A long name is made smaller to fit the line length.</p>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={!!layout.family}
              onChange={(e) => setLayout((l) => ({ ...l, family: e.target.checked }))}
              className="h-5 w-5 accent-kumkum"
            />
            Add &ldquo;<span lang={lang}>{FAMILY_WORD[lang]}</span>&rdquo; after the name
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" disabled={saving || !changed} onClick={() => save(layout)} className="btn btn-primary btn-sm min-h-11">
              {saving ? "Saving…" : saved ? "Save changes" : "Save and turn on"}
            </button>
            <button type="button" disabled={saving} onClick={() => setLayout(saved ?? DEFAULT_LAYOUT[lang])} className="btn btn-quiet btn-sm min-h-11">
              Undo changes
            </button>
            {saved && (
              <button
                type="button"
                disabled={saving}
                onClick={() => confirm("Turn off the name on this card? Guests will get the plain card.") && save(null)}
                className="btn btn-quiet btn-sm min-h-11"
              >
                Turn off
              </button>
            )}
          </div>
          {status && <p className={`text-sm font-semibold ${status.ok ? "text-leaf" : "text-kumkum"}`}>{status.text}</p>}
        </div>
        <div className="min-w-0">
          {type === "application/pdf" && (
            <div role="group" aria-label="Preview" className="mb-2 inline-flex gap-1 rounded-xl bg-paper-deep p-1">
              {(["page", "close"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`min-h-10 rounded-lg px-3 text-sm font-bold ${view === v ? "bg-card text-kumkum shadow-sm" : "text-ink hover:bg-card/70"}`}
                >
                  {v === "page" ? "Whole page" : "Close-up"}
                </button>
              ))}
            </div>
          )}
          {problem ? (
            <p className="text-sm font-semibold text-kumkum">{problem}</p>
          ) : !preview ? (
            <p className="text-sm text-ink-soft">Loading the card…</p>
          ) : type === "application/pdf" ? (
            <iframe
              key={preview}
              src={`${preview}#page=1&view=Fit&toolbar=0&navpanes=0`}
              title="Card with the sample name"
              className={`${view === "close" ? "h-[14rem]" : "h-[32rem]"} w-full rounded-lg border border-line bg-paper`}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Card with the sample name" className="max-h-[32rem] w-full rounded-lg border border-line object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}
