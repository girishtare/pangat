import { isoToIstInput } from "@/lib/events";
import { hostGate } from "@/lib/host";
import { displayPhone } from "@/lib/outreach";
import { dashboardViewStats, functionUsage, listHosts, MAX_CO_OWNERS_PER_SIDE } from "@/lib/store/admin";
import { loadHouseholdKeys } from "@/lib/store/supabase";
import { longStamp, shortWhen } from "@/lib/when";
import { Alert, PageHeader, PageTabs, Section } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { AddFunctionButton, EditHostForm, EventForm, FunctionEditor, InviteCoOwner, NewFunctionForm, RemoveHostButton, ResendInviteButton } from "./SettingsForms";
import PopupButton from "../../../../ui/PopupButton";
import DeleteEvent from "./DeleteEvent";
import CardUpload from "./CardUpload";
import { CalendarDays, Pencil, SlidersHorizontal, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const dateOnly = (iso: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));

type Tab = "details" | "functions" | "people";

export default async function EventSettings({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "functions" || tabParam === "people" ? tabParam : "details";
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
  // A co-owner of both sides counts on each side's limit.
  const coOwners = {
    bride: hosts.filter((h) => h.role === "co_owner" && h.side !== "groom").length,
    groom: hosts.filter((h) => h.role === "co_owner" && h.side !== "bride").length,
  };
  const full = { bride: coOwners.bride >= MAX_CO_OWNERS_PER_SIDE, groom: coOwners.groom >= MAX_CO_OWNERS_PER_SIDE };
  const role = (h: (typeof hosts)[number]) =>
    h.role === "owner" ? (
      <span className="font-bold">Owner</span>
    ) : (
      <span className={`badge ${h.side === "groom" ? "badge-groom" : h.side === "bride" ? "badge-bride" : "badge-no"}`}>
        Co-owner · {h.side === "groom" ? "Groom" : h.side === "bride" ? "Bride" : "Both"}
      </span>
    );
  const editButton = (h: (typeof hosts)[number]) => (
    <PopupButton
      label={<Pencil className="h-4 w-4" aria-label={`Edit ${h.displayName}`} />}
      title={h.role === "owner" ? "Edit owner" : "Edit co-owner"}
      className="btn btn-quiet btn-sm"
    >
      <EditHostForm
        slug={slug}
        full={full}
        host={{
          userId: h.userId,
          fullName: h.fullName ?? (h.displayName !== h.email ? h.displayName : null),
          email: h.email,
          phone: h.phone ? displayPhone(h.phone) : null,
          side: h.side,
          role: h.role,
        }}
      />
    </PopupButton>
  );
  const name = (h: (typeof hosts)[number]) => (
    <>
      <span className={h.displayName !== h.email ? "font-semibold" : "text-ink-soft"}>{h.displayName !== h.email ? h.displayName : "No name yet"}</span>
      {h.userId === host.userId && <span className="font-normal text-ink-soft"> (you)</span>}
    </>
  );
  const signedIn = (h: (typeof hosts)[number]) =>
    !h.confirmed ? (
      <span className="inline-flex flex-wrap items-center justify-center gap-x-1">
        Invited, not signed in yet
        {h.role !== "owner" && <ResendInviteButton slug={slug} userId={h.userId} />}
      </span>
    ) : h.lastSignInAt ? (
      longStamp(h.lastSignInAt)
    ) : (
      "Never"
    );
  const viewText = (userId: string) => {
    const v = views.get(userId);
    return v ? `${v.count}, last ${dateOnly(v.last)}` : "0";
  };

  return (
    <EventShell host={host} current="settings">
      <PageHeader title="Event settings" subtitle="Only you, as the owner, can change these." />

      <PageTabs
        label="Event settings"
        current={tab}
        tabs={[
          { key: "details", label: "Event details", href: `/host/e/${slug}/settings`, icon: SlidersHorizontal },
          { key: "functions", label: "Functions", href: `/host/e/${slug}/settings?tab=functions`, icon: CalendarDays, count: host.functions.length },
          { key: "people", label: "Owner and co-owners", href: `/host/e/${slug}/settings?tab=people`, icon: Users, count: hosts.length },
        ]}
      />

      {tab === "details" && (
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
      )}

      {tab === "details" && (
        <Section
          className="mt-5"
          title="Invitation card"
          subtitle="Each side's own wedding card, as a PDF in English and in Marathi. A guest gets their side's card: a link in the WhatsApp message and a button on their reply page, in their household's language (Slips → Language of each slip). Only you can upload them."
        >
          <div className="space-y-5">
            {(["bride", "groom"] as const).map((sd) => (
              <div key={sd}>
                <h3 className="mb-2 font-bold">{sd === "bride" ? "Bride's side" : "Groom's side"}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <CardUpload slug={slug} side={sd} lang="mr" has={!!host.event.cards[sd].mr} />
                  <CardUpload slug={slug} side={sd} lang="en" has={!!host.event.cards[sd].en} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "details" && (
        <section className="mt-5 rounded-[1.25rem] border-2 border-dashed border-kumkum/40 p-[18px] sm:p-[22px]" aria-labelledby="danger-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="danger-title" className="font-display text-xl text-kumkum">
                Delete this event
              </h2>
              <p className="text-[0.9375rem] text-ink-soft">
                For an event created by mistake. Everything in it is deleted for everyone and can&apos;t be recovered.
              </p>
            </div>
            <DeleteEvent slug={slug} eventName={host.event.name.en} households={households.length} />
          </div>
        </section>
      )}

      {tab === "functions" && (
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
      )}

      {tab === "people" && (
        <Section
          id="people"
          title="Owner and co-owners"
          subtitle={`Up to ${MAX_CO_OWNERS_PER_SIDE} co-owners on each side (bride's side ${coOwners.bride} of ${MAX_CO_OWNERS_PER_SIDE}, groom's side ${coOwners.groom} of ${MAX_CO_OWNERS_PER_SIDE}; a co-owner of both sides counts on each). A co-owner works on their side, or both; only you change these settings and the caterer numbers.`}
          actions={<InviteCoOwner slug={slug} full={full} />}
        >
          <div className="relative hidden overflow-x-auto rounded-[14px] border border-line lg:block">
            <table className="table-p min-w-[900px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email and mobile</th>
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
                    <td className="whitespace-nowrap">{name(h)}</td>
                    <td className="whitespace-nowrap">
                      {h.email}
                      <div className="text-sm text-ink-soft">{h.phone ? displayPhone(h.phone) : "No mobile yet"}</div>
                    </td>
                    <td>{role(h)}</td>
                    <td className="whitespace-nowrap">{signedIn(h)}</td>
                    <td className="whitespace-nowrap">{viewText(h.userId)}</td>
                    <td className="whitespace-nowrap">
                      {/* Pencil first, then Remove (co-owners only); the owner's pencil sits in the same column. */}
                      <span className="inline-flex items-center gap-1">
                        {editButton(h)}
                        {h.role !== "owner" ? (
                          <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />
                        ) : (
                          <span className="inline-block w-[4.75rem]" aria-hidden="true" />
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 lg:hidden">
            {hosts.map((h) => (
              <li key={h.userId} className="rounded-[14px] border border-line p-3.5">
                <p>{name(h)}</p>
                <p className="text-sm [overflow-wrap:anywhere]">{h.email}</p>
                <p className="text-sm text-ink-soft">{h.phone ? displayPhone(h.phone) : "No mobile yet"}</p>
                <div className="mt-1">{role(h)}</div>
                {/* A div, not a p: the Send again button is a form. */}
                <div className="mt-1 text-sm text-ink-soft">
                  Last signed in: {signedIn(h)} · Dashboard visits: {viewText(h.userId)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {editButton(h)}
                  {h.role !== "owner" && <RemoveHostButton slug={slug} userId={h.userId} email={h.email} />}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </EventShell>
  );
}
