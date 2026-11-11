import { redirect } from "next/navigation";
import { listMyEvents, signedInUser } from "@/lib/host";
import { scopeLabel } from "@/lib/sides";
import { AuthShell } from "../../AuthBits";
import { SetPasswordForm } from "../../AuthForms";

export const dynamic = "force-dynamic";

/** Reached from an invitation or a password-reset email (signed in by the link), or by a signed-in host. */
export default async function ChoosePassword() {
  const who = await signedInUser();
  if (!who.ok) redirect("/host/login?error=link");

  // From a co-owner invitation: name the event and side, when it's clear which (one co-owner event).
  const coOwned = (await listMyEvents(who.client)).filter((e) => e.role === "co_owner");
  const invite = coOwned.length === 1 ? coOwned[0] : null;

  return (
    <AuthShell
      title="Choose a password"
      subtitle={
        <>
          For <b className="text-ink">{who.email}</b>.
          {invite && (
            <>
              {" "}
              You&apos;ve been invited to help with <b className="text-ink">{invite.name.en}</b>, {scopeLabel(invite.side ?? "both").toLowerCase()}.
            </>
          )}{" "}
          You can also always sign in with Google if this is a Gmail address.
        </>
      }
      below={<p className="text-sm text-ink-soft">Reached from an invitation email or a password-reset email.</p>}
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
