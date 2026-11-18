import { hostGate } from "@/lib/host";
import { buildExpenseExport } from "@/lib/exportExpenses";
import { loadExpenses } from "@/lib/store/expenses";

export const dynamic = "force-dynamic";

/** Expenses as an Excel file (owner only). Read with the owner's own session, so row-level security applies too. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) {
    return new Response("Sign in as the event's owner to download the expenses.", { status: gate.reason === "signed_out" ? 401 : 403 });
  }
  const { host } = gate;
  if (!host.canManage) return new Response("Only the event's owner can download the expenses.", { status: 403 });
  const { expenses, settlements } = await loadExpenses(host.client, host.event.id);
  const file = await buildExpenseExport({ functions: host.functions.map((f) => ({ id: f.id, name: f.name.en })), expenses, settlements });
  const day = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pangat-expenses-${slug}-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
