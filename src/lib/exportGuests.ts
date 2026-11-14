import "server-only";
import ExcelJS from "exceljs";
import type { Bilingual, Side } from "./types";

export interface ExportFunction {
  id: string;
  name: Bilingual;
  catered: boolean;
  vegOnly: boolean;
}

export interface ExportReply {
  functionId: string;
  status: string;
  heads: number;
  veg: number;
}

export interface ExportHousehold {
  side: Side;
  nameEn: string;
  nameMr: string | null;
  mobile: string | null;
  location: string | null;
  softCap: number | null;
  notes: string | null;
  shortCode: string;
  slipLang: "both" | "en" | "mr";
  inviteVia: "card" | "whatsapp" | "both" | null;
  functionIds: string[];
  replies: ExportReply[];
}

const SIDE: Record<Side, string> = { bride: "Bride's side", groom: "Groom's side" };
const SLIP: Record<ExportHousehold["slipLang"], string> = { both: "English and Marathi", en: "English", mr: "Marathi" };
const INVITE: Record<NonNullable<ExportHousehold["inviteVia"]>, string> = { card: "Card", whatsapp: "WhatsApp", both: "Card & WA" };

/** One function's reply as a short cell: "Yes · 4 (2 veg)", "No", "Waiting", or blank when not invited. */
export function replyCell(fn: ExportFunction, invited: boolean, r: ExportReply | undefined): string {
  if (!invited) return "";
  if (!r) return "Waiting";
  if (r.status !== "yes") return "No";
  if (!fn.catered || fn.vegOnly) return `Yes · ${r.heads}`;
  return `Yes · ${r.heads} (${r.veg} veg)`;
}

/**
 * The guest list as an Excel file (owner, 14 Nov): one row per household, in
 * name order, with what the Guest list shows plus each function's reply. The
 * sheet is called "Guest list", not "Guests", so it can't be imported back by
 * mistake: re-importing would risk second copies with new codes, now that
 * slips are printed.
 */
export async function buildGuestExport(opts: { eventName: Bilingual; functions: ExportFunction[]; households: ExportHousehold[] }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pangat";
  wb.created = new Date();
  const ws = wb.addWorksheet("Guest list", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });

  const fns = opts.functions;
  ws.columns = [
    { header: "Name", key: "name", width: 32 },
    { header: "Marathi name", key: "nameMr", width: 32 },
    { header: "Side", key: "side", width: 14 },
    { header: "Mobile", key: "mobile", width: 16, style: { numFmt: "@" } },
    { header: "Location", key: "location", width: 22 },
    { header: "Code", key: "code", width: 10 },
    ...fns.map((f, i) => ({ header: `Invited: ${f.name.en}`, key: `inv${i}`, width: Math.min(28, Math.max(12, f.name.en.length + 10)) })),
    { header: "Cap", key: "cap", width: 7 },
    { header: "Invitation", key: "invite", width: 13 },
    { header: "Slip language", key: "slip", width: 20 },
    ...fns.map((f, i) => ({ header: `Reply: ${f.name.en}`, key: `rep${i}`, width: Math.min(30, Math.max(16, f.name.en.length + 8)) })),
    { header: "Comments / Notes", key: "notes", width: 40 },
  ];

  const sorted = [...opts.households].sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en", { sensitivity: "base", numeric: true }));
  for (const h of sorted) {
    const row: Record<string, string | number | null> = {
      name: h.nameEn,
      nameMr: h.nameMr ?? "",
      side: SIDE[h.side],
      mobile: h.mobile ?? "",
      location: h.location ?? "",
      code: h.shortCode,
      cap: h.softCap,
      invite: h.inviteVia ? INVITE[h.inviteVia] : "Not Sent",
      slip: SLIP[h.slipLang],
      notes: h.notes ?? "",
    };
    fns.forEach((f, i) => {
      const invited = h.functionIds.includes(f.id);
      row[`inv${i}`] = invited ? "Yes" : "";
      row[`rep${i}`] = replyCell(f, invited, h.replies.find((r) => r.functionId === f.id));
    });
    ws.addRow(row);
  }

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.height = 22;
  header.alignment = { vertical: "middle", wrapText: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEADFC8" } };
    c.border = { bottom: { style: "thin", color: { argb: "FF7A1420" } } };
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
