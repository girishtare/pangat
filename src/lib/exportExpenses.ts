import "server-only";
import ExcelJS from "exceljs";
import {
  CATEGORY_LABEL,
  dueOf,
  METHOD_LABEL,
  paidOf,
  SIDE_NAME,
  splitLabel,
  STATUS_LABEL,
  statusOf,
  summarise,
  type Expense,
  type Settlement,
} from "./expenses";

/** Rupees with Indian grouping (₹10,93,000), as Excel number formats can't group by lakh on their own. */
export const RUPEE_FORMAT = '[>=10000000]"₹"#\\,##\\,##\\,##0;[>=100000]"₹"#\\,##\\,##0;"₹"#,##0';
const DATE_FORMAT = "d mmm yyyy";

/** Paise → a rupee number for a cell (the cell's format shows it as ₹). */
const rupees = (paise: number) => paise / 100;
/** YYYY-MM-DD → an Excel date (midnight UTC, so it shows that day everywhere). */
const day = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);

function styleHeader(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.height = 22;
  header.alignment = { vertical: "middle", wrapText: true };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEADFC8" } };
    c.border = { bottom: { style: "thin", color: { argb: "FF7A1420" } } };
  });
}

/**
 * Expenses as an Excel file (owner, 18 Nov): Expenses, Payments and Settle up
 * sheets. Amounts are numbers in rupees, shown as ₹ with Indian grouping.
 */
export async function buildExpenseExport(opts: { functions: { id: string; name: string }[]; expenses: Expense[]; settlements: Settlement[] }): Promise<Buffer> {
  const fnName = new Map(opts.functions.map((f) => [f.id, f.name]));
  const nameOf = (e: Expense) => (e.functionId ? (fnName.get(e.functionId) ?? "General") : "General");
  const sorted = [...opts.expenses].sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true }));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Pangat";
  wb.created = new Date();

  // 1. Expenses
  const ex = wb.addWorksheet("Expenses", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  ex.columns = [
    { header: "Expense", key: "title", width: 28 },
    { header: "Vendor", key: "vendor", width: 24 },
    { header: "Vendor's phone", key: "phone", width: 16, style: { numFmt: "@" } },
    { header: "Function", key: "fn", width: 14 },
    { header: "Category", key: "cat", width: 16 },
    { header: "Amount", key: "amount", width: 14, style: { numFmt: RUPEE_FORMAT } },
    { header: "Who pays", key: "split", width: 22 },
    { header: "Bride's side share", key: "bride", width: 16, style: { numFmt: RUPEE_FORMAT } },
    { header: "Groom's side share", key: "groom", width: 16, style: { numFmt: RUPEE_FORMAT } },
    { header: "Paid", key: "paid", width: 14, style: { numFmt: RUPEE_FORMAT } },
    { header: "Still due", key: "due", width: 14, style: { numFmt: RUPEE_FORMAT } },
    { header: "Rest due by", key: "dueDate", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "Status", key: "status", width: 12 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  for (const e of sorted) {
    ex.addRow({
      title: e.title,
      vendor: e.vendor ?? "",
      phone: e.vendorPhone ?? "",
      fn: nameOf(e),
      cat: CATEGORY_LABEL[e.category],
      amount: rupees(e.amount),
      split: splitLabel(e),
      bride: rupees(e.brideShare),
      groom: rupees(e.groomShare),
      paid: rupees(paidOf(e)),
      due: rupees(dueOf(e)),
      dueDate: dueOf(e) > 0 ? day(e.dueDate) : null,
      status: STATUS_LABEL[statusOf(e)],
      notes: e.notes ?? "",
    });
  }
  const s = summarise(opts.expenses, opts.settlements);
  const total = ex.addRow({
    title: "Total",
    amount: rupees(s.total),
    bride: rupees(s.side.bride.shareOfTotal),
    groom: rupees(s.side.groom.shareOfTotal),
    paid: rupees(s.paid),
    due: rupees(s.due),
  });
  total.font = { bold: true };
  styleHeader(ex);
  ex.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1 + sorted.length, column: ex.columnCount } };

  // 2. Payments
  const pay = wb.addWorksheet("Payments", { views: [{ state: "frozen", ySplit: 1 }] });
  pay.columns = [
    { header: "Expense", key: "title", width: 28 },
    { header: "Date", key: "date", width: 14, style: { numFmt: DATE_FORMAT } },
    { header: "Amount", key: "amount", width: 14, style: { numFmt: RUPEE_FORMAT } },
    { header: "Paid by", key: "by", width: 16 },
    { header: "How", key: "how", width: 16 },
    { header: "Note", key: "note", width: 36 },
  ];
  const payments = sorted
    .flatMap((e) => e.payments.map((p) => ({ e, p })))
    .sort((a, b) => a.p.paidOn.localeCompare(b.p.paidOn) || a.e.title.localeCompare(b.e.title));
  for (const { e, p } of payments) {
    pay.addRow({ title: e.title, date: day(p.paidOn), amount: rupees(p.amount), by: SIDE_NAME[p.paidBy], how: METHOD_LABEL[p.method], note: p.note ?? "" });
  }
  styleHeader(pay);

  // 3. Settle up
  const st = wb.addWorksheet("Settle up");
  st.columns = [
    { header: "Side", key: "side", width: 16 },
    { header: "Share of the total", key: "total", width: 18, style: { numFmt: RUPEE_FORMAT } },
    { header: "Share of what's paid", key: "ofPaid", width: 20, style: { numFmt: RUPEE_FORMAT } },
    { header: "Has paid", key: "has", width: 16, style: { numFmt: RUPEE_FORMAT } },
    { header: "Balance (+ extra, − short)", key: "balance", width: 24, style: { numFmt: RUPEE_FORMAT } },
  ];
  for (const k of ["bride", "groom"] as const) {
    st.addRow({
      side: SIDE_NAME[k],
      total: rupees(s.side[k].shareOfTotal),
      ofPaid: rupees(s.side[k].shareOfPaid),
      has: rupees(s.side[k].hasPaid),
      balance: rupees(s.side[k].balance),
    });
  }
  styleHeader(st);
  st.addRow([]);
  st.addRow([s.owes ? `${SIDE_NAME[s.owes.from]} owes ${SIDE_NAME[s.owes.to]}` : "All square", s.owes ? rupees(s.owes.amount) : null]).font = { bold: true };
  st.addRow(["Has paid = payments to vendors + settlements made − settlements received."]).font = { italic: true, color: { argb: "FF5E4446" } };
  if (opts.settlements.length) {
    st.addRow([]);
    const h = st.addRow(["Settlements", "Date", "Amount", "How", "Note"]);
    h.font = { bold: true };
    for (const x of opts.settlements) {
      const r = st.addRow([`${SIDE_NAME[x.fromSide]} to ${SIDE_NAME[x.toSide]}`, day(x.paidOn), rupees(x.amount), METHOD_LABEL[x.method], x.note ?? ""]);
      r.getCell(2).numFmt = DATE_FORMAT;
      r.getCell(3).numFmt = RUPEE_FORMAT;
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
