import { describe, expect, it } from "vitest";
import { shortDay, shortStamp, shortTime, shortWhen } from "@/lib/when";

describe("host dates", () => {
  it("writes a short day in India time", () => {
    expect(shortDay("2026-12-28T06:00:00Z")).toBe("Mon 28 Dec");
    // 20:00 UTC on the 27th is already the 28th in India.
    expect(shortDay("2026-12-27T20:00:00Z")).toBe("Mon 28 Dec");
  });

  it("drops :00 on whole hours", () => {
    expect(shortTime("2026-12-27T04:30:00Z")).toBe("10 am");
    expect(shortTime("2026-12-28T06:00:00Z")).toBe("11:30 am");
    expect(shortTime("2026-12-28T13:30:00Z")).toBe("7 pm");
  });

  it("joins day and time", () => {
    expect(shortWhen("2026-12-28T06:00:00Z")).toBe("Mon 28 Dec · 11:30 am");
    expect(shortStamp("2026-12-14T15:42:00Z")).toBe("14 Dec, 9:12 pm");
  });
});
