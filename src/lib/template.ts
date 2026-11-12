import "server-only";
import ExcelJS from "exceljs";
import { MAX_CAP, MAX_IMPORT_ROWS, TEMPLATE_SHEET } from "./guestlist";
import type { Bilingual, Side } from "./types";

const FIXED = ["Name", "Marathi name", "Side", "Mobile"] as const;
const SIDE_LABEL: Record<Side, string> = { bride: "bride's side", groom: "groom's side" };

/**
 * The guest-list template for one event: a "Guests" sheet with the exact
 * columns the import expects (one Yes column per function, owner 12 Nov),
 * dropdowns for Side and the function columns, Mobile kept as text, and a
 * "How to fill" sheet. Only the Guests sheet is ever imported.
 */
export async function buildGuestTemplate(opts: {
  eventName: Bilingual;
  functions: Bilingual[];
  hostSide: Side | null;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pangat";
  wb.created = new Date();

  const ws = wb.addWorksheet(TEMPLATE_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  const help = wb.addWorksheet("How to fill");
  const lists = wb.addWorksheet("Lists", { state: "veryHidden" });

  // Dropdown sources live on a hidden sheet, so long function names never hit Excel's 255-character limit.
  const sides: Side[] = opts.hostSide ? [opts.hostSide] : ["bride", "groom"];
  sides.forEach((s, i) => (lists.getCell(i + 1, 1).value = s));
  const yesNo = ["Yes", "No"];
  yesNo.forEach((v, i) => (lists.getCell(i + 1, 2).value = v));

  // Name, Marathi name, Side, Mobile, then one column per function, then Cap.
  const fnNames = opts.functions.map((f) => f.en);
  const firstFn = FIXED.length + 1;
  const capCol = firstFn + fnNames.length;
  const headers = [...FIXED, ...fnNames, "Cap"];
  ws.columns = [
    { header: FIXED[0], key: "name", width: 34 },
    { header: FIXED[1], key: "nameMr", width: 34 },
    { header: FIXED[2], key: "side", width: 12 },
    { header: FIXED[3], key: "mobile", width: 18, style: { numFmt: "@" } },
    ...fnNames.map((n, i) => ({ header: n, key: `fn${i}`, width: Math.min(28, Math.max(12, n.length + 4)) })),
    { header: "Cap", key: "cap", width: 8 },
  ];
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6D68A" } };
    c.border = { bottom: { style: "thin", color: { argb: "FF8C1C13" } } };
  });
  ws.getCell("A1").note = "Required. One row per household (one printed card), in English.";
  ws.getCell("B1").note = "Optional. The name as it should appear in Marathi on the slip.";
  ws.getCell("C1").note = opts.hostSide
    ? `Leave blank: everything you add goes to the ${SIDE_LABEL[opts.hostSide]}.`
    : "Pick bride or groom.";
  ws.getCell("D1").note = "One mobile per household: the one that gets the WhatsApp link. 10 digits is fine.";
  fnNames.forEach((n, i) => (ws.getCell(1, firstFn + i).note = `Yes = invited to ${n}. Blank = not invited.`));
  ws.getCell(1, capCol).note = `Optional. The most people this card covers (1 to ${MAX_CAP}).`;

  const lastRow = MAX_IMPORT_ROWS + 1;
  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(r, 3).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Lists!$A$1:$A$${sides.length}`],
      showErrorMessage: true,
      errorTitle: "Side",
      error: opts.hostSide ? `Leave blank, or choose ${opts.hostSide}.` : "Choose bride or groom.",
    };
    ws.getCell(r, 4).numFmt = "@";
    for (let c = firstFn; c < capCol; c++) {
      ws.getCell(r, c).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`Lists!$B$1:$B$${yesNo.length}`],
        showErrorMessage: true,
        errorTitle: "Invited?",
        error: "Choose Yes, or leave it blank.",
      };
    }
    ws.getCell(r, capCol).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [1, MAX_CAP],
      showErrorMessage: true,
      errorTitle: "Cap",
      error: `A whole number from 1 to ${MAX_CAP}, or leave it blank.`,
    };
  }

  help.getColumn(1).width = 110;
  const lines: [string, boolean?][] = [
    [`Guest list for ${opts.eventName.en}`, true],
    [""],
    ["Fill in the Guests sheet (the first tab). Do not rename it or change its header row.", true],
    [""],
    ["• One row per household: one printed card."],
    ["• Name: as on the card, in English. Required."],
    ["• Marathi name: as it should appear on the slip. Optional, but the slips need it."],
    [
      opts.hostSide
        ? `• Side: leave blank. Everything you add goes to the ${SIDE_LABEL[opts.hostSide]}.`
        : "• Side: pick bride or groom from the list.",
    ],
    ["• Mobile: one number per household, the one that should get the WhatsApp link. 98765 43210 is fine; +91 is added."],
    ["   For a number outside India, start with + and the country code, e.g. +44 7700 900123."],
    [`• One column per function (${fnNames.join(", ") || "none yet"}): pick Yes under each function this household is invited to.`],
    ["   Blank means not invited. Every household needs at least one Yes. Tip: fill one row, then drag the Yes cells down."],
    [`• Cap: optional. The most people this card covers (1 to ${MAX_CAP}).`],
    [""],
    ["When it's ready: Pangat → Guest list → Import from a sheet → Choose file.", true],
    ["Pangat checks every row before adding anything and shows any problem with its row number."],
    ["Households already on the list are skipped, so you can upload the same file again after adding more rows."],
    [""],
    ["Example (do not copy into the Guests sheet as-is):", true],
  ];
  lines.forEach(([text, bold], i) => {
    const c = help.getCell(i + 1, 1);
    c.value = text;
    if (bold) c.font = { bold: true };
  });
  help.getCell(1, 1).font = { bold: true, size: 14 };
  const example = [
    headers,
    ["Shri. A. Joshi & family", "श्री. अ. जोशी सहपरिवार", opts.hostSide ?? "bride", "98765 43210", ...fnNames.map(() => "Yes"), 6],
    ["Dr. G. Sathe", "डॉ. ग. साठे", opts.hostSide ?? "groom", "+91 91234 56789", ...fnNames.map((_, i) => (i === fnNames.length - 1 ? "Yes" : "")), ""],
  ];
  example.forEach((row) => help.addRow([row.map(String).join("   |   ")]));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
