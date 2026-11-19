import { describe, expect, it } from "vitest";
import { cardFileName, cardLines, cardTypeOf, DEFAULT_LAYOUT, parseLayout, readLayouts } from "@/lib/cardName";

describe("name on the invitation card", () => {
  it("writes the name in the card's language, then the place", () => {
    const h = { nameEn: "Anita Shashikant Tare", nameMr: "अनिता शशिकांत तरे", location: "Borivali, Mumbai" };
    expect(cardLines("en", h)).toEqual(["Anita Shashikant Tare", "Borivali, Mumbai"]);
    expect(cardLines("mr", h)).toEqual(["अनिता शशिकांत तरे", "Borivali, Mumbai"]);
  });
  it("falls back to the English name, and leaves out a missing place", () => {
    expect(cardLines("mr", { nameEn: "Joshi family", nameMr: null, location: null })).toEqual(["Joshi family"]);
    expect(cardLines("en", { nameEn: " Joshi family ", nameMr: "", location: "  " })).toEqual(["Joshi family"]);
  });
  it("accepts a sensible placement and refuses one off the page", () => {
    expect(parseLayout(DEFAULT_LAYOUT.en)).toEqual(DEFAULT_LAYOUT.en);
    expect(parseLayout({ ...DEFAULT_LAYOUT.en, x: 0.8, w: 0.5 })).toBeNull();
    expect(parseLayout({ ...DEFAULT_LAYOUT.en, size: 0.5 })).toBeNull();
    expect(parseLayout({ ...DEFAULT_LAYOUT.en, y1: "x" })).toBeNull();
    expect(parseLayout(null)).toBeNull();
  });
  it("reads only valid saved placements", () => {
    const saved = readLayouts({ "bride-en": DEFAULT_LAYOUT.en, "bride-mr": { x: 2 }, "groom-xx": DEFAULT_LAYOUT.mr });
    expect(Object.keys(saved)).toEqual(["bride-en"]);
    expect(readLayouts(null)).toEqual({});
  });
  it("names the file and knows its type", () => {
    expect(cardFileName("Anita / Tare", "pdf")).toBe("Invitation card - Anita Tare.pdf");
    expect(cardTypeOf("x/bride-en-1.pdf")).toBe("application/pdf");
    expect(cardTypeOf("x/bride-en-1.webp")).toBe("image/webp");
  });
});
