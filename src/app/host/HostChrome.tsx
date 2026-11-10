import Link from "next/link";
import { redirect } from "next/navigation";
import type { HostContext, HostGate } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { signOut } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="rounded-full border border-kumkum/40 px-4 py-2 text-sm text-kumkum">
        Sign out
      </button>
    </form>
  );
}

/** Header shared by every page of one event. */
export function EventHeader({ host, current }: { host: HostContext; current: "dashboard" | "guests" | "slips" | "whatsapp" | "numbers" | "settings" }) {
  const base = `/host/e/${host.event.slug}`;
  const tab = (href: string, label: string, key: typeof current) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-2 text-sm ${current === key ? "bg-kumkum text-white" : "border border-kumkum/40 text-kumkum"}`}
    >
      {label}
    </Link>
  );
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link className="text-kumkum underline" href="/host?all=1">
          ← All events
        </Link>
        <span>
          {host.email} · {host.side ? scopeLabel(host.side) : "Both sides"}
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold text-kumkum">{host.event.name.en}</h1>
      {host.event.name.mr && <p className="text-lg">{host.event.name.mr}</p>}
      <nav className="mt-4 flex flex-wrap items-center gap-2">
        {tab(base, "Dashboard", "dashboard")}
        {tab(`${base}/guests`, "Guest list", "guests")}
        {tab(`${base}/slips`, "Slips", "slips")}
        {tab(`${base}/whatsapp`, "WhatsApp", "whatsapp")}
        {host.canManage && tab(`${base}/numbers`, "Caterer numbers", "numbers")}
        {host.canManage && tab(`${base}/settings`, "Event settings", "settings")}
        <SignOutButton />
      </nav>
    </header>
  );
}

/** What to show when hostGate() says no. Redirects signed-out users to sign in. */
export function GateMessage({ gate, title }: { gate: Exclude<HostGate, { ok: true }>; title: string }) {
  if (gate.reason === "signed_out") redirect("/host/login");
  const text =
    gate.reason === "demo"
      ? "This page isn't available in demo mode."
      : gate.reason === "not_host"
        ? `You are signed in as ${gate.email}, but you are not a host of this event. Ask the person who set it up to add you.`
        : "Host sign-in is not set up yet (SUPABASE_PUBLISHABLE_KEY is missing).";
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-2xl font-bold text-kumkum">{title}</h1>
      <p className="mt-3">{text}</p>
      <div className="mt-4 flex gap-3">
        <Link className="text-kumkum underline" href="/host?all=1">
          All events
        </Link>
        {gate.reason === "not_host" && <SignOutButton />}
      </div>
    </main>
  );
}
