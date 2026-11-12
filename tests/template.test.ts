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
    expect((ws.getRow(1).values as unknown[]).slice(1)).toEqual(["Name", "Marathi name", "Side", "Mobile", "Location", "Haldi", "Wedding", "Reception", "Cap", "Comments / Notes"]);
    expect(ws.getCell("C2").dataValidation?.type).toBe("list");
    expect(ws.getCell("E2").dataValidation?.type).toBeUndefined();
    for (const c of ["F2", "G500", "H2"]) expect(ws.getCell(c).dataValidation?.type).toBe("list");
    expect(ws.getCell("I2").dataValidation?.type).toBe("whole");
    expect(ws.getCell("D2").numFmt).toBe("@");
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
    ws.getRow(2).values = ["Shri. A. Joshi & family", "श्री. अ. जोशी सहपरिवार", "bride", "98765 43210", "Borivali, Mumbai", "Yes", "Yes", "Yes", 6, "Uncle"];
    ws.getRow(3).values = ["Dr. G. Sathe", null, "groom", 9123456789, null, null, "Yes", "Yes", null, null];
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
});
