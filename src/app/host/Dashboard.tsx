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

  // Any "yes" yet? (Until then each function assumes 2 people per household.)
  const yes = facts.filter((x) => x.status === "yes");

  const footnote =
    "Cards: households, one card each. People: invited adds up the caps on the invited cards; confirmed, veg and non-veg are people from the replies; expected is people too.";

  return (
    <div>
      {/* As many cards a row as fit at about today's width (at least 22rem each): one on phones, three on
          laptops, four on wide screens (owner, 14 Nov: "place the 4th box at top right"). */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] gap-3.5 lg:gap-[18px]">
        {per.map(({ fn, f }) => (
          <FunctionCard key={fn.id} fn={fn} f={f} />
        ))}
      </div>

      <p className="mt-4 hidden text-[0.9375rem] text-ink-soft lg:block">
        Bar: <span className="font-bold text-kumkum">■ said yes</span> · <span className="font-bold text-haldi-deep">■ said no</span> ·{" "}
        <span className="font-bold text-ink">□ not replied yet</span> (households).
      </p>
      <p className="mt-4 text-[0.9375rem] text-ink-soft lg:hidden">{footnote}</p>

      <div className="hidden lg:block">
        <h2 className="mb-3 mt-9 font-display text-[1.3125rem] text-kumkum">All the numbers</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[820px] border-collapse text-[0.9375rem]">
            {/* Two groups (owner, 12 Nov): cards (households) first, then people: invited (caps), confirmed, veg, non-veg, expected. */}
            <thead>
              <tr className="bg-paper-deep text-center text-sm">
                <td aria-hidden="true" />
                <th scope="colgroup" colSpan={5} className="px-2.5 pt-2.5 pb-0 font-semibold text-ink-soft">
                  Cards (households)
                </th>
                <th scope="colgroup" colSpan={5} className="border-l border-line px-2.5 pt-2.5 pb-0 font-semibold text-ink-soft">
                  People
                </th>
              </tr>
              <tr className="bg-paper-deep text-center">
                <th scope="col" className="px-4 py-3 text-left">
                  Function
                </th>
                {["Invited", "Yes", "No", "Waiting", "Replied"].map((h) => (
                  <th key={h} scope="col" className="px-2.5 py-3">
                    {h}
                  </th>
                ))}
                {["Invited", "Confirmed", "Veg", "Non-veg"].map((h, i) => (
                  <th key={`p-${h}`} scope="col" className={`px-2.5 py-3 ${i === 0 ? "border-l border-line" : ""}`}>
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
                  <td className="border-l border-line px-2.5 py-3">
                    {n(f.invitedPeople)}
                    {f.invitedWithoutCap > 0 && (
                      <div className="text-xs text-ink-soft" title="Cards with no guest count aren't in this number">
                        + {n(f.invitedWithoutCap)} {f.invitedWithoutCap === 1 ? "card" : "cards"} with no guest count
                      </div>
                    )}
                  </td>
                  <td className="px-2.5 py-3">{n(f.confirmedHeads)}</td>
                  <td className="px-2.5 py-3">{fn.catered ? n(f.veg) : "—"}</td>
                  <td className="px-2.5 py-3">{fn.catered ? n(f.nonveg) : "—"}</td>
                  <td className="bg-sand-soft px-4 py-3 font-display text-[1.125rem] text-kumkum">{n(f.expected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2.5 text-sm text-ink-soft">{footnote}</p>
      </div>
      <div className="mt-6 rounded-2xl bg-sand px-5 py-[18px] lg:mt-8">
        <h2 className="mb-1 text-base font-bold">How &quot;Expected&quot; is worked out</h2>
        <p className="text-[0.9375rem]">
          Confirmed people × <strong>{pct(rates.yesShowRate)}</strong> (some who say yes don&apos;t come) + people on the cards not replied
          yet × <strong>{pct(rates.pendingShowRate)}</strong>. A card&apos;s people are its guest count; a card with no guest count counts the function&apos;s
          average people per &quot;yes&quot;.{" "}
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
        {/* Each function's own numbers, so the cards can be checked by hand. */}
        <ul className="mt-3 space-y-1 text-[0.9375rem]">
          {per.map(({ fn, f }) => (
            <li key={fn.id} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-lg bg-card/70 px-3 py-1.5">
              <span className="font-bold">{fn.name.en}</span>
              <span className="tabular-nums text-ink-soft">
                {n(f.confirmedHeads)} × {pct(rates.yesShowRate)} + {oneDecimal(f.pendingPeople)} people on {n(f.pendingHouseholds)}{" "}
                {f.pendingHouseholds === 1 ? "card" : "cards"} × {pct(rates.pendingShowRate)} = <strong className="text-kumkum">{n(f.expected)}</strong>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-ink-soft">
          The average (for cards with no guest count) is people per &quot;yes&quot; for that function so far
          {yes.length ? "" : " (2 until the first yes comes in)"}.
        </p>
      </div>

    </div>
  );
}

const label = "text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-ink-soft lg:text-sm";
const big = "font-display text-[2.5rem] leading-none text-kumkum lg:text-[2.75rem]";

function FunctionCard({ fn, f }: { fn: FunctionInfo; f: Forecast }) {
  const share = (v: number) => (f.invitedHouseholds ? `${(v / f.invitedHouseholds) * 100}%` : "0%");
  return (
    <section className="rounded-[18px] border border-line bg-card p-[18px] lg:rounded-[20px] lg:p-[22px]">
      {/* A long name wraps whole words; the date drops under it rather than splitting the name. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-0.5">
        <h2 className="wrap-names font-display text-[1.3125rem] text-ink lg:text-[1.3125rem]">{fn.name.en}</h2>
        <span className="text-sm text-ink-soft">{shortWhen(fn.startsAt)}</span>
      </div>

      {/* Expected on the left, Confirmed on the right in the same style; veg and non-veg belong to Confirmed. */}
      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 lg:mt-2.5">
        <div>
          <div className={label}>Expected</div>
          <div className={big}>{n(f.expected)}</div>
        </div>
        <div className="ml-auto text-right">
          <div className={label}>Confirmed</div>
          <div className={big}>{n(f.confirmedHeads)}</div>
          <div className="mt-1 text-sm text-ink-soft">
            {!fn.catered ? "no food served" : fn.vegOnly ? `veg only · ${n(f.veg)}` : `veg ${n(f.veg)} · non-veg ${n(f.nonveg)}`}
          </div>
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
        {f.invitedPeople > 0 && <span>· {n(f.invitedPeople)} {f.invitedPeople === 1 ? "person" : "people"} invited</span>}
      </p>
    </section>
  );
}

function Count({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`text-base font-bold ${tone}`}>{value}</dd>
    </div>
  );
}
