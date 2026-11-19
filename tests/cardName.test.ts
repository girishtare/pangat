import { describe, expect, it } from "vitest";
import { cardFileName, cardLines, cardTypeOf, DEFAULT_LAYOUT, parseLayout, readLayouts, readPlaces } from "@/lib/cardName";

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
  it("adds सहपरिवार / and family when the card asks, once", () => {
    const h = { nameEn: "Anita Tare", nameMr: "अनिता तरे", location: null };
    expect(cardLines("mr", h, { family: true })).toEqual(["अनिता तरे सहपरिवार"]);
    expect(cardLines("en", h, { family: true })).toEqual(["Anita Tare and family"]);
    expect(cardLines("mr", { ...h, nameMr: "श्री. अ. जोशी सहपरिवार" }, { family: true })).toEqual(["श्री. अ. जोशी सहपरिवार"]);
    expect(cardLines("en", { ...h, nameEn: "Joshi family" }, { family: true })).toEqual(["Joshi family"]);
    expect(cardLines("mr", h)).toEqual(["अनिता तरे"]);
  });
  it("writes the place in Marathi on the Marathi card when the event has it", () => {
    const h = { nameEn: "Anita Tare", nameMr: "अनिता तरे", location: "Borivali, Mumbai" };
    const placesMr = { "Borivali, Mumbai": "बोरिवली, मुंबई" };
    expect(cardLines("mr", h, { placesMr })).toEqual(["अनिता तरे", "बोरिवली, मुंबई"]);
    expect(cardLines("en", h, { placesMr })).toEqual(["Anita Tare", "Borivali, Mumbai"]);
    expect(cardLines("mr", { ...h, location: "Pune" }, { placesMr })).toEqual(["अनिता तरे", "Pune"]);
    expect(readPlaces({ "Borivali, Mumbai": " बोरिवली ", Pune: "", Thane: 3 })).toEqual({ "Borivali, Mumbai": "बोरिवली" });
  });
  it("keeps the family setting with a placement", () => {
    expect(parseLayout(DEFAULT_LAYOUT.mr)?.family).toBe(true);
    expect(parseLayout({ ...DEFAULT_LAYOUT.en, family: "yes" })?.family).toBe(false);
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
