import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ClipboardList, Hash, MessageSquareText, Phone, PhoneOff, Printer } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay, formatWhen } from "@/lib/i18n";
import { displayPhone } from "@/lib/outreach";
import { loadHousehold } from "@/lib/store/admin";
import { Alert, Section, SideBadge } from "../../../../../ui/kit";
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
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href={`/host/e/${slug}/guests`} className="btn btn-quiet btn-sm -ml-2">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Guest list
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-l-4 border-haldi pl-4">
        <div className="min-w-0">
          <h1 className="wrap-names font-display text-3xl text-kumkum sm:text-4xl">{hh.nameEn}</h1>
          {hh.nameMr && (
            <p lang="mr" className="wrap-names mt-1 font-display text-xl text-ink">
              {hh.nameMr}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <SideBadge side={hh.side} />
            {hh.mobile ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 font-semibold ring-1 ring-line">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {displayPhone(hh.mobile)}
              </span>
            ) : (
              <span className="badge badge-partly">
                <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
                No mobile
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-0.5 font-mono font-semibold tracking-wider ring-1 ring-line">
              <Hash className="h-4 w-4" aria-hidden="true" />
              {hh.shortCode}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <CopyLink path={`/r/${hh.token}`} />
          <Link href={`/host/e/${slug}/slips?ids=${hh.id}`} className="btn btn-secondary">
            <Printer className="h-5 w-5" aria-hidden="true" />
            Print this slip
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Section
          icon={MessageSquareText}
          title="Reply"
          subtitle={
            latest ? `Last reply ${SOURCE[latestSource ?? ""] ?? ""}, ${formatWhen(latest, "en")}.` : "No reply yet."
          }
        >
          <p className="hint mb-4">Use this when they reply by phone or in person. It is saved as entered by a host.</p>
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
                  when: formatWhen(f.startsAt, "en"),
                  catered: f.catered,
                  current: r ? { status: r.status, heads: r.heads, veg: r.veg, arrivalSlot: r.arrivalSlot } : null,
                };
              })}
            />
          )}
        </Section>

        <Section icon={ClipboardList} title="Details and invitations">
          <DetailsForm
            slug={slug}
            id={hh.id}
            hostSide={host.side}
            side={hh.side}
            nameEn={hh.nameEn}
            nameMr={hh.nameMr}
            mobile={displayPhone(hh.mobile)}
            softCap={hh.softCap}
            functions={host.functions.map((f) => ({
              id: f.id,
              name: f.name.en,
              invited: hh.functionIds.includes(f.id),
              replied: hh.responses.some((r) => r.functionId === f.id),
            }))}
          />
        </Section>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <DeleteHousehold slug={slug} id={hh.id} name={hh.nameEn} replied={hh.responses.length > 0} />
      </div>
    </EventShell>
  );
}
