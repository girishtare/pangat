import Link from "next/link";
import { forecast, type Forecast } from "@/lib/forecast";
import { factsFor, type Scope } from "@/lib/sides";
import type { DashboardData, FunctionInfo } from "@/lib/types";
import { shortWhen } from "@/lib/when";

const n = (v: number) => v.toLocaleString("en-IN");
const pct = (v: number) => `${Math.round(v * 100)}%`;
const oneDecimal = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 1 });

/**
 * Headcounts for one scope (both sides, or one side): a card per function,
 * how Expected is worked out, and (on laptops) every number in one table.
 * The scope has already been checked against what this host may see.
 */
export default function Dashboard({
  data,
  scope,
  settingsHref,
}: {
  data: DashboardData;
  scope: Scope;
  /** Event settings, for the owner; null for co-owners (they can't open it). */
  settingsHref: string | null;
}) {
  const rates = { yesShowRate: data.event.yesShowRate, pendingShowRate: data.event.pendingShowRate };
  const facts = factsFor(scope, data.facts);
  const per = data.functions.map((fn) => ({ fn, f: forecast(facts.filter((x) => x.functionId === fn.id), rates) }));

  // The average the forecast uses for silent households: people per "yes" reply.
  const yes = facts.filter((x) => x.status === "yes");
  const avgHeads = yes.length ? yes.reduce((s, x) => s + x.heads, 0) / yes.length : 2;

  const footnote = "Invited, yes, no and waiting count households (one card each). Confirmed, veg and non-veg count people.";

  return (
    <div>
      <div className="grid gap-3.5 lg:grid-cols-[repeat(auto-fit,minmax(270px,1fr))] lg:gap-[18px]">
        {per.map(({ fn, f }) => (
          <FunctionCard key={fn.id} fn={fn} f={f} />
        ))}
      </div>

      <p className="mt-4 hidden text-[0.9375rem] text-ink-soft lg:block">
        Bar: <span className="font-bold text-kumkum">■ said yes</span> · <span className="font-bold text-haldi-deep">■ said no</span> ·{" "}
        <span className="font-bold text-ink">□ not replied yet</span> (households).
      </p>
      <p className="mt-4 text-[0.9375rem] text-ink-soft lg:hidden">{footnote}</p>

      <div className="mt-4 rounded-2xl bg-sand px-5 py-[18px] lg:mt-[22px]">
        <h2 className="mb-1 text-lg font-bold">How &quot;Expected&quot; is worked out</h2>
        <p className="text-base">
          Confirmed people × <strong>{pct(rates.yesShowRate)}</strong> (some who say yes don&apos;t come) + households not replied yet ×{" "}
          <strong>{oneDecimal(avgHeads)}</strong> people on average × <strong>{pct(rates.pendingShowRate)}</strong>.{" "}
          {settingsHref ? (
            <>
              You can change both percentages in{" "}
              <Link href={settingsHref} className="font-bold text-kumkum underline underline-offset-2 hover:text-kumkum-dark">
                Event settings
              </Link>
              .
            </>
          ) : (
            "The event's owner can change both percentages."
          )}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          The average is people per &quot;yes&quot; so far{yes.length ? "" : " (2 until the first yes comes in)"}; each function uses its own.
        </p>
      </div>

      <div className="hidden lg:block">
        <h2 className="mb-3 mt-9 font-display text-[1.625rem] text-kumkum">All the numbers</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[820px] border-collapse text-base">
            <thead>
              <tr className="bg-paper-deep text-center">
                <th scope="col" className="px-4 py-3 text-left">
                  Function
                </th>
                {["Invited", "Yes", "No", "Waiting", "Replied", "Confirmed", "Veg", "Non-veg"].map((h) => (
                  <th key={h} scope="col" className="px-2.5 py-3">
                    {h}
                  </th>
                ))}
                <th scope="col" className="bg-sand px-4 py-3 text-kumkum">
                  Expected
                </th>
              </tr>
            </thead>
            <tbody className="text-center">
              {per.map(({ fn, f }) => (
                <tr key={fn.id} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 text-left">
                    {fn.name.en}
                  </th>
                  <td className="px-2.5 py-3">{n(f.invitedHouseholds)}</td>
                  <td className="px-2.5 py-3">{n(f.yesHouseholds)}</td>
                  <td className="px-2.5 py-3">{n(f.noHouseholds)}</td>
                  <td className="px-2.5 py-3">{n(f.pendingHouseholds)}</td>
                  <td className="px-2.5 py-3">{pct(f.responseRate)}</td>
                  <td className="px-2.5 py-3">{n(f.confirmedHeads)}</td>
                  <td className="px-2.5 py-3">{fn.catered ? n(f.veg) : "—"}</td>
                  <td className="px-2.5 py-3">{fn.catered ? n(f.nonveg) : "—"}</td>
                  <td className="bg-sand-soft px-4 py-3 font-display text-[1.375rem] text-kumkum">{n(f.expected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2.5 text-sm text-ink-soft">{footnote}</p>
      </div>
    </div>
  );
}

function FunctionCard({ fn, f }: { fn: FunctionInfo; f: Forecast }) {
  const share = (v: number) => (f.invitedHouseholds ? `${(v / f.invitedHouseholds) * 100}%` : "0%");
  return (
    <section className="rounded-[18px] border border-line bg-card p-[18px] lg:rounded-[20px] lg:p-[22px]">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 className="wrap-names min-w-0 font-display text-2xl text-ink lg:text-[1.625rem]">{fn.name.en}</h2>
        <span className="shrink-0 text-sm text-ink-soft">{shortWhen(fn.startsAt)}</span>
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-2.5 lg:mt-2.5 lg:block">
        <div>
          <div className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-ink-soft lg:text-sm">Expected</div>
          <div className="font-display text-[3.5rem] leading-none text-kumkum lg:text-[4rem]">{n(f.expected)}</div>
        </div>
        <div className="text-right text-[0.9375rem] lg:mt-2 lg:text-left lg:text-base">
          Confirmed <strong>{n(f.confirmedHeads)}</strong>
          <br className="lg:hidden" />
          <span className="text-ink-soft lg:text-ink">
            <span className="hidden lg:inline"> · </span>
            {fn.catered ? `veg ${n(f.veg)} · non-veg ${n(f.nonveg)}` : "no food served"}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex h-3 overflow-hidden rounded-full bg-paper-deep lg:mt-4" aria-hidden="true">
        <span className="bg-kumkum" style={{ width: share(f.yesHouseholds) }} />
        <span className="bg-haldi" style={{ width: share(f.noHouseholds) }} />
      </div>

      {/* Phone: four counts in a row. Laptop: one line (the table below has the rest). */}
      <dl className="mt-2.5 grid grid-cols-4 gap-1 text-center text-sm lg:hidden">
        <Count label="Yes" value={n(f.yesHouseholds)} tone="text-kumkum" />
        <Count label="No" value={n(f.noHouseholds)} tone="text-haldi-deep" />
        <Count label="Waiting" value={n(f.pendingHouseholds)} tone="text-ink" />
        <Count label="Replied" value={pct(f.responseRate)} tone="text-ink" />
      </dl>
      <p className="mt-2 hidden flex-wrap gap-x-3.5 gap-y-1 text-sm text-ink-soft lg:flex">
        <span>
          <strong className="text-kumkum">{n(f.yesHouseholds)}</strong> yes
        </span>
        <span>
          <strong className="text-haldi-deep">{n(f.noHouseholds)}</strong> no
        </span>
        <span>
          <strong className="text-ink">{n(f.pendingHouseholds)}</strong> waiting
        </span>
        <span>
          · {pct(f.responseRate)} of {n(f.invitedHouseholds)} replied
        </span>
      </p>
    </section>
  );
}

function Count({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`text-lg font-bold ${tone}`}>{value}</dd>
    </div>
  );
}
