import type { Bilingual, Side } from "./types";

/**
 * Guest list import: turn rows pasted from a sheet into households.
 *
 * One row per household (one card). A header row names the columns; only
 * "Name" is required. Columns, in any order:
 *   Name | Marathi name | Side | Mobile | <one column per function> | Cap
 * Function columns (the template's way, owner 12 Nov): a column headed with
 * the function's name; "Yes" (or ✓, x, हो) invites the household, blank or
 * "No" doesn't. A household must be invited to at least one.
 * Older sheets and pastes may instead have one "Functions" column: names
 * separated by commas, or blank / "all" for every function.
 *
 * Pure logic, no database: the caller passes in the event's functions, the
 * host's side and the households that already exist.
 */

export const MAX_IMPORT_ROWS = 1000;
export const MAX_CAP = 30;

export interface FunctionRef {
  id: string;
  name: Bilingual;
}

export interface HouseholdDraft {
  side: Side;
  nameEn: string;
  nameMr: string | null;
  /** E.164, e.g. +919876543210. */
  mobile: string | null;
  softCap: number | null;
  functionIds: string[];
}

export interface ExistingHousehold {
  side: Side;
  nameEn: string;
  mobile: string | null;
}

export type RowStatus = "new" | "exists" | "error";

export interface RowResult {
  /** Row number as the host sees it in their sheet (header = 1). */
  line: number;
  label: string;
  status: RowStatus;
  draft: HouseholdDraft | null;
  errors: string[];
  warnings: string[];
}

export interface SheetCheck {
  /** Set when the sheet cannot be read at all (no header, no Name column, too many rows). */
  problem: string | null;
  rows: RowResult[];
  counts: { new: number; exists: number; error: number };
}

type Field = "nameEn" | "nameMr" | "side" | "mobile" | "functions" | "cap";

const HEADER_ALIASES: Record<Field, string[]> = {
  nameEn: ["name", "household", "householdname", "nameenglish", "englishname", "family", "familyname", "guest", "guestname"],
  nameMr: ["marathiname", "namemarathi", "marathi", "नाव", "मराठीनाव"],
  side: ["side", "बाजू"],
  mobile: ["mobile", "mobileno", "mobilenumber", "phone", "phoneno", "phonenumber", "whatsapp", "whatsappnumber", "number", "contact", "मोबाईल"],
  functions: ["functions", "function", "invitedto", "events", "event", "invited"],
  cap: ["cap", "softcap", "max", "maxpeople", "maxheads", "limit", "people"],
};

const headerKey = (s: string) => s.trim().toLowerCase().replace(/[\s_().'’:-]/g, "");

const YES = new Set(["yes", "y", "✓", "✔", "x", "true", "1", "हो", "होय"]);
const NO = new Set(["no", "n", "false", "0", "नाही"]);

/** A function column's cell: true = invited, false = not, null = unreadable. */
export function parseInvited(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (s === "" || NO.has(s)) return false;
  if (YES.has(s)) return true;
  return null;
}

/** Split pasted text into rows of cells. Tab-separated (copied from a sheet) or CSV. */
export function parseTable(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const delim = firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") {
      quoted = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Indian mobile numbers become +91XXXXXXXXXX; numbers written with another
 * country code (+44..., 0044...) are kept. Blank is allowed (null).
 */
export function normaliseMobile(raw: string): { ok: true; value: string | null } | { ok: false } {
  let s = raw.trim().replace(/[\s().\-/]/g, "");
  if (s === "") return { ok: true, value: null };
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (s.startsWith("+")) {
    if (!/^\+[1-9]\d{7,14}$/.test(s)) return { ok: false }; // no country code starts with 0
    if (s.startsWith("+91")) return /^\+91[6-9]\d{9}$/.test(s) ? { ok: true, value: s } : { ok: false };
    return { ok: true, value: s };
  }
  if (!/^\d+$/.test(s)) return { ok: false };
  if (/^[6-9]\d{9}$/.test(s)) return { ok: true, value: "+91" + s };
  if (/^0[6-9]\d{9}$/.test(s)) return { ok: true, value: "+91" + s.slice(1) };
  if (/^91[6-9]\d{9}$/.test(s)) return { ok: true, value: "+" + s };
  return { ok: false };
}

export function parseSide(raw: string): Side | null {
  const s = raw.trim().toLowerCase().replace(/['’]s$/, "").replace(/[^a-zऀ-ॿ]/g, "");
  if (["bride", "b", "brides", "वधू", "वधु", "मुलगी"].includes(s)) return "bride";
  if (["groom", "g", "grooms", "वर", "मुलगा"].includes(s)) return "groom";
  return null;
}

const nameKey = (s: string) => s.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
const SIDE_NAMES: Record<Side, string> = { bride: "bride's side", groom: "groom's side" };

export function checkSheet(input: {
  text: string;
  functions: FunctionRef[];
  /** null = the host may add to both sides. */
  hostSide: Side | null;
  existing: ExistingHousehold[];
}): SheetCheck {
  const empty = (problem: string): SheetCheck => ({ problem, rows: [], counts: { new: 0, exists: 0, error: 0 } });
  const table = parseTable(input.text);
  const headerIndex = table.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (headerIndex < 0) return empty("Paste the guest list, starting with the header row (Name, Side, Mobile, …).");

  const header = table[headerIndex].map(headerKey);
  const col: Partial<Record<Field, number>> = {};
  (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
    const i = header.findIndex((h) => HEADER_ALIASES[field].includes(h));
    if (i >= 0) col[field] = i;
  });
  if (col.nameEn === undefined) {
    return empty('The first row must be a header with a "Name" column. Copy the header row together with the guests.');
  }
  if (col.side === undefined && input.hostSide === null) {
    return empty('Add a "Side" column (bride or groom) so each household lands on the right side.');
  }

  const dataRows = table.slice(headerIndex + 1);
  if (dataRows.filter((r) => r.some((c) => c.trim() !== "")).length > MAX_IMPORT_ROWS) {
    return empty(`Import at most ${MAX_IMPORT_ROWS} households at a time.`);
  }

  const fnByName = new Map<string, FunctionRef>();
  for (const f of input.functions) {
    fnByName.set(f.name.en.trim().toLowerCase(), f);
    if (f.name.mr) fnByName.set(f.name.mr.trim(), f);
  }
  const allFunctionIds = input.functions.map((f) => f.id);
  const functionList = input.functions.map((f) => f.name.en).join(", ");

  // One column per function: a header that is a function's English or Marathi name
  // (and not already one of the fields above).
  const taken = new Set(Object.values(col));
  const fnCols: { index: number; fn: FunctionRef }[] = [];
  const fnUsed = new Set<string>();
  table[headerIndex].forEach((raw, index) => {
    if (taken.has(index) || !raw.trim()) return;
    const key = headerKey(raw);
    const fn = input.functions.find((f) => !fnUsed.has(f.id) && (headerKey(f.name.en) === key || (!!f.name.mr && f.name.mr.trim() === raw.trim())));
    if (fn) {
      fnUsed.add(fn.id);
      fnCols.push({ index, fn });
    }
  });
  const byColumns = fnCols.length > 0;

  const existingByMobile = new Map(input.existing.filter((e) => e.mobile).map((e) => [e.mobile as string, e]));
  const existingByName = new Map(input.existing.map((e) => [`${e.side}|${nameKey(e.nameEn)}`, e]));
  const seenMobile = new Map<string, number>();
  const seenName = new Map<string, number>();

  const rows: RowResult[] = [];
  dataRows.forEach((cells, i) => {
    if (!cells.some((c) => c.trim() !== "")) return; // blank line
    const line = headerIndex + i + 2;
    const cell = (f: Field) => (col[f] === undefined ? "" : (cells[col[f] as number] ?? "").trim());
    const errors: string[] = [];
    const warnings: string[] = [];

    const nameEn = cell("nameEn").replace(/\s+/g, " ");
    if (!nameEn) errors.push("Name is missing.");
    else if (nameEn.length > 120) errors.push("Name is longer than 120 characters.");
    const nameMr = cell("nameMr").replace(/\s+/g, " ") || null;
    if (nameMr && nameMr.length > 120) errors.push("Marathi name is longer than 120 characters.");

    let side: Side | null = null;
    const sideRaw = cell("side");
    if (sideRaw) {
      side = parseSide(sideRaw);
      if (!side) errors.push(`Side "${sideRaw}" is not bride or groom.`);
    } else if (input.hostSide) {
      side = input.hostSide;
    } else {
      errors.push("Side is missing (bride or groom).");
    }
    if (side && input.hostSide && side !== input.hostSide) {
      errors.push(`You can only add households to the ${SIDE_NAMES[input.hostSide]}.`);
    }

    const mobileRaw = cell("mobile");
    const mob = normaliseMobile(mobileRaw);
    let mobile: string | null = null;
    if (!mob.ok) errors.push(`Mobile "${mobileRaw}" doesn't look like a phone number.`);
    else mobile = mob.value;
    if (mob.ok && !mobile) warnings.push("No mobile number: this household can't get a WhatsApp reminder.");

    let functionIds = allFunctionIds;
    const fnRaw = cell("functions");
    if (byColumns) {
      const ids = new Set<string>();
      for (const { index, fn } of fnCols) {
        const raw = (cells[index] ?? "").trim();
        const v = parseInvited(raw);
        if (v === null) errors.push(`Under "${fn.name.en}", "${raw}" should be Yes or blank.`);
        else if (v) ids.add(fn.id);
      }
      functionIds = allFunctionIds.filter((id) => ids.has(id));
      if (fnRaw) warnings.push('The "Functions" column is ignored: the Yes columns say which functions.');
      if (functionIds.length === 0 && !errors.length) errors.push("Not invited to any function: put Yes under at least one.");
    } else if (fnRaw && fnRaw.trim().toLowerCase() !== "all") {
      const ids = new Set<string>();
      for (const part of fnRaw.split(/[,;/\n]/).map((p) => p.trim()).filter(Boolean)) {
        const f = fnByName.get(part.toLowerCase()) ?? fnByName.get(part);
        if (f) ids.add(f.id);
        else errors.push(`Function "${part}" isn't one of: ${functionList}.`);
      }
      functionIds = allFunctionIds.filter((id) => ids.has(id));
    }
    if (functionIds.length === 0 && !errors.length) errors.push("Not invited to any function.");

    let softCap: number | null = null;
    const capRaw = cell("cap");
    if (capRaw) {
      const n = Number(capRaw);
      if (!Number.isInteger(n) || n < 1 || n > MAX_CAP) errors.push(`Cap "${capRaw}" should be a whole number from 1 to ${MAX_CAP}.`);
      else softCap = n;
    }

    // Duplicates inside the pasted sheet.
    if (mobile) {
      const prev = seenMobile.get(mobile);
      if (prev) errors.push(`Same mobile as row ${prev}.`);
      else seenMobile.set(mobile, line);
    }
    if (side && nameEn) {
      const key = `${side}|${nameKey(nameEn)}`;
      const prev = seenName.get(key);
      if (prev) errors.push(`Same name and side as row ${prev}.`);
      else seenName.set(key, line);
    }

    // Already in the guest list?
    let status: RowStatus = errors.length ? "error" : "new";
    if (status === "new" && side) {
      const byMobile = mobile ? existingByMobile.get(mobile) : undefined;
      const byName = existingByName.get(`${side}|${nameKey(nameEn)}`);
      if (byName || (byMobile && byMobile.side === side)) {
        status = "exists";
        warnings.push("Already in the guest list; skipped.");
      } else if (byMobile) {
        warnings.push(`This mobile is also on the ${SIDE_NAMES[byMobile.side]}. They may be counted twice.`);
      }
    }

    rows.push({
      line,
      label: nameEn || `(row ${line})`,
      status,
      draft: status === "error" || !side ? null : { side, nameEn, nameMr, mobile, softCap, functionIds },
      errors,
      warnings,
    });
  });

  if (rows.length === 0) return empty("There are no guests under the header row.");
  const counts = { new: 0, exists: 0, error: 0 };
  for (const r of rows) counts[r.status]++;
  return { problem: null, rows, counts };
}

/* ---------- Excel files ---------- */

/** Name of the sheet in our template that holds the guests. Other sheets are instructions. */
export const TEMPLATE_SHEET = "Guests";

type CellValue = string | number | boolean | Date | null | undefined;

/** Picks the "Guests" sheet if there is one, otherwise the first sheet. */
export function pickSheet<T extends { sheet: string; data: CellValue[][] }>(sheets: T[]): T | null {
  return sheets.find((s) => s.sheet.trim().toLowerCase() === TEMPLATE_SHEET.toLowerCase()) ?? sheets[0] ?? null;
}

function cellText(v: CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  // Excel often stores a mobile number as a number: 9876543210, never 9.87654321E9.
  if (typeof v === "number") return Number.isInteger(v) ? v.toFixed(0) : String(v);
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

/** Rows from a spreadsheet → tab-separated text, the same shape as a paste. */
export function rowsToText(rows: CellValue[][]): string {
  return rows.map((r) => r.map((c) => cellText(c).replace(/[\t\r\n]+/g, " ").trim()).join("\t")).join("\n");
}
