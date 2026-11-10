import { isoToIstInput } from "@/lib/events";
import { hostGate } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { functionUsage, listHosts } from "@/lib/store/admin";
import { loadHouseholdKeys } from "@/lib/store/supabase";
import { EventHeader, GateMessage } from "../../../HostChrome";
import { AddHostForm, EventForm, FunctionEditor, NewFunctionForm, RemoveHostButton } from "./SettingsForms";

export const dynamic = "force-dynamic";

export default async function EventSettings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Event settings" />;
  const { host } = gate;

  if (!host.canManage) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-10">
        <EventHeader host={host} current="settings" />
        <p className="mt-6">Only hosts of both sides can change the event. Ask one of them if something needs changing.</p>
      </main>
    );
  }

  const [usage, hosts, households] = await Promise.all([
    Promise.all(host.functions.map((f) => functionUsage(host.event.id, f.id))),
    listHosts(host.event.id),
    loadHouseholdKeys(host.event.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <EventHeader host={host} current="settings" />

      <section className="mt-8">
        <h2 className="text-2xl font-semibold">Event details</h2>
        <div className="mt-3 rounded-xl border border-haldi/60 bg-white p-4">
          <EventForm
            slug={slug}
            nameEn={host.event.name.en}
            nameMr={host.event.name.mr}
            cutoff={isoToIstInput(host.event.cutoffAt)}
            yesShowRate={host.event.yesShowRate}
            pendingShowRate={host.event.pendingShowRate}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Functions</h2>
        <p className="mt-1 text-sm">Each function gets its own headcount. Guests see them in date order. Times are Indian Standard Time.</p>
        <div className="mt-3 space-y-4">
          {host.functions.map((f, i) => (
            <FunctionEditor
              key={f.id}
              slug={slug}
              id={f.id}
              nameEn={f.name.en}
              nameMr={f.name.mr}
              startsAt={isoToIstInput(f.startsAt)}
              venue={f.venue}
              mapUrl={f.mapUrl}
              catered={f.catered}
              invites={usage[i].invites}
              replies={usage[i].replies}
            />
          ))}
          <NewFunctionForm slug={slug} households={households.length} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Hosts</h2>
        <p className="mt-1 text-sm">
          A one-side host sees and adds guests only for that side. Hosts of both sides see everything and can change these settings.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-haldi/60 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-haldi/20">
              <tr>
                {["Email", "Side", "Last signed in", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hosts.map((h) => (
                <tr key={h.userId} className="border-t border-haldi/30">
                  <td className="px-3 py-2">
                    {h.email}
                    {h.userId === host.userId && " (you)"}
                  </td>
                  <td className="px-3 py-2">{h.side ? scopeLabel(h.side) : "Both sides"}</td>
                  <td className="px-3 py-2">
                    {h.lastSignInAt
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(
                          new Date(h.lastSignInAt),
                        )
                      : "Never"}
                  </td>
                  <td className="px-3 py-2">
                    <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <AddHostForm slug={slug} />
        </div>
      </section>
    </main>
  );
}
