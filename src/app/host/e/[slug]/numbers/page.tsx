import Link from "next/link";
import { ChefHat, Lock } from "lucide-react";
import { forecast } from "@/lib/forecast";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { closer, EMPTY_NUMBERS, latestToCaterer, toCaterer, type FunctionNumbers } from "@/lib/pilot";
import { loadNumbers } from "@/lib/store/admin";
import { supabaseStore } from "@/lib/store/supabase";
import { longStamp, shortStamp } from "@/lib/when";
import { Alert, EmptyState, PageHeader, Section } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { ActualForm, BaselineForm, FreezeButton } from "./NumbersForms";

export const dynamic = "force-dynamic";

// The UI says "family's guess"; code, database and tests keep "baseline".

const when = longStamp;
const show = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN"));
const pair = (veg: number | null, nonveg: number | null) => (veg === null ? "—" : `${show(veg)} · ${show(nonveg)}`);

/** "12 too many", "34 too few" or "exactly right". */
function missLabel(value: number, actual: number): string {
  const d = value - actual;
  return d > 0 ? `${d.toLocaleString("en-IN")} too many` : d < 0 ? `${(-d).toLocaleString("en-IN")} too few` : "exactly right";
}

const th = "px-2.5 py-3";
const tdNum = "px-2.5 py-3";
const tableBox = "overflow-x-auto rounded-[14px] border border-line";

export default async function CatererNumbers({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Caterer numbers" />;
  const { host } = gate;

  if (!host.canManage) {
    return (
      <EventShell host={host} current="numbers">
        <PageHeader title="Caterer numbers" />
        <Alert tone="info">Only the event&apos;s owner records the caterer numbers.</Alert>
      </EventShell>
    );
  }

  // Whole event, both sides: the caterer cooks for everyone.
  const [data, numbers] = await Promise.all([supabaseStore.getDashboard(slug), loadNumbers(host.functions.map((f) => f.id))]);
  const rates = { yesShowRate: host.event.yesShowRate, pendingShowRate: host.event.pendingShowRate };
  const rows = host.functions.map((fn) => {
    const live = forecast(data?.facts.filter((x) => x.functionId === fn.id) ?? [], rates);
    const n = numbers.get(fn.id) ?? EMPTY_NUMBERS;
    return { fn, live, n };
  });
  const frozenAt = rows.map((r) => r.n.predictedAt).find(Boolean) ?? null;
  const revisedAt = rows.map((r) => r.n.revisedAt).find(Boolean) ?? null;
  const day = (d: string | null) => (d ? formatDay(`${d}T12:00:00+05:30`, "en") : null);
  const dueOn = day(host.event.catererDueOn);
  const finalOn = day(host.event.catererFinalOn);
  const todayIst = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const pastFinal = !!host.event.catererFinalOn && todayIst > host.event.catererFinalOn;
  const anyActual = rows.some((r) => r.n.actual !== null);
  const fnList = host.functions.map((f) => ({ id: f.id, name: f.name.en, catered: f.catered }));
  const verdicts = rows.map((r) => closer(r.n)).filter((v) => v !== null);
  const toolWins = verdicts.filter((v) => v === "tool").length;
  const baselineWins = verdicts.filter((v) => v === "baseline").length;

  if (host.functions.length === 0) {
    return (
      <EventShell host={host} current="numbers">
        <PageHeader title="Caterer numbers" />
        <EmptyState icon={ChefHat} title="No functions yet">
          Add the event&apos;s functions in{" "}
          <Link href={`/host/e/${slug}/settings`} className="font-semibold text-kumkum underline">
            Event settings
          </Link>{" "}
          first.
        </EmptyState>
      </EventShell>
    );
  }

  const verdictCard = anyActual ? (
    <VerdictCard rows={rows} toolWins={toolWins} baselineWins={baselineWins} judged={verdicts.length} frozenAt={frozenAt} />
  ) : (
    <section className="card p-5 sm:p-6">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-ink-soft">4 · Which number was closer?</p>
      <p className="mt-1">Fill in the counts on the day to see which number was closer.</p>
    </section>
  );

  return (
    <EventShell host={host} current="numbers">
      <PageHeader title="Caterer numbers" subtitle="Did Pangat beat the family's own guess? Only you, as the owner, see this page." />

      <div className="space-y-[18px]">
        {anyActual && verdictCard}

        <Section
          n={1}
          title="Family's own guess"
          subtitle="What the family would have ordered without Pangat. Write the family's guess down before replies come in and don't change it afterwards: the pilot is judged against it."
        >
          <BaselineForm slug={slug} functions={fnList} values={Object.fromEntries(rows.map((r) => [r.fn.id, r.n.baseline]))} />
        </Section>

        <Section
          n={2}
          title="Pangat's number"
          subtitle="The caterer gets the higher of the family's guess and Pangat's frozen number."
          actions={<FrozenPill label={frozenAt ? `Frozen on ${shortStamp(frozenAt)}` : "Not frozen yet"} />}
        >
          {/* Laptop: the table. Phone: one card per function, so "To the caterer" never scrolls out of sight. */}
          <div className={`${tableBox} hidden lg:block`}>
            <table className="w-full min-w-[720px] border-collapse text-center text-base">
              <thead>
                <tr className="bg-paper-deep">
                  <th scope="col" className="px-4 py-3 text-left">
                    Function
                  </th>
                  <th scope="col" className={th}>
                    Family&apos;s guess
                  </th>
                  <th scope="col" className={th}>
                    Pangat now
                  </th>
                  <th scope="col" className={th}>
                    Pangat frozen
                  </th>
                  <th scope="col" className={th}>
                    Veg · non-veg
                  </th>
                  <th scope="col" className="bg-sand px-4 py-3 text-kumkum">
                    To the caterer
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ fn, live, n }) => (
                  <tr key={fn.id} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 text-left">
                      {fn.name.en}
                    </th>
                    <td className={tdNum}>{show(n.baseline)}</td>
                    <td className={`${tdNum} text-ink-soft`}>{show(live.expected)}</td>
                    <td className={`${tdNum} font-bold`}>
                      {show(n.predicted)}
                      {n.revised !== null && n.predicted !== null && (
                        <div className="text-xs font-normal text-ink-soft">caterer then: {show(toCaterer(n.baseline, n.predicted))}</div>
                      )}
                    </td>
                    <td className={tdNum}>{pair(n.predictedVeg, n.predictedNonveg)}</td>
                    <td className="bg-sand-soft px-4 py-3 font-display text-[1.375rem] text-kumkum">{show(latestToCaterer(n))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 lg:hidden">
            {rows.map(({ fn, live, n }) => (
              <li key={fn.id} className="overflow-hidden rounded-[14px] border border-line">
                <div className="flex items-center justify-between gap-3 bg-sand-soft px-4 py-3">
                  <span className="font-bold">{fn.name.en}</span>
                  <span className="text-right">
                    <span className="block text-xs font-bold text-kumkum">To the caterer</span>
                    <span className="font-display text-3xl text-kumkum">{show(latestToCaterer(n))}</span>
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <dt className="text-ink-soft">Family&apos;s guess</dt>
                  <dd className="text-right font-semibold">{show(n.baseline)}</dd>
                  <dt className="text-ink-soft">Pangat now</dt>
                  <dd className="text-right">{show(live.expected)}</dd>
                  <dt className="text-ink-soft">Pangat frozen</dt>
                  <dd className="text-right font-bold">{show(n.predicted)}</dd>
                  <dt className="text-ink-soft">Veg · non-veg</dt>
                  <dd className="text-right">{pair(n.predictedVeg, n.predictedNonveg)}</dd>
                  {n.revised !== null && (
                    <>
                      <dt className="text-ink-soft">Revised</dt>
                      <dd className="text-right font-bold">{show(n.revised)}</dd>
                      <dt className="text-ink-soft">Caterer then</dt>
                      <dd className="text-right">{show(toCaterer(n.baseline, n.predicted))}</dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-sm text-ink-soft">
            &quot;Pangat now&quot; keeps changing as late replies come in; the comparison uses the frozen number. Veg · non-veg is Pangat&apos;s frozen
            split.
          </p>

          {revisedAt && (
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-xl text-kumkum">Revised count</h3>
                <FrozenPill label={`Frozen on ${shortStamp(revisedAt)}`} />
              </div>
              <div className={`${tableBox} hidden lg:block`}>
                <table className="w-full min-w-[600px] border-collapse text-center text-base">
                  <thead>
                    <tr className="bg-paper-deep">
                      <th scope="col" className="px-4 py-3 text-left">
                        Function
                      </th>
                      <th scope="col" className={th}>
                        Pangat revised
                      </th>
                      <th scope="col" className={th}>
                        Veg · non-veg
                      </th>
                      <th scope="col" className={th}>
                        Caterer then (first count)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ fn, n }) => (
                      <tr key={fn.id} className="border-t border-line">
                        <th scope="row" className="px-4 py-3 text-left">
                          {fn.name.en}
                        </th>
                        <td className={`${tdNum} font-bold`}>{show(n.revised)}</td>
                        <td className={tdNum}>{pair(n.revisedVeg, n.revisedNonveg)}</td>
                        <td className={tdNum}>{show(toCaterer(n.baseline, n.predicted))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2.5 text-sm text-ink-soft">
                &quot;To the caterer&quot; above uses the revision. The pilot is still judged on the first count.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[14px] border border-line p-4">
              <p className="flex items-center gap-2 font-bold">
                <Lock className="h-4 w-4 text-kumkum" aria-hidden="true" />
                First count
              </p>
              <p className="hint">
                Freeze when the caterer needs the first count{dueOn ? ` (${dueOn})` : ""}: the pilot is judged on this freeze.
              </p>
              <p className="hint mb-3">{frozenAt ? `Frozen ${when(frozenAt)}.` : `Not frozen yet${dueOn ? `; due ${dueOn}` : ""}.`}</p>
              <FreezeButton
                slug={slug}
                kind="first"
                frozenBefore={!!frozenAt}
                label={frozenAt ? "Freeze the first count again" : "Freeze the first count"}
                confirmText={`Freeze Pangat's numbers for the caterer's first count${dueOn ? ` (due ${dueOn})` : ""}? The pilot is judged on these.`}
              />
            </div>
            <div className="rounded-[14px] border border-line p-4">
              <p className="flex items-center gap-2 font-bold">
                <Lock className="h-4 w-4 text-haldi-deep" aria-hidden="true" />
                Revised count
              </p>
              <p className="hint">If the caterer accepts changes later{finalOn ? ` (until ${finalOn})` : ""}, freeze a revised count then.</p>
              {frozenAt ? (
                <>
                  <p className="hint mb-3">{revisedAt ? `Frozen ${when(revisedAt)}.` : `Optional${finalOn ? `, until ${finalOn}` : ""}.`}</p>
                  {pastFinal && (
                    <div className="mb-3">
                      <Alert tone="warn">The caterer&apos;s last day for changes ({finalOn}) has passed. Check with them before sending a new number.</Alert>
                    </div>
                  )}
                  <FreezeButton
                    slug={slug}
                    kind="revised"
                    frozenBefore={!!revisedAt}
                    label={revisedAt ? "Freeze a newer revision" : "Freeze a revised count"}
                    confirmText="Freeze today's numbers as the revised count for the caterer? The pilot verdict still uses the first count."
                  />
                </>
              ) : (
                <p className="hint">Available after the first count is frozen.</p>
              )}
            </div>
          </div>
          {!dueOn && <p className="hint mt-3">Set the caterer&apos;s dates in Event settings to see them here.</p>}
        </Section>

        <Section
          n={3}
          title="Counted on the day"
          subtitle="How many actually came to each function. Veg and non-veg if the caterer can tell you; the total is enough otherwise."
        >
          <ActualForm
            slug={slug}
            functions={fnList}
            values={Object.fromEntries(rows.map((r) => [r.fn.id, { actual: r.n.actual, veg: r.n.actualVeg, nonveg: r.n.actualNonveg }]))}
          />
        </Section>

        {!anyActual && verdictCard}
      </div>
    </EventShell>
  );
}

function FrozenPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-haldi bg-haldi-soft px-3.5 py-1.5 text-[0.9375rem] font-bold">
      <Lock className="h-4 w-4 text-haldi-deep" aria-hidden="true" />
      {label}
    </span>
  );
}

/** Which number came closer, per function. Uses the existing verdict rule (closer) on the first frozen count. */
function VerdictCard({
  rows,
  toolWins,
  baselineWins,
  judged,
  frozenAt,
}: {
  rows: { fn: { id: string; name: { en: string } }; n: FunctionNumbers }[];
  toolWins: number;
  baselineWins: number;
  judged: number;
  frozenAt: string | null;
}) {
  const counted = rows.filter((r) => r.n.actual !== null);
  const misses = counted.flatMap(({ n }) =>
    [n.baseline, n.predicted].filter((v): v is number => v !== null).map((v) => Math.abs(v - (n.actual as number))),
  );
  const maxMiss = Math.max(1, ...misses);
  const judgedRows = rows.filter((r) => closer(r.n) !== null);
  const familyOff = judgedRows.reduce((s, { n }) => s + Math.abs((n.baseline as number) - (n.actual as number)), 0);
  const pangatOff = judgedRows.reduce((s, { n }) => s + Math.abs((n.predicted as number) - (n.actual as number)), 0);
  const fns = (k: number) => `${k} function${k === 1 ? "" : "s"}`;
  const headline =
    judged === 0
      ? "Not enough numbers to compare yet."
      : toolWins > baselineWins
        ? `Pangat was closer for ${toolWins} of ${fns(judged)}.`
        : baselineWins > toolWins
          ? `The family's guess was closer for ${baselineWins} of ${fns(judged)}.`
          : toolWins === 0
            ? "Both numbers were equally close."
            : `Level: each was closer for ${toolWins} of ${fns(judged)}.`;

  return (
    <section className="rounded-[22px] border-2 border-kumkum bg-card px-5 py-6 sm:px-7">
      <p className="text-sm font-bold uppercase tracking-[0.08em] text-ink-soft">4 · Which number was closer?</p>
      <h2 className="mt-1 font-display text-[1.75rem] leading-[1.2] text-kumkum sm:text-4xl">{headline}</h2>
      {judged > 0 ? (
        <p className="mt-1.5 text-lg">
          Across all functions, the family&apos;s guess was off by <strong>{familyOff.toLocaleString("en-IN")}</strong> people; Pangat was off by{" "}
          <strong>{pangatOff.toLocaleString("en-IN")}</strong>.
        </p>
      ) : (
        <p className="mt-1.5 text-lg">Fill in the family&apos;s guess and freeze Pangat&apos;s number to compare them with the counts.</p>
      )}

      <div className="mt-[22px] grid gap-[22px]">
        {counted.map(({ fn, n }) => {
          const actual = n.actual as number;
          const v = closer(n);
          const lines = [
            { label: "Family's guess", value: n.baseline, bar: "bg-sand-deep" },
            { label: "Pangat", value: n.predicted, bar: "bg-kumkum" },
          ];
          return (
            <div key={fn.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <h3 className="font-display text-2xl">
                  {fn.name.en} <span className="font-sans text-base text-ink-soft">· {actual.toLocaleString("en-IN")} came</span>
                </h3>
                {v === "tool" && <span className="rounded-full bg-kumkum px-3 py-0.5 text-sm font-bold text-white">✓ Pangat was closer</span>}
                {v === "baseline" && <span className="rounded-full bg-sand px-3 py-0.5 text-sm font-bold text-kumkum-dark">Family&apos;s guess was closer</span>}
                {v === "tie" && <span className="rounded-full bg-paper-deep px-3 py-0.5 text-sm font-bold text-ink">Equally close</span>}
              </div>
              <div className="mt-2 grid gap-y-1.5 text-[0.9375rem]">
                {lines.map((l) => (
                  <div
                    key={l.label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)_100px]"
                  >
                    <span>
                      {l.label} {show(l.value)}
                    </span>
                    <span className="col-span-2 row-start-2 h-4 sm:col-span-1 sm:row-start-auto" aria-hidden="true">
                      {l.value !== null && (
                        <span
                          className={`block h-4 rounded ${l.bar}`}
                          style={{ width: `${(Math.abs(l.value - actual) / maxMiss) * 100}%`, minWidth: l.value === actual ? 0 : 4 }}
                        />
                      )}
                    </span>
                    <span className="text-right font-bold sm:text-left">{l.value === null ? "—" : missLabel(l.value, actual)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-[18px] text-[0.9375rem] text-ink-soft">
        Shorter bar = closer to the real count.
        {frozenAt ? ` Pangat's number here is the one frozen on ${formatDay(frozenAt, "en")}.` : ""}
      </p>
    </section>
  );
}
