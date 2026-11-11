import { NextResponse, type NextRequest } from "next/server";
import { hostGate } from "@/lib/host";
import { cardSignedUrl } from "@/lib/store/admin";

export const dynamic = "force-dynamic";

/** A host previews an invitation card: /host/e/<slug>/card?side=bride|groom&l=en|mr. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return NextResponse.redirect(new URL("/host/login", request.nextUrl.origin));
  const side = request.nextUrl.searchParams.get("side") === "groom" ? "groom" : "bride";
  const lang = request.nextUrl.searchParams.get("l") === "mr" ? "mr" : "en";
  const path = gate.host.event.cards[side][lang];
  if (!path) return NextResponse.redirect(new URL(`/host/e/${slug}/settings`, request.nextUrl.origin));
  return NextResponse.redirect(await cardSignedUrl(path));
}
