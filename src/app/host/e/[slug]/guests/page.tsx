import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, CircleCheck, Search, Settings, TriangleAlert, Users } from "lucide-react";
import { LiveSearch } from "../../../../ui/LiveSearch";
import { hostGate } from "@/lib/host";
import { householdWhatsApp } from "@/lib/hostMessages";
import { parseSort, sortGuests, type GuestSort, type SortDir } from "@/lib/guestSort";
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
import PopupButton from "../../../../ui/PopupButton";
import LookupQueue, { type LookupItem } from "./LookupQueue";

export const dynamic = "force-dynamic";

export default async function GuestList({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; dir?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const { sort, dir } = parseSort(sp.sort, sp.dir);
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
  const found = q
    ? guests.filter(
        (g) =>
          g.nameEn.toLowerCase().includes(qLower) ||
          (g.nameMr ?? "").includes(q) ||
          (g.location ?? "").toLowerCase().includes(qLower) ||
          (g.notes ?? "").toLowerCase().includes(qLower) ||
          g.shortCode === q.toUpperCase() ||
          (qDigits.length >= 4 && (g.mobile ?? "").includes(qDigits)),
      )
    : guests;
  const shown = sortGuests(found, sort, dir);
  const link = (id: string) => `/host/e/${slug}/guests/${id}`;
  // Replied with more people than the card's cap (the cap is a guide; guests aren't stopped).
  const overCap = (g: (typeof guests)[number]) => g.softCap !== null && g.maxHeads > g.softCap;
  const overCount = guests.filter(overCap).length;
  // Links that sort by a column: first click ascending, second click descending; the search stays.
  const sortHref = (col: GuestSort) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    qs.set("sort", col);
    qs.set("dir", sort === col && dir === "asc" ? "desc" : "asc");
    return `/host/e/${slug}/guests?${qs}`;
  };
  const th = (col: GuestSort, label: string) => <SortHeader key={col} label={label} active={sort === col} dir={dir} href={sortHref(col)} />;
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
              <PopupButton label="+ Add a household" title="Add one household">
                <AddHouseholdForm slug={slug} hostSide={host.side} functions={host.functions.map((f) => ({ id: f.id, name: f.name.en }))} />
              </PopupButton>
              <PopupButton label="Import from Excel" title="Import from Excel" className="btn btn-secondary">
                <ImportForm slug={slug} />
                <p className="hint mt-4">
                  Columns: <b>Name</b>, Marathi name,{host.side ? "" : " Side,"} Mobile, Location, a Yes column for each function, Cap, Comments / Notes. Households already on
                  the list are skipped, so the same file can be uploaded again after adding rows.
                </p>
              </PopupButton>
            </>
          ) : undefined
        }
      />

      {/* Two columns on phones too (owner, 12 Nov). With three cards, the total spans the row on phones so none sits alone. */}
      <div className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${overCount ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <CountCard
          className={overCount ? "" : "max-sm:col-span-2"}
          value={n(guests.length)}
          label="households"
          sub={host.side ? undefined : `${n(bySide.bride)} bride's side · ${n(bySide.groom)} groom's side`}
        />
        {/* Nothing missing: an all-clear instead of "0 have no …", which read like a problem (owner, 12 Nov). */}
        {guests.length > 0 && noMobile === 0 ? (
          <CountCard ok label={guests.length === 1 ? "It has a mobile" : `All ${n(guests.length)} have a mobile`} sub="Each can get its WhatsApp link" />
        ) : (
          <CountCard value={n(noMobile)} label="have no mobile" sub="They can only reply by QR or phone" />
        )}
        {guests.length > 0 && noMarathi === 0 ? (
          <CountCard ok label={guests.length === 1 ? "It has a Marathi name" : `All ${n(guests.length)} have a Marathi name`} sub="Their slips show it" />
        ) : (
          <CountCard value={n(noMarathi)} label="have no Marathi name" sub="Their slip shows the English name" />
        )}
        {overCount > 0 && (
          <Link href={`/host/e/${slug}/guests?sort=cap&dir=desc`} className="block rounded-[1.25rem] hover:opacity-90">
            <CountCard value={n(overCount)} label="over their cap" sub="Replied with more people than the card allows. Check with them." warn />
          </Link>
        )}
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
      ) : null}

      <section className="mt-9" aria-labelledby="households">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="households" className="font-display text-[1.3125rem] text-kumkum">
            Households
          </h2>
          <LiveSearch
            className="w-full sm:w-auto sm:min-w-[22rem]"
            label="Find a household by name, mobile, code, location or notes"
            placeholder="Search name, mobile, code, place"
          />
        </div>
        {q && (
          <p className="mt-2 text-sm">
            {found.length} of {guests.length} households match &quot;{q}&quot;.{" "}
            <Link href={`/host/e/${slug}/guests`} className="font-semibold text-kumkum underline">
              Show all
            </Link>
          </p>
        )}

        {shown.length === 0 ? (
          <div className="mt-4">
            {q ? (
              <EmptyState icon={Search} title="No household matches">
                Try part of the name, the last digits of the mobile, the six-letter code, or a place.
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
            <div className="table-scroll mt-4 hidden rounded-[1.25rem] border border-line bg-card lg:block">
              <table className="table-p min-w-[960px]">
                <thead>
                  <tr>
                    {th("name", "Household")}
                    {th("side", "Side")}
                    {th("mobile", "Mobile")}
                    {th("location", "Location")}
                    {th("code", "Code")}
                    {th("invited", "Invited to")}
                    {th("replied", "Replied")}
                    {th("cap", "Cap")}
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
                        {g.notes && (
                          <div className="mt-0.5 line-clamp-1 text-sm italic text-ink-soft" title={g.notes}>
                            Note: {g.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <SideBadge side={g.side} />
                      </td>
                      <td className="whitespace-nowrap">{g.mobile ? displayPhone(g.mobile) : <span className="font-bold text-kumkum">No mobile</span>}</td>
                      <td className="max-w-[12rem] text-sm">{g.location ?? <span className="text-ink-soft">—</span>}</td>
                      <td className="whitespace-nowrap font-display tracking-[0.2em]">{g.shortCode}</td>
                      <td className="text-sm">{invitedTo(g.functionIds)}</td>
                      <td>
                        <ReplyBadge replied={g.replied.length} invited={g.functionIds.length} />
                      </td>
                      <td className="whitespace-nowrap">
                        {g.softCap ?? "—"}
                        {overCap(g) && <OverCap heads={g.maxHeads} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Phones: the same sorting as the table headers, as a menu. */}
            <form action={`/host/e/${slug}/guests`} className="mt-4 flex items-end gap-2 lg:hidden">
              {q && <input type="hidden" name="q" value={q} />}
              <label className="block flex-1">
                <span className="label">Sort by</span>
                <select name="sort" defaultValue={sort ?? ""} className="input">
                  <option value="">Order added</option>
                  <option value="name">Household name</option>
                  <option value="side">Side</option>
                  <option value="mobile">Mobile</option>
                  <option value="location">Location</option>
                  <option value="code">Code</option>
                  <option value="invited">Functions invited to</option>
                  <option value="replied">Replied</option>
                  <option value="cap">Cap</option>
                </select>
              </label>
              <label className="block w-32">
                <span className="sr-only">Direction</span>
                <select name="dir" defaultValue={dir} className="input">
                  <option value="asc">A → Z, low → high</option>
                  <option value="desc">Z → A, high → low</option>
                </select>
              </label>
              <button type="submit" className="btn btn-secondary">
                Sort
              </button>
            </form>
            <ul className="mt-3 space-y-3 lg:hidden">
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
                      {g.location && (
                        <>
                          <dt className="text-ink-soft">Location</dt>
                          <dd className="text-right">{g.location}</dd>
                        </>
                      )}
                      <dt className="text-ink-soft">Code</dt>
                      <dd className="text-right font-display tracking-[0.2em]">{g.shortCode}</dd>
                      <dt className="text-ink-soft">Invited to</dt>
                      <dd className="text-right">{invitedTo(g.functionIds)}</dd>
                      {g.notes && <dd className="col-span-2 mt-1 line-clamp-2 italic text-ink-soft">Note: {g.notes}</dd>}
                      {g.softCap !== null && (
                        <>
                          <dt className="text-ink-soft">Cap</dt>
                          <dd className="text-right">
                            {g.softCap}
                            {overCap(g) && <OverCap heads={g.maxHeads} />}
                          </dd>
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

function CountCard({
  value,
  label,
  sub,
  warn = false,
  ok = false,
  className = "",
}: {
  /** The number; left out for an all-clear card (`ok`), which shows a tick instead. */
  value?: string;
  label: string;
  sub?: string;
  warn?: boolean;
  ok?: boolean;
  className?: string;
}) {
  return (
    <div className={`card h-full px-3.5 py-3 sm:px-[18px] sm:py-4 ${warn ? "border-kumkum" : ""} ${className}`}>
      {ok ? (
        <CircleCheck className="h-6 w-6 text-leaf sm:h-7 sm:w-7" aria-hidden="true" />
      ) : (
        <p className={`font-display text-[1.5rem] leading-none sm:text-[1.75rem] ${warn ? "text-kumkum" : "text-ink"}`}>{value}</p>
      )}
      <p className="mt-1.5 font-bold leading-snug max-sm:text-sm">{label}</p>
      {sub && <p className="text-sm text-ink-soft max-sm:text-xs">{sub}</p>}
    </div>
  );
}

/** A column header that sorts the list (a plain link, so it works without JavaScript). */
function SortHeader({ label, active, dir, href }: { label: string; active: boolean; dir: SortDir; href: string }) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 rounded-md px-1 hover:text-kumkum ${active ? "text-kumkum" : ""}`}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <Icon className={`h-4 w-4 ${active ? "" : "opacity-40"}`} aria-hidden="true" />
      </Link>
    </th>
  );
}

/** Replied with more people than the cap. */
function OverCap({ heads }: { heads: number }) {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-kumkum-soft px-2 py-0.5 text-xs font-bold text-kumkum">
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
      {heads} replied
    </span>
  );
}
