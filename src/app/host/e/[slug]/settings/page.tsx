import { isoToIstInput } from "@/lib/events";
import { hostGate } from "@/lib/host";
import { displayPhone } from "@/lib/outreach";
import { dashboardViewStats, functionUsage, listHosts, MAX_CO_OWNERS_PER_SIDE } from "@/lib/store/admin";
import { loadHouseholdKeys } from "@/lib/store/supabase";
import { longStamp, shortWhen } from "@/lib/when";
import { Alert, PageHeader, Section } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { AddFunctionButton, EventForm, FunctionEditor, HostNameForm, InviteCoOwner, NewFunctionForm, RemoveHostButton } from "./SettingsForms";
import PopupButton from "../../../../ui/PopupButton";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

const dateOnly = (iso: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default async function EventSettings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Event settings" />;
  const { host } = gate;

  if (!host.canManage) {
    return (
      <EventShell host={host} current="settings">
        <PageHeader title="Event settings" subtitle="Only the event's owner can change these." />
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
    h.role === "owner" ? <span className="font-bold">Owner</span> : <span className={`badge ${h.side === "groom" ? "badge-groom" : "badge-bride"}`}>Co-owner · {h.side === "groom" ? "Groom" : "Bride"}</span>;
  const nameButton = (h: (typeof hosts)[number]) => (
    <PopupButton
      label={<Pencil className="h-4 w-4" aria-label={`Edit the name of ${h.displayName}`} />}
      title={h.displayName !== h.email ? "Edit name" : "Add name"}
      className="btn btn-quiet btn-sm"
    >
      <HostNameForm slug={slug} userId={h.userId} fullName={h.displayName !== h.email ? h.displayName : null} />
    </PopupButton>
  );
  const signedIn = (h: (typeof hosts)[number]) => (!h.confirmed ? "Invited, not signed in yet" : h.lastSignInAt ? longStamp(h.lastSignInAt) : "Never");
  const viewText = (userId: string) => {
    const v = views.get(userId);
    return v ? `${v.count}, last ${dateOnly(v.last)}` : "0";
  };

  return (
    <EventShell host={host} current="settings">
      <PageHeader title="Event settings" subtitle="Only you, as the owner, can change these." />

      <div className="space-y-5">
        <Section id="details" title="Event details">
          <EventForm
            slug={slug}
            nameEn={host.event.name.en}
            nameMr={host.event.name.mr}
            cutoff={isoToIstInput(host.event.cutoffAt)}
            yesShowRate={host.event.yesShowRate}
            pendingShowRate={host.event.pendingShowRate}
            contactBride={displayPhone(host.event.contactPhone.bride)}
            contactGroom={displayPhone(host.event.contactPhone.groom)}
            catererDueOn={host.event.catererDueOn}
            catererFinalOn={host.event.catererFinalOn}
          />
        </Section>

        <Section
          id="functions"
          title="Functions"
          subtitle="Each function gets its own headcount. Guests see them in date order. Times are Indian Standard Time."
          actions={<AddFunctionButton />}
        >
          <div className="space-y-3">
            {host.functions.map((f, i) => (
              <FunctionEditor
                key={f.id}
                slug={slug}
                id={f.id}
                nameEn={f.name.en}
                nameMr={f.name.mr}
                startsAt={isoToIstInput(f.startsAt)}
                when={shortWhen(f.startsAt)}
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
          title="Owner and co-owners"
          subtitle={`Up to ${MAX_CO_OWNERS_PER_SIDE} helpers on each side (bride's side ${coOwners.bride} of ${MAX_CO_OWNERS_PER_SIDE}, groom's side ${coOwners.groom} of ${MAX_CO_OWNERS_PER_SIDE}). A co-owner sees and works on their own side only; only you change these settings and the caterer numbers.`}
          actions={<InviteCoOwner slug={slug} full={{ bride: coOwners.bride >= MAX_CO_OWNERS_PER_SIDE, groom: coOwners.groom >= MAX_CO_OWNERS_PER_SIDE }} />}
        >
          <div className="relative hidden overflow-x-auto rounded-[14px] border border-line lg:block">
            <table className="table-p min-w-[860px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last signed in</th>
                  <th>Dashboard visits</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((h) => (
                  <tr key={h.userId}>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span className={h.displayName !== h.email ? "font-semibold" : "text-ink-soft"}>{h.displayName !== h.email ? h.displayName : "Add name"}</span>
                        {h.userId === host.userId && <span className="text-ink-soft"> (you)</span>}
                        {nameButton(h)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{h.email}</td>
                    <td>{role(h)}</td>
                    <td>{signedIn(h)}</td>
                    <td>{viewText(h.userId)}</td>
                    <td>{h.role !== "owner" && <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 lg:hidden">
            {hosts.map((h) => (
              <li key={h.userId} className="rounded-[14px] border border-line p-3.5">
                <p className="flex flex-wrap items-center gap-1 font-semibold">
                  {h.displayName !== h.email ? h.displayName : <span className="font-normal text-ink-soft">Add name</span>}
                  {h.userId === host.userId && <span className="font-normal text-ink-soft"> (you)</span>}
                  {nameButton(h)}
                </p>
                <p className="text-sm [overflow-wrap:anywhere]">{h.email}</p>
                <div className="mt-1">{role(h)}</div>
                <p className="mt-1 text-sm text-ink-soft">
                  Last signed in: {signedIn(h)} · Dashboard visits: {viewText(h.userId)}
                </p>
                {h.role !== "owner" && (
                  <div className="mt-2">
                    <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </EventShell>
  );
}
