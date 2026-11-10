import Link from "next/link";
import { notFound } from "next/navigation";
import { hostGate } from "@/lib/host";
import { formatWhen } from "@/lib/i18n";
import { loadHousehold } from "@/lib/store/admin";
import { EventHeader, GateMessage } from "../../../../HostChrome";
import { CopyLink, DeleteHousehold, DetailsForm, ReplyForm } from "./HouseholdForms";

export const dynamic = "force-dynamic";

const SOURCE: Record<string, string> = {
  qr: "by the guest, from the QR code",
  link: "by the guest, from their link",
  code: "by the guest, with their short code",
  on_behalf: "by a host, on their behalf",
};

export default async function Household({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Household" />;
  const { host } = gate;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const hh = await loadHousehold(host.event.id, id);
  if (!hh || (host.side && host.side !== hh.side)) notFound();

  const invited = host.functions.filter((f) => hh.functionIds.includes(f.id));
  const latest = hh.responses.map((r) => r.updatedAt).sort().at(-1);
  const latestSource = hh.responses.find((r) => r.updatedAt === latest)?.source;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <EventHeader host={host} current="guests" />
      <Link className="mt-6 inline-block text-sm text-kumkum underline" href={`/host/e/${slug}/guests`}>
        ← Guest list
      </Link>

      <section className="mt-3">
        <h2 className="text-2xl font-bold">{hh.nameEn}</h2>
        {hh.nameMr && <p className="text-lg">{hh.nameMr}</p>}
        <p className="mt-1 text-sm">
          {hh.side === "bride" ? "Bride's side" : "Groom's side"} · {hh.mobile ?? "no mobile"} · code{" "}
          <span className="font-mono font-semibold">{hh.shortCode}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CopyLink path={`/r/${hh.token}`} />
          <Link href={`/host/e/${slug}/slips?ids=${hh.id}`} className="text-sm text-kumkum underline">
            Print this slip
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h3 className="text-xl font-semibold">Reply</h3>
        <p className="mt-1 text-sm">
          {latest
            ? `Last reply ${SOURCE[latestSource ?? ""] ?? ""}, ${formatWhen(latest, "en")}.`
            : "No reply yet."}{" "}
          Use this when they reply by phone or in person. It is saved as entered by a host, and works after the guests&apos; cut-off.
        </p>
        <div className="mt-3">
          {invited.length === 0 ? (
            <p>They are not invited to any function.</p>
          ) : (
            <ReplyForm
              slug={slug}
              id={hh.id}
              functions={invited.map((f) => {
                const r = hh.responses.find((x) => x.functionId === f.id);
                return {
                  id: f.id,
                  name: `${f.name.en} · ${formatWhen(f.startsAt, "en")}`,
                  catered: f.catered,
                  current: r ? { status: r.status, heads: r.heads, veg: r.veg, arrivalSlot: r.arrivalSlot } : null,
                };
              })}
            />
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-haldi/60 bg-white p-4">
        <h3 className="text-xl font-semibold">Details and invitations</h3>
        <div className="mt-3">
          <DetailsForm
            slug={slug}
            id={hh.id}
            hostSide={host.side}
            side={hh.side}
            nameEn={hh.nameEn}
            nameMr={hh.nameMr}
            mobile={hh.mobile}
            softCap={hh.softCap}
            functions={host.functions.map((f) => ({
              id: f.id,
              name: f.name.en,
              invited: hh.functionIds.includes(f.id),
              replied: hh.responses.some((r) => r.functionId === f.id),
            }))}
          />
        </div>
      </section>

      <section className="mt-8">
        <DeleteHousehold slug={slug} id={hh.id} name={hh.nameEn} replied={hh.responses.length > 0} />
      </section>
    </main>
  );
}
