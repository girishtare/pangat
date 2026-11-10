import Link from "next/link";
import { isDemo } from "@/lib/store";
import { DEMO_TOKENS } from "@/lib/store/demo";

export default function Home() {
  const demo = isDemo();
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-4xl font-bold text-kumkum">Pangat</h1>
      <p className="mt-2 text-xl">Know who is really coming.</p>
      <ul className="mt-6 space-y-2 text-lg">
        <li>• Every family gets its own link and QR code, on WhatsApp or a printed slip.</li>
        <li>• They tell you who&apos;s coming to each function, and how many are vegetarian, in Marathi or English.</li>
        <li>• You see the headcount per function, and an expected number for the caterer.</li>
      </ul>
      {!demo && (
        <div className="mt-8 space-y-3">
          <Link href="/host/signup" className="block rounded-xl bg-kumkum px-5 py-4 text-center text-xl font-semibold text-white">
            Create a free account
          </Link>
          <Link href="/host/login" className="block rounded-xl border-2 border-kumkum px-5 py-3 text-center text-lg font-semibold text-kumkum">
            Sign in
          </Link>
        </div>
      )}
      {demo && (
        <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
          <h2 className="font-semibold">Demo mode</h2>
          <p className="mt-1 text-sm">No database is configured, so a sample wedding is loaded in memory.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {DEMO_TOKENS.map((token) => (
              <li key={token}>
                <Link className="text-kumkum underline" href={`/r/${token}`}>
                  Guest page: {token}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link className="text-kumkum underline" href="/host">
                Host dashboard
              </Link>
            </li>
          </ul>
        </section>
      )}
    </main>
  );
}
