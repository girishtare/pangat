import { NextResponse, type NextRequest } from "next/server";
import { cardPathForGuest, cardSignedUrl } from "@/lib/store/admin";

export const dynamic = "force-dynamic";

/**
 * A guest opens the invitation card: /r/<token>/card?l=en|mr. The household's
 * token is the key (as for the reply page); the PDF itself stays private and is
 * served through a link that works for an hour.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const lang = request.nextUrl.searchParams.get("l") === "mr" ? "mr" : "en";
  const path = /^[A-Za-z0-9_-]{6,64}$/.test(token) ? await cardPathForGuest(token, lang) : null;
  if (!path) return NextResponse.redirect(new URL(`/r/${encodeURIComponent(token)}`, request.nextUrl.origin));
  return NextResponse.redirect(await cardSignedUrl(path));
}
