import Link from "next/link";
import { ArrowRight, CalendarClock, LayoutDashboard, Link2Off, Settings, Users } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { canSeeLookup } from "@/lib/lookup";
import { listPendingLookups, recordDashboardView } from "@/lib/store/admin";
import { loadDashboard } from "@/lib/store/supabase";
import { EmptyState, PageHeader } from "../../../ui/kit";
import Dashboard from "../../Dashboard";
import { EventShell, GateMessage } from "../../HostChrome";

export const dynamic = "force-dynamic";

export default async function EventDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Dashboard" />;
  const { host } = gate;

  // Evidence for the review: did the hosts (the parents) look at the dashboard?
  await recordDashboardView(host.event.id, host.userId).catch((err) => console.error("dashboard view not recorded", err));

  // Loaded as the host: row-level security limits rows to their side.
  const data = await loadDashboard(host.client, slug);
  const waiting = (await listPendingLookups(host.event.id)).filter((r) =>
    canSeeLookup(host.side, r.opened.side, r.matched?.side ?? null),
  ).length;
  if (!data) return <GateMessage gate={{ ok: false, reason: "not_host", email: host.email }} title="Dashboard" />;

  const closed = Date.now() > new Date(host.event.cutoffAt).getTime();
  const base = `/host/e/${slug}`;

  return (
    <EventShell host={host} current="dashboard">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {closed ? "Replies closed on " : "Guests can reply until "}
            {formatDay(host.event.cutoffAt, "en")}
          </span>
        }
      />

      {waiting > 0 && (
        <Link
          href={`${base}/guests#wrong-link`}
          className="card mb-6 flex flex-wrap items-center gap-3 border-haldi bg-haldi-soft/60 px-4 py-3 hover:bg-haldi-soft"
        >
          <Link2Off className="h-6 w-6 shrink-0 text-kumkum" aria-hidden="true" />
          <span className="min-w-0 flex-1 font-semibold">
            {waiting} {waiting === 1 ? "family needs" : "families need"} their correct link
          </span>
          <span className="btn btn-secondary btn-sm">
            View requests <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      )}

      {data.functions.length === 0 ? (
        <EmptyState icon={Settings} title="No functions yet">
          {host.canManage ? (
            <>
              Add the event&apos;s functions in{" "}
              <Link href={`${base}/settings`} className="font-semibold text-kumkum underline">
                Event settings
              </Link>
              .
            </>
          ) : (
            "The event's owner hasn't added any functions yet."
          )}
        </EmptyState>
      ) : data.facts.length === 0 ? (
        <EmptyState icon={Users} title="No guests on the list yet">
          Add households on the{" "}
          <Link href={`${base}/guests`} className="font-semibold text-kumkum underline">
            Guest list
          </Link>{" "}
          and the numbers will appear here as they reply.
        </EmptyState>
      ) : (
        <Dashboard data={data} hostSide={host.side} />
      )}
    </EventShell>
  );
}
