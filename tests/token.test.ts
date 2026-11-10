import { describe, expect, it } from "vitest";
import { isPlausibleToken, newShortCode, newToken } from "@/lib/token";

describe("tokens", () => {
  it("makes unique URL-safe tokens", () => {
    const tokens = new Set(Array.from({ length: 500 }, newToken));
    expect(tokens.size).toBe(500);
    for (const tk of tokens) expect(isPlausibleToken(tk)).toBe(true);
  });

  it("makes short codes without look-alike characters", () => {
    for (let i = 0; i < 200; i++) expect(newShortCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });

  it("rejects junk tokens", () => {
    expect(isPlausibleToken("../etc")).toBe(false);
    expect(isPlausibleToken("short")).toBe(false);
  });
});
