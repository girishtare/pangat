import { describe, expect, it } from "vitest";
import { forecast, type ForecastInput } from "@/lib/forecast";

const yes = (heads: number, veg = heads): ForecastInput => ({ status: "yes", heads, veg, nonveg: heads - veg });
const no: ForecastInput = { status: "no", heads: 0, veg: 0, nonveg: 0 };
const pending: ForecastInput = { status: "pending", heads: 0, veg: 0, nonveg: 0 };

describe("forecast", () => {
  it("counts confirmed heads and diet from yes replies only", () => {
    const f = forecast([yes(4, 3), yes(2), no, pending], { yesShowRate: 1, pendingShowRate: 0 });
    expect(f.confirmedHeads).toBe(6);
    expect(f.veg).toBe(5);
    expect(f.nonveg).toBe(1);
    expect(f.expected).toBe(6);
    expect(f.responseRate).toBe(0.75);
  });

  it("discounts yes replies and estimates pending households", () => {
    // 10 confirmed heads over 2 households -> average 5.
    // 10 x 0.9 = 9, plus 2 pending x 5 x 0.4 = 4 -> 13.
    const f = forecast([yes(6), yes(4), pending, pending], { yesShowRate: 0.9, pendingShowRate: 0.4 });
    expect(f.avgHeadsPerYes).toBe(5);
    expect(f.expectedFromYes).toBeCloseTo(9);
    expect(f.expectedFromPending).toBeCloseTo(4);
    expect(f.expected).toBe(13);
  });

  it("uses the fallback household size before any yes arrives", () => {
    const f = forecast([pending, pending, no], { yesShowRate: 0.9, pendingShowRate: 0.5, fallbackHeads: 3 });
    expect(f.expected).toBe(3);
  });

  it("handles an empty list", () => {
    const f = forecast([], { yesShowRate: 0.9, pendingShowRate: 0.4 });
    expect(f.expected).toBe(0);
    expect(f.responseRate).toBe(0);
  });
});

describe("people by cap (owner, 12 Nov)", () => {
  const waiting = (cap: number | null): ForecastInput => ({ status: "pending", heads: 0, veg: 0, nonveg: 0, cap });

  it("adds up the caps of the invited cards, and counts cards without one", () => {
    const f = forecast([{ ...yes(3), cap: 4 }, waiting(5), waiting(null), { ...no, cap: 2 }], { yesShowRate: 0.9, pendingShowRate: 0.4 });
    expect(f.invitedHouseholds).toBe(4);
    expect(f.invitedPeople).toBe(11);
    expect(f.invitedWithoutCap).toBe(1);
  });

  it("estimates a pending card by its cap, and a card without a cap by the average per yes", () => {
    // Average per yes = 4. Pending people = 6 (cap) + 4 (no cap) = 10 -> 10 x 0.5 = 5. Plus 4 x 1 = 4 -> 9.
    const f = forecast([yes(4), waiting(6), waiting(null)], { yesShowRate: 1, pendingShowRate: 0.5 });
    expect(f.pendingPeople).toBe(10);
    expect(f.expectedFromPending).toBeCloseTo(5);
    expect(f.expected).toBe(9);
  });

  it("72 cards with a cap of 3 and no replies: 216 people, expected 216 x 40%", () => {
    const f = forecast(Array.from({ length: 72 }, () => waiting(3)), { yesShowRate: 0.9, pendingShowRate: 0.4 });
    expect(f.invitedPeople).toBe(216);
    expect(f.expected).toBe(86);
  });
});
