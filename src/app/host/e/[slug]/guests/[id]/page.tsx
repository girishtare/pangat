import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Printer } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { displayPhone } from "@/lib/outreach";
import { loadHousehold } from "@/lib/store/admin";
import { shortDay, shortStamp } from "@/lib/when";
import { Alert, Section } from "../../../../../ui/kit";
import { EventShell, GateMessage } from "../../../../HostChrome";
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
  const closed = Date.now() > new Date(host.event.cutoffAt).getTime();

  return (
    <EventShell host={host} current="guests">
      <nav aria-label="Breadcrumb" className="mb-3">
        <Link href={`/host/e/${slug}/guests`} className="inline-flex min-h-11 items-center gap-1 font-bold text-kumkum hover:text-kumkum-dark">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          Guest list
        </Link>
      </nav>

      <header className="card mb-5 flex flex-wrap items-center justify-between gap-4 p-[18px] sm:p-7">
        <div className="min-w-0">
          <h1 className="wrap-names font-display text-[1.5rem] leading-[1.2] text-kumkum lg:text-[1.75rem]">{hh.nameEn}</h1>
          {hh.nameMr && (
            <p lang="mr" className="wrap-names font-display text-[1.3125rem] text-ink">
              {hh.nameMr}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className={`badge text-sm ${hh.side === "bride" ? "badge-bride" : "badge-groom"}`}>
              {hh.side === "bride" ? "Bride's side" : "Groom's side"}
            </span>
            {hh.mobile ? <span>{displayPhone(hh.mobile)}</span> : <span className="font-bold text-kumkum">No mobile</span>}
            {hh.location && <span>{hh.location}</span>}
            <span>
              Code <span className="font-display text-base tracking-[0.2em]">{hh.shortCode}</span>
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <CopyLink path={`/r/${hh.token}`} />
          <Link href={`/host/e/${slug}/slips?tab=print&ids=${hh.id}`} className="btn btn-secondary">
            <Printer className="h-5 w-5" aria-hidden="true" />
            Print this slip
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Section
          title="Reply"
          subtitle={
            latest ? (
              <>
                Last reply: <b className="text-ink">{SOURCE[latestSource ?? ""] ?? ""}</b> · {shortStamp(latest)}. Change it here if they told you
                something different on the phone.
              </>
            ) : (
              "No reply yet. Record it here when they reply by phone or in person."
            )
          }
        >
          {closed && (
            <div className="mb-4">
              <Alert tone="info">
                Guests could reply until {formatDay(host.event.cutoffAt, "en")}. You can still record or change their reply here.
              </Alert>
            </div>
          )}
          {invited.length === 0 ? (
            <Alert tone="warn">They are not invited to any function. Tick one under Details and invitations.</Alert>
          ) : (
            <ReplyForm
              slug={slug}
              id={hh.id}
              functions={invited.map((f) => {
                const r = hh.responses.find((x) => x.functionId === f.id);
                return {
                  id: f.id,
                  name: f.name.en,
                  when: shortDay(f.startsAt),
                  catered: f.catered,
                  vegOnly: f.vegOnly,
                  current: r ? { status: r.status, heads: r.heads, veg: r.veg, arrivalSlot: r.arrivalSlot } : null,
                };
              })}
            />
          )}
        </Section>

        <div className="grid gap-5">
          <Section title="Details and invitations">
            <DetailsForm
              slug={slug}
              id={hh.id}
              hostSide={host.side}
              side={hh.side}
              nameEn={hh.nameEn}
              nameMr={hh.nameMr}
              mobile={displayPhone(hh.mobile)}
              softCap={hh.softCap}
              location={hh.location}
              notes={hh.notes}
              functions={host.functions.map((f) => ({
                id: f.id,
                name: f.name.en,
                invited: hh.functionIds.includes(f.id),
                replied: hh.responses.some((r) => r.functionId === f.id),
              }))}
            />
          </Section>
          <DeleteHousehold slug={slug} id={hh.id} name={hh.nameEn} replied={hh.responses.length > 0} />
        </div>
      </div>
    </EventShell>
  );
}
