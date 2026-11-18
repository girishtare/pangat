import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import type { Expense, Settlement } from "@/lib/expenses";

vi.mock("server-only", () => ({}));

const R = (rupees: number) => rupees * 100;
const base = { vendor: null, vendorPhone: null, functionId: null, category: "other" as const, bridePctBp: null, dueDate: null, billPath: null, notes: null, createdAt: "2026-11-18T00:00:00Z" };

const expenses: Expense[] = [
  {
    ...base,
    id: "a",
    title: "Mandap decor",
    vendor: "Shubh Decorators",
    vendorPhone: "+919920031122",
    functionId: "w",
    category: "decor",
    amount: R(120000),
    split: "shared_amount",
    brideShare: R(70000),
    groomShare: R(50000),
    dueDate: "2026-12-24",
    payments: [{ id: "p1", paidOn: "2026-12-12", amount: R(50000), paidBy: "groom", method: "upi", note: "advance" }],
  },
  { ...base, id: "b", title: "Haldi decor", amount: R(45000), split: "bride", brideShare: R(45000), groomShare: 0, payments: [] },
];
const settlements: Settlement[] = [{ id: "s", fromSide: "bride", toSide: "groom", amount: R(1000), paidOn: "2026-12-13", method: "cash", note: null }];

describe("expenses export", () => {
  it("has three sheets, rupee numbers and Indian grouping", async () => {
    const { buildExpenseExport, RUPEE_FORMAT } = await import("@/lib/exportExpenses");
    const buf = await buildExpenseExport({ functions: [{ id: "w", name: "Wedding" }], expenses, settlements });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Expenses", "Payments", "Settle up"]);

    const ex = wb.getWorksheet("Expenses")!;
    expect(ex.getRow(1).getCell(1).value).toBe("Expense");
    // Name order: Haldi decor, then Mandap decor.
    expect(ex.getRow(2).getCell(1).value).toBe("Haldi decor");
    const mandap = ex.getRow(3);
    expect(mandap.getCell(4).value).toBe("Wedding");
    expect(mandap.getCell(6).value).toBe(120000);
    expect(mandap.getCell(6).numFmt).toBe(RUPEE_FORMAT);
    expect(mandap.getCell(7).value).toBe("₹70,000 / ₹50,000");
    expect(mandap.getCell(10).value).toBe(50000);
    expect(mandap.getCell(11).value).toBe(70000);
    expect(mandap.getCell(13).value).toBe("Part paid");
    expect(ex.getRow(4).getCell(1).value).toBe("Total");
    expect(ex.getRow(4).getCell(6).value).toBe(165000);

    const pay = wb.getWorksheet("Payments")!;
    expect(pay.getRow(2).getCell(1).value).toBe("Mandap decor");
    expect(pay.getRow(2).getCell(3).value).toBe(50000);
    expect(pay.getRow(2).getCell(4).value).toBe("Groom's side");

    const st = wb.getWorksheet("Settle up")!;
    expect(st.getRow(2).getCell(1).value).toBe("Bride's side");
    expect(st.getRow(2).getCell(2).value).toBe(115000); // 70,000 + 45,000
    // Groom paid 50,000; bride's share of it is 29,167; bride handed over 1,000.
    expect(st.getRow(2).getCell(4).value).toBe(1000);
    expect(st.getRow(2).getCell(5).value).toBe(1000 - 29167);
    expect(st.getRow(5).getCell(1).value).toBe("Bride's side owes Groom's side");
    expect(st.getRow(5).getCell(2).value).toBe(28167);
  });
});
