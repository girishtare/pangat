export interface ForecastInput {
  status: "yes" | "no" | "pending";
  heads: number;
  veg: number;
  nonveg: number;
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
  expectedFromYes: number;
  expectedFromPending: number;
  /** The single number to compare with the family's baseline. */
  expected: number;
}

/**
 * Expected headcount for one function.
 *
 *   expected = confirmed heads x yesShowRate
 *            + pending households x average heads per yes x pendingShowRate
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

  const expectedFromYes = confirmedHeads * rates.yesShowRate;
  const expectedFromPending = pending.length * avgHeadsPerYes * rates.pendingShowRate;

  return {
    invitedHouseholds: rows.length,
    yesHouseholds: yes.length,
    noHouseholds: no.length,
    pendingHouseholds: pending.length,
    responseRate: rows.length > 0 ? (yes.length + no.length) / rows.length : 0,
    confirmedHeads,
    veg,
    nonveg,
    avgHeadsPerYes,
    expectedFromYes,
    expectedFromPending,
    expected: Math.round(expectedFromYes + expectedFromPending),
  };
}
