export interface ForecastInput {
  status: "yes" | "no" | "pending";
  heads: number;
  veg: number;
  nonveg: number;
  /** The card's cap: the most people it covers (null = not set). */
  cap?: number | null;
}

export interface ForecastRates {
  /** Share of people who said yes that actually turn up. */
  yesShowRate: number;
  /** Share of still-silent households that turn up anyway. */
  pendingShowRate: number;
  /** Heads per household to assume before any yes has come in. */
  fallbackHeads?: number;
}

export interface Forecast {
  invitedHouseholds: number;
  /** People on the invited cards: their caps added up (cards without a cap aren't counted). */
  invitedPeople: number;
  /** Invited cards with no cap, so not in invitedPeople. */
  invitedWithoutCap: number;
  yesHouseholds: number;
  noHouseholds: number;
  pendingHouseholds: number;
  /** Responded households / invited households, 0..1. */
  responseRate: number;
  /** Heads exactly as guests reported them. */
  confirmedHeads: number;
  veg: number;
  nonveg: number;
  avgHeadsPerYes: number;
  /** People on the cards not replied yet: each card's cap, or the average per yes when it has none. */
  pendingPeople: number;
  expectedFromYes: number;
  expectedFromPending: number;
  /** The single number to compare with the family's baseline. */
  expected: number;
}

/**
 * Expected headcount for one function.
 *
 *   expected = confirmed heads x yesShowRate
 *            + people on pending cards x pendingShowRate
 *
 * People on a pending card = its cap (owner, 12 Nov: "use the cap to count the
 * number of people"), or the average heads per yes when it has no cap.
 *
 * Both rates are guesses until a real event has been counted; they live on
 * the event row so they can be tuned afterwards.
 */
export function forecast(rows: ForecastInput[], rates: ForecastRates): Forecast {
  const yes = rows.filter((r) => r.status === "yes");
  const no = rows.filter((r) => r.status === "no");
  const pending = rows.filter((r) => r.status === "pending");

  const confirmedHeads = yes.reduce((sum, r) => sum + r.heads, 0);
  const veg = yes.reduce((sum, r) => sum + r.veg, 0);
  const nonveg = yes.reduce((sum, r) => sum + r.nonveg, 0);
  const avgHeadsPerYes = yes.length > 0 ? confirmedHeads / yes.length : (rates.fallbackHeads ?? 2);

  const capOf = (r: ForecastInput) => (typeof r.cap === "number" && r.cap > 0 ? r.cap : null);
  const invitedPeople = rows.reduce((sum, r) => sum + (capOf(r) ?? 0), 0);
  const invitedWithoutCap = rows.filter((r) => capOf(r) === null).length;
  const pendingPeople = pending.reduce((sum, r) => sum + (capOf(r) ?? avgHeadsPerYes), 0);

  const expectedFromYes = confirmedHeads * rates.yesShowRate;
  const expectedFromPending = pendingPeople * rates.pendingShowRate;

  return {
    invitedHouseholds: rows.length,
    invitedPeople,
    invitedWithoutCap,
    yesHouseholds: yes.length,
    noHouseholds: no.length,
    pendingHouseholds: pending.length,
    responseRate: rows.length > 0 ? (yes.length + no.length) / rows.length : 0,
    confirmedHeads,
    veg,
    nonveg,
    avgHeadsPerYes,
    pendingPeople,
    expectedFromYes,
    expectedFromPending,
    expected: Math.round(expectedFromYes + expectedFromPending),
  };
}
