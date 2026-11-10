import Link from "next/link";
import { redirect } from "next/navigation";
import { signedInUser } from "@/lib/host";
import NewEventForm from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEvent() {
  const who = await signedInUser();
  if (!who.ok && who.reason === "signed_out") redirect("/host/login");
  if (!who.ok) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-bold text-kumkum">Create an event</h1>
        <p className="mt-3">Events can only be created when a database is connected.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <Link className="text-sm text-kumkum underline" href="/host?all=1">
        ← All events
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-kumkum">Create an event</h1>
      <p className="mt-1">You will be its owner, and can invite up to 3 co-owners from each side afterwards.</p>
      <NewEventForm />
    </main>
  );
}
