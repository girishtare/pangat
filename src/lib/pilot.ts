/**
 * The pilot record (CLAUDE.md, "How the pilot is judged"): per function, the
 * family's baseline, the tool's number frozen on 14 December, and the actual
 * count. The caterer gets the higher of baseline and predicted. The tool has
 * earned its place only if predicted is closer to actual than baseline is.
 */

export interface FunctionNumbers {
  baseline: number | null;
  predicted: number | null;
  predictedVeg: number | null;
  predictedNonveg: number | null;
  predictedAt: string | null;
  actual: number | null;
  actualVeg: number | null;
  actualNonveg: number | null;
}

export const EMPTY_NUMBERS: FunctionNumbers = {
  baseline: null,
  predicted: null,
  predictedVeg: null,
  predictedNonveg: null,
  predictedAt: null,
  actual: null,
  actualVeg: null,
  actualNonveg: null,
};

/** Splits an expected headcount using the veg / non-veg ratio of confirmed replies. */
export function splitByConfirmed(expected: number, veg: number, nonveg: number): { veg: number; nonveg: number } | null {
  if (veg + nonveg === 0) return null;
  const v = Math.round((expected * veg) / (veg + nonveg));
  return { veg: v, nonveg: expected - v };
}

/** Decided: if the two disagree, the higher number goes to the caterer. */
export function toCaterer(baseline: number | null, predicted: number | null): number | null {
  if (baseline === null) return predicted;
  if (predicted === null) return baseline;
  return Math.max(baseline, predicted);
}

export type Verdict = "tool" | "baseline" | "tie" | null;

/** Which number came closer to the actual count. Null until all three exist. */
export function closer(n: Pick<FunctionNumbers, "baseline" | "predicted" | "actual">): Verdict {
  if (n.baseline === null || n.predicted === null || n.actual === null) return null;
  const b = Math.abs(n.baseline - n.actual);
  const p = Math.abs(n.predicted - n.actual);
  return p < b ? "tool" : b < p ? "baseline" : "tie";
}

/** A whole number from a form field, blank meaning "not set". */
export function readCount(raw: FormDataEntryValue | null, max = 100000): { ok: true; value: number | null } | { ok: false } {
  const s = String(raw ?? "").trim().replace(/,/g, "");
  if (s === "") return { ok: true, value: null };
  if (!/^\d+$/.test(s)) return { ok: false };
  const n = Number(s);
  return n <= max ? { ok: true, value: n } : { ok: false };
}
