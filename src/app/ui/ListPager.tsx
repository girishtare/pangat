import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavPending } from "./NavPending";

/**
 * Previous / Next for a server-rendered list shown a page at a time
 * ("Page 2 of 8 · 51–100 of 400"). Plain links, so it works without JavaScript
 * and the page survives a reload.
 */
export function ListPager({
  at,
  pages,
  first,
  last,
  total,
  prevHref,
  nextHref,
  where,
}: {
  at: number;
  pages: number;
  first: number;
  last: number;
  total: number;
  prevHref: string | null;
  nextHref: string | null;
  where: "top" | "bottom";
}) {
  const btn = "btn btn-secondary btn-sm min-h-10";
  const off = `${btn} pointer-events-none opacity-50`;
  return (
    <nav aria-label={where === "top" ? "Pages" : "Pages (bottom)"} className={`flex items-center justify-between gap-2 ${where === "top" ? "mt-4" : "mt-3"}`}>
      {prevHref ? (
        <Link href={prevHref} scroll={where === "bottom"} className={btn}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
          <NavPending />
        </Link>
      ) : (
        <span className={off} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </span>
      )}
      <p className="text-center text-sm">
        <span className="font-semibold">
          Page {at} of {pages}
        </span>
        <span className="text-ink-soft max-sm:block">
          <span className="max-sm:hidden"> · </span>
          {first}–{last} of {total}
        </span>
      </p>
      {nextHref ? (
        <Link href={nextHref} scroll={where === "bottom"} className={btn}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <NavPending />
        </Link>
      ) : (
        <span className={off} aria-disabled="true">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
