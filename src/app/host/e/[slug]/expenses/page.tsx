import { FileSpreadsheet, Wallet } from "lucide-react";
import { daysUntil, dueOf, dueSoon, formatRupees, METHOD_LABEL, SIDE_NAME, splitLabel, summarise, type Expense, type Settlement } from "@/lib/expenses";
import { hostGate } from "@/lib/host";
import { loadExpenses } from "@/lib/store/expenses";
import { todayIst } from "@/lib/todo";
import type { Side } from "@/lib/types";
import { dayMonth, dayOfDate } from "@/lib/when";
import PopupButton from "../../../../ui/PopupButton";
import { Alert, EmptyState, PageHeader } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { Bar } from "./Bar";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseList, type Filters, type SortKey } from "./ExpenseList";
import { RemoveSettlement, SettlementForm } from "./SettleForms";

export const dynamic = "force-dynamic";

const SORTS: SortKey[] = ["due", "title", "function", "category", "amount", "split", "paid", "status", "bill"];
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default async function Expenses({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const gate = await hostGate(slug);
  if (!gate.ok) {
    if (gate.reason === "demo") {
      return (
        <main className="mx-auto max-w-lg px-4 py-16">
          <Alert tone="info">Expenses need a database, so they aren&apos;t available in demo mode.</Alert>
        </main>
      );
    }
    return <GateMessage gate={gate} title="Expenses" />;
  }
  const { host } = gate;

  if (!host.canManage) {
    return (
      <EventShell host={host} current="expenses">
        <PageHeader title="Expenses" />
        <Alert tone="info">Only the event&apos;s owner sees the expenses.</Alert>
      </EventShell>
    );
  }

  // Read as the owner: row-level security lets only the owner see these.
  const { expenses, settlements } = await loadExpenses(host.client, host.event.id);
  const functions = host.functions.map((f) => ({ id: f.id, name: f.name.en }));
  const today = todayIst();
  const s = summarise(expenses, settlements);
  const withDue = expenses.filter((e) => dueOf(e) > 0);
  const nextDue = withDue
    .map((e) => e.dueDate)
    .filter((d): d is string => !!d)
    .sort()[0];
  const fnCount = new Set(expenses.map((e) => (e.functionId && functions.some((f) => f.id === e.functionId) ? e.functionId : "general"))).size;
  const soon = dueSoon(expenses, today);

  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T | "" => (v && (allowed as readonly string[]).includes(v) ? (v as T) : "");
  const initial: Filters = {
    q: (sp.q ?? "").slice(0, 60),
    fn: sp.fn === "general" || functions.some((f) => f.id === sp.fn) ? (sp.fn as string) : "",
    cat: (sp.cat ?? "").slice(0, 20),
    split: pick(sp.split, ["bride", "groom", "shared"] as const),
    status: pick(sp.status, ["paid", "part", "unpaid"] as const),
    sort: pick(sp.sort, SORTS) || "due",
    dir: sp.dir === "desc" ? "desc" : "asc",
  };

  const addButton = (
    <PopupButton label="+ Add expense" title="Add an expense" wide>
      <ExpenseForm slug={slug} functions={functions} />
    </PopupButton>
  );

  return (
    <EventShell host={host} current="expenses">
      <PageHeader
        title="Expenses"
        subtitle="Every cost of the wedding, who pays what share, and who has paid. Only you, as the owner, see this page."
        actions={
          expenses.length > 0 ? (
            <>
              {addButton}
              <a href={`/host/e/${slug}/expenses/export`} className="btn btn-secondary" download>
                <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                Export to Excel
              </a>
            </>
          ) : undefined
        }
      />

      {expenses.length === 0 ? (
        <EmptyState icon={Wallet} title="No expenses yet">
          <p>Add the first one: catering, hall, decor…</p>
          <div className="mt-4 flex justify-center">{addButton}</div>
        </EmptyState>
      ) : (
        <>
          {/* Summary. Phones: Total and Still due side by side, then Paid and each side's share across. */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
            <div className="card order-1 p-4 sm:p-5">
              <p className="text-sm font-semibold text-ink-soft">Total</p>
              <p className="font-display text-[1.5rem] leading-tight text-kumkum sm:text-[2rem]">{formatRupees(s.total)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {s.count} expense{s.count === 1 ? "" : "s"} · {fnCount} function{fnCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="card order-2 p-4 sm:p-5 xl:order-3">
              <p className="text-sm font-semibold text-ink-soft">Still due</p>
              <p className="font-display text-[1.5rem] leading-tight text-ink sm:text-[2rem]">{formatRupees(s.due)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {withDue.length} expense{withDue.length === 1 ? "" : "s"}
                {nextDue && (
                  <>
                    {" "}
                    · next on <strong className="text-kumkum">{dayMonth(nextDue)}</strong>
                  </>
                )}
              </p>
            </div>
            <div className="card order-3 col-span-2 p-4 sm:p-5 xl:order-2 xl:col-span-1">
              <p className="text-sm font-semibold text-ink-soft">Paid</p>
              <p className="font-display text-[1.5rem] leading-tight text-ink sm:text-[2rem]">{formatRupees(s.paid)}</p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-deep" role="presentation">
                <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, (s.paid / Math.max(1, s.total)) * 100)}%` }} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{pct(s.paid, s.total)}% of the total</p>
            </div>
            <div className="card order-4 col-span-2 p-4 sm:p-5 xl:col-span-1">
              <p className="text-sm font-semibold text-ink-soft">Each side&apos;s share of the total</p>
              <Bar bridePct={(s.side.bride.shareOfTotal / Math.max(1, s.total)) * 100} className="mt-3 h-2.5" />
              <div className="mt-2 flex justify-between gap-3 text-sm">
                <p>
                  <span className="block font-bold text-kumkum">Bride&apos;s side</span>
                  <span className="font-semibold">{formatRupees(s.side.bride.shareOfTotal)}</span>
                </p>
                <p className="text-right">
                  <span className="block font-bold text-haldi-deep">Groom&apos;s side</span>
                  <span className="font-semibold">{formatRupees(s.side.groom.shareOfTotal)}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <SettleUp s={s} slug={slug} settlements={settlements} />
            <DueSoon list={soon} today={today} />
          </div>

          <ExpenseList slug={slug} expenses={expenses} functions={functions} initial={initial} today={today} />
        </>
      )}
    </EventShell>
  );
}

function SettleUp({ s, slug, settlements }: { s: ReturnType<typeof summarise>; slug: string; settlements: Settlement[] }) {
  const sides: Side[] = ["bride", "groom"];
  const diff = (b: number) =>
    b === 0 ? (
      <span className="text-ink-soft">—</span>
    ) : b > 0 ? (
      <span className="font-bold text-leaf">+{formatRupees(b)} extra</span>
    ) : (
      <span className="font-bold text-kumkum">−{formatRupees(-b)} short</span>
    );
  return (
    <section aria-labelledby="settle-title" className="rounded-[18px] bg-sand p-4 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Settle up · for what&apos;s been paid so far</p>
      <h2 id="settle-title" className="mt-1 font-display text-[1.3125rem] leading-snug text-ink sm:text-[1.5rem]">
        {s.owes ? (
          <>
            {SIDE_NAME[s.owes.from]} owes {SIDE_NAME[s.owes.to]} <span className="text-kumkum">{formatRupees(s.owes.amount)}</span>
          </>
        ) : s.paid === 0 ? (
          "All square: nothing paid yet"
        ) : (
          "All square"
        )}
      </h2>

      {/* Laptops and tablets: the four columns. */}
      <div className="mt-4 hidden overflow-x-auto rounded-[14px] bg-card sm:block">
        <table className="table-p">
          <thead>
            <tr>
              <th scope="col">Side</th>
              <th scope="col">Its share of what&apos;s paid</th>
              <th scope="col">Has paid</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {sides.map((k) => (
              <tr key={k}>
                <td>
                  <span className={`badge ${k === "bride" ? "badge-bride" : "badge-groom"}`}>{k === "bride" ? "Bride" : "Groom"}</span>
                </td>
                <td className="whitespace-nowrap">{formatRupees(s.side[k].shareOfPaid)}</td>
                <td className="whitespace-nowrap">{formatRupees(s.side[k].hasPaid)}</td>
                <td className="whitespace-nowrap">{diff(s.side[k].balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Phones: what each side has paid, of its share. */}
      <dl className="mt-4 divide-y divide-line rounded-[14px] bg-card px-4 sm:hidden">
        {sides.map((k) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-3 text-sm">
            <dt>{SIDE_NAME[k]} paid</dt>
            <dd className="text-right">
              <strong>{formatRupees(s.side[k].hasPaid)}</strong> of {formatRupees(s.side[k].shareOfPaid)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <PopupButton label="Record a settlement" title="Record a settlement" className="btn btn-secondary w-full bg-card sm:w-auto">
          <SettlementForm slug={slug} from={s.owes?.from ?? "groom"} amount={s.owes?.amount ?? null} />
        </PopupButton>
      </div>

      {settlements.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-ink">Settlements</h3>
          <ul className="mt-2 divide-y divide-line rounded-[14px] bg-card px-4">
            {settlements.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm">
                <span>
                  <strong>{formatRupees(x.amount)}</strong> from {SIDE_NAME[x.fromSide]} to {SIDE_NAME[x.toSide]}
                  <span className="block text-ink-soft">
                    {dayOfDate(x.paidOn)} · {METHOD_LABEL[x.method]}
                    {x.note ? ` · ${x.note}` : ""}
                  </span>
                </span>
                <RemoveSettlement slug={slug} id={x.id} amount={x.amount} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm text-ink">
        When everything is paid: Bride&apos;s side {formatRupees(s.side.bride.shareOfTotal)} · Groom&apos;s side {formatRupees(s.side.groom.shareOfTotal)}.
      </p>
    </section>
  );
}

function DueSoon({ list, today }: { list: Expense[]; today: string }) {
  return (
    <section aria-labelledby="due-soon-title" className="rounded-[18px] border border-haldi bg-haldi-soft p-4 sm:p-6">
      <h2 id="due-soon-title" className="font-display text-[1.3125rem] text-ink">
        Due in the next 14 days
      </h2>
      {list.length === 0 ? (
        <p className="mt-3 text-ink">Nothing is due in the next 14 days.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {list.map((e, i) => {
            const overdue = daysUntil(e.dueDate!, today) < 0;
            const strong = overdue || i === 0;
            return (
              <li key={e.id} className="flex items-start justify-between gap-3 rounded-[14px] bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="leading-snug">
                    <strong>{e.title}</strong>
                    {e.vendor && <span className="text-ink-soft"> · {e.vendor}</span>}
                  </p>
                  <p className="text-sm text-ink-soft">{splitLabel(e)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold">{formatRupees(dueOf(e))}</p>
                  <p className={`text-sm ${strong ? "font-bold text-kumkum" : "text-ink-soft"}`}>
                    {overdue ? "overdue · " : ""}
                    {dayOfDate(e.dueDate!)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
