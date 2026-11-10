import Link from "next/link";
import { ChevronRight, FileSpreadsheet, Languages, PhoneOff, Search, Settings, UserPlus, Users } from "lucide-react";
import { hostGate } from "@/lib/host";
import { householdWhatsApp } from "@/lib/hostMessages";
import { formatWhen } from "@/lib/i18n";
import { canNameMatch, canSeeLookup } from "@/lib/lookup";
import { displayPhone } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import { listPendingLookups } from "@/lib/store/admin";
import { listGuests } from "@/lib/store/supabase";
import { Alert, EmptyState, PageHeader, ReplyBadge, SideBadge, Stat } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import AddHouseholdForm from "./AddHouseholdForm";
import ImportForm from "./ImportForm";
import LookupQueue, { type LookupItem } from "./LookupQueue";

export const dynamic = "force-dynamic";

export default async function GuestList({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Guest list" />;

  const { host } = gate;
  const [guests, lookups, base] = await Promise.all([
    listGuests(host.client, host.event.id),
    listPendingLookups(host.event.id),
    publicBaseUrl(),
  ]);
  const lookupItems: LookupItem[] = lookups
    .filter((r) => canSeeLookup(host.side, r.opened.side, r.matched?.side ?? null))
    .map((r) => {
      const openedVisible = !host.side || r.opened.side === host.side;
      const match: LookupItem["match"] = !r.matched
        ? { kind: "none" }
        : r.matched.id === r.opened.id
          ? { kind: "same" }
          : !canNameMatch(host.side, r.matched.side)
            ? { kind: "hidden" }
            : { kind: "named", id: r.matched.id, name: r.matched.nameEn, sendHref: householdWhatsApp(host, base, r.matched, "invite") };
      return {
        id: r.id,
        when: formatWhen(r.createdAt, "en"),
        mobile: displayPhone(r.mobile) ?? r.mobile,
        opened: openedVisible ? { id: r.opened.id, name: r.opened.nameEn } : { id: null, name: "a household on the other side" },
        match,
      };
    });
  const noMobile = guests.filter((g) => !g.mobile).length;
  const noMarathi = guests.filter((g) => !g.nameMr).length;
  const qLower = q.toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const shown = q
    ? guests.filter(
        (g) =>
          g.nameEn.toLowerCase().includes(qLower) ||
          (g.nameMr ?? "").includes(q) ||
          g.shortCode === q.toUpperCase() ||
          (qDigits.length >= 4 && (g.mobile ?? "").includes(qDigits)),
      )
    : guests;
  const link = (id: string) => `/host/e/${slug}/guests/${id}`;
  // In date order, like the functions themselves.
  const invitedTo = (ids: string[]) => host.functions.filter((f) => ids.includes(f.id)).map((f) => f.name.en).join(" · ");

  return (
    <EventShell host={host} current="guests">
      <PageHeader icon={Users} title="Guest list" subtitle="One household per printed card. Open a household to record a reply taken by phone." />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={Users} value={guests.length.toLocaleString("en-IN")} label="Households" />
        <Stat icon={PhoneOff} value={noMobile} label="No mobile" tone={noMobile ? "warn" : "default"} />
        <Stat icon={Languages} value={noMarathi} label="No Marathi name" tone={noMarathi ? "warn" : "default"} />
      </div>

      <div id="wrong-link" className="scroll-mt-24">
        <LookupQueue slug={slug} items={lookupItems} />
      </div>

      {host.functions.length === 0 ? (
        <div className="mt-6">
          <Alert tone="warn">
            Add the event&apos;s functions in{" "}
            {host.canManage ? (
              <Link href={`/host/e/${slug}/settings`} className="font-semibold underline">
                Event settings
              </Link>
            ) : (
              "Event settings (the owner can do this)"
            )}{" "}
            before adding guests.
          </Alert>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          <details className="card group p-0" open={guests.length === 0}>
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-kumkum text-white">
                <UserPlus className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg text-kumkum">Add one household</span>
                <span className="hint block">A late addition, with the same checks as an import.</span>
              </span>
              <ChevronRight className="h-5 w-5 text-ink-soft transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <div className="border-t border-line px-4 pb-4">
              <AddHouseholdForm slug={slug} hostSide={host.side} functions={host.functions.map((f) => ({ id: f.id, name: f.name.en }))} />
            </div>
          </details>
          <details className="card group p-0" open={guests.length === 0}>
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-haldi text-ink">
                <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg text-kumkum">Import from Excel</span>
                <span className="hint block">Fill the template, upload it, check, then add.</span>
              </span>
              <ChevronRight className="h-5 w-5 text-ink-soft transition-transform group-open:rotate-90" aria-hidden="true" />
            </summary>
            <div className="border-t border-line px-4 pb-4">
              <p className="hint mt-3">
                Columns: <b>Name</b>, Marathi name,{host.side ? "" : " Side,"} Mobile, Functions (blank = all), Cap. Households already on
                the list are skipped, so the same file can be uploaded again after adding rows.
              </p>
              <ImportForm slug={slug} />
            </div>
          </details>
        </div>
      )}

      <section className="mt-8" aria-labelledby="households">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="households" className="font-display text-2xl text-kumkum">
            Households
          </h2>
        </div>
        <form className="mt-3 flex gap-2" action={`/host/e/${slug}/guests`} role="search">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Find a household by name, mobile or code</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Search by name, mobile or code" className="input pl-10" />
          </label>
          <button type="submit" className="btn btn-secondary shrink-0">
            Find
          </button>
        </form>
        {q && (
          <p className="mt-2 text-sm">
            {shown.length} of {guests.length} households match &quot;{q}&quot;.{" "}
            <Link href={`/host/e/${slug}/guests`} className="font-semibold text-kumkum underline">
              Show all
            </Link>
          </p>
        )}

        {shown.length === 0 ? (
          <div className="mt-4">
            {q ? (
              <EmptyState icon={Search} title="No household matches">
                Try part of the name, the last digits of the mobile, or the six-letter code.
              </EmptyState>
            ) : host.functions.length === 0 ? (
              <EmptyState icon={Settings} title="No households yet" />
            ) : (
              <EmptyState icon={Users} title="No households yet">
                Add one above, or import the whole list from Excel.
              </EmptyState>
            )}
          </div>
        ) : (
          <>
            <div className="card mt-4 hidden overflow-hidden lg:block">
              <table className="table-p">
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Side</th>
                    <th>Mobile</th>
                    <th>Code</th>
                    <th>Invited to</th>
                    <th>Replied</th>
                    <th className="text-right">Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((g) => (
                    <tr key={g.id}>
                      <td className="max-w-[18rem]">
                        <Link href={link(g.id)} className="wrap-names font-semibold text-kumkum underline-offset-2 hover:underline">
                          {g.nameEn}
                        </Link>
                        {g.nameMr && (
                          <div lang="mr" className="wrap-names text-sm">
                            {g.nameMr}
                          </div>
                        )}
                      </td>
                      <td>
                        <SideBadge side={g.side} />
                      </td>
                      <td className="whitespace-nowrap">
                        {g.mobile ? displayPhone(g.mobile) : <span className="badge badge-partly">No mobile</span>}
                      </td>
                      <td className="font-mono tracking-wider">{g.shortCode}</td>
                      <td className="text-sm">{invitedTo(g.functionIds)}</td>
                      <td>
                        <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                      </td>
                      <td className="text-right">{g.softCap ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-3 lg:hidden">
              {shown.map((g) => (
                <li key={g.id}>
                  <Link href={link(g.id)} className="card block p-4 hover:border-kumkum">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="wrap-names font-display text-lg text-kumkum">{g.nameEn}</p>
                        {g.nameMr && (
                          <p lang="mr" className="wrap-names">
                            {g.nameMr}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SideBadge side={g.side} />
                      <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                      {!g.mobile && <span className="badge badge-partly">No mobile</span>}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {g.mobile && (
                        <>
                          <dt className="text-ink-soft">Mobile</dt>
                          <dd className="text-right font-semibold">{displayPhone(g.mobile)}</dd>
                        </>
                      )}
                      <dt className="text-ink-soft">Code</dt>
                      <dd className="text-right font-mono font-semibold tracking-wider">{g.shortCode}</dd>
                      <dt className="text-ink-soft">Invited to</dt>
                      <dd className="text-right">{invitedTo(g.functionIds)}</dd>
                      {g.softCap !== null && (
                        <>
                          <dt className="text-ink-soft">Cap</dt>
                          <dd className="text-right">{g.softCap}</dd>
                        </>
                      )}
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </EventShell>
  );
}
