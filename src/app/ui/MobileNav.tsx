"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutList, Menu, X } from "lucide-react";
import { NavIcon, type NavItem } from "./navIcons";

/** Phone and tablet: a top bar with the event name and a menu button. */
export default function MobileNav({
  eventName,
  eventDate,
  items,
  who,
  signOut,
}: {
  eventName: string;
  eventDate: string | null;
  items: NavItem[];
  who: string;
  signOut: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const active = items.find((i) => i.active);

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-card lg:hidden print:hidden">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="event-menu"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border-2 border-kumkum bg-card px-3 text-[0.9375rem] font-bold text-kumkum hover:bg-kumkum-soft"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          <span>{open ? "Close" : "Menu"}</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg leading-[1.25] text-kumkum">{eventName}</div>
          <div className="truncate text-[0.8125rem] text-ink-soft">
            {active?.label}
            {eventDate ? ` · ${eventDate}` : ""}
          </div>
        </div>
      </div>
      {open && (
        <nav id="event-menu" aria-label="Event" className="border-t border-line bg-card px-4 pb-4 pt-3 shadow-lg">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-[0.9375rem] ${
                    item.active ? "bg-kumkum font-bold text-white" : "font-semibold text-ink hover:bg-paper"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-y border-line py-1">
            <Link href="/host?all=1" className="flex min-h-12 items-center gap-3 rounded-xl px-3.5 font-semibold text-ink hover:bg-paper">
              <LayoutList className="h-5 w-5 shrink-0" aria-hidden="true" />
              All events
            </Link>
          </div>
          <p className="mt-3 px-3.5 text-sm text-ink-soft [overflow-wrap:anywhere]">{who}</p>
          <div className="px-2">{signOut}</div>
        </nav>
      )}
    </div>
  );
}
