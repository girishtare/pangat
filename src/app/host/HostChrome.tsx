import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LayoutList, LogOut, ShieldAlert } from "lucide-react";
import type { HostContext, HostGate } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { shortDay } from "@/lib/when";
import { Mark, Wordmark } from "../ui/kit";
import MobileNav from "../ui/MobileNav";
import { NavIcon, type NavItem, type NavKey } from "../ui/navIcons";
import { signOut } from "./actions";

export function SignOutButton({ compact = false, variant = "button" }: { compact?: boolean; variant?: "button" | "rail" }) {
  if (variant === "rail") {
    return (
      <form action={signOut}>
        <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-1.5 font-semibold text-kumkum hover:bg-paper">
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </form>
    );
  }
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

/** "You are the owner", or the co-owner's side, for the rail's event card. */
function roleLine(host: HostContext): string {
  return host.role === "owner" ? "You are the owner" : `Co-owner · ${host.side ? scopeLabel(host.side) : ""}`;
}

/**
 * Every page of one event: a rail on laptops, a top bar with a menu on
 * phones. Both are hidden when printing (slips).
 */
export function EventShell({ host, current, children }: { host: HostContext; current: NavKey; children: ReactNode }) {
  const items = navItems(host, current);
  const first = host.functions[0]?.startsAt;
  const date = first ? shortDay(first) : null;
  const who = `${host.email} · ${roleLabel(host)}`;

  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-line bg-card px-4 py-6 lg:flex print:hidden">
        <Link href="/host?all=1" className="flex items-center gap-2 self-start px-2 font-display text-2xl leading-none text-kumkum" aria-label="Pangat: all events">
          <Mark className="h-[26px] w-[26px]" />
          Pangat
        </Link>
        <p className="mx-2 mt-3 text-[0.9375rem] text-ink-soft [overflow-wrap:anywhere]">
          {host.email} · {roleLabel(host)}
        </p>
        <div className="mx-2 mt-4 rounded-[14px] bg-sand p-3.5">
          <p className="wrap-names font-display text-xl leading-[1.3] text-kumkum">{host.event.name.en}</p>
          {host.event.name.mr && (
            <p lang="mr" className="wrap-names text-[0.9375rem] text-ink-soft">
              {host.event.name.mr}
            </p>
          )}
          <p className="mt-1 text-sm text-ink-soft">{[date, roleLine(host)].filter(Boolean).join(" · ")}</p>
        </div>
        <nav aria-label="Event" className="mt-[18px]">
          <ul className="grid gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 transition-colors ${
                    item.active ? "bg-kumkum font-bold text-white" : "font-semibold text-ink hover:bg-paper"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mx-2 mt-[18px] border-y border-line py-1">
          <Link href="/host?all=1" className="flex min-h-12 items-center gap-3 rounded-xl px-1.5 font-semibold text-ink hover:bg-paper">
            <LayoutList className="h-5 w-5 shrink-0" aria-hidden="true" />
            All events
          </Link>
        </div>
        <div className="mx-2 mt-auto pt-6">
          <SignOutButton variant="rail" />
        </div>
      </aside>

      <MobileNav eventName={host.event.name.en} eventDate={date} items={items} who={who} signOut={<SignOutButton variant="rail" />} />

      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8 print:p-0">
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
        <h1 className="mt-2 font-display text-2xl text-kumkum">{title}</h1>
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
