import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n";
import { eventDays, splitLead } from "@/lib/text";

describe("splitLead", () => {
  it("splits after the first sentence and keeps the wording", () => {
    expect(splitLead("Sorry about that. Enter your mobile number.")).toEqual(["Sorry about that.", "Enter your mobile number."]);
    expect(splitLead("Thank you! We look forward to seeing you.")).toEqual(["Thank you!", "We look forward to seeing you."]);
  });

  it("returns a one-sentence message whole", () => {
    expect(splitLead("Please answer for every function.")).toEqual(["Please answer for every function.", ""]);
  });

  it("splits the guest messages in both languages without losing text", () => {
    for (const lang of ["en", "mr"] as const) {
      for (const key of ["notUsAsk", "thanksYes", "thanksNo", "notFound"] as const) {
        const whole = t(lang, key);
        const [lead, rest] = splitLead(whole);
        expect(rest).not.toBe("");
        expect(`${lead} ${rest}`).toBe(whole);
      }
    }
  });
});

describe("eventDays", () => {
  it("gives one day with its weekday", () => {
    const d = eventDays(["2026-12-28T05:30:00Z", "2026-12-28T13:30:00Z"], "en");
    expect(d).toContain("Monday");
    expect(d).toContain("28");
    expect(d).toContain("December");
  });

  it("gives a span across days", () => {
    const d = eventDays(["2026-12-28T13:30:00Z", "2026-12-27T04:30:00Z"], "en") ?? "";
    expect(d).toContain("27");
    expect(d).toContain("28");
    expect(d).not.toContain("Sunday");
  });

  it("uses India time for the day", () => {
    // 20:00 UTC on the 27th is 01:30 on the 28th in India.
    expect(eventDays(["2026-12-27T20:00:00Z"], "en")).toContain("28");
  });

  it("is empty without functions", () => {
    expect(eventDays([], "en")).toBeNull();
  });
});
