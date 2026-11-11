import Link from "next/link";
import { redirect } from "next/navigation";
import { signedInUser } from "@/lib/host";
import { AuthNote, AuthShell, GoogleButton, OrDivider } from "../AuthBits";
import { SignUpForm } from "../AuthForms";

export const dynamic = "force-dynamic";

export default async function SignUp() {
  const who = await signedInUser();
  if (who.ok) redirect("/host");
  if (!who.ok && who.reason !== "signed_out") {
    return (
      <AuthShell title="Create your account">
        <AuthNote tone="info">Sign-up needs a database, so it isn&apos;t available in demo mode.</AuthNote>
      </AuthShell>
    );
  }
  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your event, send each family its own link, and see the headcount. Free."
      below={
        <p>
          Already have an account?{" "}
          <Link href="/host/login" className="font-bold text-kumkum underline underline-offset-2">
            Sign in
          </Link>
        </p>
      }
    >
      <GoogleButton />
      <OrDivider />
      <SignUpForm />
    </AuthShell>
  );
}
