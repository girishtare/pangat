import Link from "next/link";
import { redirect } from "next/navigation";
import { signedInUser } from "@/lib/host";
import Logo from "../../ui/Logo";
import { AuthNote, AuthShell } from "../AuthBits";
import NewEventForm from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEvent() {
  const who = await signedInUser();
  if (!who.ok && who.reason === "signed_out") redirect("/host/login");
  if (!who.ok) {
    return (
      <AuthShell title="Create an event">
        <AuthNote tone="info">Events can only be created when a database is connected.</AuthNote>
      </AuthShell>
    );
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-lg" aria-label="Pangat home">
            <Logo decorative className="h-10" />
          </Link>
          <Link href="/host?all=1" className="font-bold text-kumkum underline underline-offset-2">
            Your events
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-14 pt-8 sm:px-6 sm:pt-10">
        <h1 className="font-display text-[1.5rem] leading-tight text-kumkum sm:text-[1.75rem]">Create an event</h1>
        <p className="mt-1.5 text-ink-soft">
          Takes a minute. You&apos;ll be its owner, can invite up to 3 co-owners from each side afterwards, and can change everything later in
          Event settings.
        </p>
        <div className="card mt-6 p-5 sm:p-7">
          <NewEventForm />
        </div>
      </main>
    </div>
  );
}
