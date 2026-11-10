import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { hostClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

/** Google sign-in comes back here with ?code=…; swap it for a session, then carry on. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await hostClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    console.error("auth callback failed", error.status, error.code);
  }
  return NextResponse.redirect(new URL("/host/login?error=link", url.origin));
}
