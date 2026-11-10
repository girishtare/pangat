import { redirect } from "next/navigation";
import { signedInUser } from "@/lib/host";
import { SetPasswordForm } from "../../AuthForms";

export const dynamic = "force-dynamic";

/** Reached from an invitation or a password-reset email (signed in by the link), or by a signed-in host. */
export default async function ChoosePassword() {
  const who = await signedInUser();
  if (!who.ok) redirect("/host/login?error=link");
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-bold text-kumkum">Choose a password</h1>
      <p className="mt-2 text-lg">
        For <b>{who.email}</b>. You can also always sign in with Google if this is a Gmail address.
      </p>
      <div className="mt-6">
        <SetPasswordForm />
      </div>
    </main>
  );
}
