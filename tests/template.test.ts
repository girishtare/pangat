import ExcelJS from "exceljs";
import readExcelFile from "read-excel-file/node";
import { describe, expect, it, vi } from "vitest";
import { checkSheet, pickSheet, rowsToText, TEMPLATE_SHEET, type FunctionRef } from "@/lib/guestlist";

vi.mock("server-only", () => ({}));

const functions: FunctionRef[] = [
  { id: "f-haldi", name: { en: "Haldi", mr: "हळद" } },
  { id: "f-wedding", name: { en: "Wedding", mr: "विवाह" } },
  { id: "f-reception", name: { en: "Reception", mr: "स्वागत समारंभ" } },
];

async function template(hostSide: "bride" | "groom" | null = null) {
  const { buildGuestTemplate } = await import("@/lib/template");
  return buildGuestTemplate({ eventName: { en: "Sample Wedding", mr: null }, functions: functions.map((f) => f.name), hostSide });
}

async function readBack(buf: Buffer) {
  const sheets = await readExcelFile(buf);
  const sheet = pickSheet(sheets as unknown as { sheet: string; data: (string | number | boolean | Date | null)[][] }[]);
  return { sheet, text: rowsToText(sheet!.data) };
}

describe("Excel template", () => {
  it("has the import's columns, dropdowns and a text Mobile column", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await template()) as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([TEMPLATE_SHEET, "How to fill", "Lists"]);
    const ws = wb.getWorksheet(TEMPLATE_SHEET)!;
    expect((ws.getRow(1).values as unknown[]).slice(1)).toEqual([
      "Name",
      "Marathi name",
      "Side",
      "Country code",
      "Mobile",
      "Location",
      "Language",
      "Send the invitation by",
      "Haldi",
      "Wedding",
      "Reception",
      "Guest Count",
      "Comments / Notes",
    ]);
    for (const c of ["C2", "D2", "G2", "H2", "I2", "J500", "K2"]) expect(ws.getCell(c).dataValidation?.type).toBe("list");
    expect(ws.getCell("F2").dataValidation?.type).toBeUndefined();
    expect(ws.getCell("L2").dataValidation?.type).toBe("whole");
    expect(ws.getCell("E2").numFmt).toBe("@");
    const lists = wb.getWorksheet("Lists")!;
    expect(lists.state).toBe("veryHidden");
    expect(lists.getColumn(2).values.slice(1)).toEqual(["Yes", "No"]);
  });

  it("offers only the host's own side to a one-side host", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await template("groom")) as unknown as ArrayBuffer);
    expect(wb.getWorksheet("Lists")!.getColumn(1).values.slice(1)).toEqual(["groom"]);
  });

  it("an empty template reads back as 'no guests', not an error", async () => {
    const { sheet, text } = await readBack(await template());
    expect(sheet!.sheet).toBe(TEMPLATE_SHEET);
    expect(checkSheet({ text, functions, hostSide: null, existing: [] }).problem).toMatch(/no guests/);
  });

  it("a filled-in template imports cleanly", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await template()) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(TEMPLATE_SHEET)!;
    ws.getRow(2).values = ["Shri. A. Joshi & family", "श्री. अ. जोशी सहपरिवार", "bride", null, "98765 43210", "Borivali, Mumbai", null, null, "Yes", "Yes", "Yes", 6, "Uncle"];
    ws.getRow(3).values = ["Dr. G. Sathe", null, "groom", null, 9123456789, null, null, null, null, "Yes", "Yes", null, null];
    const filled = Buffer.from(await wb.xlsx.writeBuffer());

    const { text } = await readBack(filled);
    const r = checkSheet({ text, functions, hostSide: null, existing: [] });
    expect(r.problem).toBeNull();
    expect(r.counts).toEqual({ new: 2, exists: 0, error: 0 });
    expect(r.rows[0].draft).toEqual({
      side: "bride",
      nameEn: "Shri. A. Joshi & family",
      nameMr: "श्री. अ. जोशी सहपरिवार",
      mobile: "+919876543210",
      softCap: 6,
      location: "Borivali, Mumbai",
      notes: "Uncle",
      functionIds: ["f-haldi", "f-wedding", "f-reception"],
    });
    expect(r.rows[1].draft).toMatchObject({ side: "groom", mobile: "+919123456789", functionIds: ["f-wedding", "f-reception"] });
  });

  it("reads the Language column", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await template()) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(TEMPLATE_SHEET)!;
    ws.getRow(2).values = ["Kale", null, "bride", null, null, null, "Marathi", null, "Yes"];
    ws.getRow(3).values = ["Bhide", null, "bride", null, null, null, "English", null, "Yes"];
    ws.getRow(4).values = ["Apte", null, "bride", null, null, null, "Hindi", null, "Yes"];
    const { text } = await readBack(Buffer.from(await wb.xlsx.writeBuffer()));
    const r = checkSheet({ text, functions, hostSide: null, existing: [] });
    expect(r.rows[0].draft?.slipLang).toBe("mr");
    expect(r.rows[1].draft?.slipLang).toBe("en");
    expect(r.rows[2].status).toBe("error");
  });

  it("reads the country code and how to send the invitation", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await template()) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet(TEMPLATE_SHEET)!;
    ws.getRow(2).values = ["Sathe", null, "bride", "+971 United Arab Emirates", "50 123 4567", "Dubai", null, "Card & WhatsApp", "Yes"];
    ws.getRow(3).values = ["Joshi", null, "bride", null, "98765 43210", null, null, "WhatsApp", "Yes"];
    ws.getRow(4).values = ["Kale", null, "bride", null, null, null, null, "WhatsApp", "Yes"];
    ws.getRow(5).values = ["Apte", null, "bride", "+999 Nowhere", "12345678", null, null, null, "Yes"];
    const { text } = await readBack(Buffer.from(await wb.xlsx.writeBuffer()));
    const r = checkSheet({ text, functions, hostSide: null, existing: [] });
    expect(r.rows[0].draft).toMatchObject({ mobile: "+971501234567", inviteBy: { card: true, wa: true } });
    expect(r.rows[1].draft).toMatchObject({ mobile: "+919876543210", inviteBy: { card: false, wa: true } });
    expect(r.rows[2].status).toBe("error"); // WhatsApp without a mobile
    expect(r.rows[3].status).toBe("error"); // unknown country code
  });
});

import { replyCell } from "@/lib/exportGuests";

describe("replyCell (guest list export)", () => {
  const fn = { id: "f", name: { en: "Wedding", mr: null }, catered: true, vegOnly: false };
  it("is blank when not invited and Waiting with no reply", () => {
    expect(replyCell(fn, false, undefined)).toBe("");
    expect(replyCell(fn, true, undefined)).toBe("Waiting");
  });
  it("shows yes with people and veg, or no", () => {
    expect(replyCell(fn, true, { functionId: "f", status: "yes", heads: 4, veg: 2 })).toBe("Yes · 4 (2 veg)");
    expect(replyCell(fn, true, { functionId: "f", status: "no", heads: 0, veg: 0 })).toBe("No");
  });
  it("leaves veg out where no food or veg only", () => {
    expect(replyCell({ ...fn, catered: false }, true, { functionId: "f", status: "yes", heads: 3, veg: 0 })).toBe("Yes · 3");
    expect(replyCell({ ...fn, vegOnly: true }, true, { functionId: "f", status: "yes", heads: 3, veg: 3 })).toBe("Yes · 3");
  });
});
