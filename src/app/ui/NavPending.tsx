"use client";

import { useLinkStatus } from "next/link";

/**
 * A small spinner inside a navigation link, shown from the moment it is
 * clicked until the new page is ready, so a tap never looks ignored
 * (owner, 12 Nov: "the site runs too slow"). Must sit inside a <Link>.
 */
export function NavPending({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent transition-opacity ${
        pending ? "animate-spin opacity-80" : "opacity-0"
      } ${className}`}
    />
  );
}
