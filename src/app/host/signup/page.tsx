import Link from "next/link";
import { redirect } from "next/navigation";
import { signedInUser } from "@/lib/host";
import { GoogleButton, OrDivider } from "../AuthBits";
import { SignUpForm } from "../AuthForms";

export const dynamic = "force-dynamic";

export default async function SignUp() {
  const who = await signedInUser();
  if (who.ok) redirect("/host");
  if (!who.ok && who.reason !== "signed_out") {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Create an account</h1>
        <p className="mt-3">Sign-up needs a database, so it isn&apos;t available in demo mode.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-bold text-kumkum">Create your Pangat account</h1>
      <p className="mt-2 text-lg">Know who is really coming. Set up your event, share each family&apos;s own link, and see the headcount.</p>
      <div className="mt-6">
        <GoogleButton />
      </div>
      <OrDivider />
      <SignUpForm />
      <p className="mt-6 text-sm">
        Already have an account?{" "}
        <Link href="/host/login" className="font-semibold text-kumkum underline">
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-xs text-gray-600">Sign-up with a mobile number is coming later.</p>
    </main>
  );
}
