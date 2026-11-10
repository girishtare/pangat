import { describe, expect, it } from "vitest";
import { defaultCutoff, defaultFunctions, istInputToIso, isoToIstInput, isValidDate, makeSlug } from "@/lib/events";

describe("default functions", () => {
  it("puts Haldi the day before, then Wedding and Reception on the day, in IST", () => {
    expect(defaultFunctions("2026-12-28")).toEqual([
      { nameEn: "Haldi", nameMr: "हळद", startsAt: "2026-12-27T10:00:00+05:30", catered: true, sortOrder: 1 },
      { nameEn: "Wedding", nameMr: "विवाह", startsAt: "2026-12-28T11:30:00+05:30", catered: true, sortOrder: 2 },
      { nameEn: "Reception", nameMr: "स्वागत समारंभ", startsAt: "2026-12-28T19:00:00+05:30", catered: true, sortOrder: 3 },
    ]);
  });

  it("handles a wedding on the first of a month", () => {
    expect(defaultFunctions("2027-01-01")[0].startsAt).toBe("2026-12-31T10:00:00+05:30");
  });

  it("closes replies 15 days before the wedding by default", () => {
    expect(defaultCutoff("2026-12-28")).toBe("2026-12-13T23:59");
  });
});

describe("IST date-time inputs", () => {
  it("round-trips a datetime-local value", () => {
    const iso = istInputToIso("2026-12-28T11:30");
    expect(iso).toBe("2026-12-28T11:30:00+05:30");
    expect(isoToIstInput(iso!)).toBe("2026-12-28T11:30");
  });

  it("converts UTC timestamps from the database back to IST", () => {
    expect(isoToIstInput("2026-12-28T06:00:00+00:00")).toBe("2026-12-28T11:30");
    expect(isoToIstInput("2026-12-27T20:00:00Z")).toBe("2026-12-28T01:30");
  });

  it("rejects malformed values", () => {
    expect(istInputToIso("28/12/2026 11:30")).toBeNull();
    expect(istInputToIso("2026-02-30T10:00")).toBeNull();
    expect(istInputToIso("2026-12-28T25:00")).toBeNull();
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
  });
});

describe("makeSlug", () => {
  it("builds a URL-safe name with a random tail", () => {
    expect(makeSlug("Riya & Arjun's Wedding!", () => "k3x9")).toBe("riya-arjun-s-wedding-k3x9");
  });

  it("falls back for names with no Latin letters", () => {
    expect(makeSlug("विवाह सोहळा", () => "a1b2")).toBe("event-a1b2");
  });

  it("matches the database's slug rule", () => {
    const rule = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
    for (const name of ["A", "Wedding", "x".repeat(80), "--Joshi--"]) expect(makeSlug(name, () => "zz99")).toMatch(rule);
  });
});
