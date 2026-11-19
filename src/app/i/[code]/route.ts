import { NextResponse, type NextRequest } from "next/server";
import { householdByLinkCode } from "@/lib/store/admin";
import { isLinkCode } from "@/lib/outreach";

export const dynamic = "force-dynamic";

/**
 * A short reply link from a WhatsApp message (owner, 19 Nov; migration 0032):
 * /i/<code> goes on to the household's reply page, in its language as the long
 * link did with ?l=. An unknown code ends on the reply page's "link isn't valid".
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const hh = isLinkCode(code) ? await householdByLinkCode(code) : null;
  if (!hh) return NextResponse.redirect(new URL(`/r/${encodeURIComponent(code)}`, req.url), 302);
  const to = new URL(`/r/${hh.token}`, req.url);
  if (hh.slipLang !== "both") to.searchParams.set("l", hh.slipLang);
  return NextResponse.redirect(to, 302);
}
