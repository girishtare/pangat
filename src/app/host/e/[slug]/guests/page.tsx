import { hostGate } from "@/lib/host";
import { listGuests } from "@/lib/store/supabase";
import { EventHeader, GateMessage } from "../../../HostChrome";
import AddHouseholdForm from "./AddHouseholdForm";
import ImportForm from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function GuestList({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Guest list" />;

  const { host } = gate;
  const guests = await listGuests(host.client, host.event.id);
  const fnName = new Map(host.functions.map((f) => [f.id, f.name.en]));
  const noMobile = guests.filter((g) => !g.mobile).length;
  const noMarathi = guests.filter((g) => !g.nameMr).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <EventHeader host={host} current="guests" />
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
        <h2 className="text-xl font-semibold">Households</h2>
        {guests.length === 0 ? (
          <p className="mt-2">No households yet.</p>
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
                {guests.map((g) => (
                  <tr key={g.id} className="border-t border-haldi/30 align-top">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{g.nameEn}</div>
                      {g.nameMr && <div>{g.nameMr}</div>}
                    </td>
                    <td className="px-3 py-2">{g.side === "bride" ? "Bride" : "Groom"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{g.mobile ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">
                      <a className="text-kumkum underline" href={`/r/${g.token}`} target="_blank" rel="noreferrer">
                        {g.shortCode}
                      </a>
                    </td>
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
