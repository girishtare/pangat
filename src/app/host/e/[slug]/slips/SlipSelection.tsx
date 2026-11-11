"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Printer } from "lucide-react";

/*
 * Which slips to print. Every slip on screen has a tick box in its top-left
 * corner (screen only); all are ticked to start. Printing lays out only the
 * ticked slips, packed 8 to a sheet, so reprinting a few wastes no paper.
 */

interface Selection {
  ids: string[];
  ticked: Set<string>;
  toggle: (id: string) => void;
  setAll: (on: boolean) => void;
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
      setAll: (on) => setTicked(on ? new Set(ids) : new Set()),
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
    <button type="button" disabled={n === 0} onClick={() => window.print()} className="btn btn-primary min-h-14 w-full text-lg">
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
 * The sheets. On screen: every slip, with its tick box (unticked ones faded).
 * In print: only the ticked slips, packed into as few sheets as they need.
 */
export function SlipSheets({ items, perSheet }: { items: { id: string; name: string; slip: ReactNode }[]; perSheet: number }) {
  const { ids, ticked, toggle, setAll } = useSelection();
  const chosen = items.filter((it) => ticked.has(it.id));
  const printSheets = chunk(chosen, perSheet).length;
  const all = ticked.size === ids.length;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-paper-deep px-3 py-2 print:hidden">
        <p className="font-semibold">
          {ticked.size === 0
            ? "No slips ticked"
            : `${ticked.size.toLocaleString("en-IN")} of ${ids.length.toLocaleString("en-IN")} ticked · prints on ${printSheets} sheet${printSheets === 1 ? "" : "s"}`}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setAll(true)} disabled={all} className="btn btn-secondary btn-sm min-h-10">
            Tick all
          </button>
          <button type="button" onClick={() => setAll(false)} disabled={ticked.size === 0} className="btn btn-secondary btn-sm min-h-10">
            Untick all
          </button>
        </div>
      </div>

      {/* Screen: every slip with its tick box. */}
      <div className="overflow-hidden print:hidden">
        {chunk(items, perSheet).map((page, i) => (
          <div key={i} className="sheet">
            {page.map((it) => {
              const on = ticked.has(it.id);
              return (
                <div key={it.id} className="slip-cell">
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

      {/* Print: only the ticked slips, 8 to a sheet. */}
      <div className="hidden print:block">
        {chunk(chosen, perSheet).map((page, i) => (
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
