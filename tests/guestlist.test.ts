import { describe, expect, it } from "vitest";
import { checkSheet, normaliseMobile, parseSide, parseTable, type FunctionRef } from "@/lib/guestlist";

const functions: FunctionRef[] = [
  { id: "f-haldi", name: { en: "Haldi", mr: "हळद" } },
  { id: "f-wedding", name: { en: "Wedding", mr: "विवाह" } },
  { id: "f-reception", name: { en: "Reception", mr: "स्वागत समारंभ" } },
];
const all = ["f-haldi", "f-wedding", "f-reception"];

const check = (text: string, hostSide: "bride" | "groom" | null = null, existing = [] as Parameters<typeof checkSheet>[0]["existing"]) =>
  checkSheet({ text, functions, hostSide, existing });

describe("parseTable", () => {
  it("reads tab-separated text copied from a sheet", () => {
    expect(parseTable("Name\tSide\r\nJoshi\tbride\r\n")).toEqual([["Name", "Side"], ["Joshi", "bride"]]);
  });

  it("reads CSV with quoted commas and quotes", () => {
    expect(parseTable('Name,Functions\n"Joshi, A.","Wedding, Reception"\n"Say ""hi""",all')).toEqual([
      ["Name", "Functions"],
      ["Joshi, A.", "Wedding, Reception"],
      ['Say "hi"', "all"],
    ]);
  });
});

describe("normaliseMobile", () => {
  it("turns Indian numbers in any common form into +91", () => {
    for (const raw of ["98765 43210", "09876543210", "919876543210", "+91 98765-43210", "0091 9876543210"]) {
      expect(normaliseMobile(raw)).toEqual({ ok: true, value: "+919876543210" });
    }
  });

  it("keeps foreign numbers with a country code", () => {
    expect(normaliseMobile("+44 7700 900123")).toEqual({ ok: true, value: "+447700900123" });
  });

  it("allows blank and rejects nonsense", () => {
    expect(normaliseMobile("  ")).toEqual({ ok: true, value: null });
    expect(normaliseMobile("12345")).toEqual({ ok: false });
    expect(normaliseMobile("+91 12345 67890")).toEqual({ ok: false });
    expect(normaliseMobile("+00000000")).toEqual({ ok: false });
    expect(normaliseMobile("0000000000")).toEqual({ ok: false });
    expect(normaliseMobile("call uncle")).toEqual({ ok: false });
  });
});

describe("parseSide", () => {
  it("understands English, short and Marathi forms", () => {
    expect(parseSide("Bride's")).toBe("bride");
    expect(parseSide("G")).toBe("groom");
    expect(parseSide("वधू")).toBe("bride");
    expect(parseSide("वर")).toBe("groom");
    expect(parseSide("both")).toBeNull();
  });
});

describe("checkSheet", () => {
  it("builds households from a clean sheet", () => {
    const r = check("Name\tMarathi name\tSide\tMobile\tFunctions\tCap\nShri A Joshi\tश्री अ जोशी\tbride\t9876543210\t\t6\nDr G Sathe\t\tgroom\t9123456789\tWedding, Reception\t");
    expect(r.problem).toBeNull();
    expect(r.counts).toEqual({ new: 2, exists: 0, error: 0 });
    expect(r.rows[0].draft).toEqual({
      side: "bride", nameEn: "Shri A Joshi", nameMr: "श्री अ जोशी", mobile: "+919876543210", softCap: 6, location: null, notes: null, functionIds: all,
    });
    expect(r.rows[1].draft?.functionIds).toEqual(["f-wedding", "f-reception"]);
    expect(r.rows[1].line).toBe(3);
  });

  it("accepts header names in other words and columns in any order", () => {
    const r = check("Phone,Family name,Side\n98765 43210,Kale,Groom's");
    expect(r.rows[0].draft).toMatchObject({ nameEn: "Kale", side: "groom", mobile: "+919876543210" });
  });

  it("matches functions by Marathi name too", () => {
    const r = check("Name\tSide\tFunctions\nPatil\tbride\tहळद; विवाह");
    expect(r.rows[0].draft?.functionIds).toEqual(["f-haldi", "f-wedding"]);
  });

  it("needs a Name column", () => {
    expect(check("Joshi\tbride\nKale\tgroom").problem).toMatch(/Name/);
  });

  it("needs a Side column for a host of both sides, but not for a one-side host", () => {
    expect(check("Name\nJoshi").problem).toMatch(/Side/);
    const r = check("Name\nJoshi", "bride");
    expect(r.rows[0].draft?.side).toBe("bride");
  });

  it("stops a one-side host adding to the other side", () => {
    const r = check("Name\tSide\nKale\tgroom", "bride");
    expect(r.rows[0].status).toBe("error");
    expect(r.rows[0].errors.join()).toMatch(/bride's side/);
  });

  it("reports every problem on a row, with the sheet's row number", () => {
    const r = check("Name\tSide\tMobile\tFunctions\tCap\n\tuncle\t123\tSangeet\t50");
    expect(r.rows[0].line).toBe(2);
    expect(r.rows[0].status).toBe("error");
    expect(r.rows[0].errors).toHaveLength(5);
    expect(r.counts.error).toBe(1);
  });

  it("flags duplicates inside the paste", () => {
    const r = check("Name\tSide\tMobile\nJoshi\tbride\t9876543210\nKulkarni\tbride\t+91 98765 43210\nJoshi.\tbride\t");
    expect(r.rows[1].errors.join()).toMatch(/row 2/);
    expect(r.rows[2].errors.join()).toMatch(/row 2/);
  });

  it("skips households already in the list, by name or by mobile", () => {
    const existing = [
      { side: "bride" as const, nameEn: "Shri. A. Joshi", mobile: null },
      { side: "bride" as const, nameEn: "Kulkarni", mobile: "+919876543210" },
    ];
    const r = check("Name\tSide\tMobile\nShri A Joshi\tbride\t\nB Kulkarni & family\tbride\t9876543210\nPatil\tbride\t", null, existing);
    expect(r.rows.map((x) => x.status)).toEqual(["exists", "exists", "new"]);
    expect(r.counts).toEqual({ new: 1, exists: 2, error: 0 });
  });

  it("warns, but allows, a mobile that is already on the other side", () => {
    const existing = [{ side: "groom" as const, nameEn: "Kale", mobile: "+919876543210" }];
    const r = check("Name\tSide\tMobile\nKale\tbride\t9876543210", null, existing);
    expect(r.rows[0].status).toBe("new");
    expect(r.rows[0].warnings.join()).toMatch(/groom's side/);
  });

  it("warns when there is no mobile", () => {
    const r = check("Name\tSide\nJoshi\tbride");
    expect(r.rows[0].status).toBe("new");
    expect(r.rows[0].warnings.join()).toMatch(/WhatsApp/);
  });

  it("ignores blank lines and explains an empty paste", () => {
    expect(check("").problem).toBeTruthy();
    expect(check("Name\tSide\n\n\t\n").problem).toMatch(/no guests/);
    expect(check("\nName\tSide\n\nJoshi\tbride\n").rows[0].line).toBe(4);
  });
});

describe("Excel rows", () => {
  it("prefers the Guests sheet, otherwise the first", async () => {
    const { pickSheet } = await import("@/lib/guestlist");
    const a = { sheet: "How to fill", data: [] };
    const b = { sheet: " guests ", data: [] };
    expect(pickSheet([a, b])).toBe(b);
    expect(pickSheet([a])).toBe(a);
    expect(pickSheet([])).toBeNull();
  });

  it("turns cells into the same text as a paste, and the checks still apply", async () => {
    const { rowsToText } = await import("@/lib/guestlist");
    const text = rowsToText([
      ["Name", "Marathi name", "Side", "Mobile", "Functions", "Cap"],
      ["Shri A Joshi", "श्री अ जोशी", "bride", 9876543210, "Wedding, Reception", 6],
      ["Line\nbreak\tname", null, "groom", "+91 91234 56789", undefined, null],
    ]);
    expect(text.split("\n")[1]).toBe("Shri A Joshi\tश्री अ जोशी\tbride\t9876543210\tWedding, Reception\t6");
    const r = check(text);
    expect(r.counts).toEqual({ new: 2, exists: 0, error: 0 });
    expect(r.rows[0].draft).toMatchObject({ mobile: "+919876543210", softCap: 6, functionIds: ["f-wedding", "f-reception"] });
    expect(r.rows[1].draft).toMatchObject({ nameEn: "Line break name", mobile: "+919123456789", functionIds: all });
  });

  it("writes dates as plain dates and keeps large integers exact", async () => {
    const { rowsToText } = await import("@/lib/guestlist");
    expect(rowsToText([[new Date("2026-12-28T00:00:00Z"), 919876543210, 1.5, true]])).toBe("2026-12-28\t919876543210\t1.5\tyes");
  });
});

describe("one Yes column per function (template, 12 Nov)", () => {
  it("invites each household to the functions marked Yes", () => {
    const r = check("Name\tSide\tHaldi\tWedding\tReception\nJoshi\tbride\tYes\t\tyes\nSathe\tgroom\t\tYes\tNo\nPatil\tbride\t✓\tx\tहो");
    expect(r.counts).toEqual({ new: 3, exists: 0, error: 0 });
    expect(r.rows[0].draft?.functionIds).toEqual(["f-haldi", "f-reception"]);
    expect(r.rows[1].draft?.functionIds).toEqual(["f-wedding"]);
    expect(r.rows[2].draft?.functionIds).toEqual(all);
  });

  it("needs at least one Yes, and flags anything other than Yes / No / blank", () => {
    const r = check("Name\tSide\tHaldi\tWedding\nJoshi\tbride\t\t\nSathe\tgroom\tmaybe\tYes");
    expect(r.rows[0].errors).toContain("Not invited to any function: put Yes under at least one.");
    expect(r.rows[1].errors).toContain('Under "Haldi", "maybe" should be Yes or blank.');
  });

  it("matches headers by Marathi name and ignores a leftover Functions column", () => {
    const r = check("Name\tSide\tFunctions\tहळद\tविवाह\nJoshi\tbride\tall\tYes\t");
    expect(r.rows[0].draft?.functionIds).toEqual(["f-haldi"]);
    expect(r.rows[0].warnings.some((w) => w.includes("Functions"))).toBe(true);
  });

  it("only the listed function columns count; functions without a column are not invited", () => {
    const r = check("Name\tSide\tWedding\nJoshi\tbride\tYes");
    expect(r.rows[0].draft?.functionIds).toEqual(["f-wedding"]);
  });
});

describe("columns from an out-of-date template", () => {
  it("stops on a Yes column that isn't one of the event's functions (renamed since download)", () => {
    const r = check("Name\tSide\tSangeet\tWedding\nJoshi\tbride\tYes\tYes\nSathe\tgroom\t\tYes");
    expect(r.problem).toBe(
      'Column "Sangeet" isn\'t one of this event\'s functions (Haldi, Wedding, Reception). Rename the column to match, or download a fresh template.',
    );
    expect(r.rows).toEqual([]);
  });

  it("still ignores other extra columns, like a relation or numbers", () => {
    const r = check("Name\tSide\tRelation\tCount\tWedding\nJoshi\tbride\tuncle's side\t3\tYes\nSathe\tgroom\t\t1\tYes");
    expect(r.problem).toBeNull();
    expect(r.counts.new).toBe(2);
  });
});

describe("location and comments / notes (12 Nov)", () => {
  it("reads both, from the template's headers", () => {
    const r = check("Name\tSide\tMobile\tLocation\tWedding\tCap\tComments / Notes\nJoshi\tbride\t9876543210\t Borivali,  Mumbai \tYes\t4\tComing a day early");
    expect(r.rows[0].draft).toMatchObject({ location: "Borivali, Mumbai", notes: "Coming a day early", softCap: 4, functionIds: ["f-wedding"] });
  });

  it("keeps them blank when missing, and flags ones that are too long", () => {
    expect(check("Name\tSide\nJoshi\tbride").rows[0].draft).toMatchObject({ location: null, notes: null });
    const r = check(`Name\tSide\tLocation\tNotes\nJoshi\tbride\t${"x".repeat(81)}\t${"y".repeat(501)}`);
    expect(r.rows[0].errors).toHaveLength(2);
  });
});

describe("same name, different family (12 Nov)", () => {
  it("two rows with the same name but a different mobile or location are both new", () => {
    const r = check(
      "Name\tSide\tMobile\tLocation\nRamesh Tare\tbride\t9876543210\tBorivali, Mumbai\nRamesh Tare\tbride\t9123456789\tThane\nRamesh Tare\tbride\t\tEdvan, Palghar",
    );
    expect(r.counts).toEqual({ new: 3, exists: 0, error: 0 });
  });

  it("is still a duplicate when nothing tells them apart (blank doesn't count as different)", () => {
    const r = check("Name\tSide\tMobile\tLocation\nRamesh Tare\tbride\t9876543210\tBorivali\nRamesh Tare\tbride\t\tborivali");
    expect(r.rows[1].errors.join()).toMatch(/row 2/);
  });

  it("against the existing list: a different location makes a new household; the same or blank is skipped", () => {
    const existing = [{ side: "bride" as const, nameEn: "Ramesh Tare", mobile: null, location: "Borivali, Mumbai" }];
    const r = check("Name\tSide\tLocation\nRamesh Tare\tbride\tEdvan, Palghar\nRamesh Tare\tbride\tborivali mumbai", null, existing);
    expect(r.rows.map((x) => x.status)).toEqual(["new", "exists"]);
    expect(check("Name\tSide\nRamesh Tare\tbride", null, existing).rows[0].status).toBe("exists");
  });
});
