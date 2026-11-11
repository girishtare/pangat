import { NextResponse, type NextRequest } from "next/server";
import { hostGate } from "@/lib/host";
import { cardSignedUrl } from "@/lib/store/admin";

export const dynamic = "force-dynamic";

/** A host previews the event's invitation card: /host/e/<slug>/card?l=en|mr. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return NextResponse.redirect(new URL("/host/login", request.nextUrl.origin));
  const path = request.nextUrl.searchParams.get("l") === "mr" ? gate.host.event.cards.mr : gate.host.event.cards.en;
  if (!path) return NextResponse.redirect(new URL(`/host/e/${slug}/settings`, request.nextUrl.origin));
  return NextResponse.redirect(await cardSignedUrl(path));
}
