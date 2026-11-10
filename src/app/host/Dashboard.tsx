import { forecast } from "@/lib/forecast";
import { factsFor, scopeLabel, scopesFor } from "@/lib/sides";
import type { DashboardData, InviteFact, Side } from "@/lib/types";

/** Headcount tables: one per side the host may see, plus a total for hosts of both sides. */
export default function Dashboard({ data, hostSide }: { data: DashboardData; hostSide: Side | null }) {
  const rates = { yesShowRate: data.event.yesShowRate, pendingShowRate: data.event.pendingShowRate };
  const scopes = scopesFor(hostSide, data.facts);
  return (
    <>
      <p className="mt-3 text-sm">
        Expected = confirmed × {rates.yesShowRate} + pending households × average heads × {rates.pendingShowRate}.
      </p>
      {data.functions.length === 0 && <p className="mt-6">This event has no functions yet.</p>}
      {data.functions.length > 0 &&
        scopes.map((scope) => (
          <section key={scope} className="mt-6">
            {scopes.length > 1 && <h2 className="text-xl font-semibold">{scopeLabel(scope)}</h2>}
            <FunctionTable functions={data.functions} facts={factsFor(scope, data.facts)} rates={rates} />
          </section>
        ))}
    </>
  );
}

function FunctionTable({
  functions,
  facts,
  rates,
}: {
  functions: DashboardData["functions"];
  facts: InviteFact[];
  rates: { yesShowRate: number; pendingShowRate: number };
}) {
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-haldi/60 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-haldi/20">
          <tr>
            {["Function", "Invited", "Yes", "No", "Pending", "Replied", "Confirmed heads", "Veg", "Non-veg", "Expected"].map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {functions.map((fn) => {
            const f = forecast(facts.filter((x) => x.functionId === fn.id), rates);
            return (
              <tr key={fn.id} className="border-t border-haldi/30">
                <td className="px-3 py-2 font-semibold">{fn.name.en}</td>
                <td className="px-3 py-2">{f.invitedHouseholds}</td>
                <td className="px-3 py-2">{f.yesHouseholds}</td>
                <td className="px-3 py-2">{f.noHouseholds}</td>
                <td className="px-3 py-2">{f.pendingHouseholds}</td>
                <td className="px-3 py-2">{Math.round(f.responseRate * 100)}%</td>
                <td className="px-3 py-2">{f.confirmedHeads}</td>
                <td className="px-3 py-2">{f.veg}</td>
                <td className="px-3 py-2">{f.nonveg}</td>
                <td className="px-3 py-2 text-lg font-bold text-kumkum">{f.expected}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
