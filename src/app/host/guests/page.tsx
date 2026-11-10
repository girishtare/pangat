import Link from "next/link";
import { redirect } from "next/navigation";
import { hostGate } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { listGuests } from "@/lib/store/supabase";
import AddHouseholdForm from "./AddHouseholdForm";
import ImportForm from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function GuestList() {
  const gate = await hostGate();
  if (!gate.ok) {
    if (gate.reason === "signed_out") redirect("/host/login");
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Guest list</h1>
        <p className="mt-3">
          {gate.reason === "demo"
            ? "The guest list can't be edited in demo mode."
            : gate.reason === "not_host"
              ? `You are signed in as ${gate.email}, but you are not a host of this event.`
              : "Host sign-in is not set up yet."}
        </p>
        <Link className="mt-4 inline-block text-kumkum underline" href="/host">
          Back to the dashboard
        </Link>
      </main>
    );
  }

  const { host } = gate;
  const guests = await listGuests(host.client, host.event.id);
  const fnName = new Map(host.functions.map((f) => [f.id, f.name.en]));
  const noMobile = guests.filter((g) => !g.mobile).length;
  const noMarathi = guests.filter((g) => !g.nameMr).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link className="text-sm text-kumkum underline" href="/host">
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-3xl font-bold text-kumkum">Guest list</h1>
      <p className="mt-1 text-sm">
        {host.event.name.en} · {host.side ? scopeLabel(host.side) : "Both sides"} · {guests.length} households
        {noMobile > 0 && ` · ${noMobile} without a mobile`}
        {noMarathi > 0 && ` · ${noMarathi} without a Marathi name`}
      </p>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-haldi/60 bg-white p-4">
          <h2 className="text-xl font-semibold">Add one household</h2>
          <p className="mt-1 text-sm">For a late addition. The same checks as an import.</p>
          <AddHouseholdForm hostSide={host.side} functions={host.functions.map((f) => ({ id: f.id, name: f.name.en }))} />
        </div>
        <div className="rounded-xl border border-haldi/60 bg-white p-4">
          <h2 className="text-xl font-semibold">Import from a sheet</h2>
          <p className="mt-1 text-sm">
            One row per household (one card), with a header row. Columns: <b>Name</b>, Marathi name,
            {host.side ? "" : " Side,"} Mobile, Functions (blank = all), Cap. Copy the cells in Google Sheets or Excel,
            header included, and paste them here.
          </p>
          <ImportForm />
        </div>
      </section>

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
