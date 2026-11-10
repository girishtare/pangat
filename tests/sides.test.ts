import { describe, expect, it } from "vitest";
import { factsFor, scopeLabel, scopesFor } from "@/lib/sides";
import type { InviteFact } from "@/lib/types";

const fact = (householdId: string, side: "bride" | "groom"): InviteFact => ({
  householdId,
  side,
  functionId: "fn-wedding",
  status: "pending",
  heads: 0,
  veg: 0,
  nonveg: 0,
});

const facts = [fact("a", "bride"), fact("b", "bride"), fact("c", "groom")];

describe("dashboard sections by side", () => {
  it("shows a one-side host only their side", () => {
    expect(scopesFor("bride", facts)).toEqual(["bride"]);
    expect(scopesFor("groom", facts)).toEqual(["groom"]);
  });

  it("shows a both-sides host the total, then each side", () => {
    expect(scopesFor(null, facts)).toEqual(["both", "bride", "groom"]);
  });

  it("skips the total when only one side has guests", () => {
    expect(scopesFor(null, [fact("a", "groom")])).toEqual(["groom"]);
    expect(scopesFor(null, [])).toEqual(["both"]);
  });

  it("filters facts by section", () => {
    expect(factsFor("bride", facts).map((f) => f.householdId)).toEqual(["a", "b"]);
    expect(factsFor("both", facts)).toHaveLength(3);
  });

  it("labels sections in plain English", () => {
    expect(scopeLabel("groom")).toBe("Groom's side");
    expect(scopeLabel("both")).toBe("Both sides");
  });
});
