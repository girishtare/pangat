import Link from "next/link";
import { Bell, CircleCheck, Clock, Mail, MessageCircle, Phone, PhoneCall, Timer } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { householdMessage } from "@/lib/hostMessages";
import { DEFAULT_TEXT, displayPhone, PLACEHOLDERS, whatsappLink, type MessageKind } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import { listEffort, listHosts, loadNudges } from "@/lib/store/admin";
import { listGuests } from "@/lib/store/supabase";
import { Alert, EmptyState, PageHeader, ReplyBadge, Section, SideBadge, Stat, WhatsAppIcon } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { EffortForm, SendButton, TextEditor } from "./WhatsAppForms";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(
    new Date(iso),
  );

type Show = "todo" | "all";

export default async function WhatsApp({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string; show?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="WhatsApp" />;
  const { host } = gate;
  const kind: MessageKind = sp.kind === "reminder" ? "reminder" : "invite";
  const show: Show = sp.show === "all" ? "all" : "todo";

  const [guests, nudges, base, hosts] = await Promise.all([
    listGuests(host.client, host.event.id),
    loadNudges(host.event.id),
    publicBaseUrl(),
    listHosts(host.event.id),
  ]);
  const effort = await listEffort(host.event.id, hosts);

  const template = host.event.messageText[kind] ?? DEFAULT_TEXT[kind];
  const message = (g: (typeof guests)[number]) => householdMessage(host, base, g, kind);

  const pending = (g: (typeof guests)[number]) => g.replied.length < g.functionIds.length;
  const sentKey = (id: string) => (kind === "invite" ? nudges.get(id)?.invite : nudges.get(id)?.reminder) ?? null;
  const todo = guests.filter((g) => (kind === "invite" ? !nudges.get(g.id)?.invite : pending(g)));
  const rows = show === "all" ? guests : todo;
  const noMobile = rows.filter((g) => !g.mobile).length;
  const sample = guests[0];

  const totals = effort.reduce((t, e) => ({ minutes: t.minutes + e.minutes, calls: t.calls + e.calls }), { minutes: 0, calls: 0 });
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const listTitle = show === "all" ? "All households" : kind === "invite" ? "Not sent the invitation yet" : "Still to reply";
  const tab = (k: MessageKind, label: string, sub: string, Icon: typeof Mail) => (
    <Link
      href={`/host/e/${slug}/whatsapp?kind=${k}`}
      aria-current={kind === k ? "page" : undefined}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center ${
        kind === k ? "bg-kumkum text-white shadow-sm" : "text-kumkum hover:bg-paper-deep"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="leading-tight">
        <span className="block font-semibold">{label}</span>
        <span className={`block text-xs ${kind === k ? "text-white/85" : "text-ink-soft"}`}>{sub}</span>
      </span>
    </Link>
  );

  return (
    <EventShell host={host} current="whatsapp">
      <PageHeader
        icon={MessageCircle}
        title="WhatsApp"
        subtitle="Send each household its own reply link from your own WhatsApp. Tap a button, WhatsApp opens with the message ready, you press send."
      />

      <nav aria-label="Message type" className="card mb-6 grid grid-cols-2 gap-1 p-1">
        {tab("invite", "Invitation", "after the card", Mail)}
        {tab("reminder", "Reminder", "to pending households", Bell)}
      </nav>

      <Section
        icon={kind === "invite" ? Mail : Bell}
        title={kind === "invite" ? "Invitation message" : "Reminder message"}
        subtitle={
          <>
            Words in braces are filled in for each household: <span className="font-mono text-xs">{PLACEHOLDERS.join(" ")}</span>. The
            Marathi is a first draft: have a native reader check it.
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <TextEditor slug={slug} kind={kind} text={template} canEdit={host.canManage} isDefault={!host.event.messageText[kind]} />
            {!host.canManage && <p className="hint mt-2">Only the event&apos;s owner can change the message.</p>}
          </div>
          <div>
            <p className="label flex items-center gap-2">
              <WhatsAppIcon className="h-5 w-5 text-whatsapp" />
              {sample ? `Preview for ${sample.nameEn}` : "Preview"}
            </p>
            {sample ? (
              <div className="rounded-2xl bg-[#e9e3d8] p-3">
                <div className="ml-auto max-w-[95%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-[0.9375rem] leading-relaxed text-ink shadow-sm wrap-names">
                  {message(sample)}
                </div>
              </div>
            ) : (
              <p className="hint">Add a household to see a preview.</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Alert tone="info">
            When you tap <b>Send</b>, WhatsApp opens with this message filled in for that household. You still press send in WhatsApp.
          </Alert>
        </div>
      </Section>

      <section className="mt-8" aria-labelledby="send-list">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="send-list" className="font-display text-2xl text-kumkum">
            {listTitle} <span className="text-ink-soft">({rows.length})</span>
          </h2>
          <Link href={`/host/e/${slug}/whatsapp?kind=${kind}&show=${show === "all" ? "todo" : "all"}`} className="btn btn-quiet btn-sm">
            {show === "all" ? "Show only those still to do" : "Show all households"}
          </Link>
        </div>
        {noMobile > 0 && (
          <div className="mt-3">
            <Alert tone="warn">
              {noMobile} of these {noMobile === 1 ? "has" : "have"} no mobile number. Add one on their household page, or reach them another
              way.
            </Alert>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={CircleCheck} title={guests.length === 0 ? "No households yet" : kind === "invite" ? "All invitations sent" : "Everyone has replied"}>
              {guests.length === 0
                ? "Add households on the Guest list first."
                : kind === "invite"
                  ? "Every household has been sent the invitation from here."
                  : "There is nobody left to remind."}
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="card mt-4 hidden overflow-hidden lg:block">
              <table className="table-p">
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Mobile</th>
                    <th>Reply</th>
                    <th>Invitation</th>
                    <th>Reminders</th>
                    <th className="text-right">Send</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => {
                    const n = nudges.get(g.id);
                    const href = whatsappLink(g.mobile, message(g));
                    return (
                      <tr key={g.id}>
                        <td className="max-w-[16rem]">
                          <Link href={`/host/e/${slug}/guests/${g.id}`} className="wrap-names font-semibold text-kumkum hover:underline">
                            {g.nameEn}
                          </Link>
                          {!host.side && (
                            <div className="mt-1">
                              <SideBadge side={g.side} />
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap">{g.mobile ? displayPhone(g.mobile) : <span className="badge badge-partly">No mobile</span>}</td>
                        <td>
                          <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                        </td>
                        <td className="whitespace-nowrap text-sm">{n?.invite ? when(n.invite) : "—"}</td>
                        <td className="whitespace-nowrap text-sm">{n?.reminders ? `${n.reminders}, last ${when(n.reminder!)}` : "—"}</td>
                        <td className="text-right">
                          {href ? <SendButton slug={slug} householdId={g.id} kind={kind} href={href} sentBefore={!!sentKey(g.id)} /> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-3 lg:hidden">
              {rows.map((g) => {
                const n = nudges.get(g.id);
                const href = whatsappLink(g.mobile, message(g));
                return (
                  <li key={g.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/host/e/${slug}/guests/${g.id}`} className="wrap-names min-w-0 font-display text-lg text-kumkum">
                        {g.nameEn}
                      </Link>
                      <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                      {!host.side && <SideBadge side={g.side} />}
                      {g.mobile ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          {displayPhone(g.mobile)}
                        </span>
                      ) : (
                        <span className="badge badge-partly">No mobile</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Invitation: {n?.invite ? when(n.invite) : "not yet"} · Reminders: {n?.reminders ?? 0}
                    </p>
                    {href && (
                      <div className="mt-3">
                        <SendButton slug={slug} householdId={g.id} kind={kind} href={href} sentBefore={!!sentKey(g.id)} full />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="hint mt-3">
          &quot;Invitation&quot; and &quot;Reminders&quot; record when the message was opened in WhatsApp from here; Pangat can&apos;t see
          whether it was actually sent.
        </p>
      </section>

      <div className="mt-8">
        <Section
          icon={Timer}
          title="Time spent chasing replies"
          subtitle="Log the time and calls the family spends chasing replies, outside Pangat too. The review uses this to judge whether Pangat saves effort."
        >
          <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
            <Stat icon={Clock} value={`${Math.round((totals.minutes / 60) * 10) / 10} h`} label="Hours" tone="warn" />
            <Stat icon={PhoneCall} value={totals.calls} label="Phone calls" tone="warn" />
          </div>
          <EffortForm slug={slug} today={today} />
          {effort.length > 0 && (
            <>
              <div className="mt-5 hidden lg:block">
                <table className="table-p">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Who</th>
                      <th>Minutes</th>
                      <th>Calls</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effort.slice(0, 50).map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap">{formatDay(`${e.loggedOn}T12:00:00+05:30`, "en")}</td>
                        <td className="[overflow-wrap:anywhere]">{e.email ?? "—"}</td>
                        <td>{e.minutes}</td>
                        <td>{e.calls}</td>
                        <td>{e.note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-5 space-y-2 lg:hidden">
                {effort.slice(0, 50).map((e) => (
                  <li key={e.id} className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-semibold">
                      {formatDay(`${e.loggedOn}T12:00:00+05:30`, "en")} · {e.minutes} min · {e.calls} calls
                    </p>
                    {e.note && <p>{e.note}</p>}
                    {e.email && <p className="text-xs text-ink-soft [overflow-wrap:anywhere]">{e.email}</p>}
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
