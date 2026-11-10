import { redirect } from "next/navigation";
import { forecast } from "@/lib/forecast";
import { factsFor, scopeLabel, scopesFor } from "@/lib/sides";
import { getStore, isDemo } from "@/lib/store";
import { loadDashboard, loadHostAccess } from "@/lib/store/supabase";
import { eventSlug } from "@/lib/supabase/config";
import { hostClient } from "@/lib/supabase/session";
import type { DashboardData, InviteFact, Side } from "@/lib/types";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

function Notice({ children, signedIn }: { children: React.ReactNode; signedIn?: boolean }) {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-2xl font-bold text-kumkum">Host dashboard</h1>
      <div className="mt-3 space-y-2">{children}</div>
      {signedIn && <SignOutButton />}
    </main>
  );
}

function SignOutButton() {
  return (
    <form action={signOut} className="mt-4">
      <button type="submit" className="rounded-full border border-kumkum/40 px-4 py-2 text-base text-kumkum">
        Sign out
      </button>
    </form>
  );
}

export default async function HostDashboard() {
  const slug = eventSlug();
  let data: DashboardData | null;
  let hostSide: Side | null = null;
  let who: string | null = null;

  if (isDemo()) {
    data = await getStore().getDashboard(slug);
  } else {
    const supabase = await hostClient();
    if (!supabase) return <Notice>Host sign-in is not set up yet (SUPABASE_PUBLISHABLE_KEY is missing).</Notice>;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/host/login");
    who = user.email ?? "you";

    const access = await loadHostAccess(supabase, slug);
    if (!access) {
      return (
        <Notice signedIn>
          <p>You are signed in as {who}, but you are not a host of this event.</p>
          <p>Ask the family member who set up Pangat to add you.</p>
        </Notice>
      );
    }
    hostSide = access.side;
    // Loaded as the host: row-level security limits rows to their side.
    data = await loadDashboard(supabase, slug);
  }

  if (!data) return <Notice signedIn={!!who}>Event not found.</Notice>;
  const rates = { yesShowRate: data.event.yesShowRate, pendingShowRate: data.event.pendingShowRate };
  const scopes = scopesFor(hostSide, data.facts);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-kumkum">{data.event.name.en}</h1>
          <p className="mt-1 text-sm">
            {who ? `Signed in as ${who} · ${hostSide ? scopeLabel(hostSide) : "Both sides"}` : "Demo data"}
          </p>
        </div>
        {who && <SignOutButton />}
      </div>
      <p className="mt-3 text-sm">
        Expected = confirmed × {rates.yesShowRate} + pending households × average heads × {rates.pendingShowRate}.
      </p>
      {scopes.map((scope) => (
        <section key={scope} className="mt-6">
          {scopes.length > 1 && <h2 className="text-xl font-semibold">{scopeLabel(scope)}</h2>}
          <FunctionTable functions={data.functions} facts={factsFor(scope, data.facts)} rates={rates} />
        </section>
      ))}
    </main>
  );
}

function FunctionTable({
  functions,
  facts,
  rates,
}: {
  functions: DashboardData["functions"];
  facts: InviteFact[];
  rates: { yesShowRate: number; pendingShowRate: number };
}) {
  return (
    <div className="mt-2 overflow-x-auto rounded-xl border border-haldi/60 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-haldi/20">
          <tr>
            {["Function", "Invited", "Yes", "No", "Pending", "Replied", "Confirmed heads", "Veg", "Non-veg", "Expected"].map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {functions.map((fn) => {
            const f = forecast(facts.filter((x) => x.functionId === fn.id), rates);
            return (
              <tr key={fn.id} className="border-t border-haldi/30">
                <td className="px-3 py-2 font-semibold">{fn.name.en}</td>
                <td className="px-3 py-2">{f.invitedHouseholds}</td>
                <td className="px-3 py-2">{f.yesHouseholds}</td>
                <td className="px-3 py-2">{f.noHouseholds}</td>
                <td className="px-3 py-2">{f.pendingHouseholds}</td>
                <td className="px-3 py-2">{Math.round(f.responseRate * 100)}%</td>
                <td className="px-3 py-2">{f.confirmedHeads}</td>
                <td className="px-3 py-2">{f.veg}</td>
                <td className="px-3 py-2">{f.nonveg}</td>
                <td className="px-3 py-2 text-lg font-bold text-kumkum">{f.expected}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
