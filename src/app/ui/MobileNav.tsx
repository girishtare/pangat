"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
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
    <div className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur lg:hidden print:hidden">
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="event-menu"
          className="btn btn-secondary btn-sm shrink-0 px-3"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          <span>{open ? "Close" : "Menu"}</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold leading-tight text-kumkum">{eventName}</div>
          <div className="truncate text-xs text-ink-soft">
            {active?.label}
            {eventDate ? ` · ${eventDate}` : ""}
          </div>
        </div>
      </div>
      {open && (
        <nav id="event-menu" aria-label="Event" className="border-t border-line bg-paper px-4 pb-4 pt-2 shadow-lg">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-semibold ${
                    item.active ? "bg-kumkum text-white" : "text-ink hover:bg-paper-deep"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <p className="text-ink-soft">{who}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/host?all=1" className="btn btn-quiet btn-sm">
                All events
              </Link>
              {signOut}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
