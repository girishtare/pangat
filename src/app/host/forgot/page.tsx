import Link from "next/link";
import { AuthShell } from "../AuthBits";
import { ResetForm } from "../AuthForms";

export const dynamic = "force-dynamic";

export default function Forgot() {
  return (
    <AuthShell
      title="Forgotten your password?"
      subtitle="We'll email you a link to choose a new one. If you signed up with Google, just use Continue with Google instead."
      below={
        <Link href="/host/login" className="font-bold text-kumkum underline underline-offset-2">
          ← Back to sign in
        </Link>
      }
    >
      <ResetForm />
    </AuthShell>
  );
}
