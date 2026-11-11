import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/store";
import { hostClient } from "@/lib/supabase/session";
import { AuthNote, AuthShell, GoogleButton, LINK_ERRORS, OrDivider } from "../AuthBits";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HostLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (isDemo()) {
    return (
      <AuthShell title="Sign in">
        <AuthNote tone="info">This is demo mode, so there is nothing to sign in to.</AuthNote>
        <Link className="btn btn-primary w-full" href="/host">
          Open the demo dashboard
        </Link>
      </AuthShell>
    );
  }

  const supabase = await hostClient();
  if (!supabase) {
    return (
      <AuthShell title="Sign in">
        <AuthNote>Sign-in is not set up yet (SUPABASE_PUBLISHABLE_KEY is missing).</AuthNote>
      </AuthShell>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/host");
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see who is coming. For hosts and co-owners of an event."
      below={
        <p>
          New to Pangat?{" "}
          <Link href="/host/signup" className="font-bold text-kumkum underline underline-offset-2">
            Create a free account
          </Link>
        </p>
      }
    >
      {error && LINK_ERRORS[error] && <AuthNote>{LINK_ERRORS[error]}</AuthNote>}
      <GoogleButton />
      <OrDivider />
      <LoginForm />
    </AuthShell>
  );
}
