import { forecast } from "@/lib/forecast";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { closer, EMPTY_NUMBERS, latestToCaterer, splitByConfirmed, toCaterer } from "@/lib/pilot";
import { loadNumbers } from "@/lib/store/admin";
import { supabaseStore } from "@/lib/store/supabase";
import { EventHeader, GateMessage } from "../../../HostChrome";
import { ActualForm, BaselineForm, FreezeButton } from "./NumbersForms";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
const show = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN"));

export default async function CatererNumbers({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Caterer numbers" />;
  const { host } = gate;

  if (!host.canManage) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <EventHeader host={host} current="numbers" />
        <p className="mt-6">Only the event&apos;s owner records the caterer numbers.</p>
      </main>
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

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <EventHeader host={host} current="numbers" />

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">1. The family&apos;s baseline</h2>
        <p className="mt-1 text-sm">
          What you would have ordered without Pangat, one number per function. Write it down before replies come in
          and don&apos;t change it afterwards: the pilot is judged against it.
        </p>
        <div className="mt-3">
          <BaselineForm slug={slug} functions={fnList} values={Object.fromEntries(rows.map((r) => [r.fn.id, r.n.baseline]))} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">2. The tool&apos;s number, and what goes to the caterer</h2>
        <p className="mt-1 text-sm">
          Freeze the tool&apos;s numbers when the caterer needs the first count{dueOn ? ` (${dueOn})` : ""}: the pilot is judged on that
          freeze. If the caterer accepts changes later{finalOn ? ` (until ${finalOn})` : ""}, freeze a revised number then. Either way,
          if the baseline and the tool disagree, the higher one goes to the caterer.
          {!dueOn && " Set the caterer's dates in Event settings to see them here."}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-haldi/20">
              <tr>
                {["Function", "Baseline", "Tool now", "First count (judged)", "Revised", "To the caterer"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ fn, live, liveSplit, n }) => (
                <tr key={fn.id} className="border-t border-haldi/30 align-top">
                  <td className="px-3 py-2 font-semibold">{fn.name.en}</td>
                  <td className="px-3 py-2">{show(n.baseline)}</td>
                  <td className="px-3 py-2">
                    {show(live.expected)}
                    {liveSplit && <div className="text-xs">{liveSplit.veg} veg / {liveSplit.nonveg} non-veg</div>}
                  </td>
                  <td className="px-3 py-2">
                    {show(n.predicted)}
                    {n.predictedVeg !== null && <div className="text-xs">{n.predictedVeg} veg / {n.predictedNonveg} non-veg</div>}
                    {n.predicted !== null && <div className="text-xs">caterer: {show(toCaterer(n.baseline, n.predicted))}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {show(n.revised)}
                    {n.revisedVeg !== null && <div className="text-xs">{n.revisedVeg} veg / {n.revisedNonveg} non-veg</div>}
                  </td>
                  <td className="px-3 py-2 text-lg font-bold text-kumkum">{show(latestToCaterer(n))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">First count{frozenAt ? `: frozen ${when(frozenAt)}` : ""}</p>
            <div className="mt-1">
              <FreezeButton
                slug={slug}
                kind="first"
                frozenBefore={!!frozenAt}
                label={frozenAt ? "Freeze the first count again" : "Freeze the first count"}
                confirmText={`Freeze the tool's numbers for the caterer's first count${dueOn ? ` (due ${dueOn})` : ""}? The pilot is judged on these.`}
              />
            </div>
          </div>
          {frozenAt && (
            <div>
              <p className="text-sm font-semibold">Revised count{revisedAt ? `: frozen ${when(revisedAt)}` : ""}</p>
              {pastFinal && (
                <p className="mt-1 rounded-xl bg-kumkum/10 px-3 py-2 text-sm text-kumkum">
                  The caterer&apos;s last day for changes ({finalOn}) has passed. Check with them before sending a new number.
                </p>
              )}
              <div className="mt-1">
                <FreezeButton
                  slug={slug}
                  kind="revised"
                  frozenBefore={!!revisedAt}
                  label={revisedAt ? "Freeze a newer revision" : "Freeze a revised count"}
                  confirmText="Freeze today's numbers as the revised count for the caterer? The pilot verdict still uses the first count."
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">3. Actual count on the day</h2>
        <p className="mt-1 text-sm">People who actually ate, per function. Veg and non-veg if the caterer can tell you; the total is enough otherwise.</p>
        <div className="mt-3">
          <ActualForm
            slug={slug}
            functions={fnList}
            values={Object.fromEntries(rows.map((r) => [r.fn.id, { actual: r.n.actual, veg: r.n.actualVeg, nonveg: r.n.actualNonveg }]))}
          />
        </div>
      </section>

      {anyActual && (
        <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
          <h2 className="text-xl font-semibold">4. Which number was closer?</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-haldi/20">
                <tr>
                  {["Function", "Actual", "Baseline off by", "Tool off by (first count)", "Revised off by", "Closer"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ fn, n }) => {
                  const v = closer(n);
                  return (
                    <tr key={fn.id} className="border-t border-haldi/30">
                      <td className="px-3 py-2 font-semibold">{fn.name.en}</td>
                      <td className="px-3 py-2">{show(n.actual)}</td>
                      <td className="px-3 py-2">{n.baseline !== null && n.actual !== null ? Math.abs(n.baseline - n.actual) : "—"}</td>
                      <td className="px-3 py-2">{n.predicted !== null && n.actual !== null ? Math.abs(n.predicted - n.actual) : "—"}</td>
                      <td className="px-3 py-2">{n.revised !== null && n.actual !== null ? Math.abs(n.revised - n.actual) : "—"}</td>
                      <td className="px-3 py-2 font-semibold">{v === "tool" ? "Pangat" : v === "baseline" ? "Family's baseline" : v === "tie" ? "Tie" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
