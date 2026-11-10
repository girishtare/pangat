import Link from "next/link";
import { ChefHat, Lock, Scale, Trophy } from "lucide-react";
import { forecast } from "@/lib/forecast";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { closer, EMPTY_NUMBERS, latestToCaterer, splitByConfirmed, toCaterer } from "@/lib/pilot";
import { loadNumbers } from "@/lib/store/admin";
import { supabaseStore } from "@/lib/store/supabase";
import { Alert, EmptyState, PageHeader, Section } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { ActualForm, BaselineForm, FreezeButton } from "./NumbersForms";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
const show = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN"));
const split = (veg: number | null, nonveg: number | null) => (veg === null ? null : `${veg} veg · ${nonveg} non-veg`);

export default async function CatererNumbers({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Caterer numbers" />;
  const { host } = gate;

  if (!host.canManage) {
    return (
      <EventShell host={host} current="numbers">
        <PageHeader icon={ChefHat} title="Caterer numbers" />
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
    return { fn, live, liveSplit: splitByConfirmed(live.expected, live.veg, live.nonveg), n };
  });
  const frozenAt = rows.map((r) => r.n.predictedAt).find(Boolean) ?? null;
  const revisedAt = rows.map((r) => r.n.revisedAt).find(Boolean) ?? null;
  const day = (d: string | null) => (d ? formatDay(`${d}T12:00:00+05:30`, "en") : null);
  const dueOn = day(host.event.catererDueOn);
  const finalOn = day(host.event.catererFinalOn);
  const todayIst = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const pastFinal = !!host.event.catererFinalOn && todayIst > host.event.catererFinalOn;
  const anyActual = rows.some((r) => r.n.actual !== null);
  const fnList = host.functions.map((f) => ({ id: f.id, name: f.name.en }));
  const verdicts = rows.map((r) => closer(r.n)).filter((v) => v !== null);
  const toolWins = verdicts.filter((v) => v === "tool").length;
  const baselineWins = verdicts.filter((v) => v === "baseline").length;

  if (host.functions.length === 0) {
    return (
      <EventShell host={host} current="numbers">
        <PageHeader icon={ChefHat} title="Caterer numbers" />
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

  return (
    <EventShell host={host} current="numbers">
      <PageHeader
        icon={ChefHat}
        title="Caterer numbers"
        subtitle="The family's baseline, the tool's frozen numbers, what goes to the caterer, and which came closer on the day."
      />

      <div className="space-y-6">
        <Section n={1} title="The family's baseline" subtitle="What you would have ordered without Pangat. Write it down before replies come in and don't change it afterwards: the pilot is judged against it.">
          <BaselineForm slug={slug} functions={fnList} values={Object.fromEntries(rows.map((r) => [r.fn.id, r.n.baseline]))} />
        </Section>

        <Section
          n={2}
          title="The tool's number, and what goes to the caterer"
          subtitle={
            <>
              Freeze when the caterer needs the first count{dueOn ? ` (${dueOn})` : ""}: the pilot is judged on that freeze. If the caterer
              accepts changes later{finalOn ? ` (until ${finalOn})` : ""}, freeze a revised count then. The higher of the baseline and the
              latest frozen number goes to the caterer.
              {!dueOn && " Set the caterer's dates in Event settings to see them here."}
            </>
          }
        >
          <div className="hidden lg:block">
            <table className="table-p">
              <thead>
                <tr>
                  <th>Function</th>
                  <th className="text-right">Baseline</th>
                  <th className="text-right">Tool now</th>
                  <th className="text-right">First count (judged)</th>
                  <th className="text-right">Revised</th>
                  <th className="bg-haldi! text-right text-ink">To the caterer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ fn, live, liveSplit, n }) => (
                  <tr key={fn.id}>
                    <td className="font-semibold">{fn.name.en}</td>
                    <td className="text-right">{show(n.baseline)}</td>
                    <td className="text-right">
                      {show(live.expected)}
                      {liveSplit && <div className="text-xs text-ink-soft">{split(liveSplit.veg, liveSplit.nonveg)}</div>}
                    </td>
                    <td className="text-right">
                      {show(n.predicted)}
                      {n.predictedVeg !== null && <div className="text-xs text-ink-soft">{split(n.predictedVeg, n.predictedNonveg)}</div>}
                      {n.predicted !== null && <div className="text-xs text-ink-soft">caterer then: {show(toCaterer(n.baseline, n.predicted))}</div>}
                    </td>
                    <td className="text-right">
                      {show(n.revised)}
                      {n.revisedVeg !== null && <div className="text-xs text-ink-soft">{split(n.revisedVeg, n.revisedNonveg)}</div>}
                    </td>
                    <td className="bg-haldi-soft/70 text-right font-display text-2xl font-bold text-kumkum">{show(latestToCaterer(n))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 lg:hidden">
            {rows.map(({ fn, live, n }) => (
              <li key={fn.id} className="overflow-hidden rounded-xl border border-line">
                <div className="flex items-center justify-between gap-3 bg-haldi-soft/70 px-4 py-3">
                  <span className="font-display text-lg font-bold">{fn.name.en}</span>
                  <span className="text-right">
                    <span className="block text-xs font-semibold text-haldi-deep">To the caterer</span>
                    <span className="font-display text-3xl font-bold text-kumkum">{show(latestToCaterer(n))}</span>
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <dt className="text-ink-soft">Baseline</dt>
                  <dd className="text-right font-semibold">{show(n.baseline)}</dd>
                  <dt className="text-ink-soft">Tool now</dt>
                  <dd className="text-right font-semibold">{show(live.expected)}</dd>
                  <dt className="text-ink-soft">First count (judged)</dt>
                  <dd className="text-right font-semibold">{show(n.predicted)}</dd>
                  <dt className="text-ink-soft">Revised</dt>
                  <dd className="text-right font-semibold">{show(n.revised)}</dd>
                  {(n.revisedVeg ?? n.predictedVeg) !== null && (
                    <>
                      <dt className="text-ink-soft">Veg / non-veg</dt>
                      <dd className="text-right">
                        {n.revisedVeg !== null ? split(n.revisedVeg, n.revisedNonveg) : split(n.predictedVeg, n.predictedNonveg)}
                      </dd>
                    </>
                  )}
                </dl>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Lock className="h-4 w-4 text-kumkum" aria-hidden="true" />
                First count
              </p>
              <p className="hint mb-3">{frozenAt ? `Frozen ${when(frozenAt)}.` : `Not frozen yet${dueOn ? `; due ${dueOn}` : ""}.`}</p>
              <FreezeButton
                slug={slug}
                kind="first"
                frozenBefore={!!frozenAt}
                label={frozenAt ? "Freeze the first count again" : "Freeze the first count"}
                confirmText={`Freeze the tool's numbers for the caterer's first count${dueOn ? ` (due ${dueOn})` : ""}? The pilot is judged on these.`}
              />
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="flex items-center gap-2 font-semibold">
                <Lock className="h-4 w-4 text-haldi-deep" aria-hidden="true" />
                Revised count
              </p>
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
        </Section>

        <Section n={3} title="Actual count on the day" subtitle="People who actually ate, per function. Veg and non-veg if the caterer can tell you; the total is enough otherwise.">
          <ActualForm
            slug={slug}
            functions={fnList}
            values={Object.fromEntries(rows.map((r) => [r.fn.id, { actual: r.n.actual, veg: r.n.actualVeg, nonveg: r.n.actualNonveg }]))}
          />
        </Section>

        <Section n={4} title="Which number was closer?" subtitle="The family's baseline against the tool's first count, function by function.">
          {!anyActual ? (
            <EmptyState icon={Scale} title="Waiting for the actual counts">
              Enter the counts from the day in section 3 and the comparison appears here.
            </EmptyState>
          ) : (
            <>
              {verdicts.length > 0 && (
                <div className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 ${toolWins > baselineWins ? "bg-leaf-soft text-leaf" : "bg-paper-deep text-ink"}`}>
                  <Trophy className="h-7 w-7 shrink-0" aria-hidden="true" />
                  <p className="font-display text-xl font-bold">
                    {toolWins > baselineWins ? "Pangat was closer" : baselineWins > toolWins ? "The family's baseline was closer" : "Level so far"}
                    <span className="block font-sans text-sm font-semibold">
                      Pangat closer in {toolWins} of {verdicts.length} function{verdicts.length === 1 ? "" : "s"}
                    </span>
                  </p>
                </div>
              )}
              <div className="hidden lg:block">
                <table className="table-p">
                  <thead>
                    <tr>
                      <th>Function</th>
                      <th className="text-right">Actual</th>
                      <th className="text-right">Baseline off by</th>
                      <th className="text-right">Tool off by (first count)</th>
                      <th className="text-right">Revised off by</th>
                      <th>Closer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ fn, n }) => {
                      const v = closer(n);
                      return (
                        <tr key={fn.id}>
                          <td className="font-semibold">{fn.name.en}</td>
                          <td className="text-right">{show(n.actual)}</td>
                          <td className="text-right">{n.baseline !== null && n.actual !== null ? Math.abs(n.baseline - n.actual) : "—"}</td>
                          <td className="text-right">{n.predicted !== null && n.actual !== null ? Math.abs(n.predicted - n.actual) : "—"}</td>
                          <td className="text-right">{n.revised !== null && n.actual !== null ? Math.abs(n.revised - n.actual) : "—"}</td>
                          <td>
                            <Verdict v={v} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-2 lg:hidden">
                {rows.map(({ fn, n }) => (
                  <li key={fn.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3 text-sm">
                    <span className="font-semibold">{fn.name.en}</span>
                    <span className="text-ink-soft">
                      Actual {show(n.actual)} · baseline off by {n.baseline !== null && n.actual !== null ? Math.abs(n.baseline - n.actual) : "—"} ·
                      tool off by {n.predicted !== null && n.actual !== null ? Math.abs(n.predicted - n.actual) : "—"}
                    </span>
                    <Verdict v={closer(n)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>
    </EventShell>
  );
}

function Verdict({ v }: { v: ReturnType<typeof closer> }) {
  if (v === "tool") return <span className="badge badge-yes">Pangat ✓</span>;
  if (v === "baseline") return <span className="badge badge-partly">Family&apos;s baseline</span>;
  if (v === "tie") return <span className="badge badge-no">Tie</span>;
  return <span className="text-ink-soft">—</span>;
}
