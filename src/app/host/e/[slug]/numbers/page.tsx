import { forecast } from "@/lib/forecast";
import { hostGate } from "@/lib/host";
import { closer, EMPTY_NUMBERS, splitByConfirmed, toCaterer } from "@/lib/pilot";
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
        <p className="mt-6">Only hosts of both sides record the caterer numbers.</p>
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
  const anyActual = rows.some((r) => r.n.actual !== null);
  const fnList = host.functions.map((f) => ({ id: f.id, name: f.name.en }));

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <EventHeader host={host} current="numbers" />

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">1. The family&apos;s baseline</h2>
        <p className="mt-1 text-sm">
          What you would have ordered without Pangat, one number per function. Write it down before replies come in (the plan says by 12
          November) and don&apos;t change it afterwards: the pilot is judged against it.
        </p>
        <div className="mt-3">
          <BaselineForm slug={slug} functions={fnList} values={Object.fromEntries(rows.map((r) => [r.fn.id, r.n.baseline]))} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">2. The tool&apos;s number, and what goes to the caterer</h2>
        <p className="mt-1 text-sm">
          On 14 December, freeze the tool&apos;s numbers. If the baseline and the tool disagree, the higher one goes to the caterer.
          {frozenAt && ` Frozen on ${when(frozenAt)}.`}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-haldi/20">
              <tr>
                {["Function", "Baseline", "Tool now (veg / non-veg)", "Tool frozen (veg / non-veg)", "To the caterer"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ fn, live, liveSplit, n }) => (
                <tr key={fn.id} className="border-t border-haldi/30">
                  <td className="px-3 py-2 font-semibold">{fn.name.en}</td>
                  <td className="px-3 py-2">{show(n.baseline)}</td>
                  <td className="px-3 py-2">
                    {show(live.expected)}
                    {liveSplit && ` (${liveSplit.veg} / ${liveSplit.nonveg})`}
                  </td>
                  <td className="px-3 py-2">
                    {show(n.predicted)}
                    {n.predictedVeg !== null && ` (${n.predictedVeg} / ${n.predictedNonveg})`}
                  </td>
                  <td className="px-3 py-2 text-lg font-bold text-kumkum">{show(toCaterer(n.baseline, n.predicted))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <FreezeButton slug={slug} frozenBefore={!!frozenAt} />
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
                  {["Function", "Actual", "Baseline off by", "Tool off by", "Closer"].map((h) => (
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
