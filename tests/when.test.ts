import { describe, expect, it } from "vitest";
import { longStamp, shortDay, shortStamp, shortTime, shortWhen } from "@/lib/when";

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
});
