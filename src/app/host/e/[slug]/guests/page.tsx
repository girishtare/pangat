import Link from "next/link";
import { hostGate } from "@/lib/host";
import { householdWhatsApp } from "@/lib/hostMessages";
import { formatWhen } from "@/lib/i18n";
import { canNameMatch, canSeeLookup } from "@/lib/lookup";
import { displayPhone } from "@/lib/outreach";
import { publicBaseUrl } from "@/lib/site";
import { listPendingLookups } from "@/lib/store/admin";
import { listGuests } from "@/lib/store/supabase";
import { EventHeader, GateMessage } from "../../../HostChrome";
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
  const fnName = new Map(host.functions.map((f) => [f.id, f.name.en]));
  const noMobile = guests.filter((g) => !g.mobile).length;
  const noMarathi = guests.filter((g) => !g.nameMr).length;
  const qLower = q.toLowerCase();
  const qDigits = q.replace(/D/g, "");
  const shown = q
    ? guests.filter(
        (g) =>
          g.nameEn.toLowerCase().includes(qLower) ||
          (g.nameMr ?? "").includes(q) ||
          g.shortCode === q.toUpperCase() ||
          (qDigits.length >= 4 && (g.mobile ?? "").includes(qDigits)),
      )
    : guests;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <EventHeader host={host} current="guests" />
      <LookupQueue slug={slug} items={lookupItems} />
      <p className="mt-4 text-sm">
        {guests.length} households
        {noMobile > 0 && ` · ${noMobile} without a mobile`}
        {noMarathi > 0 && ` · ${noMarathi} without a Marathi name`}
      </p>

      {host.functions.length === 0 ? (
        <p className="mt-6 rounded-xl bg-kumkum/10 px-4 py-3 text-kumkum">
          Add the event&apos;s functions in Event settings before adding guests.
        </p>
      ) : (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-haldi/60 bg-white p-4">
            <h2 className="text-xl font-semibold">Add one household</h2>
            <p className="mt-1 text-sm">For a late addition. The same checks as an import.</p>
            <AddHouseholdForm slug={slug} hostSide={host.side} functions={host.functions.map((f) => ({ id: f.id, name: f.name.en }))} />
          </div>
          <div className="rounded-xl border border-haldi/60 bg-white p-4">
            <h2 className="text-xl font-semibold">Import from Excel</h2>
            <p className="mt-1 text-sm">
              Columns: <b>Name</b>, Marathi name,{host.side ? "" : " Side,"} Mobile, Functions (blank = all), Cap. Households already on
              the list are skipped, so the same file can be uploaded again after adding rows.
            </p>
            <ImportForm slug={slug} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">Households</h2>
          <form className="flex gap-2" action={`/host/e/${slug}/guests`}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, mobile or code"
              aria-label="Find a household"
              className="rounded-xl border-2 border-haldi/60 bg-white px-3 py-2"
            />
            <button type="submit" className="rounded-xl border-2 border-kumkum px-4 py-2 font-semibold text-kumkum">
              Find
            </button>
            {q && (
              <Link href={`/host/e/${slug}/guests`} className="self-center text-sm text-kumkum underline">
                Clear
              </Link>
            )}
          </form>
        </div>
        <p className="mt-1 text-sm">Open a household to record a reply taken by phone, change its details, or delete it.</p>
        {q && <p className="mt-2 text-sm">{shown.length} of {guests.length} households match &quot;{q}&quot;.</p>}
        {shown.length === 0 ? (
          <p className="mt-2">{q ? "No household matches." : "No households yet."}</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-haldi/60 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-haldi/20">
                <tr>
                  {["Household", "Side", "Mobile", "Code", "Invited to", "Replied", "Cap"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((g) => (
                  <tr key={g.id} className="border-t border-haldi/30 align-top">
                    <td className="px-3 py-2">
                      <Link href={`/host/e/${slug}/guests/${g.id}`} className="font-semibold text-kumkum underline">
                        {g.nameEn}
                      </Link>
                      {g.nameMr && <div>{g.nameMr}</div>}
                    </td>
                    <td className="px-3 py-2">{g.side === "bride" ? "Bride" : "Groom"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{g.mobile ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">{g.shortCode}</td>
                    <td className="px-3 py-2">{g.functionIds.map((id) => fnName.get(id) ?? "?").join(", ")}</td>
                    <td className="px-3 py-2">
                      {g.replied.length === 0 ? "—" : g.replied.length === g.functionIds.length ? "Yes" : "Partly"}
                    </td>
                    <td className="px-3 py-2">{g.softCap ?? "—"}</td>
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
