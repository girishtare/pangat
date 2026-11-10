import { describe, expect, it } from "vitest";
import { isEmailLinkType, passwordProblem, safeNext } from "@/lib/auth";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/host/e/x/guests")).toBe("/host/e/x/guests");
    expect(safeNext("/host?all=1")).toBe("/host?all=1");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "host", "/host\nx", "", null, undefined]) {
      expect(safeNext(bad as string)).toBe("/host");
    }
  });
});

describe("auth helpers", () => {
  it("accepts only the email link types we handle", () => {
    expect(isEmailLinkType("invite")).toBe(true);
    expect(isEmailLinkType("recovery")).toBe(true);
    expect(isEmailLinkType("magiclink")).toBe(false);
    expect(isEmailLinkType(null)).toBe(false);
  });

  it("checks passwords", () => {
    expect(passwordProblem("short")).toMatch(/10/);
    expect(passwordProblem("long enough pw")).toBeNull();
    expect(passwordProblem("long enough pw", "different one")).toMatch(/match/);
    expect(passwordProblem("long enough pw", "long enough pw")).toBeNull();
  });
});
