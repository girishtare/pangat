import { describe, expect, it } from "vitest";
import { normaliseMobile } from "@/lib/guestlist";
import { joinPhone, splitPhone } from "@/lib/phone";

describe("phone with a country code", () => {
  it("splits stored numbers for the form", () => {
    expect(splitPhone("+919876543210")).toEqual({ iso: "IN", local: "98765 43210" });
    expect(splitPhone("+971501234567")).toEqual({ iso: "AE", local: "501234567" });
    expect(splitPhone("+358401234567")).toEqual({ iso: "FI", local: "401234567" });
    expect(splitPhone("+14155550123").iso).toBe("US");
    expect(splitPhone(null)).toEqual({ iso: "IN", local: "" });
  });
  it("joins the picked country and the typed number", () => {
    expect(joinPhone("IN", "98765 43210")).toBe("+919876543210");
    expect(joinPhone("IN", "098765 43210")).toBe("+919876543210");
    expect(joinPhone("IN", "919876543210")).toBe("+919876543210");
    expect(joinPhone("AE", "050 123 4567")).toBe("+971501234567");
    expect(joinPhone("IN", "+44 7700 900123")).toBe("+44 7700 900123");
    expect(joinPhone("IN", "  ")).toBe("");
  });
  it("round-trips through the server check", () => {
    for (const s of ["+919876543210", "+971501234567", "+358401234567"]) {
      const { iso, local } = splitPhone(s);
      const n = normaliseMobile(joinPhone(iso, local));
      expect(n.ok && n.value).toBe(s);
    }
  });
});
