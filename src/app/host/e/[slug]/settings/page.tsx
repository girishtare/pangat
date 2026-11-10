import { CalendarDays, Flower2, Settings, Users } from "lucide-react";
import { isoToIstInput } from "@/lib/events";
import { hostGate } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { dashboardViewStats, functionUsage, listHosts, MAX_CO_OWNERS_PER_SIDE } from "@/lib/store/admin";
import { loadHouseholdKeys } from "@/lib/store/supabase";
import { Alert, PageHeader, Section } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { EventForm, FunctionEditor, InviteCoOwner, NewFunctionForm, RemoveHostButton } from "./SettingsForms";

export const dynamic = "force-dynamic";

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
const dateOnly = (iso: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default async function EventSettings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Event settings" />;
  const { host } = gate;

  if (!host.canManage) {
    return (
      <EventShell host={host} current="settings">
        <PageHeader icon={Settings} title="Event settings" />
        <Alert tone="info">Only the event&apos;s owner can change the event. Ask them if something needs changing.</Alert>
      </EventShell>
    );
  }

  const [usage, hosts, households, views] = await Promise.all([
    Promise.all(host.functions.map((f) => functionUsage(host.event.id, f.id))),
    listHosts(host.event.id),
    loadHouseholdKeys(host.event.id),
    dashboardViewStats(host.event.id),
  ]);
  const coOwners = {
    bride: hosts.filter((h) => h.role === "co_owner" && h.side === "bride").length,
    groom: hosts.filter((h) => h.role === "co_owner" && h.side === "groom").length,
  };
  const role = (h: (typeof hosts)[number]) =>
    h.role === "owner" ? <span className="badge badge-partly">Owner</span> : <span className={`badge ${h.side === "groom" ? "badge-groom" : "badge-bride"}`}>Co-owner · {h.side ? scopeLabel(h.side) : ""}</span>;
  const viewText = (userId: string) => {
    const v = views.get(userId);
    return v ? `${v.count}, last ${dateOnly(v.last)}` : "None";
  };

  return (
    <EventShell host={host} current="settings">
      <PageHeader icon={Settings} title="Event settings" />

      <nav aria-label="Settings sections" className="card sticky top-16 z-20 mb-6 flex gap-1 overflow-x-auto p-1 lg:top-4">
        {[
          ["#details", "Event details"],
          ["#functions", "Functions"],
          ["#people", "Owner and co-owners"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="flex min-h-11 shrink-0 items-center rounded-xl px-4 font-semibold text-kumkum hover:bg-paper-deep">
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        <Section id="details" icon={CalendarDays} title="Event details" subtitle="Names, when replies close, the caterer's dates, contact numbers and the expected-headcount rates.">
          <EventForm
            slug={slug}
            nameEn={host.event.name.en}
            nameMr={host.event.name.mr}
            cutoff={isoToIstInput(host.event.cutoffAt)}
            yesShowRate={host.event.yesShowRate}
            pendingShowRate={host.event.pendingShowRate}
            contactBride={host.event.contactPhone.bride}
            contactGroom={host.event.contactPhone.groom}
            catererDueOn={host.event.catererDueOn}
            catererFinalOn={host.event.catererFinalOn}
          />
        </Section>

        <Section id="functions" icon={Flower2} title="Functions" subtitle="Each function gets its own headcount. Guests see them in date order. Times are Indian Standard Time.">
          <div className="grid gap-4 xl:grid-cols-2">
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
        </Section>

        <Section
          id="people"
          icon={Users}
          title="Owner and co-owners"
          subtitle={`You are the owner: the only one who changes these settings and the caterer numbers. Invite up to ${MAX_CO_OWNERS_PER_SIDE} co-owners per side; each sees their own side's guests only.`}
          actions={<InviteCoOwner slug={slug} full={{ bride: coOwners.bride >= MAX_CO_OWNERS_PER_SIDE, groom: coOwners.groom >= MAX_CO_OWNERS_PER_SIDE }} />}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="badge badge-bride text-sm">
              Bride&apos;s side: {coOwners.bride} of {MAX_CO_OWNERS_PER_SIDE}
            </span>
            <span className="badge badge-groom text-sm">
              Groom&apos;s side: {coOwners.groom} of {MAX_CO_OWNERS_PER_SIDE}
            </span>
          </div>
          <div>
            <div>
              <div className="hidden lg:block">
                <table className="table-p">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Last signed in</th>
                      <th>Dashboard views</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hosts.map((h) => (
                      <tr key={h.userId}>
                        <td className="min-w-[16rem] [overflow-wrap:anywhere]">
                          {h.email}
                          {h.userId === host.userId && <span className="text-ink-soft"> (you)</span>}
                          {!h.confirmed && <div className="text-xs text-haldi-deep">Invitation not accepted yet</div>}
                        </td>
                        <td>{role(h)}</td>
                        <td className="text-sm">{h.lastSignInAt ? dateTime(h.lastSignInAt) : "Never"}</td>
                        <td className="text-sm">{viewText(h.userId)}</td>
                        <td>{h.role !== "owner" && <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 lg:hidden">
                {hosts.map((h) => (
                  <li key={h.userId} className="rounded-xl border border-line p-3">
                    <p className="font-semibold [overflow-wrap:anywhere]">
                      {h.email}
                      {h.userId === host.userId && <span className="font-normal text-ink-soft"> (you)</span>}
                    </p>
                    <div className="mt-1">{role(h)}</div>
                    {!h.confirmed && <p className="mt-1 text-xs text-haldi-deep">Invitation not accepted yet</p>}
                    <p className="mt-1 text-sm text-ink-soft">
                      Last signed in: {h.lastSignInAt ? dateTime(h.lastSignInAt) : "never"} · Dashboard views: {viewText(h.userId)}
                    </p>
                    {h.role !== "owner" && (
                      <div className="mt-2">
                        <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </EventShell>
  );
}
