import Link from "next/link";
import { ResetForm } from "../AuthForms";

export const dynamic = "force-dynamic";

export default function Forgot() {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-bold text-kumkum">Forgotten your password?</h1>
      <p className="mt-2 text-lg">We&apos;ll email you a link to choose a new one. If you signed up with Google, just use Continue with Google instead.</p>
      <div className="mt-6">
        <ResetForm />
      </div>
      <Link href="/host/login" className="mt-6 inline-block text-sm text-kumkum underline">
        ← Back to sign in
      </Link>
    </main>
  );
}
