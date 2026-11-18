import { describe, expect, it } from "vitest";
import {
  brideShareOfPaid,
  checkAmountCoversPayments,
  checkPayment,
  dueSoon,
  formatRupees,
  mulDivRound,
  parsePct,
  parseRupees,
  pctText,
  rupeesInput,
  splitLabel,
  splitShares,
  statusOf,
  summarise,
  type Expense,
  type Payment,
  type Settlement,
} from "@/lib/expenses";

const R = (rupees: number) => rupees * 100; // rupees → paise

let n = 0;
function pay(rupees: number, paidBy: "bride" | "groom", paidOn = "2026-12-01"): Payment {
  return { id: `p${++n}`, paidOn, amount: R(rupees), paidBy, method: "upi", note: null };
}
function exp(e: Partial<Expense> & { title: string; amount: number; brideShare: number; groomShare: number }): Expense {
  return {
    id: e.title,
    vendor: null,
    vendorPhone: null,
    functionId: null,
    category: "other",
    split: "shared_amount",
    bridePctBp: null,
    dueDate: null,
    billPath: null,
    notes: null,
    payments: [],
    createdAt: "2026-11-18T00:00:00Z",
    ...e,
  };
}

/** The six expenses in docs/features/expenses/expenses-web.png. */
const SAMPLE: Expense[] = [
  exp({ title: "Catering", amount: R(480000), split: "shared_pct", bridePctBp: 5000, brideShare: R(240000), groomShare: R(240000), dueDate: "2026-12-20", payments: [pay(200000, "bride")] }),
  exp({ title: "Hall hire", amount: R(350000), split: "shared_pct", bridePctBp: 6000, brideShare: R(210000), groomShare: R(140000), payments: [pay(210000, "bride"), pay(140000, "groom")] }),
  exp({ title: "Mandap decor", amount: R(120000), split: "shared_amount", brideShare: R(70000), groomShare: R(50000), dueDate: "2026-12-24", payments: [pay(50000, "groom")] }),
  exp({ title: "Haldi decor", amount: R(45000), split: "bride", brideShare: R(45000), groomShare: 0, dueDate: "2026-12-26", payments: [pay(20000, "bride")] }),
  exp({ title: "DJ and sound", amount: R(60000), split: "groom", brideShare: 0, groomShare: R(60000), payments: [pay(60000, "groom")] }),
  exp({ title: "Invitation cards", amount: R(38000), split: "shared_pct", bridePctBp: 5000, brideShare: R(19000), groomShare: R(19000), payments: [pay(38000, "bride")] }),
];

describe("money", () => {
  it("reads rupees as typed", () => {
    expect(parseRupees("1,20,000")).toEqual({ ok: true, paise: 12_000_000 });
    expect(parseRupees("120000.50")).toEqual({ ok: true, paise: 12_000_050 });
    expect(parseRupees("120000.5")).toEqual({ ok: true, paise: 12_000_050 });
    expect(parseRupees("₹ 45,000")).toEqual({ ok: true, paise: 4_500_000 });
    expect(parseRupees("")).toEqual({ ok: true, paise: null });
    expect(parseRupees("12.345").ok).toBe(false);
    expect(parseRupees("-5").ok).toBe(false);
    expect(parseRupees("abc").ok).toBe(false);
  });
  it("shows rupees the Indian way, with paise only when there are any", () => {
    expect(formatRupees(R(1093000))).toBe("₹10,93,000");
    expect(formatRupees(33_363)).toBe("₹333.63");
    expect(formatRupees(-R(89833))).toBe("−₹89,833");
    expect(rupeesInput(12_000_050)).toBe("1,20,000.50");
    expect(rupeesInput(R(45000))).toBe("45,000");
  });
  it("reads and shows percentages in basis points", () => {
    expect(parsePct("60")).toBe(6000);
    expect(parsePct("33.33")).toBe(3333);
    expect(parsePct("100")).toBe(10000);
    expect(parsePct("100.5")).toBeNull();
    expect(pctText(3333)).toBe("33.33");
    expect(pctText(3330)).toBe("33.3");
    expect(pctText(6000)).toBe("60");
  });
  it("rounds half up", () => {
    expect(mulDivRound(1, 1, 2)).toBe(1);
    expect(mulDivRound(5, 1, 2)).toBe(3);
    expect(mulDivRound(4, 1, 3)).toBe(1);
  });
});

describe("split", () => {
  it("one side pays all", () => {
    expect(splitShares(R(45000), { split: "bride" })).toEqual({ ok: true, shares: { bride: R(45000), groom: 0, bridePctBp: null } });
    expect(splitShares(R(60000), { split: "groom" })).toEqual({ ok: true, shares: { bride: 0, groom: R(60000), bridePctBp: null } });
  });
  it("by percentage, and the two sides add up exactly on odd amounts", () => {
    const r = splitShares(R(1001), { split: "shared_pct", bridePctBp: 3333 });
    expect(r).toEqual({ ok: true, shares: { bride: 33_363, groom: 66_737, bridePctBp: 3333 } });
    if (r.ok) expect(r.shares.bride + r.shares.groom).toBe(R(1001));
    expect(splitShares(R(350000), { split: "shared_pct", bridePctBp: 6000 })).toEqual({ ok: true, shares: { bride: R(210000), groom: R(140000), bridePctBp: 6000 } });
  });
  it("by amount, which must add up", () => {
    expect(splitShares(R(120000), { split: "shared_amount", bride: R(70000), groom: R(50000) }).ok).toBe(true);
    expect(splitShares(R(120000), { split: "shared_amount", bride: R(70000), groom: R(40000) })).toEqual({ ok: false, message: "The two shares must add up to ₹1,20,000." });
  });
  it("says how it is split", () => {
    expect(SAMPLE.map(splitLabel)).toEqual(["Shared 50 / 50", "Shared 60 / 40", "₹70,000 / ₹50,000", "Bride's side only", "Groom's side only", "Shared 50 / 50"]);
  });
});

describe("payments and status", () => {
  it("can't pay more than is due", () => {
    expect(checkPayment(R(70000), R(70000))).toBeNull();
    expect(checkPayment(R(70000), R(70001))).toBe("That's more than the ₹70,000 still due.");
    expect(checkPayment(0, R(1))).toBe("This expense is already paid in full.");
    expect(checkAmountCoversPayments(R(40000), R(50000))).toMatch(/more than the new total of ₹40,000/);
    expect(checkAmountCoversPayments(R(50000), R(50000))).toBeNull();
  });
  it("Paid, Part paid, Not paid", () => {
    expect(SAMPLE.map(statusOf)).toEqual(["part", "paid", "part", "part", "paid", "paid"]);
    expect(statusOf(exp({ title: "x", amount: R(10), brideShare: R(10), groomShare: 0 }))).toBe("unpaid");
  });
});

describe("settle up", () => {
  it("matches the design's sample", () => {
    const s = summarise(SAMPLE);
    expect(s.total).toBe(R(1093000));
    expect(s.side.bride.shareOfTotal).toBe(R(584000));
    expect(s.side.groom.shareOfTotal).toBe(R(509000));
    expect(s.paid).toBe(R(718000));
    expect(s.due).toBe(R(375000));
    expect(s.side.bride.shareOfPaid).toBe(R(378167));
    expect(s.side.groom.shareOfPaid).toBe(R(339833));
    expect(s.side.bride.hasPaid).toBe(R(468000));
    expect(s.side.groom.hasPaid).toBe(R(250000));
    expect(s.side.bride.balance).toBe(R(89833));
    expect(s.side.groom.balance).toBe(-R(89833));
    expect(s.owes).toEqual({ from: "groom", to: "bride", amount: R(89833) });
  });
  it("rounds each expense's share of what's paid to the rupee", () => {
    expect(brideShareOfPaid(SAMPLE[2])).toBe(R(29167));
  });
  it("is all square with no payments", () => {
    const none = SAMPLE.map((e) => ({ ...e, payments: [] }));
    const s = summarise(none);
    expect(s.paid).toBe(0);
    expect(s.due).toBe(R(1093000));
    expect(s.owes).toBeNull();
    expect(s.side.bride.shareOfTotal).toBe(R(584000));
  });
  it("is all square when every expense is one side's, paid by that side", () => {
    const own = [
      exp({ title: "a", amount: R(1000), split: "bride", brideShare: R(1000), groomShare: 0, payments: [pay(400, "bride")] }),
      exp({ title: "b", amount: R(3000), split: "groom", brideShare: 0, groomShare: R(3000), payments: [pay(3000, "groom")] }),
    ];
    expect(summarise(own).owes).toBeNull();
  });
  it("one side paying the other's expense creates a debt", () => {
    const s = summarise([exp({ title: "a", amount: R(1000), split: "groom", brideShare: 0, groomShare: R(1000), payments: [pay(1000, "bride")] })]);
    expect(s.owes).toEqual({ from: "groom", to: "bride", amount: R(1000) });
  });
  it("a settlement that clears the balance makes it all square", () => {
    const settle: Settlement = { id: "s1", fromSide: "groom", toSide: "bride", amount: R(89833), paidOn: "2026-12-10", method: "bank", note: null };
    const s = summarise(SAMPLE, [settle]);
    expect(s.owes).toBeNull();
    expect(s.side.bride.hasPaid).toBe(R(378167));
    expect(s.side.groom.hasPaid).toBe(R(339833));
    const part = summarise(SAMPLE, [{ ...settle, amount: R(80000) }]);
    expect(part.owes).toEqual({ from: "groom", to: "bride", amount: R(9833) });
  });
  it("odd amounts still add up", () => {
    const e = exp({ title: "odd", amount: R(1001), split: "shared_pct", bridePctBp: 3333, brideShare: 33_363, groomShare: 66_737, payments: [pay(500, "groom")] });
    const s = summarise([e]);
    expect(s.side.bride.shareOfPaid + s.side.groom.shareOfPaid).toBe(R(500));
    expect(s.side.bride.shareOfPaid).toBe(R(167)); // 500 × 333.63 / 1001 = 166.65 → 167
    expect(s.owes).toEqual({ from: "bride", to: "groom", amount: R(167) });
  });
});

describe("due soon", () => {
  it("lists money due in the next 14 days, overdue first", () => {
    const list = [
      exp({ title: "later", amount: R(10), brideShare: R(10), groomShare: 0, dueDate: "2026-12-30" }),
      exp({ title: "soon", amount: R(10), brideShare: R(10), groomShare: 0, dueDate: "2026-12-20" }),
      exp({ title: "overdue", amount: R(10), brideShare: R(10), groomShare: 0, dueDate: "2026-12-01" }),
      exp({ title: "paid", amount: R(10), brideShare: R(10), groomShare: 0, dueDate: "2026-12-19", payments: [pay(10, "bride")] }),
      exp({ title: "no date", amount: R(10), brideShare: R(10), groomShare: 0 }),
    ];
    expect(dueSoon(list, "2026-12-10").map((e) => e.title)).toEqual(["overdue", "soon"]);
  });
});
