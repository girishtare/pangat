import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/store";
import { hostClient } from "@/lib/supabase/session";
import { GoogleButton, LINK_ERRORS, OrDivider } from "../AuthBits";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HostLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (isDemo()) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Sign in</h1>
        <p className="mt-3">This is demo mode, so there is nothing to sign in to.</p>
        <Link className="mt-4 inline-block text-kumkum underline" href="/host">
          Open the demo dashboard
        </Link>
      </main>
    );
  }

  const supabase = await hostClient();
  if (!supabase) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Sign in</h1>
        <p className="mt-3">Sign-in is not set up yet (SUPABASE_PUBLISHABLE_KEY is missing).</p>
      </main>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/host");
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-bold text-kumkum">Sign in to Pangat</h1>
      <p className="mt-2 text-lg">For hosts and co-owners of an event.</p>
      {error && LINK_ERRORS[error] && (
        <p role="alert" className="mt-4 rounded-xl bg-kumkum/10 px-4 py-3 text-kumkum">
          {LINK_ERRORS[error]}
        </p>
      )}
      <div className="mt-6">
        <GoogleButton />
      </div>
      <OrDivider />
      <LoginForm />
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        <Link href="/host/signup" className="font-semibold text-kumkum underline">
          New here? Create an account
        </Link>
        <Link href="/host/forgot" className="text-kumkum underline">
          Forgot your password?
        </Link>
      </div>
    </main>
  );
}
