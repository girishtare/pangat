"use server";

import { revalidatePath } from "next/cache";
import readExcelFile from "read-excel-file/node";
import { checkSheet, pickSheet, rowsToText, type SheetCheck } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { insertHouseholds, loadHouseholdKeys, type NewHousehold } from "@/lib/store/supabase";
import { newShortCode, newToken } from "@/lib/token";

const MAX_TEXT = 500_000;

export type CheckResult = { ok: true; check: SheetCheck } | { ok: false; error: string };
export type SaveResult =
  | { ok: true; added: number; skipped: number; codes: { name: string; shortCode: string }[] }
  | { ok: false; error: string; check?: SheetCheck };

async function signedInHost(slug: string): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate(slug);
  if (gate.ok) return { host: gate.host };
  if (gate.reason === "demo") return { error: "The guest list can't be changed in demo mode." };
  if (gate.reason === "not_host") return { error: "You are not a host of this event." };
  return { error: "Please sign in again." };
}

async function runCheck(host: HostContext, text: string) {
  const keys = await loadHouseholdKeys(host.event.id);
  const check = checkSheet({ text, functions: host.functions, hostSide: host.side, existing: keys });
  return { check, usedCodes: new Set(keys.map((k) => k.shortCode)) };
}

/** Read the pasted sheet and report what would happen. Writes nothing. */
export async function checkImport(slug: string, text: string): Promise<CheckResult> {
  if (typeof text !== "string" || text.length > MAX_TEXT) return { ok: false, error: "That paste is too large." };
  const who = await signedInHost(slug);
  if ("error" in who) return { ok: false, error: who.error };
  const { check } = await runCheck(who.host, text);
  return { ok: true, check };
}

/** Check again and, if every row is fine, add the new households. */
export async function saveImport(slug: string, text: string): Promise<SaveResult> {
  if (typeof text !== "string" || text.length > MAX_TEXT) return { ok: false, error: "That paste is too large." };
  const who = await signedInHost(slug);
  if ("error" in who) return { ok: false, error: who.error };
  const { check, usedCodes } = await runCheck(who.host, text);
  if (check.problem) return { ok: false, error: check.problem, check };
  if (check.counts.error > 0) return { ok: false, error: "Fix the rows marked in red first. Nothing was added.", check };
  if (check.counts.new === 0) return { ok: false, error: "Every household is already in the guest list. Nothing was added.", check };

  const rows: NewHousehold[] = [];
  for (const r of check.rows) {
    if (r.status !== "new" || !r.draft) continue;
    let shortCode = newShortCode();
    while (usedCodes.has(shortCode)) shortCode = newShortCode();
    usedCodes.add(shortCode);
    rows.push({ ...r.draft, token: newToken(), shortCode });
  }

  try {
    await insertHouseholds(who.host.event.id, rows);
  } catch (err) {
    console.error("saveImport failed", err);
    return { ok: false, error: "Saving failed, so nothing was added. Please try again." };
  }
  revalidatePath("/host", "layout");
  return {
    ok: true,
    added: rows.length,
    skipped: check.counts.exists,
    codes: rows.map((r) => ({ name: r.nameEn, shortCode: r.shortCode })),
  };
}

export type ReadResult = { ok: true; text: string; sheet: string } | { ok: false; error: string };

const MAX_UPLOAD_BYTES = 900_000;

/** Reads an uploaded Excel file into the same text as a paste. Writes nothing. */
export async function readSpreadsheet(slug: string, formData: FormData): Promise<ReadResult> {
  const who = await signedInHost(slug);
  if ("error" in who) return { ok: false, error: who.error };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file first." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is too large. Keep it under 900 KB (about 5,000 rows)." };
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) return { ok: false, error: 'That is an old Excel file (.xls). In Excel choose File → Save As → "Excel Workbook (.xlsx)", then upload that.' };
  if (!name.endsWith(".xlsx")) return { ok: false, error: "Choose an Excel file (.xlsx) or a CSV file." };

  try {
    const sheets = await readExcelFile(Buffer.from(await file.arrayBuffer()));
    const sheet = pickSheet(sheets as unknown as { sheet: string; data: (string | number | boolean | Date | null)[][] }[]);
    if (!sheet) return { ok: false, error: "That file has no sheets." };
    return { ok: true, text: rowsToText(sheet.data), sheet: sheet.sheet };
  } catch (err) {
    console.error("readSpreadsheet failed", err);
    return { ok: false, error: "Couldn't read that file. Open it in Excel, save it as an Excel Workbook (.xlsx), and try again." };
  }
}

export type AddState = SaveResult | null;

const oneLine = (v: FormDataEntryValue | null) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();

/** Add one late household. Goes through exactly the same checks as an import. */
export async function addHousehold(slug: string, _prev: AddState, formData: FormData): Promise<AddState> {
  const functions = formData.getAll("functions").map(oneLine).filter(Boolean);
  const header = ["Name", "Marathi name", "Side", "Mobile", "Functions", "Cap"];
  const row = [
    oneLine(formData.get("name")),
    oneLine(formData.get("nameMr")),
    oneLine(formData.get("side")),
    oneLine(formData.get("mobile")),
    functions.length ? functions.join(", ") : "none",
    oneLine(formData.get("cap")),
  ];
  if (!row[0]) return { ok: false, error: "Enter the household's name." };
  if (!functions.length) return { ok: false, error: "Tick at least one function." };
  const result = await saveImport(slug, `${header.join("\t")}\n${row.join("\t")}`);
  if (!result.ok && result.check?.counts.exists) {
    return { ...result, error: "This household is already on the guest list (same name, or same mobile, on this side). Nothing was added." };
  }
  return result;
}
