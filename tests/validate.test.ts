import { describe, expect, it } from "vitest";
import { normalise, submissionSchema } from "@/lib/validate";
import type { FunctionInfo } from "@/lib/types";

const fn = (id: string, catered = true): FunctionInfo => ({
  id, name: { en: id, mr: null }, startsAt: "2026-12-28T11:30:00+05:30", venue: null, mapUrl: null, catered,
});
const invited = [fn("wedding"), fn("sangeet", false)];

describe("normalise", () => {
  it("turns a yes into heads with a veg and non-veg split", () => {
    const r = normalise(
      [
        { functionId: "wedding", coming: true, heads: 4, veg: 3, arrivalSlot: "on_time" },
        { functionId: "sangeet", coming: false, heads: 0, veg: 0, arrivalSlot: null },
      ],
      invited,
    );
    expect(r).toEqual({
      ok: true,
      answers: [
        { functionId: "wedding", status: "yes", heads: 4, veg: 3, nonveg: 1, arrivalSlot: "on_time" },
        { functionId: "sangeet", status: "no", heads: 0, veg: 0, nonveg: 0, arrivalSlot: null },
      ],
    });
  });

  it("ignores diet for functions without food", () => {
    const r = normalise(
      [
        { functionId: "wedding", coming: false, heads: 0, veg: 0, arrivalSlot: null },
        { functionId: "sangeet", coming: true, heads: 2, veg: 2, arrivalSlot: "late" },
      ],
      invited,
    );
    expect(r.ok && r.answers[1]).toMatchObject({ heads: 2, veg: 0, nonveg: 0 });
  });

  it("rejects a function the household is not invited to", () => {
    const r = normalise([{ functionId: "haldi", coming: true, heads: 2, veg: 2, arrivalSlot: null }], invited);
    expect(r).toEqual({ ok: false, error: "unknown_function" });
  });

  it("rejects a partial reply", () => {
    const r = normalise([{ functionId: "wedding", coming: true, heads: 2, veg: 2, arrivalSlot: null }], invited);
    expect(r).toEqual({ ok: false, error: "missing_function" });
  });

  it("rejects more vegetarians than people, and a yes with nobody", () => {
    const rest = { functionId: "sangeet", coming: false, heads: 0, veg: 0, arrivalSlot: null } as const;
    expect(normalise([{ functionId: "wedding", coming: true, heads: 2, veg: 3, arrivalSlot: null }, rest], invited)).toEqual({ ok: false, error: "veg_exceeds_heads" });
    expect(normalise([{ functionId: "wedding", coming: true, heads: 0, veg: 0, arrivalSlot: null }, rest], invited)).toEqual({ ok: false, error: "heads_required" });
  });
});

describe("submissionSchema", () => {
  it("rejects absurd headcounts and unknown sources", () => {
    const base = { token: "demo-family-1", source: "link", answers: [{ functionId: "wedding", coming: true, heads: 2, veg: 2, arrivalSlot: null }] };
    expect(submissionSchema.safeParse(base).success).toBe(true);
    expect(submissionSchema.safeParse({ ...base, source: "on_behalf" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...base, answers: [{ ...base.answers[0], heads: 500 }] }).success).toBe(false);
  });
});
