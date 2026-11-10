import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyEvents, signedInUser } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { scopeLabel } from "@/lib/sides";
import { getStore } from "@/lib/store";
import Dashboard from "./Dashboard";
import { SignOutButton } from "./HostChrome";

export const dynamic = "force-dynamic";

export default async function HostHome({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const who = await signedInUser();

  if (!who.ok && who.reason === "demo") {
    const data = await getStore().getDashboard("demo-wedding");
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl text-kumkum">{data?.event.name.en ?? "Demo"}</h1>
        <p className="mt-1 mb-6 text-ink-soft">Demo data. Sign-in, the guest list and event settings need a database.</p>
        {data && <Dashboard data={data} scope="both" settingsHref={null} />}
      </main>
    );
  }
  if (!who.ok && who.reason === "signed_out") redirect("/host/login");
  if (!who.ok) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Host</h1>
        <p className="mt-3">Host sign-in is not set up yet (SUPABASE_PUBLISHABLE_KEY is missing).</p>
      </main>
    );
  }

  const events = await listMyEvents(who.client);
  const { all } = await searchParams;
  // Most hosts have one event: take them straight to it.
  if (events.length === 1 && !all) redirect(`/host/e/${events[0].slug}`);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">{who.email}</span>
        <SignOutButton />
      </div>
      <h1 className="mt-3 text-3xl font-bold text-kumkum">Your events</h1>
      {events.length === 0 ? (
        <p className="mt-3">You are not a host of any event yet. Create one, or ask the person running an event to add you.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.map((e) => (
            <li key={e.slug}>
              <Link href={`/host/e/${e.slug}`} className="block rounded-xl border border-haldi/60 bg-white p-4 hover:border-kumkum">
                <div className="text-lg font-semibold text-kumkum">{e.name.en}</div>
                <div className="text-sm">
                  {e.firstStartsAt ? formatDay(e.firstStartsAt, "en") : "No functions yet"} ·{" "}
                  {e.role === "owner" ? "Owner" : `Co-owner, ${e.side ? scopeLabel(e.side) : ""}`}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/host/new" className="mt-6 inline-block rounded-xl bg-kumkum px-5 py-3 font-semibold text-white">
        Create an event
      </Link>
    </main>
  );
}
