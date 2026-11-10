import { hostGate } from "@/lib/host";
import Link from "next/link";
import { canSeeLookup } from "@/lib/lookup";
import { listPendingLookups, recordDashboardView } from "@/lib/store/admin";
import { loadDashboard } from "@/lib/store/supabase";
import Dashboard from "../../Dashboard";
import { EventHeader, GateMessage } from "../../HostChrome";

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

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <EventHeader host={host} current="dashboard" />
      {waiting > 0 && (
        <Link href={`/host/e/${slug}/guests`} className="mt-4 block rounded-xl bg-kumkum/10 px-4 py-3 text-kumkum underline">
          {waiting} guest{waiting === 1 ? "" : "s"} said a link wasn&apos;t theirs. Open the guest list to send them the right one.
        </Link>
      )}
      <Dashboard data={data} hostSide={host.side} />
    </main>
  );
}
