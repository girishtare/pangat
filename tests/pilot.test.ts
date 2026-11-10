import { describe, expect, it } from "vitest";
import { closer, readCount, splitByConfirmed, toCaterer } from "@/lib/pilot";

describe("pilot record", () => {
  it("splits the tool's number by the confirmed veg ratio", () => {
    expect(splitByConfirmed(100, 30, 10)).toEqual({ veg: 75, nonveg: 25 });
    expect(splitByConfirmed(7, 1, 2)).toEqual({ veg: 2, nonveg: 5 });
    expect(splitByConfirmed(50, 0, 0)).toBeNull();
  });

  it("sends the higher of baseline and tool to the caterer", () => {
    expect(toCaterer(700, 640)).toBe(700);
    expect(toCaterer(600, 640)).toBe(640);
    expect(toCaterer(null, 640)).toBe(640);
    expect(toCaterer(700, null)).toBe(700);
    expect(toCaterer(null, null)).toBeNull();
  });

  it("judges which number came closer to the actual count", () => {
    expect(closer({ baseline: 800, predicted: 690, actual: 700 })).toBe("tool");
    expect(closer({ baseline: 720, predicted: 650, actual: 700 })).toBe("baseline");
    expect(closer({ baseline: 710, predicted: 690, actual: 700 })).toBe("tie");
    expect(closer({ baseline: 710, predicted: null, actual: 700 })).toBeNull();
  });

  it("reads counts from form fields", () => {
    expect(readCount("  750 ")).toEqual({ ok: true, value: 750 });
    expect(readCount("1,200")).toEqual({ ok: true, value: 1200 });
    expect(readCount("")).toEqual({ ok: true, value: null });
    expect(readCount(null)).toEqual({ ok: true, value: null });
    expect(readCount("-3")).toEqual({ ok: false });
    expect(readCount("7.5")).toEqual({ ok: false });
    expect(readCount("100001")).toEqual({ ok: false });
  });
});
