import "server-only";
import ExcelJS from "exceljs";
import { MAX_CAP, MAX_IMPORT_ROWS, TEMPLATE_SHEET } from "./guestlist";
import { COUNTRIES } from "./phone";
import type { Bilingual, Side } from "./types";

// In the order of Add one household (owner, 14 Nov): name, Marathi name, side, country code, mobile, location,
// language, how to send the invitation; then the functions, Guest Count and notes.
const FIXED = ["Name", "Marathi name", "Side", "Country code", "Mobile", "Location", "Language", "Send the invitation by"] as const;
const NOTES = "Comments / Notes";
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
  const languages = ["Marathi", "English", "Both"];
  languages.forEach((v, i) => (lists.getCell(i + 1, 3).value = v));
  const sendBy = ["Card", "WhatsApp", "Card & WhatsApp"];
  sendBy.forEach((v, i) => (lists.getCell(i + 1, 4).value = v));
  const countries = COUNTRIES.map((c) => `+${c.code} ${c.name}`);
  countries.forEach((v, i) => (lists.getCell(i + 1, 5).value = v));

  // Columns: A Name, B Marathi name, C Side, D Country code, E Mobile, F Location, G Language, H Send the invitation by,
  // then one per function, then Guest Count and Comments / Notes.
  const fnNames = opts.functions.map((f) => f.en);
  const firstFn = FIXED.length + 1;
  const capCol = firstFn + fnNames.length;
  const notesCol = capCol + 1;
  const headers = [...FIXED, ...fnNames, "Guest Count", NOTES];
  ws.columns = [
    { header: FIXED[0], key: "name", width: 34 },
    { header: FIXED[1], key: "nameMr", width: 34 },
    { header: FIXED[2], key: "side", width: 12 },
    { header: FIXED[3], key: "country", width: 22 },
    { header: FIXED[4], key: "mobile", width: 18, style: { numFmt: "@" } },
    { header: FIXED[5], key: "location", width: 24 },
    { header: FIXED[6], key: "lang", width: 12 },
    { header: FIXED[7], key: "sendBy", width: 22 },
    ...fnNames.map((n, i) => ({ header: n, key: `fn${i}`, width: Math.min(28, Math.max(12, n.length + 4)) })),
    { header: "Guest Count", key: "cap", width: 12 },
    { header: NOTES, key: "notes", width: 44 },
  ];
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEADFC8" } };
    c.border = { bottom: { style: "thin", color: { argb: "FF7A1420" } } };
  });
  ws.getCell("A1").note = "Required. One row per household (one printed card), in English.";
  ws.getCell("B1").note = "Optional. The name as it should appear in Marathi on the slip.";
  ws.getCell("C1").note = opts.hostSide
    ? `Leave blank: everything you add goes to the ${SIDE_LABEL[opts.hostSide]}.`
    : "Pick bride or groom.";
  ws.getCell("D1").note = "Optional. The mobile's country; blank = +91 India.";
  ws.getCell("E1").note = "One mobile per household: the one that gets the WhatsApp link. 10 digits is fine.";
  ws.getCell("F1").note = 'Optional. Where they stay: just the place, e.g. "Borivali, Mumbai" or "Edvan, Palghar".';
  ws.getCell("G1").note = "Optional. Marathi, English or Both (blank = Both): their slip, WhatsApp message and reply page use it. Both opens in Marathi.";
  ws.getCell("H1").note = "Optional. Card, WhatsApp, or Card & WhatsApp (blank = Card). WhatsApp needs a mobile.";
  fnNames.forEach((n, i) => (ws.getCell(1, firstFn + i).note = `Yes = invited to ${n}. Blank = not invited.`));
  ws.getCell(1, capCol).note = `Optional. The most people this card covers (1 to ${MAX_CAP}).`;
  ws.getCell(1, notesCol).note = "Optional. Anything to remember about this household.";

  const list = (title: string, col: string, n: number, error: string) => ({
    type: "list" as const,
    allowBlank: true,
    formulae: [`Lists!$${col}$1:$${col}$${n}`],
    showErrorMessage: true,
    errorTitle: title,
    error,
  });
  const lastRow = MAX_IMPORT_ROWS + 1;
  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(r, 3).dataValidation = list("Side", "A", sides.length, opts.hostSide ? `Leave blank, or choose ${opts.hostSide}.` : "Choose bride or groom.");
    ws.getCell(r, 4).dataValidation = list("Country code", "E", countries.length, "Pick a country from the list, or leave it blank for India.");
    ws.getCell(r, 5).numFmt = "@";
    ws.getCell(r, 7).dataValidation = list("Language", "C", languages.length, "Choose Marathi, English or Both.");
    ws.getCell(r, 8).dataValidation = list("Send the invitation by", "D", sendBy.length, "Choose Card, WhatsApp, or Card & WhatsApp.");
    for (let c = firstFn; c < capCol; c++) {
      ws.getCell(r, c).dataValidation = list("Invited?", "B", yesNo.length, "Choose Yes, or leave it blank.");
    }
    ws.getCell(r, capCol).dataValidation = {
      type: "whole",
      operator: "between",
      allowBlank: true,
      formulae: [1, MAX_CAP],
      showErrorMessage: true,
      errorTitle: "Guest Count",
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
    ["• Country code: optional, pick the mobile's country from the list. Blank = +91 India."],
    ["• Mobile: one number per household, the one that should get the WhatsApp link. 98765 43210 is fine."],
    ["   (A number typed with its own + and country code, e.g. +44 7700 900123, is kept as typed.)"],
    ['• Location: optional. Where they stay, just the place: "Borivali, Mumbai", "Edvan, Palghar".'],
    ["• Language: optional. Marathi, English or Both (blank = Both). Their slip, WhatsApp message and reply page use it; Both opens in Marathi."],
    ["• Send the invitation by: optional. Card, WhatsApp, or Card & WhatsApp (blank = Card). WhatsApp needs a mobile."],
    [`• One column per function (${fnNames.join(", ") || "none yet"}): pick Yes under each function this household is invited to.`],
    ["   Blank means not invited. Every household needs at least one Yes. Tip: fill one row, then drag the Yes cells down."],
    [`• Guest Count: optional. The most people this card covers (1 to ${MAX_CAP}).`],
    ["• Comments / Notes: optional, anything to remember about the household."],
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
    ["Shri. A. Joshi & family", "श्री. अ. जोशी सहपरिवार", opts.hostSide ?? "bride", "+91 India", "98765 43210", "Borivali, Mumbai", "Both", "Card & WhatsApp", ...fnNames.map(() => "Yes"), 6, ""],
    ["Dr. G. Sathe", "डॉ. ग. साठे", opts.hostSide ?? "groom", "+971 United Arab Emirates", "50 123 4567", "Dubai", "Marathi", "WhatsApp", ...fnNames.map((_, i) => (i === fnNames.length - 1 ? "Yes" : "")), "", "Coming from Dubai"],
  ];
  example.forEach((row) => help.addRow([row.map(String).join("   |   ")]));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
