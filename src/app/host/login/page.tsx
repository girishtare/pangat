import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/store";
import { hostClient } from "@/lib/supabase/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function HostLogin() {
  if (isDemo()) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Host sign-in</h1>
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
        <h1 className="text-2xl font-bold text-kumkum">Host sign-in</h1>
        <p className="mt-3">Host sign-in is not set up yet (SUPABASE_PUBLISHABLE_KEY is missing).</p>
      </main>
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/host");

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-bold text-kumkum">Host sign-in</h1>
      <p className="mt-2 text-lg">For the family members running the guest list.</p>
      <LoginForm />
    </main>
  );
}
