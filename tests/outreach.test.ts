import { encode } from "uqr";
import { describe, expect, it } from "vitest";
import { chunk, DEFAULT_TEXT, displayPhone, fillMessage, guestLink, whatsappLink } from "@/lib/outreach";
import { qrPath } from "@/lib/qr";

const vars = {
  name: "Shri. A. Joshi & family",
  nameMr: "श्री. अ. जोशी सहपरिवार",
  event: "Riya & Arjun's Wedding",
  eventMr: null,
  date: "13 December",
  dateMr: "१३ डिसेंबर",
  phone: "98765 43210",
  link: "https://pangat.example/r/abcDEF123_-xyz",
};

describe("messages", () => {
  it("fills every placeholder, falling back to English for missing Marathi", () => {
    const text = fillMessage(DEFAULT_TEXT.invite, vars);
    expect(text).toContain("नमस्कार श्री. अ. जोशी सहपरिवार!");
    expect(text).toContain("Riya & Arjun's Wedding साठी"); // event_mr missing → English name
    expect(text).toContain("by 13 December");
    expect(text).toContain("१३ डिसेंबर पर्यंत");
    expect(text.endsWith(vars.link)).toBe(true);
    expect(text).not.toMatch(/\{[a-z_]+\}/);
    expect(fillMessage(DEFAULT_TEXT.reminder, vars)).not.toMatch(/\{[a-z_]+\}/);
  });

  it("leaves unknown braces alone and handles a missing phone", () => {
    expect(fillMessage("{phone}|{nope}|{name}", { ...vars, phone: null })).toBe("|{nope}|Shri. A. Joshi & family");
    // New _en names and the old unsuffixed ones fill the same.
    expect(fillMessage("{name_en}|{name}|{event_en}|{event}", vars)).toBe(`${vars.name}|${vars.name}|${vars.event}|${vars.event}`);
  });

  it("builds wa.me links from stored mobiles", () => {
    const link = whatsappLink("+919876543210", "Hello & नमस्कार\nline two");
    expect(link).toBe(`https://wa.me/919876543210?text=${encodeURIComponent("Hello & नमस्कार\nline two")}`);
    expect(decodeURIComponent(new URL(link!).searchParams.get("text")!)).toBe("Hello & नमस्कार\nline two");
    expect(whatsappLink(null, "x")).toBeNull();
    expect(whatsappLink("+12", "x")).toBeNull();
  });

  it("marks QR links so replies record the channel", () => {
    expect(guestLink("https://pangat.example/", "tok123", "qr")).toBe("https://pangat.example/r/tok123?s=q");
    expect(guestLink("https://pangat.example", "tok123", "link")).toBe("https://pangat.example/r/tok123");
    expect(guestLink("https://pangat.example", "tok123", "qr", "en")).toBe("https://pangat.example/r/tok123?s=q&l=en");
  });

  it("shows Indian mobiles as people write them", () => {
    expect(displayPhone("+919876543210")).toBe("98765 43210");
    expect(displayPhone("+447700900123")).toBe("+447700900123");
    expect(displayPhone(null)).toBeNull();
  });

  it("pages slips eight to a sheet", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 8)).toEqual([[1, 2, 3, 4, 5, 6, 7, 8], [9, 10]]);
    expect(chunk([], 8)).toEqual([]);
  });
});

describe("QR codes", () => {
  it("draws exactly the dark modules of the encoded link", () => {
    const text = "https://pangat-tau.vercel.app/r/AbCdEfGhIjKlMnOpQrStUv?s=q";
    const { size, d } = qrPath(text);
    const { data } = encode(text, { ecc: "M", border: 0 });
    expect(size).toBe(data.length);
    const dark = data.flat().filter(Boolean).length;
    const painted = [...d.matchAll(/h(\d+)v1/g)].reduce((sum, m) => sum + Number(m[1]), 0);
    expect(painted).toBe(dark);
    expect(size).toBeLessThanOrEqual(41); // version 6 or smaller: prints sharply at 30 mm
  });
});
