import Link from "next/link";
import { Info, Settings, Users } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { canSeeLookup } from "@/lib/lookup";
import { scopesFor, type Scope } from "@/lib/sides";
import { listPendingLookups, recordDashboardView } from "@/lib/store/admin";
import { loadDashboard } from "@/lib/store/supabase";
import { EmptyState, PageHeader } from "../../../ui/kit";
import Dashboard from "../../Dashboard";
import { EventShell, GateMessage } from "../../HostChrome";

export const dynamic = "force-dynamic";

const SWITCH_LABELS: Record<Scope, { long: string; short: string }> = {
  both: { long: "Both sides", short: "Both" },
  bride: { long: "Bride's side", short: "Bride's" },
  groom: { long: "Groom's side", short: "Groom's" },
};

export default async function EventDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { slug } = await params;
  const { side: wanted } = await searchParams;
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

  // Which side to show. A co-owner only ever gets their own side (scopesFor
  // returns just that), whatever ?side= says; the owner can switch.
  const scopes = scopesFor(host.side, data.facts);
  const scope: Scope = scopes.find((s) => s === wanted) ?? scopes[0];

  const closed = Date.now() > new Date(host.event.cutoffAt).getTime();
  const base = `/host/e/${slug}`;
  const hasData = data.functions.length > 0 && data.facts.length > 0;

  return (
    <EventShell host={host} current="dashboard">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-4">
        <PageHeader
          title="How many are coming"
          subtitle={`Updated just now · replies ${closed ? "closed" : "close"} on ${formatDay(host.event.cutoffAt, "en")}`}
        />
        {hasData && scopes.length > 1 && (
          <nav aria-label="Side" className="-mt-1 mb-4 grid grid-cols-3 gap-1 rounded-[14px] bg-paper-deep p-1 lg:mb-6 lg:mt-0 lg:inline-flex">
            {scopes.map((s) => {
              const active = s === scope;
              return (
                <Link
                  key={s}
                  href={s === scopes[0] ? base : `${base}?side=${s}`}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-[10px] px-2 text-[0.9375rem] lg:px-[18px] lg:text-[1.0625rem] ${
                    active ? "bg-card font-bold text-kumkum shadow-[0_1px_3px_rgba(46,26,28,0.15)]" : "font-semibold text-ink hover:bg-card/60"
                  }`}
                >
                  <span className="lg:hidden">{SWITCH_LABELS[s].short}</span>
                  <span className="hidden lg:inline">{SWITCH_LABELS[s].long}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {waiting > 0 && (
        <div
          role="status"
          className="mb-4 flex flex-col gap-2.5 rounded-[14px] border border-haldi bg-haldi-soft px-4 py-3.5 lg:mb-[22px] lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:px-[18px]"
        >
          <Info className="hidden h-[22px] w-[22px] shrink-0 text-haldi-deep lg:block" aria-hidden="true" />
          <span className="min-w-0 lg:flex-1">
            <strong>
              {waiting} {waiting === 1 ? "person" : "people"}
            </strong>{" "}
            opened a link that wasn&apos;t theirs and {waiting === 1 ? "is" : "are"} waiting for their own.
          </span>
          <Link
            href={`${base}/guests#wrong-link`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-card px-4 font-bold text-ink hover:bg-paper"
          >
            Send their links
          </Link>
        </div>
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
        <Dashboard data={data} scope={scope} settingsHref={host.canManage ? `${base}/settings` : null} />
      )}
    </EventShell>
  );
}
