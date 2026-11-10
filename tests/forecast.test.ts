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
