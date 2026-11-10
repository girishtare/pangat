"use server";

import { revalidatePath } from "next/cache";
import { forecast } from "@/lib/forecast";
import { hostGate, type HostContext } from "@/lib/host";
import { readCount, splitByConfirmed } from "@/lib/pilot";
import { loadNumbers, saveNumbers } from "@/lib/store/admin";
import { supabaseStore } from "@/lib/store/supabase";

export type FormState = { ok: boolean; message: string } | null;

async function manager(slug: string): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { error: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  if (!gate.host.canManage) return { error: "Only the event's owner can record these numbers." };
  return { host: gate.host };
}

const done = (message: string): FormState => {
  revalidatePath("/host", "layout");
  return { ok: true, message };
};

/** The family's own estimate per function: what they would have ordered without the tool. */
export async function saveBaselines(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const now = new Date().toISOString();
  const rows = [];
  for (const f of who.host.functions) {
    const v = readCount(fd.get(`baseline_${f.id}`));
    if (!v.ok) return { ok: false, message: `${f.name.en}: enter a whole number, or leave it blank.` };
    rows.push({ functionId: f.id, baseline: v.value, baseline_set_at: v.value === null ? null : now });
  }
  await saveNumbers(rows, who.host.userId);
  return done("Baseline saved.");
}

/** The tool's expected headcount and veg split per function, over both sides, as of now. */
async function snapshot(slug: string) {
  const data = await supabaseStore.getDashboard(slug);
  if (!data) return null;
  const rates = { yesShowRate: data.event.yesShowRate, pendingShowRate: data.event.pendingShowRate };
  return data.functions.map((fn) => {
    const f = forecast(
      data.facts.filter((x) => x.functionId === fn.id),
      rates,
    );
    const split = splitByConfirmed(f.expected, f.veg, f.nonveg);
    return { functionId: fn.id, count: f.expected, veg: split?.veg ?? null, nonveg: split?.nonveg ?? null };
  });
}

/** Freezes the tool's numbers for the caterer's first count. The pilot is judged on these. */
export async function freezePredicted(slug: string, _prev: FormState): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const snap = await snapshot(slug);
  if (!snap) return { ok: false, message: "Event not found." };
  const now = new Date().toISOString();
  await saveNumbers(
    snap.map((r) => ({
      functionId: r.functionId,
      predicted: r.count,
      predicted_veg: r.veg,
      predicted_nonveg: r.nonveg,
      predicted_at: now,
      predicted_by: who.host.userId,
    })),
    who.host.userId,
  );
  return done("The tool's numbers are frozen. These are the ones the pilot is judged on.");
}

/** Freezes a revised number for the caterer, after the first count. Doesn't change the pilot verdict. */
export async function freezeRevised(slug: string, _prev: FormState): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const existing = await loadNumbers(who.host.functions.map((f) => f.id));
  if (![...existing.values()].some((n) => n.predictedAt)) {
    return { ok: false, message: "Freeze the first count before freezing a revision." };
  }
  const snap = await snapshot(slug);
  if (!snap) return { ok: false, message: "Event not found." };
  const now = new Date().toISOString();
  await saveNumbers(
    snap.map((r) => ({
      functionId: r.functionId,
      revised: r.count,
      revised_veg: r.veg,
      revised_nonveg: r.nonveg,
      revised_at: now,
      revised_by: who.host.userId,
    })),
    who.host.userId,
  );
  return done("Revised numbers frozen. Send the new 'To the caterer' figures; the pilot is still judged on the first count.");
}

/** Counted on the day, per function. */
export async function saveActuals(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const who = await manager(slug);
  if ("error" in who) return { ok: false, message: who.error };
  const now = new Date().toISOString();
  const rows = [];
  for (const f of who.host.functions) {
    const total = readCount(fd.get(`actual_${f.id}`));
    const veg = readCount(fd.get(`actualVeg_${f.id}`));
    const nonveg = readCount(fd.get(`actualNonveg_${f.id}`));
    if (!total.ok || !veg.ok || !nonveg.ok) return { ok: false, message: `${f.name.en}: enter whole numbers, or leave them blank.` };
    let actual = total.value;
    if (actual === null && veg.value !== null && nonveg.value !== null) actual = veg.value + nonveg.value;
    if (actual !== null && veg.value !== null && nonveg.value !== null && veg.value + nonveg.value !== actual) {
      return { ok: false, message: `${f.name.en}: veg (${veg.value}) and non-veg (${nonveg.value}) don't add up to ${actual}.` };
    }
    rows.push({
      functionId: f.id,
      actual,
      actual_veg: veg.value,
      actual_nonveg: nonveg.value,
      actual_set_at: actual === null ? null : now,
    });
  }
  await saveNumbers(rows, who.host.userId);
  return done("Actual counts saved.");
}
