import type { InviteFact, Side } from "./types";

/** A dashboard section: one side, or both together. */
export type Scope = "both" | Side;

const LABELS: Record<Scope, string> = {
  both: "Both sides",
  bride: "Bride's side",
  groom: "Groom's side",
};

export function scopeLabel(scope: Scope): string {
  return LABELS[scope];
}

/**
 * Sections to show a host. A one-side host sees only their side. A host of
 * both sides sees the combined total first, then each side that has guests.
 * (Row-level security has already removed rows the host may not see; this
 * only decides how to lay out what is left.)
 */
export function scopesFor(hostSide: Side | null, facts: InviteFact[]): Scope[] {
  if (hostSide) return [hostSide];
  const present = (["bride", "groom"] as const).filter((s) => facts.some((f) => f.side === s));
  return present.length > 1 ? ["both", ...present] : present.length === 1 ? [present[0]] : ["both"];
}

export function factsFor(scope: Scope, facts: InviteFact[]): InviteFact[] {
  return scope === "both" ? facts : facts.filter((f) => f.side === scope);
}
