import { z } from "zod";
import type { ArrivalSlot, FunctionInfo } from "./types";

export const MAX_HEADS = 30;

const answerSchema = z.object({
  functionId: z.string().min(1),
  coming: z.boolean(),
  heads: z.number().int().min(0).max(MAX_HEADS),
  veg: z.number().int().min(0).max(MAX_HEADS),
  arrivalSlot: z.enum(["early", "on_time", "late"]).nullable(),
});

export const submissionSchema = z.object({
  token: z.string().min(8).max(64),
  source: z.enum(["qr", "link"]),
  answers: z.array(answerSchema).min(1).max(20),
});

export type Submission = z.infer<typeof submissionSchema>;

export interface NormalisedAnswer {
  functionId: string;
  status: "yes" | "no";
  heads: number;
  veg: number;
  nonveg: number;
  arrivalSlot: ArrivalSlot | null;
}

export type NormaliseResult =
  | { ok: true; answers: NormalisedAnswer[] }
  | { ok: false; error: "missing_function" | "unknown_function" | "heads_required" | "veg_exceeds_heads" };

/**
 * Check a guest's answers against the functions they are invited to and turn
 * them into rows. Every invited function must be answered exactly once.
 */
/** One saved reply, as the database holds it. */
export interface SavedReply {
  status: string;
  heads: number;
  veg: number;
  nonveg: number;
  arrival_slot: string | null;
}

/** True when a reply differs from what is saved (or nothing is saved yet). */
export function replyChanged(saved: SavedReply | undefined, next: SavedReply): boolean {
  return (
    !saved ||
    saved.status !== next.status ||
    saved.heads !== next.heads ||
    saved.veg !== next.veg ||
    saved.nonveg !== next.nonveg ||
    (saved.arrival_slot ?? null) !== (next.arrival_slot ?? null)
  );
}

export function normalise(answers: Submission["answers"], invited: FunctionInfo[]): NormaliseResult {
  const byId = new Map(invited.map((f) => [f.id, f]));
  const seen = new Set<string>();
  const out: NormalisedAnswer[] = [];

  for (const a of answers) {
    const fn = byId.get(a.functionId);
    if (!fn || seen.has(a.functionId)) return { ok: false, error: "unknown_function" };
    seen.add(a.functionId);

    if (!a.coming) {
      out.push({ functionId: a.functionId, status: "no", heads: 0, veg: 0, nonveg: 0, arrivalSlot: null });
      continue;
    }
    if (a.heads < 1) return { ok: false, error: "heads_required" };
    if (a.veg > a.heads) return { ok: false, error: "veg_exceeds_heads" };

    // Diet only matters where food is served.
    const veg = fn.catered ? a.veg : 0;
    const nonveg = fn.catered ? a.heads - a.veg : 0;
    out.push({ functionId: a.functionId, status: "yes", heads: a.heads, veg, nonveg, arrivalSlot: a.arrivalSlot });
  }

  if (seen.size !== invited.length) return { ok: false, error: "missing_function" };
  return { ok: true, answers: out };
}
