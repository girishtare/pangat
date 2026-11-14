import { sentShare, type InviteModes } from "./invites";

/**
 * Sorting the guest list by any column. Ties fall back to the English name, so
 * the order is always stable and predictable.
 */
export const GUEST_SORTS = ["name", "side", "mobile", "location", "code", "invited", "replied", "sent", "cap"] as const;
export type GuestSort = (typeof GUEST_SORTS)[number];
export type SortDir = "asc" | "desc";

export interface SortableGuest {
  nameEn: string;
  side: "bride" | "groom";
  mobile: string | null;
  location?: string | null;
  shortCode: string;
  functionIds: string[];
  replied: string[];
  softCap: number | null;
  /** How they are to be invited and what has gone out. */
  invite?: InviteModes;
}

export function parseSort(sort: string | undefined, dir: string | undefined): { sort: GuestSort | null; dir: SortDir } {
  const s = GUEST_SORTS.find((k) => k === sort) ?? null;
  return { sort: s, dir: dir === "desc" ? "desc" : "asc" };
}

const byName = (a: SortableGuest, b: SortableGuest) => a.nameEn.localeCompare(b.nameEn, "en", { sensitivity: "base", numeric: true });

/** Share of invited functions answered: 0 = no reply, 1 = all. */
const replyShare = (g: SortableGuest) => (g.functionIds.length ? g.replied.length / g.functionIds.length : 0);

/** Returns a new, sorted array. Blanks (no mobile, no location, no cap) always go last, whichever way. */
export function sortGuests<T extends SortableGuest>(rows: T[], sort: GuestSort | null, dir: SortDir): T[] {
  if (!sort) return rows;
  const sign = dir === "desc" ? -1 : 1;
  const blanksLast = (a: string | number | null, b: string | number | null, cmp: () => number) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return sign * cmp();
  };
  const cmp = (a: T, b: T): number => {
    switch (sort) {
      case "name":
        return sign * byName(a, b);
      case "side":
        return sign * a.side.localeCompare(b.side);
      case "mobile":
        return blanksLast(a.mobile, b.mobile, () => a.mobile!.localeCompare(b.mobile!));
      case "location":
        return blanksLast(a.location ?? null, b.location ?? null, () => a.location!.localeCompare(b.location!, "en", { sensitivity: "base" }));
      case "code":
        return sign * a.shortCode.localeCompare(b.shortCode);
      case "invited":
        return sign * (a.functionIds.length - b.functionIds.length);
      case "replied":
        return sign * (replyShare(a) - replyShare(b));
      case "sent":
        // Share of the chosen modes sent: none first going up.
        return sign * ((a.invite ? sentShare(a.invite) : 0) - (b.invite ? sentShare(b.invite) : 0));
      case "cap":
        return blanksLast(a.softCap, b.softCap, () => a.softCap! - b.softCap!);
    }
  };
  return [...rows].sort((a, b) => cmp(a, b) || byName(a, b));
}
