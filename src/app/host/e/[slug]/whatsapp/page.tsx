import Link from "next/link";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { householdMessage } from "@/lib/hostMessages";
import { DEFAULT_TEXT, displayPhone, PLACEHOLDERS, whatsappLink, type MessageKind } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import { listEffort, listHosts, loadNudges } from "@/lib/store/admin";
import { listGuests } from "@/lib/store/supabase";
import { EventHeader, GateMessage } from "../../../HostChrome";
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
  const withMobile = rows.filter((g) => g.mobile);
  const noMobile = rows.length - withMobile.length;
  const sample = guests[0];

  const totals = effort.reduce((t, e) => ({ minutes: t.minutes + e.minutes, calls: t.calls + e.calls }), { minutes: 0, calls: 0 });
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const tab = (k: MessageKind, label: string) => (
    <Link
      href={`/host/e/${slug}/whatsapp?kind=${k}`}
      className={`rounded-full px-4 py-2 text-sm ${kind === k ? "bg-kumkum text-white" : "border border-kumkum/40 text-kumkum"}`}
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <EventHeader host={host} current="whatsapp" />

      <p className="mt-6">
        Send each household its own reply link from your own WhatsApp. Tap a button: WhatsApp opens with the message ready, you press
        send. Works best on the phone whose WhatsApp the family knows.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tab("invite", "Invitation (after the card)")}
        {tab("reminder", "Reminder (to pending households)")}
      </div>

      <section className="mt-6 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">{kind === "invite" ? "Invitation message" : "Reminder message"}</h2>
        <p className="mt-1 text-sm">
          Words in braces are filled in for each household: {PLACEHOLDERS.join(" ")}. The Marathi is a first draft: have a native reader
          check it.
        </p>
        <div className="mt-3">
          <TextEditor slug={slug} kind={kind} text={template} canEdit={host.canManage} isDefault={!host.event.messageText[kind]} />
        </div>
        {sample && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Preview for {sample.nameEn}</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-[#e7ffdb] p-3 font-sans">{message(sample)}</pre>
          </details>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold">
            {show === "all" ? "All households" : kind === "invite" ? "Not sent the invitation yet" : "Still to reply"} ({rows.length})
          </h2>
          <Link href={`/host/e/${slug}/whatsapp?kind=${kind}&show=${show === "all" ? "todo" : "all"}`} className="text-sm text-kumkum underline">
            {show === "all" ? "Show only those still to do" : "Show all households"}
          </Link>
        </div>
        {noMobile > 0 && (
          <p className="mt-2 text-sm">
            {noMobile} of these have no mobile number; add one on their household page, or reach them another way.
          </p>
        )}
        {rows.length === 0 ? (
          <p className="mt-3">{kind === "invite" ? "Every household has been sent the invitation." : "Every household has replied."}</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-haldi/60 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-haldi/20">
                <tr>
                  {["Household", "Mobile", "Replied", "Invitation", "Reminders", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const n = nudges.get(g.id);
                  const href = whatsappLink(g.mobile, message(g));
                  return (
                    <tr key={g.id} className="border-t border-haldi/30">
                      <td className="px-3 py-2">
                        <Link href={`/host/e/${slug}/guests/${g.id}`} className="font-semibold text-kumkum underline">
                          {g.nameEn}
                        </Link>
                        {!host.side && <div className="text-xs">{g.side === "bride" ? "Bride" : "Groom"}</div>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{displayPhone(g.mobile) ?? "—"}</td>
                      <td className="px-3 py-2">{g.replied.length === 0 ? "No" : pending(g) ? "Partly" : "Yes"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{n?.invite ? when(n.invite) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{n?.reminders ? `${n.reminders}, last ${when(n.reminder!)}` : "—"}</td>
                      <td className="px-3 py-2">
                        {href ? (
                          <SendButton slug={slug} householdId={g.id} kind={kind} href={href} sentBefore={!!sentKey(g.id)} />
                        ) : (
                          <span className="text-xs">No mobile</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs">
          &quot;Invitation&quot; and &quot;Reminders&quot; record when the message was opened in WhatsApp from here; Pangat can&apos;t see
          whether it was actually sent.
        </p>
      </section>

      <section className="mt-10 rounded-xl border border-haldi/60 bg-white p-4">
        <h2 className="text-xl font-semibold">Time spent chasing replies</h2>
        <p className="mt-1 text-sm">
          Log the time and phone calls the family spends chasing replies, outside Pangat too. The 3 January review uses this to judge
          whether Pangat saves effort. So far: <b>{Math.round((totals.minutes / 60) * 10) / 10} hours</b> and <b>{totals.calls} calls</b>.
        </p>
        <div className="mt-3">
          <EffortForm slug={slug} today={today} />
        </div>
        {effort.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["Date", "Who", "Minutes", "Calls", "Note"].map((h) => (
                    <th key={h} className="px-2 py-1 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {effort.slice(0, 50).map((e) => (
                  <tr key={e.id} className="border-t border-haldi/30">
                    <td className="whitespace-nowrap px-2 py-1">{formatDay(`${e.loggedOn}T12:00:00+05:30`, "en")}</td>
                    <td className="px-2 py-1">{e.email ?? "—"}</td>
                    <td className="px-2 py-1">{e.minutes}</td>
                    <td className="px-2 py-1">{e.calls}</td>
                    <td className="px-2 py-1">{e.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
