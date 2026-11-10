import type { Side } from "./types";

/**
 * Which "not us" requests a host sees: hosts of both sides see all; a one-side
 * host sees a request if the opened link or the matched household is on their
 * side. Details of a household on the other side stay hidden (see canNameMatch).
 */
export function canSeeLookup(hostSide: Side | null, openedSide: Side, matchedSide: Side | null): boolean {
  return hostSide === null || openedSide === hostSide || matchedSide === hostSide;
}

/** May this host see the matched household's name and send it its link? */
export function canNameMatch(hostSide: Side | null, matchedSide: Side | null): boolean {
  return matchedSide !== null && (hostSide === null || hostSide === matchedSide);
}
