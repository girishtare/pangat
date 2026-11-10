import { NextResponse, type NextRequest } from "next/server";
import { isEmailLinkType, safeNext } from "@/lib/auth";
import { hostClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

/**
 * Links in Pangat's emails (confirm sign-up, co-owner invitation, password
 * reset) land here with ?token_hash=…&type=…. Verifying on the server works
 * even when the email is opened in a different browser or app from the one
 * used to sign up, which matters on phones.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await hostClient();
  if (tokenHash && isEmailLinkType(type) && supabase) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Invited co-owners and password resets need to choose a password next.
      const next = type === "invite" || type === "recovery" ? "/host/account/password" : safeNext(url.searchParams.get("next"));
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("email link failed", error.status, error.code);
  }
  return NextResponse.redirect(new URL("/host/login?error=link", url.origin));
}
