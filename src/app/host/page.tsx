import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyEvents, signedInUser } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { getStore } from "@/lib/store";
import { dayMonthYear } from "@/lib/when";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { Divider } from "../ui/kit";
import Dashboard from "./Dashboard";
import { SignOutButton } from "./HostChrome";
import Logo from "../ui/Logo";

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

  const create = (
    <Link href="/host/new" className="btn btn-haldi min-h-12 w-full px-6 text-lg sm:w-auto">
      <Plus className="h-5 w-5" aria-hidden="true" />
      Create an event
    </Link>
  );

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pt-5 sm:px-6 sm:pt-7">
        <Logo className="h-10 sm:h-12" />
        <div className="flex min-w-0 items-center gap-3 text-sm sm:text-base">
          <span className="min-w-0 truncate text-ink">{who.email}</span>
          <span className="h-6 w-px shrink-0 bg-line" aria-hidden="true" />
          <SignOutButton variant="text" />
        </div>
      </header>
      <Divider className="mx-auto mt-4 max-w-6xl px-4 sm:px-6" />

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <h1 className="font-display text-[2rem] leading-tight text-kumkum-dark sm:text-[2.75rem]">Your events</h1>
            <p className="mt-1 text-lg text-ink-soft">Choose an event to continue.</p>
          </div>
          {events.length > 0 && create}
        </div>

        {events.length === 0 ? (
          <div className="card mt-8 flex flex-col items-center gap-4 px-6 py-10 text-center">
            <EventArt className="h-20 w-24" />
            <p className="font-display text-2xl text-kumkum">No events yet</p>
            <p className="max-w-md text-ink-soft">You are not a host of any event yet. Create one, or ask the person running an event to add you.</p>
            {create}
          </div>
        ) : (
          /* Three cards a row on laptops (two on tablets, one on phones); more events wrap to the next row. */
          <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {events.map((e) => (
              <li key={e.slug} className="flex">
                <article className="card relative flex w-full flex-col p-5 transition-colors hover:border-kumkum sm:p-6">
                  <EventArt className="h-20 w-24 shrink-0" />
                  <h2 className="wrap-names mt-4 font-display text-[1.375rem] leading-snug text-ink sm:text-2xl">{e.name.en}</h2>
                  <p className="mt-1.5 flex items-center gap-2 text-ink-soft">
                    <CalendarDays className="h-5 w-5 shrink-0 text-kumkum" aria-hidden="true" />
                    {e.firstStartsAt ? `First function: ${dayMonthYear(e.firstStartsAt)}` : "No functions yet"}
                  </p>
                  <span className="badge badge-groom mt-3 self-start whitespace-normal text-sm">
                    {e.role === "owner" ? "Owner" : `Co-owner · ${e.side ? scopeLabel(e.side) : "Both sides"}`}
                  </span>
                  <span className="min-h-5 flex-1" aria-hidden="true" />
                  {/* The whole card opens the event; the button is the visible, large tap target. */}
                  <Link
                    href={`/host/e/${e.slug}`}
                    aria-label={`Open ${e.name.en}`}
                    className="btn btn-primary min-h-12 w-full text-lg after:absolute after:inset-0 after:rounded-[1.25rem] after:content-['']"
                  >
                    Open event
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}

        <Divider className="mx-auto mt-10 max-w-md" />
      </main>
    </div>
  );
}

/** A small marigold-and-diya drawing for each event card. Decorative. */
function EventArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
      <g fill="none" stroke="#b59a64" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 70c6-14 16-22 28-24" />
        <path d="M22 66c-4-6-4-12 0-17 4 5 4 11 0 17z" fill="#ebe1cb" />
      </g>
      {[
        [34, 30, 13],
        [24, 50, 11],
      ].map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          {Array.from({ length: 10 }, (_, i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy - r * 0.55}
              rx={r * 0.32}
              ry={r * 0.55}
              transform={`rotate(${i * 36} ${cx} ${cy})`}
              fill="#e5c26a"
              stroke="#b59a64"
              strokeWidth="0.8"
            />
          ))}
          <circle cx={cx} cy={cy} r={r * 0.35} fill="#d9a441" />
        </g>
      ))}
      <ellipse cx="78" cy="80" rx="36" ry="7" fill="#f2e8d2" stroke="#b59a64" strokeWidth="1.6" />
      <path d="M58 70c0 7 9 11 20 11s20-4 20-11z" fill="#fffcf5" stroke="#5e4446" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M58 70h40" stroke="#5e4446" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M78 48c-4 6-5 11-2 15 2 3 6 2 6-2 0-5-3-8-4-13z" fill="#e5a33a" stroke="#790d16" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M78 63v7" stroke="#5e4446" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 82c3-2 7-2 9 0" stroke="#790d16" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
