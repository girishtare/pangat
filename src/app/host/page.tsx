import { forecast } from "@/lib/forecast";
import { getStore, isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HostDashboard() {
  // Host sign-in and per-side access arrive in stage 2. Until then the
  // dashboard is only reachable in demo mode, never against real guest data.
  if (!isDemo()) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Host dashboard</h1>
        <p className="mt-3">Host sign-in is not built yet, so the dashboard is switched off while a real database is connected.</p>
      </main>
    );
  }

  const data = await getStore().getDashboard(process.env.PANGAT_EVENT_SLUG || "demo-wedding");
  if (!data) return <main className="p-8">Event not found.</main>;

  const rates = { yesShowRate: data.event.yesShowRate, pendingShowRate: data.event.pendingShowRate };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-bold text-kumkum">{data.event.name.en}</h1>
      <p className="mt-1 text-sm">
        Demo data. Expected = confirmed × {rates.yesShowRate} + pending households × average heads × {rates.pendingShowRate}.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-haldi/60 bg-white">
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
            {data.functions.map((fn) => {
              const f = forecast(data.facts.filter((x) => x.functionId === fn.id), rates);
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
    </main>
  );
}
