"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ChevronLeft, ChevronRight, Printer, Search } from "lucide-react";

/*
 * Which slips to print. Every slip on screen has a tick box in its top-left
 * corner (screen only); all are ticked to start. Printing lays out only the
 * ticked slips, packed 8 to a sheet, so reprinting a few wastes no paper.
 */

interface Selection {
  ids: string[];
  ticked: Set<string>;
  toggle: (id: string) => void;
  /** Tick or untick these slips, leaving the rest as they are. */
  setMany: (ids: string[], on: boolean) => void;
}

const Ctx = createContext<Selection | null>(null);

function useSelection(): Selection {
  const s = useContext(Ctx);
  if (!s) throw new Error("SlipSelection is missing");
  return s;
}

/** Holds the ticks for the slips shown; wraps both the controls and the sheets. */
export function SlipSelection({ ids, children }: { ids: string[]; children: ReactNode }) {
  // A new set of slips (filters changed) starts all ticked again.
  return (
    <SelectionState key={ids.join(",")} ids={ids}>
      {children}
    </SelectionState>
  );
}

function SelectionState({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(ids));
  const value = useMemo<Selection>(
    () => ({
      ids,
      ticked,
      toggle: (id) =>
        setTicked((t) => {
          const n = new Set(t);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        }),
      setMany: (some, on) =>
        setTicked((t) => {
          const n = new Set(t);
          for (const id of some) {
            if (on) n.add(id);
            else n.delete(id);
          }
          return n;
        }),
    }),
    [ids, ticked],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Prints the ticked slips only. */
export function PrintButton() {
  const { ticked } = useSelection();
  const n = ticked.size;
  return (
    <button type="button" disabled={n === 0} onClick={() => window.print()} className="btn btn-primary min-h-14 w-full text-base">
      <Printer className="h-5 w-5" aria-hidden="true" />
      {n === 0 ? "Tick slips to print" : `Print ${n.toLocaleString("en-IN")} slip${n === 1 ? "" : "s"}`}
    </button>
  );
}

const chunk = <T,>(items: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
};

/**
 * The sheets. On screen: one A4 sheet at a time with Previous / Next (owner,
 * 12 Nov), of every slip or those matching the search, each with its tick box
 * (unticked ones faded). In print: only the ticked slips, whatever the search
 * or the sheet on screen, packed into as few sheets as they need.
 */
export function SlipSheets({
  items,
  perSheet,
}: {
  items: { id: string; name: string; nameMr: string | null; location?: string | null; code: string; slip: ReactNode }[];
  perSheet: number;
}) {
  const { ids, ticked, toggle, setMany } = useSelection();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  // The print copy (every ticked slip) is built only while printing, not sent and
  // drawn with every visit: the browser fires beforeprint for the Print button and
  // for Ctrl+P alike, and flushSync puts the slips on the page before it prints.
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  // On screen the sheet is laid out to fit its box (owner, 14 Nov: "landscape so it fits a horizontal screen"):
  // where there's room, its 8 slips sit 4 across and 2 down; on a narrow screen, 2 across as on paper. Either way it is
  // scaled to the box's width. Printing is unchanged: A4 portrait, 2 x 4.
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ wide: boolean; zoom: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const PX_PER_MM = 96 / 25.4;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      const wide = w >= 700;
      setFit({ wide, zoom: Math.min(1, w / ((wide ? 388 : 194) * PX_PER_MM)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const chosen = items.filter((it) => ticked.has(it.id));
  const printSheets = chunk(chosen, perSheet).length;

  // Search by English or Marathi name, place, or the slip's code.
  const q = query.trim();
  const ql = q.toLowerCase();
  const shown = q
    ? items.filter((it) => it.name.toLowerCase().includes(ql) || (it.nameMr ?? "").includes(q) || (it.location ?? "").toLowerCase().includes(ql) || it.code.toLowerCase().includes(ql))
    : items;
  const shownIds = shown.map((it) => it.id);
  const screenSheets = chunk(shown, perSheet);
  const sheetCount = screenSheets.length;
  // A search can leave fewer sheets than the one we were on: stay in range.
  const at = Math.min(page, Math.max(0, sheetCount - 1));
  const allShownTicked = shownIds.every((id) => ticked.has(id));
  const noneShownTicked = !shownIds.some((id) => ticked.has(id));

  return (
    <>
      <label className="relative mb-3 block print:hidden">
        <span className="sr-only">Search slips</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name, place or code"
          className="input pl-10"
        />
      </label>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-paper-deep px-3 py-2 print:hidden">
        <p className="font-semibold">
          {ticked.size === 0
            ? "No slips ticked"
            : `${ticked.size.toLocaleString("en-IN")} of ${ids.length.toLocaleString("en-IN")} ticked · prints on ${printSheets} sheet${printSheets === 1 ? "" : "s"}`}
        </p>
        {/* With a search, these act on the slips found only. */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setMany(shownIds, true)} disabled={allShownTicked} className="btn btn-secondary btn-sm min-h-10">
            {q ? "Tick these" : "Tick all"}
          </button>
          <button type="button" onClick={() => setMany(shownIds, false)} disabled={noneShownTicked} className="btn btn-secondary btn-sm min-h-10">
            {q ? "Untick these" : "Untick all"}
          </button>
        </div>
      </div>
      {q && (
        <p className="mb-3 text-[0.9375rem] text-ink-soft print:hidden">
          {shown.length === 0
            ? `No slip matches "${q}".`
            : `${shown.length} slip${shown.length === 1 ? "" : "s"} found. Printing still uses every ticked slip, found or not.`}
        </p>
      )}

      {/* Screen: one sheet at a time (or of the ones found), each slip with its tick box. */}
      {sheetCount > 1 && <SheetPager at={at} count={sheetCount} perSheet={perSheet} total={shown.length} onGo={setPage} />}
      <div ref={box} className="overflow-hidden print:hidden">
        {screenSheets.slice(at, at + 1).map((sheet) => (
          <div key={at} className={`sheet ${fit?.wide ? "sheet-wide" : ""}`} style={fit ? { zoom: fit.zoom } : undefined}>
            {sheet.map((it) => {
              const on = ticked.has(it.id);
              return (
                <div key={it.id} className="slip-cell slip-pick">
                  <label className="absolute left-[1.5mm] top-[1.5mm] z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white/90 shadow-sm">
                    <input type="checkbox" checked={on} onChange={() => toggle(it.id)} className="h-6 w-6 accent-kumkum" />
                    <span className="sr-only">Print the slip for {it.name}</span>
                  </label>
                  <div className={`slip-fill ${on ? "" : "opacity-35"}`}>{it.slip}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {sheetCount > 1 && <SheetPager at={at} count={sheetCount} perSheet={perSheet} total={shown.length} onGo={setPage} bottom />}

      {/* Print: only the ticked slips, 8 to a sheet. */}
      <div className="hidden print:block">
        {printing &&
          chunk(chosen, perSheet).map((page, i) => (
          <div key={i} className="sheet">
            {page.map((it) => (
              <div key={it.id} className="slip-cell">
                {it.slip}
              </div>
            ))}
          </div>
          ))}
      </div>
    </>
  );
}

/** Previous / Next between the sheets on screen, with "Sheet 2 of 9 · slips 9-16 of 72". */
function SheetPager({
  at,
  count,
  perSheet,
  total,
  onGo,
  bottom = false,
}: {
  at: number;
  count: number;
  perSheet: number;
  total: number;
  onGo: (n: number) => void;
  bottom?: boolean;
}) {
  const first = at * perSheet + 1;
  const last = Math.min(total, (at + 1) * perSheet);
  const go = (n: number) => {
    onGo(n);
    if (bottom) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <nav aria-label={bottom ? "Sheets (bottom)" : "Sheets"} className={`flex items-center justify-between gap-2 print:hidden ${bottom ? "mt-1" : "mb-3"}`}>
      <button type="button" onClick={() => go(at - 1)} disabled={at === 0} className="btn btn-secondary btn-sm min-h-10">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>
      <p className="text-center text-sm" aria-live={bottom ? undefined : "polite"}>
        <span className="font-semibold">
          Sheet {at + 1} of {count}
        </span>
        <span className="text-ink-soft max-sm:block">
          <span className="max-sm:hidden"> · </span>slips {first}–{last} of {total}
        </span>
      </p>
      <button type="button" onClick={() => go(at + 1)} disabled={at >= count - 1} className="btn btn-secondary btn-sm min-h-10">
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
