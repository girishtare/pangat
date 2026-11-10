import { describe, expect, it } from "vitest";
import { canNameMatch, canSeeLookup } from "@/lib/lookup";

describe("not-us requests by side", () => {
  it("shows every request to a host of both sides", () => {
    expect(canSeeLookup(null, "bride", null)).toBe(true);
    expect(canSeeLookup(null, "groom", "bride")).toBe(true);
  });

  it("shows a one-side host requests touching their side", () => {
    expect(canSeeLookup("bride", "bride", null)).toBe(true);
    expect(canSeeLookup("bride", "groom", "bride")).toBe(true);
    expect(canSeeLookup("bride", "groom", "groom")).toBe(false);
    expect(canSeeLookup("bride", "groom", null)).toBe(false);
  });

  it("names the matched household only to hosts who may see it", () => {
    expect(canNameMatch(null, "groom")).toBe(true);
    expect(canNameMatch("groom", "groom")).toBe(true);
    expect(canNameMatch("bride", "groom")).toBe(false);
    expect(canNameMatch("bride", null)).toBe(false);
  });
});
