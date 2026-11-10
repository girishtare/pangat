import Link from "next/link";
import { ChevronRight, Search, Settings, Users } from "lucide-react";
import { hostGate } from "@/lib/host";
import { householdWhatsApp } from "@/lib/hostMessages";
import { canNameMatch, canSeeLookup } from "@/lib/lookup";
import { displayPhone } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import { listPendingLookups } from "@/lib/store/admin";
import { listGuests } from "@/lib/store/supabase";
import { shortStamp } from "@/lib/when";
import { Alert, EmptyState, PageHeader, ReplyBadge, SideBadge } from "../../../../ui/kit";
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
        when: shortStamp(r.createdAt),
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

  const bySide = { bride: guests.filter((g) => g.side === "bride").length, groom: guests.filter((g) => g.side === "groom").length };
  const n = (v: number) => v.toLocaleString("en-IN");
  const canAdd = host.functions.length > 0;

  return (
    <EventShell host={host} current="guests">
      <PageHeader
        title="Guest list"
        subtitle="One household = one printed card = one link, one QR code and one short code."
        actions={
          canAdd ? (
            <>
              <a href="#add" className="btn btn-primary">
                + Add a household
              </a>
              <a href="#import" className="btn btn-secondary">
                Import from Excel
              </a>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <CountCard
          value={n(guests.length)}
          label="households"
          sub={host.side ? undefined : `${n(bySide.bride)} bride's side · ${n(bySide.groom)} groom's side`}
        />
        <CountCard value={n(noMobile)} label="have no mobile" sub="They can only reply by QR or phone" />
        <CountCard value={n(noMarathi)} label="have no Marathi name" sub="Their slip shows the English name" />
      </div>

      <div id="wrong-link" className="scroll-mt-24">
        <LookupQueue slug={slug} items={lookupItems} />
      </div>

      {!canAdd ? (
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
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-2">
          <section id="add" aria-labelledby="add-title" className="card scroll-mt-24 p-[18px] sm:p-[22px]">
            <h2 id="add-title" className="font-display text-2xl text-kumkum">
              Add one household
            </h2>
            <AddHouseholdForm slug={slug} hostSide={host.side} functions={host.functions.map((f) => ({ id: f.id, name: f.name.en }))} />
          </section>
          <section id="import" aria-labelledby="import-title" className="card scroll-mt-24 p-[18px] sm:p-[22px]">
            <h2 id="import-title" className="font-display text-2xl text-kumkum">
              Import from Excel
            </h2>
            <ImportForm slug={slug} />
            <p className="hint mt-4">
              Columns: <b>Name</b>, Marathi name,{host.side ? "" : " Side,"} Mobile, Functions (blank = all), Cap. Households already on the
              list are skipped, so the same file can be uploaded again after adding rows.
            </p>
          </section>
        </div>
      )}

      <section className="mt-9" aria-labelledby="households">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="households" className="font-display text-[1.625rem] text-kumkum">
            Households
          </h2>
          <form className="w-full sm:w-auto sm:min-w-[22rem]" action={`/host/e/${slug}/guests`} role="search">
            <label className="relative block">
              <span className="sr-only">Find a household by name, mobile or code</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                enterKeyHint="search"
                placeholder="Search name, mobile or code"
                className="input min-h-12 pl-11"
              />
            </label>
          </form>
        </div>
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
            <div className="mt-4 hidden overflow-x-auto rounded-[1.25rem] border border-line bg-card lg:block">
              <table className="table-p min-w-[820px]">
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Side</th>
                    <th>Mobile</th>
                    <th>Code</th>
                    <th>Invited to</th>
                    <th>Replied</th>
                    <th>Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((g) => (
                    <tr key={g.id}>
                      <td className="max-w-[18rem]">
                        <Link href={link(g.id)} className="wrap-names font-bold text-kumkum underline underline-offset-2 hover:text-kumkum-dark">
                          {g.nameEn}
                        </Link>
                        {g.nameMr ? (
                          <div lang="mr" className="wrap-names text-sm text-ink-soft">
                            {g.nameMr}
                          </div>
                        ) : (
                          <div className="text-sm text-kumkum">No Marathi name</div>
                        )}
                      </td>
                      <td>
                        <SideBadge side={g.side} />
                      </td>
                      <td className="whitespace-nowrap">{g.mobile ? displayPhone(g.mobile) : <span className="font-bold text-kumkum">No mobile</span>}</td>
                      <td className="whitespace-nowrap font-display tracking-[0.2em]">{g.shortCode}</td>
                      <td className="text-sm">{invitedTo(g.functionIds)}</td>
                      <td>
                        <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                      </td>
                      <td>{g.softCap ?? "—"}</td>
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
                        <p className="wrap-names font-bold text-kumkum underline underline-offset-2">{g.nameEn}</p>
                        {g.nameMr ? (
                          <p lang="mr" className="wrap-names text-sm text-ink-soft">
                            {g.nameMr}
                          </p>
                        ) : (
                          <p className="text-sm text-kumkum">No Marathi name</p>
                        )}
                      </div>
                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SideBadge side={g.side} />
                      <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-ink-soft">Mobile</dt>
                      <dd className="text-right font-semibold">{g.mobile ? displayPhone(g.mobile) : <span className="text-kumkum">No mobile</span>}</dd>
                      <dt className="text-ink-soft">Code</dt>
                      <dd className="text-right font-display tracking-[0.2em]">{g.shortCode}</dd>
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
            <p className="hint mt-3">
              Showing {n(shown.length)} of {n(guests.length)} · each name opens the household page.
            </p>
          </>
        )}
      </section>
    </EventShell>
  );
}

function CountCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="card px-[18px] py-4">
      <p className="font-display text-4xl leading-none text-ink">{value}</p>
      <p className="mt-1.5 font-bold">{label}</p>
      {sub && <p className="text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}
