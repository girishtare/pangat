import { describe, expect, it } from "vitest";
import { dayMonthYear, longStamp, shortDay, shortStamp, shortTime, shortWhen, slipDate } from "@/lib/when";

describe("host dates", () => {
  it("writes a short day in India time", () => {
    expect(shortDay("2026-12-28T06:00:00Z")).toBe("Mon 28 Dec");
    // 20:00 UTC on the 27th is already the 28th in India.
    expect(shortDay("2026-12-27T20:00:00Z")).toBe("Mon 28 Dec");
  });

  it("always writes hh:mm am/pm", () => {
    expect(shortTime("2026-12-27T04:30:00Z")).toBe("10:00 am");
    expect(shortTime("2026-12-28T06:00:00Z")).toBe("11:30 am");
    expect(shortTime("2026-12-28T13:30:00Z")).toBe("07:00 pm");
    expect(shortTime("2026-12-28T06:30:00Z")).toBe("12:00 pm");
  });

  it("joins day and time", () => {
    expect(shortWhen("2026-12-28T06:00:00Z")).toBe("Mon 28 Dec · 11:30 am");
    expect(shortStamp("2026-12-14T15:42:00Z")).toBe("14 Dec, 09:12 pm");
    expect(longStamp("2026-11-10T09:49:00Z")).toBe("10 Nov 2026, 03:19 pm");
  });

  it("writes the slip's reply-by date with an ordinal and the year", () => {
    expect(slipDate("2026-12-24T18:29:00Z").en).toBe("24th December 2026");
    expect(slipDate("2026-12-01T06:00:00Z").en).toBe("1st December 2026");
    expect(slipDate("2026-12-02T06:00:00Z").en).toBe("2nd December 2026");
    expect(slipDate("2026-12-03T06:00:00Z").en).toBe("3rd December 2026");
    expect(slipDate("2026-12-11T06:00:00Z").en).toBe("11th December 2026");
    expect(slipDate("2026-12-13T06:00:00Z").en).toBe("13th December 2026");
    expect(slipDate("2026-12-22T06:00:00Z").en).toBe("22nd December 2026");
    expect(slipDate("2026-12-24T06:00:00Z").mr).toContain("२०२६");
  });

  it("writes an event date with the year", () => {
    expect(dayMonthYear("2027-02-10T04:30:00Z")).toBe("10 Feb 2027");
  });
});
