import Link from "next/link";
import { isDemo } from "@/lib/store";
import { DEMO_TOKENS } from "@/lib/store/demo";

export default function Home() {
  const demo = isDemo();
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-4xl font-bold text-kumkum">Pangat</h1>
      <p className="mt-2 text-lg">Know who is really coming.</p>
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
