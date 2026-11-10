"use server";

import { revalidatePath } from "next/cache";
import { checkSheet, type SheetCheck } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { insertHouseholds, loadHouseholdKeys, type NewHousehold } from "@/lib/store/supabase";
import { newShortCode, newToken } from "@/lib/token";

const MAX_TEXT = 500_000;

export type CheckResult = { ok: true; check: SheetCheck } | { ok: false; error: string };
export type SaveResult =
  | { ok: true; added: number; skipped: number; codes: { name: string; shortCode: string }[] }
  | { ok: false; error: string; check?: SheetCheck };

async function signedInHost(): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate();
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
export async function checkImport(text: string): Promise<CheckResult> {
  if (typeof text !== "string" || text.length > MAX_TEXT) return { ok: false, error: "That paste is too large." };
  const who = await signedInHost();
  if ("error" in who) return { ok: false, error: who.error };
  const { check } = await runCheck(who.host, text);
  return { ok: true, check };
}

/** Check again and, if every row is fine, add the new households. */
export async function saveImport(text: string): Promise<SaveResult> {
  if (typeof text !== "string" || text.length > MAX_TEXT) return { ok: false, error: "That paste is too large." };
  const who = await signedInHost();
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
  revalidatePath("/host/guests");
  revalidatePath("/host");
  return {
    ok: true,
    added: rows.length,
    skipped: check.counts.exists,
    codes: rows.map((r) => ({ name: r.nameEn, shortCode: r.shortCode })),
  };
}

export type AddState = SaveResult | null;

const oneLine = (v: FormDataEntryValue | null) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();

/** Add one late household. Goes through exactly the same checks as an import. */
export async function addHousehold(_prev: AddState, formData: FormData): Promise<AddState> {
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
  return saveImport(`${header.join("\t")}\n${row.join("\t")}`);
}
