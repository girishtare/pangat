import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarDays, LogOut, ShieldAlert } from "lucide-react";
import type { HostContext, HostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { scopeLabel } from "@/lib/sides";
import { Divider, Wordmark } from "../ui/kit";
import MobileNav from "../ui/MobileNav";
import { NavIcon, type NavItem, type NavKey } from "../ui/navIcons";
import { signOut } from "./actions";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOut}>
      <button type="submit" className={`btn btn-quiet ${compact ? "btn-sm" : ""}`}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}

function roleLabel(host: HostContext): string {
  return host.role === "owner" ? "Owner" : `Co-owner · ${host.side ? scopeLabel(host.side) : ""}`;
}

function navItems(host: HostContext, current: NavKey): NavItem[] {
  const base = `/host/e/${host.event.slug}`;
  const all: (Omit<NavItem, "active" | "icon"> & { ownerOnly?: boolean })[] = [
    { key: "dashboard", href: base, label: "Dashboard" },
    { key: "guests", href: `${base}/guests`, label: "Guest list" },
    { key: "slips", href: `${base}/slips`, label: "Slips" },
    { key: "whatsapp", href: `${base}/whatsapp`, label: "WhatsApp" },
    { key: "numbers", href: `${base}/numbers`, label: "Caterer numbers", ownerOnly: true },
    { key: "settings", href: `${base}/settings`, label: "Event settings", ownerOnly: true },
  ];
  return all
    .filter((i) => !i.ownerOnly || host.canManage)
    .map((i) => ({ key: i.key, href: i.href, label: i.label, icon: i.key, active: i.key === current }));
}

/**
 * Every page of one event: a compact rail on laptops, a top bar with a menu on
 * phones. Both are hidden when printing (slips).
 */
export function EventShell({ host, current, children }: { host: HostContext; current: NavKey; children: ReactNode }) {
  const items = navItems(host, current);
  const first = host.functions[0]?.startsAt;
  const date = first ? formatDay(first, "en") : null;
  const who = `${host.email} · ${roleLabel(host)}`;

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-line bg-paper-deep/60 px-4 py-6 lg:flex print:hidden">
        <Link href="/host?all=1" className="px-2" aria-label="Pangat: all events">
          <Wordmark small />
        </Link>
        <div className="mt-5 rounded-2xl border border-line bg-card px-3 py-3">
          <p className="wrap-names font-display text-base font-bold leading-snug text-kumkum">{host.event.name.en}</p>
          {host.event.name.mr && (
            <p lang="mr" className="wrap-names text-sm text-ink">
              {host.event.name.mr}
            </p>
          )}
          {date && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {date}
            </p>
          )}
        </div>
        <nav aria-label="Event" className="mt-5">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold transition-colors ${
                    item.active ? "bg-kumkum text-white shadow-sm" : "text-ink hover:bg-card"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-6">
          <Divider className="mb-4" />
          <p className="break-all px-2 text-xs text-ink-soft">{host.email}</p>
          <p className="px-2 text-xs font-semibold text-ink">{roleLabel(host)}</p>
          <div className="mt-2 flex flex-wrap items-center">
            <Link href="/host?all=1" className="btn btn-quiet btn-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All events
            </Link>
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      <MobileNav eventName={host.event.name.en} eventDate={date} items={items} who={who} signOut={<SignOutButton compact />} />

      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 print:p-0">
        <div className="mx-auto max-w-[72rem] print:max-w-none">{children}</div>
      </main>
    </div>
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
        : "Sign-in is not set up yet. Please try again later.";
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <Wordmark small />
      <div className="card mt-6 p-6">
        <ShieldAlert className="h-8 w-8 text-haldi-deep" aria-hidden="true" />
        <h1 className="mt-2 font-display text-2xl font-bold text-kumkum">{title}</h1>
        <p className="mt-2 text-ink">{text}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="btn btn-secondary" href="/host?all=1">
            All events
          </Link>
          {gate.reason === "not_host" && <SignOutButton />}
        </div>
      </div>
    </main>
  );
}
