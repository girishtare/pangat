import { CalendarDays, Clock, MapPin, Users, Utensils } from "lucide-react";
import { forecast, type Forecast } from "@/lib/forecast";
import { formatWhen } from "@/lib/i18n";
import { factsFor, scopeLabel, scopesFor, type Scope } from "@/lib/sides";
import type { DashboardData, FunctionInfo, InviteFact, Side } from "@/lib/types";
import { Section, Stat } from "../ui/kit";

const n = (v: number) => v.toLocaleString("en-IN");
const pct = (v: number) => `${Math.round(v * 100)}%`;

function householdTotals(facts: InviteFact[]) {
  const byHousehold = new Map<string, { answered: number; invited: number }>();
  for (const f of facts) {
    const h = byHousehold.get(f.householdId) ?? { answered: 0, invited: 0 };
    h.invited++;
    if (f.status !== "pending") h.answered++;
    byHousehold.set(f.householdId, h);
  }
  const all = [...byHousehold.values()];
  return { households: all.length, replied: all.filter((h) => h.answered > 0).length };
}

/** Headcounts: totals, one card per function, and (for the owner) each side. */
export default function Dashboard({ data, hostSide }: { data: DashboardData; hostSide: Side | null }) {
  const rates = { yesShowRate: data.event.yesShowRate, pendingShowRate: data.event.pendingShowRate };
  const scopes = scopesFor(hostSide, data.facts);
  const primary: Scope = scopes[0];
  const facts = factsFor(primary, data.facts);
  const totals = householdTotals(facts);
  const pending = totals.households - totals.replied;
  const replyRate = totals.households ? totals.replied / totals.households : 0;
  const per = data.functions.map((fn) => ({ fn, f: forecast(facts.filter((x) => x.functionId === fn.id), rates) }));
  const sides = scopes.slice(1) as Side[];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={Users} value={n(totals.households)} label={primary === "both" ? "Households invited" : `Households · ${scopeLabel(primary)}`} />
        <Stat
          icon={Users}
          value={n(totals.replied)}
          label="Replied"
          sub={`${pct(replyRate)} of households`}
          tone="good"
          progress={{ value: replyRate * 100 }}
        />
        <Stat
          icon={Clock}
          value={n(pending)}
          label="Waiting for a reply"
          sub={totals.households ? `${pct(pending / totals.households)} of households` : undefined}
          tone={pending > 0 ? "warn" : "default"}
          progress={{ value: totals.households ? (pending / totals.households) * 100 : 0, tone: "warn" }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {per.map(({ fn, f }) => (
          <FunctionCard key={fn.id} fn={fn} f={f} />
        ))}
      </div>

      {sides.length > 1 && (
        <Section icon={Users} title="By side" subtitle="The same numbers for each side.">
          <SideTable functions={data.functions} facts={data.facts} sides={sides} rates={rates} />
        </Section>
      )}

      <p className="hint">
        <b>Expected</b> = confirmed people × {pct(rates.yesShowRate)} + households still to reply × average people per household × {pct(rates.pendingShowRate)}.
        The percentages are set in Event settings.
      </p>
    </div>
  );
}

function FunctionCard({ fn, f }: { fn: FunctionInfo; f: Forecast }) {
  return (
    <article className="card overflow-hidden">
      <div className="border-b border-line bg-paper-deep/70 px-4 py-3">
        <h3 className="font-display text-xl font-bold text-kumkum">
          {fn.name.en}
          {fn.name.mr && (
            <span lang="mr" className="ml-2 text-base font-semibold text-ink-soft">
              {fn.name.mr}
            </span>
          )}
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {formatWhen(fn.startsAt, "en")}
          </span>
          {fn.venue && (
            <span className="inline-flex items-start gap-1" title={fn.venue}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{fn.venue}</span>
            </span>
          )}
        </p>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between gap-3 rounded-xl bg-haldi-soft/70 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-haldi-deep">Expected</div>
            <div className="font-display text-5xl font-bold leading-none text-kumkum">{n(f.expected)}</div>
          </div>
          <div className="text-right text-sm text-ink-soft">
            {n(f.confirmedHeads)} confirmed
            <br />
            people
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Mini label="Coming" value={f.yesHouseholds} tone="text-leaf" />
          <Mini label="Not coming" value={f.noHouseholds} tone="text-ink-soft" />
          <Mini label="Pending" value={f.pendingHouseholds} tone="text-haldi-deep" />
        </dl>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>{n(f.invitedHouseholds)} households invited</span>
            <span>{pct(f.responseRate)} replied</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-deep">
            <div className="h-full rounded-full bg-leaf" style={{ width: `${f.responseRate * 100}%` }} />
          </div>
        </div>
        {fn.catered ? (
          <p className="mt-3 flex items-center gap-2 text-sm">
            <Utensils className="h-4 w-4 text-haldi-deep" aria-hidden="true" />
            <span>
              <b>{n(f.veg)}</b> veg · <b>{n(f.nonveg)}</b> non-veg confirmed
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">No food served at this function.</p>
        )}
      </div>
    </article>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-1 py-2">
      <dd className={`font-display text-2xl font-bold ${tone}`}>{n(value)}</dd>
      <dt className="text-xs text-ink-soft">{label}</dt>
    </div>
  );
}

function SideTable({
  functions,
  facts,
  sides,
  rates,
}: {
  functions: FunctionInfo[];
  facts: InviteFact[];
  sides: Side[];
  rates: { yesShowRate: number; pendingShowRate: number };
}) {
  const rows = functions.map((fn) => ({
    fn,
    bySide: sides.map((s) => ({ side: s, f: forecast(factsFor(s, facts).filter((x) => x.functionId === fn.id), rates) })),
  }));
  return (
    <>
      <div className="hidden lg:block">
        <table className="table-p">
          <thead>
            <tr>
              <th>Function</th>
              {sides.map((s) => (
                <th key={s} colSpan={3} className="text-center">
                  {scopeLabel(s)}
                </th>
              ))}
            </tr>
            <tr>
              <th />
              {sides.map((s) => [
                <th key={`${s}r`}>Replied</th>,
                <th key={`${s}c`}>Confirmed</th>,
                <th key={`${s}e`}>Expected</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ fn, bySide }) => (
              <tr key={fn.id}>
                <td className="font-semibold">{fn.name.en}</td>
                {bySide.map(({ side, f }) => [
                  <td key={`${side}r`}>{pct(f.responseRate)}</td>,
                  <td key={`${side}c`}>{n(f.confirmedHeads)}</td>,
                  <td key={`${side}e`} className="font-display text-lg font-bold text-kumkum">
                    {n(f.expected)}
                  </td>,
                ])}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 lg:hidden">
        {rows.map(({ fn, bySide }) => (
          <li key={fn.id} className="rounded-xl border border-line p-3">
            <p className="font-semibold">{fn.name.en}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {bySide.map(({ side, f }) => (
                <div key={side} className="rounded-lg bg-paper-deep/60 p-2">
                  <p className="text-xs font-semibold text-ink-soft">{scopeLabel(side)}</p>
                  <p className="font-display text-2xl font-bold text-kumkum">{n(f.expected)}</p>
                  <p className="text-xs text-ink-soft">
                    expected · {n(f.confirmedHeads)} confirmed · {pct(f.responseRate)} replied
                  </p>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
