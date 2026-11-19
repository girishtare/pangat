import { NextResponse, type NextRequest } from "next/server";
import { householdByLinkCode } from "@/lib/store/admin";
import { isLinkCode } from "@/lib/outreach";

export const dynamic = "force-dynamic";

/** A short card link (/i/<code>/mr or /en): goes on to the household's invitation card in that language. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string; lang: string }> }) {
  const { code, lang } = await params;
  const hh = isLinkCode(code) && (lang === "mr" || lang === "en") ? await householdByLinkCode(code) : null;
  if (!hh) return NextResponse.redirect(new URL(`/r/${encodeURIComponent(code)}`, req.url), 302);
  return NextResponse.redirect(new URL(`/r/${hh.token}/card?l=${lang}`, req.url), 302);
}
