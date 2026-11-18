"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Paperclip, Search, SlidersHorizontal, X } from "lucide-react";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  daysUntil,
  dueOf,
  formatRupees,
  paidBy,
  paidOf,
  SIDE_NAME,
  splitLabel,
  STATUS_LABEL,
  statusOf,
  type Category,
  type Expense,
  type Status,
} from "@/lib/expenses";
import { displayPhone } from "@/lib/outreach";
import { dayMonth } from "@/lib/when";
import { Bar } from "./Bar";
import { ExpenseForm, type FunctionChoice } from "./ExpenseForm";

export type SortKey = "due" | "title" | "function" | "category" | "amount" | "split" | "paid" | "status" | "bill";
export interface Filters {
  q: string;
  fn: string; // "" = all, "general", or a function id
  cat: string; // "" or a category
  split: string; // "" | bride | groom | shared
  status: string; // "" | paid | part | unpaid
  sort: SortKey;
  dir: "asc" | "desc";
}

const SORT_LABEL: Record<SortKey, string> = {
  due: "Due date",
  title: "Expense",
  function: "Function",
  category: "Category",
  amount: "Amount",
  split: "Who pays",
  paid: "Paid",
  status: "Status",
  bill: "Bill",
};
const STATUS_ORDER: Record<Status, number> = { unpaid: 0, part: 1, paid: 2 };
const BADGE: Record<Status, string> = { paid: "badge-yes", part: "badge-partly", unpaid: "badge-no" };

const phoneText = (p: string | null) => (p ? (p.startsWith("+91") ? `+91 ${displayPhone(p)}` : p) : null);
const paidByText = (e: Expense) => {
  const by = paidBy(e);
  return by === null ? null : by === "both" ? "both sides" : `by ${SIDE_NAME[by]}`;
};

export function ExpenseList({ slug, expenses, functions, initial, today }: { slug: string; expenses: Expense[]; functions: FunctionChoice[]; initial: Filters; today: string }) {
  const [f, setF] = useState<Filters>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filterDialog = useRef<HTMLDialogElement>(null);
  const fnName = useMemo(() => new Map(functions.map((x) => [x.id, x.name])), [functions]);
  const nameOf = (e: Expense) => (e.functionId ? (fnName.get(e.functionId) ?? "General") : "General");

  // Filters live in the address, so they survive a reload.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const set = (k: string, v: string, dflt = "") => (v && v !== dflt ? p.set(k, v) : p.delete(k));
    set("q", f.q.trim());
    set("fn", f.fn);
    set("cat", f.cat);
    set("split", f.split);
    set("status", f.status);
    set("sort", f.sort, "due");
    set("dir", f.dir, "asc");
    const qs = p.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [f]);

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const list = expenses.filter(
      (e) =>
        (!q || e.title.toLowerCase().includes(q) || (e.vendor ?? "").toLowerCase().includes(q)) &&
        (!f.fn || (f.fn === "general" ? !e.functionId || !fnName.has(e.functionId) : e.functionId === f.fn)) &&
        (!f.cat || e.category === f.cat) &&
        (!f.split || (f.split === "shared" ? e.split === "shared_pct" || e.split === "shared_amount" : e.split === f.split)) &&
        (!f.status || statusOf(e) === f.status),
    );
    const byTitle = (a: Expense, b: Expense) => a.title.localeCompare(b.title);
    // Paid-up expenses have nothing due, so they go after those with a date.
    const dueKey = (e: Expense) => (dueOf(e) > 0 && e.dueDate ? e.dueDate : null);
    const cmp = (a: Expense, b: Expense): number => {
      switch (f.sort) {
        case "due":
          return (dueKey(a) ?? "").localeCompare(dueKey(b) ?? "");
        case "title":
          return byTitle(a, b);
        case "function":
          return nameOf(a).localeCompare(nameOf(b));
        case "category":
          return CATEGORY_LABEL[a.category].localeCompare(CATEGORY_LABEL[b.category]);
        case "amount":
          return a.amount - b.amount;
        case "split":
          return a.brideShare / a.amount - b.brideShare / b.amount;
        case "paid":
          return paidOf(a) - paidOf(b);
        case "status":
          return STATUS_ORDER[statusOf(a)] - STATUS_ORDER[statusOf(b)];
        case "bill":
          return Number(!!b.billPath) - Number(!!a.billPath);
      }
    };
    return [...list].sort((a, b) => {
      if (f.sort === "due") {
        // Nothing due (or no date): last, whichever way round.
        const x = dueKey(a);
        const y = dueKey(b);
        if (x === null && y !== null) return 1;
        if (y === null && x !== null) return -1;
      }
      const c = cmp(a, b);
      return (f.dir === "desc" ? -c : c) || byTitle(a, b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, f, fnName]);

  const filtered = !!(f.q.trim() || f.fn || f.cat || f.split || f.status);
  const totals = shown.reduce(
    (t, e) => ({ amount: t.amount + e.amount, bride: t.bride + e.brideShare, groom: t.groom + e.groomShare, paid: t.paid + paidOf(e), due: t.due + dueOf(e) }),
    { amount: 0, bride: 0, groom: 0, paid: 0, due: 0 },
  );

  const open = (id: string) => {
    setEditing(id);
    dialog.current?.showModal();
  };
  const current = expenses.find((e) => e.id === editing);
  useEffect(() => {
    // Deleted while open: close the pop-up.
    if (editing && !current && dialog.current?.open) dialog.current.close();
  }, [editing, current]);

  const sortBy = (k: SortKey) => setF((s) => ({ ...s, sort: k, dir: s.sort === k && s.dir === "asc" ? "desc" : "asc" }));
  const th = (k: SortKey, children: ReactNode, className = "") => {
    const on = f.sort === k;
    const Icon = !on ? ArrowUpDown : f.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th key={k} scope="col" className={className} aria-sort={on ? (f.dir === "asc" ? "ascending" : "descending") : undefined}>
        <button type="button" onClick={() => sortBy(k)} className="inline-flex min-h-10 items-center gap-1 font-semibold hover:text-kumkum">
          {children}
          <Icon className={`h-3.5 w-3.5 ${on ? "text-kumkum" : "text-ink-soft"}`} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const dueSoonish = (e: Expense) => !!e.dueDate && dueOf(e) > 0 && daysUntil(e.dueDate, today) <= 14;
  const dueLine = (e: Expense) => {
    if (dueOf(e) === 0 || !e.dueDate) return null;
    const overdue = daysUntil(e.dueDate, today) < 0;
    return { text: `${overdue ? "overdue · " : "by "}${dayMonth(e.dueDate)}`, strong: dueSoonish(e) };
  };

  const selects = (
    <>
      <label className="block">
        <span className="sr-only">Function</span>
        <select value={f.fn} onChange={(e) => setF((s) => ({ ...s, fn: e.target.value }))} className="input">
          <option value="">All functions</option>
          <option value="general">General</option>
          {functions.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Category</span>
        <select value={f.cat} onChange={(e) => setF((s) => ({ ...s, cat: e.target.value }))} className="input">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c as Category]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Who pays</span>
        <select value={f.split} onChange={(e) => setF((s) => ({ ...s, split: e.target.value }))} className="input">
          <option value="">Any split</option>
          <option value="bride">Bride&apos;s side only</option>
          <option value="groom">Groom&apos;s side only</option>
          <option value="shared">Shared</option>
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Status</span>
        <select value={f.status} onChange={(e) => setF((s) => ({ ...s, status: e.target.value }))} className="input">
          <option value="">Any status</option>
          <option value="unpaid">Not paid</option>
          <option value="part">Part paid</option>
          <option value="paid">Paid</option>
        </select>
      </label>
    </>
  );

  const search = (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">Search by item or vendor</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
      <input type="search" value={f.q} onChange={(e) => setF((s) => ({ ...s, q: e.target.value }))} placeholder="Search item or vendor" className="input pl-10" />
    </label>
  );

  return (
    <section className="mt-8" aria-labelledby="all-expenses">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="all-expenses" className="font-display text-[1.3125rem] text-kumkum">
          All expenses
        </h2>
        <button type="button" onClick={() => filterDialog.current?.showModal()} className="btn btn-secondary btn-sm min-h-11 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filter · Sort{filtered ? " (on)" : ""}
        </button>
        {/* Laptops: search and the four drop-downs in one row. */}
        <div className="hidden w-full gap-3 lg:ml-auto lg:flex lg:w-auto lg:flex-1 lg:justify-end">
          <div className="flex w-[18rem] xl:w-[22rem]">{search}</div>
          <div className="grid grid-cols-4 gap-3">{selects}</div>
        </div>
      </div>
      <div className="mt-3 lg:hidden">{search}</div>

      {filtered && (
        <p className="mt-3 text-sm">
          {shown.length} of {expenses.length} expense{expenses.length === 1 ? "" : "s"} shown.{" "}
          <button type="button" onClick={() => setF((s) => ({ ...s, q: "", fn: "", cat: "", split: "", status: "" }))} className="inline-flex min-h-11 items-center font-semibold text-kumkum underline">
            Clear filters
          </button>
        </p>
      )}

      {/* Laptops and tablets: the table. */}
      <div className="table-scroll card mt-4 hidden p-0 md:block">
        <table className="table-p">
          <thead>
            <tr>
              {th("title", "Expense")}
              {th("function", "Function", "text-left!")}
              {th("category", "Category")}
              {th("amount", "Amount")}
              {th("split", "Who pays")}
              {th("paid", "Paid")}
              {th("due", "Due")}
              {th("status", "Status")}
              {th("bill", "Bill")}
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => {
              const st = statusOf(e);
              const d = dueLine(e);
              const by = paidByText(e);
              return (
                <tr key={e.id}>
                  <td className="min-w-[12rem]">
                    <button type="button" onClick={() => open(e.id)} className="text-left font-semibold text-kumkum underline decoration-1 underline-offset-2 hover:decoration-2">
                      {e.title}
                    </button>
                    {(e.vendor || e.vendorPhone) && <div className="text-[0.8125rem] text-ink-soft">{[e.vendor, phoneText(e.vendorPhone)].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td className="text-left!">{nameOf(e)}</td>
                  <td>{CATEGORY_LABEL[e.category]}</td>
                  <td className="whitespace-nowrap font-semibold">{formatRupees(e.amount)}</td>
                  <td className="min-w-[10rem]">
                    <Bar bridePct={(e.brideShare / e.amount) * 100} className="mx-auto h-2 w-36 max-w-full" />
                    <div className="mt-1 whitespace-nowrap text-[0.8125rem]">{splitLabel(e)}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    {paidOf(e) > 0 ? formatRupees(paidOf(e)) : "—"}
                    {by && <div className="text-[0.8125rem] text-ink-soft">{by}</div>}
                  </td>
                  <td className="whitespace-nowrap">
                    {dueOf(e) > 0 ? formatRupees(dueOf(e)) : "—"}
                    {d && <div className={`text-[0.8125rem] ${d.strong ? "font-bold text-kumkum" : "text-ink-soft"}`}>{d.text}</div>}
                  </td>
                  <td>
                    <span className={`badge ${BADGE[st]}`}>{STATUS_LABEL[st]}</span>
                  </td>
                  <td>
                    {e.billPath ? (
                      <a
                        href={`/host/e/${slug}/expenses/bill?id=${e.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-kumkum hover:bg-kumkum-soft"
                        aria-label={`Open the bill for ${e.title} (new tab)`}
                        title="Open the bill"
                      >
                        <Paperclip className="h-5 w-5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span aria-label="No bill">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center! text-ink-soft">
                  No expenses match. Clear the filters to see them all.
                </td>
              </tr>
            )}
          </tbody>
          {shown.length > 0 && (
            <tfoot>
              <tr className="bg-paper-deep font-bold">
                <td className="border-t-2 border-line px-4 py-3">{filtered ? `Total of ${shown.length} shown` : "Total"}</td>
                <td className="border-t-2 border-line" />
                <td className="border-t-2 border-line" />
                <td className="whitespace-nowrap border-t-2 border-line text-center">{formatRupees(totals.amount)}</td>
                <td className="border-t-2 border-line px-3 text-center text-[0.8125rem]">
                  <span className="block whitespace-nowrap">Bride {formatRupees(totals.bride)}</span>
                  <span className="block whitespace-nowrap">Groom {formatRupees(totals.groom)}</span>
                </td>
                <td className="whitespace-nowrap border-t-2 border-line text-center">{formatRupees(totals.paid)}</td>
                <td className="whitespace-nowrap border-t-2 border-line text-center">{formatRupees(totals.due)}</td>
                <td className="border-t-2 border-line" />
                <td className="border-t-2 border-line" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 hidden text-sm text-ink-soft md:block">
        Bar: <span className="font-bold text-kumkum">■ Bride&apos;s side</span> · <span className="font-bold text-haldi-deep">■ Groom&apos;s side</span>. Each name opens the
        expense to edit it, add a payment or attach the bill.
      </p>

      {/* Phones: one card per expense. */}
      <ul className="mt-4 space-y-3 md:hidden">
        {shown.map((e) => {
          const st = statusOf(e);
          const d = dueLine(e);
          return (
            <li key={e.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <button type="button" onClick={() => open(e.id)} className="min-h-11 text-left font-display text-[1.0625rem] leading-snug text-kumkum underline decoration-1 underline-offset-2">
                  {e.title}
                </button>
                <span className="shrink-0 pt-2 font-bold">{formatRupees(e.amount)}</span>
              </div>
              <p className="text-sm text-ink-soft">
                {[e.vendor, nameOf(e), CATEGORY_LABEL[e.category]].filter(Boolean).join(" · ")}
                {e.billPath && (
                  <>
                    {" · "}
                    <a href={`/host/e/${slug}/expenses/bill?id=${e.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-kumkum underline">
                      <Paperclip className="h-4 w-4" aria-hidden="true" /> Bill
                    </a>
                  </>
                )}
              </p>
              <Bar bridePct={(e.brideShare / e.amount) * 100} className="mt-3 h-2" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {splitLabel(e)}
                  {paidOf(e) > 0 && st !== "paid" ? ` · paid ${formatRupees(paidOf(e))}` : ""}
                </span>
                {st === "paid" ? (
                  <span className={`badge ${BADGE[st]}`}>{STATUS_LABEL[st]}</span>
                ) : (
                  <span className={`badge ${d?.strong ? "badge-bride" : "badge-groom"}`}>
                    {formatRupees(dueOf(e))} due{d ? ` ${d.text.replace(/^by /, "")}` : ""}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-6 text-center text-ink-soft">No expenses match. Clear the filters to see them all.</li>}
        {shown.length > 0 && (
          <li className="pt-1 text-center text-sm text-ink-soft">
            {shown.length} expense{shown.length === 1 ? "" : "s"} · total {formatRupees(totals.amount)}
          </li>
        )}
      </ul>

      {/* Phones: Filter · Sort pop-up. */}
      <dialog
        ref={filterDialog}
        aria-labelledby="expense-filter-title"
        className="card m-auto w-[calc(100%-2rem)] max-w-md p-0 text-ink"
        onClick={(e) => e.target === filterDialog.current && filterDialog.current?.close()}
      >
        <div className="flex items-center justify-between border-b border-line bg-paper-deep px-5 py-4">
          <h2 id="expense-filter-title" className="font-display text-[1.125rem] text-kumkum">
            Filter · Sort
          </h2>
          <button type="button" onClick={() => filterDialog.current?.close()} className="btn btn-quiet btn-sm" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          {selects}
          <label className="block">
            <span className="label">Sort by</span>
            <select value={`${f.sort}:${f.dir}`} onChange={(e) => setF((s) => ({ ...s, sort: e.target.value.split(":")[0] as SortKey, dir: e.target.value.split(":")[1] as "asc" | "desc" }))} className="input">
              {(Object.keys(SORT_LABEL) as SortKey[]).flatMap((k) =>
                (["asc", "desc"] as const).map((d) => (
                  <option key={`${k}:${d}`} value={`${k}:${d}`}>
                    {SORT_LABEL[k]} {k === "due" ? (d === "asc" ? "(soonest first)" : "(latest first)") : k === "title" || k === "function" || k === "category" ? (d === "asc" ? "(A to Z)" : "(Z to A)") : d === "asc" ? "(low to high)" : "(high to low)"}
                  </option>
                )),
              )}
            </select>
          </label>
          <button type="button" onClick={() => filterDialog.current?.close()} className="btn btn-primary w-full">
            Show {shown.length} expense{shown.length === 1 ? "" : "s"}
          </button>
        </div>
      </dialog>

      {/* Edit pop-up: one for the page, filled with the expense whose name was tapped. */}
      <dialog
        ref={dialog}
        aria-labelledby="edit-expense-title"
        className="card m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto p-0 text-left text-[0.9375rem] text-ink"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        onClose={() => setEditing(null)}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-paper-deep px-5 py-4">
          <h2 id="edit-expense-title" className="font-display text-[1.125rem] leading-tight text-kumkum">
            Edit expense
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-quiet btn-sm" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pb-5 pt-1">{current && <ExpenseForm key={current.id} slug={slug} functions={functions} expense={current} />}</div>
      </dialog>
    </section>
  );
}
