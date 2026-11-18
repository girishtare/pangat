import { NextResponse, type NextRequest } from "next/server";
import { hostGate } from "@/lib/host";
import { billSignedUrl } from "@/lib/store/expenses";

export const dynamic = "force-dynamic";

/** The owner opens an expense's bill: /host/e/<slug>/expenses/bill?id=<expense>. A signed link for an hour. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return NextResponse.redirect(new URL("/host/login", request.nextUrl.origin));
  const back = NextResponse.redirect(new URL(`/host/e/${slug}/expenses`, request.nextUrl.origin));
  if (!gate.host.canManage) return back;
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back;
  // Read as the owner (row-level security): only this event's expenses.
  const { data } = await gate.host.client.from("expenses").select("bill_path").eq("event_id", gate.host.event.id).eq("id", id).maybeSingle();
  if (!data?.bill_path) return back;
  return NextResponse.redirect(await billSignedUrl(data.bill_path));
}
