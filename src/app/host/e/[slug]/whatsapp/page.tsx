import Link from "next/link";
import { CircleCheck, Clock, MessageSquareText, Users } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { householdMessage } from "@/lib/hostMessages";
import { DEFAULT_TEXT, displayPhone, PLACEHOLDERS, whatsappLink, type MessageKind } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import { listEffort, listHosts, loadNudges } from "@/lib/store/admin";
import { listGuests } from "@/lib/store/supabase";
import { shortStamp } from "@/lib/when";
import { Alert, EmptyState, PageHeader, PageTabs } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import DistributionList from "./DistributionList";
import { EffortForm, TextEditor } from "./WhatsAppForms";

export const dynamic = "force-dynamic";

type Show = "todo" | "all";
type Tab = "message" | "list" | "time";

export default async function WhatsApp({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ kind?: string; show?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="WhatsApp" />;
  const { host } = gate;
  const kind: MessageKind = sp.kind === "reminder" ? "reminder" : "invite";
  const show: Show = sp.show === "all" ? "all" : "todo";
  const tabNow: Tab = sp.tab === "list" || sp.tab === "time" ? sp.tab : "message";

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
  const sentCount = guests.filter((g) => !!sentKey(g.id)).length;
  const allNoMobile = guests.filter((g) => !g.mobile).length;
  const hours = Math.floor(totals.minutes / 60);
  const mins = totals.minutes % 60;
  const listTitle = show === "all" ? "All households" : kind === "invite" ? "Still to send" : "Still to remind";
  const base_ = `/host/e/${slug}/whatsapp`;
  const tab = (k: MessageKind, label: string) => (
    <Link
      href={`${base_}?tab=${tabNow}&kind=${k}`}
      aria-current={kind === k ? "true" : undefined}
      className={`flex min-h-11 items-center justify-center rounded-[10px] px-3 text-center text-[0.9375rem] leading-tight sm:px-[18px] sm:text-[0.9375rem] ${
        kind === k ? "bg-card font-bold text-kumkum shadow-[0_1px_3px_rgba(46,26,28,0.15)]" : "font-semibold text-ink hover:bg-card/60"
      }`}
    >
      {label}
    </Link>
  );
  const filterLink = (s: Show, label: string) => (
    <Link
      href={`${base_}?tab=list&kind=${kind}&show=${s}`}
      aria-current={show === s ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-full border-2 px-4 font-bold ${
        show === s ? "border-ink bg-ink text-white" : "border-line bg-card text-ink hover:border-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <EventShell host={host} current="whatsapp">
      <PageHeader title="WhatsApp" subtitle="Each button opens WhatsApp on your phone with the message already written. You press send." />

      <PageTabs
        label="WhatsApp"
        current={tabNow}
        tabs={[
          { key: "message", label: "Message", href: `${base_}?tab=message&kind=${kind}`, icon: MessageSquareText },
          { key: "list", label: "Distribution list", href: `${base_}?tab=list&kind=${kind}`, icon: Users, count: todo.length },
          { key: "time", label: "Time spent chasing", href: `${base_}?tab=time&kind=${kind}`, icon: Clock },
        ]}
      />

      {tabNow !== "time" && (
        <nav aria-label="Message type" className="mb-5 grid grid-cols-2 gap-1 rounded-[14px] bg-paper-deep p-1 sm:inline-grid">
          {tab("invite", "Invitation (after the card)")}
          {tab("reminder", "Reminder (to households waiting)")}
        </nav>
      )}

      {tabNow === "message" && (
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="card p-[18px] sm:p-[22px]" aria-labelledby="message-title">
          <h2 id="message-title" className="text-base font-bold">
            The message
          </h2>
          <p className="mb-3 text-[0.9375rem] text-ink-soft">
            {host.canManage ? "Only you, as the owner, can edit it." : "Only the event's owner can change it."} Keep{" "}
            {PLACEHOLDERS.map((p, i) => (
              <span key={p}>
                <code className="rounded bg-paper-deep px-1 font-mono text-sm text-ink">{p}</code>
                {i < PLACEHOLDERS.length - 2 ? ", " : i === PLACEHOLDERS.length - 2 ? " and " : ""}
              </span>
            ))}
            : they&apos;re filled in for each family. The Marathi is a first draft: have a native reader check it.
          </p>
          <TextEditor slug={slug} kind={kind} text={template} canEdit={host.canManage} isDefault={!host.event.messageText[kind]} />
        </section>

        <section className="rounded-[1.25rem] bg-sand p-[18px] sm:p-[22px]" aria-labelledby="preview-title">
          <h2 id="preview-title" className="mb-3 text-base font-bold">
            {sample ? `Preview · ${sample.nameEn}` : "Preview"}
          </h2>
          {sample ? (
            <div className="wrap-names whitespace-pre-wrap rounded-[14px] bg-card px-4 py-3 text-[0.9375rem] leading-relaxed text-ink shadow-sm">
              {message(sample)}
            </div>
          ) : (
            <p className="hint">Add a household to see a preview.</p>
          )}
          <p className="mt-3 text-sm text-ink-soft">
            When you tap <b>Send</b> on the Distribution list, WhatsApp opens with this message filled in for that household. You still press
            send in WhatsApp.
          </p>
        </section>
      </div>
      )}

      {tabNow === "list" && (
      <section aria-labelledby="send-list">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="send-list" className="font-display text-[1.3125rem] text-kumkum">
              {listTitle} · {rows.length.toLocaleString("en-IN")}
            </h2>
            <p className="text-ink-soft">
              {sentCount.toLocaleString("en-IN")} sent · {allNoMobile.toLocaleString("en-IN")} have no mobile
            </p>
          </div>
          <div className="flex gap-2">
            {filterLink("todo", "To do")}
            {filterLink("all", "All")}
          </div>
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
          <DistributionList
            slug={slug}
            kind={kind}
            showSide={!host.side}
            rows={rows.map((g) => {
              const n = nudges.get(g.id);
              return {
                id: g.id,
                nameEn: g.nameEn,
                nameMr: g.nameMr,
                location: g.location,
                shortCode: g.shortCode,
                side: g.side,
                mobile: g.mobile ? displayPhone(g.mobile) : null,
                replied: g.replied.length,
                invited: g.functionIds.length,
                invitationSent: n?.invite ? shortStamp(n.invite) : null,
                reminders: n?.reminders ? `${n.reminders}, last ${shortStamp(n.reminder!)}` : "0",
                href: whatsappLink(g.mobile, message(g)),
                sentBefore: !!sentKey(g.id),
              };
            })}
          />
        )}
        <p className="hint mt-3">
          &quot;Invitation sent&quot; and &quot;Reminders&quot; record when the message was opened in WhatsApp from here; Pangat can&apos;t see
          whether it was actually sent.
        </p>
      </section>
      )}

      {tabNow === "time" && (
      <section className="card p-[18px] sm:p-7" aria-labelledby="effort-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 basis-60">
            <h2 id="effort-title" className="font-display text-[1.3125rem] text-kumkum">
              Time spent chasing replies
            </h2>
            <p className="text-[0.9375rem] text-ink-soft">
              Log the time and calls the family spends chasing replies, outside Pangat too. The review uses this to judge whether Pangat saves
              effort.
            </p>
          </div>
          <dl className="flex gap-8">
            <div>
              <dd className="font-display text-[1.5rem] leading-none">
                {hours} h {mins} m
              </dd>
              <dt className="mt-1 text-sm text-ink-soft">total time</dt>
            </div>
            <div>
              <dd className="font-display text-[1.5rem] leading-none">{totals.calls.toLocaleString("en-IN")}</dd>
              <dt className="mt-1 text-sm text-ink-soft">phone calls</dt>
            </div>
          </dl>
        </div>
        <div className="mt-5">
          <EffortForm slug={slug} today={today} />
        </div>
        {effort.length > 0 && (
          <>
            <div className="mt-5 hidden overflow-x-auto rounded-[14px] border border-line lg:block">
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
                      <td className="[overflow-wrap:anywhere]">{e.who ?? "—"}</td>
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
                  {e.who && <p className="text-xs text-ink-soft [overflow-wrap:anywhere]">{e.who}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      )}
    </EventShell>
  );
}
