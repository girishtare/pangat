import Link from "next/link";
import { Printer } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { chunk, displayPhone, guestLink } from "@/lib/outreach";
import { qrPath } from "@/lib/qr";
import { publicBaseUrl } from "@/lib/site";
import { listGuests, type GuestRow } from "@/lib/store/supabase";
import type { Side } from "@/lib/types";
import { Alert, EmptyState, PageHeader } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const PER_SHEET = 8; // 2 x 4 on A4: each slip about 97 x 70 mm

/*
 * Print geometry is fixed: A4, 8 mm margins, a 194 x 281 mm sheet split 2 x 4.
 * On screen the sheet is only shrunk with `zoom` (never in print), so phones
 * see the whole sheet without sideways scrolling.
 */
const PRINT_CSS = `
@page { size: A4; margin: 8mm; }
.sheet { width: 194mm; height: 281mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); background: white; }
.slip { border: 0.3mm dashed #9a8f86; padding: 3.5mm; overflow: hidden; color: #2e1a1c; }
.slip-inner { height: 100%; border: 0.35mm solid transparent; border-radius: 2.5mm; /* same box as before, no visible frame */ padding: 2.5mm 3mm; display: flex; flex-direction: column; }
@media screen {
  .sheet { margin: 0 auto 8mm; box-shadow: 0 2px 10px rgba(46,26,28,.18); }
  @media (max-width: 1279px) { .sheet { zoom: 0.9; } }
  @media (max-width: 760px) { .sheet { zoom: 0.68; } }
  @media (max-width: 560px) { .sheet { zoom: 0.5; } }
  @media (max-width: 420px) { .sheet { zoom: 0.44; } }
  /* Laptops: the sheet sits beside the controls. */
  @media (min-width: 1280px) { .sheet { zoom: 0.7; margin-left: 0; } }
  @media (min-width: 1366px) { .sheet { zoom: 0.8; } }
  @media (min-width: 1440px) { .sheet { zoom: 0.88; } }
}
@media print {
  html, body { background: white !important; }
  .sheet { break-after: page; box-shadow: none; }
  .sheet:last-child { break-after: auto; }
}
`;

function Slip({
  g,
  base,
  eventName,
  replyBy,
  phone,
}: {
  g: GuestRow;
  base: string;
  eventName: string;
  replyBy: { en: string; mr: string };
  phone: string | null;
}) {
  const qr = qrPath(guestLink(base, g.token, "qr"));
  const q = 4; // quiet zone, in modules
  return (
    <div className="slip">
      <div className="slip-inner">
        <div className="flex items-center justify-between gap-2 border-b border-kumkum pb-[1.2mm] font-bold uppercase text-kumkum" style={{ fontSize: "6.8pt", letterSpacing: "0.06em" }}>
          <span lang="mr" className="min-w-0 truncate">
            {eventName}
          </span>
          <span className="shrink-0">Pangat</span>
        </div>
        <div className="mt-[2mm] flex min-h-0 flex-1 gap-[3mm]">
          <div className="min-w-0 flex-1">
            <div lang={g.nameMr ? "mr" : undefined} className="wrap-names font-display text-kumkum" style={{ fontSize: "12.5pt", lineHeight: 1.2 }}>
              {g.nameMr || g.nameEn}
            </div>
            {g.nameMr && (
              <div className="wrap-names" style={{ fontSize: "8.5pt", lineHeight: 1.25 }}>
                {g.nameEn}
              </div>
            )}
            <div className="mt-[2mm]" style={{ fontSize: "7.5pt", lineHeight: 1.35 }}>
              <div lang="mr" className="font-bold">
                QR स्कॅन करून कोण कोण येणार ते कळवा.
              </div>
              <div>Scan to tell us who&apos;s coming.</div>
              <div className="mt-[0.8mm]">
                <span lang="mr">{replyBy.mr} पर्यंत</span> · Reply by {replyBy.en}
              </div>
            </div>
          </div>
          <div className="flex flex-none flex-col items-center">
            <svg
              viewBox={`${-q} ${-q} ${qr.size + 2 * q} ${qr.size + 2 * q}`}
              style={{ width: "30mm", height: "30mm", flex: "none" }}
              shapeRendering="crispEdges"
              role="img"
              aria-label={`QR code for ${g.nameEn}`}
            >
              <rect x={-q} y={-q} width={qr.size + 2 * q} height={qr.size + 2 * q} fill="#fff" />
              <path d={qr.d} fill="#000" />
            </svg>
            <div className="text-kumkum" style={{ fontSize: "6.5pt" }}>
              <span lang="mr">कोड</span> · Code
            </div>
            <div className="font-display" style={{ fontSize: "13pt", letterSpacing: "0.2em", lineHeight: 1.1 }}>
              {g.shortCode}
            </div>
          </div>
        </div>
        {phone && (
          <div className="mt-[1.5mm] border-t border-line pt-[1.2mm]" style={{ fontSize: "6.6pt", lineHeight: 1.3 }}>
            <span lang="mr">स्मार्टफोन नाही? {phone} वर फोन करून कोड सांगा.</span> No smartphone? Call {phone} and give your code.
          </div>
        )}
      </div>
    </div>
  );
}

export default async function Slips({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ side?: string; since?: string; ids?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Slips" />;
  const { host } = gate;

  const all = await listGuests(host.client, host.event.id);
  const side: Side | null = host.side ?? (sp.side === "bride" || sp.side === "groom" ? sp.side : null);
  const ids = sp.ids ? new Set(sp.ids.split(",")) : null;
  const since = sp.since && /^\d{4}-\d{2}-\d{2}$/.test(sp.since) ? sp.since : null;
  const guests = all.filter(
    (g) => (!side || g.side === side) && (!ids || ids.has(g.id)) && (!since || g.createdAt.slice(0, 10) >= since),
  );

  const base = await publicBaseUrl();
  const replyBy = { en: formatDay(host.event.cutoffAt, "en"), mr: formatDay(host.event.cutoffAt, "mr") };
  const eventName = host.event.name.mr || host.event.name.en;
  const missingPhone = (["bride", "groom"] as const).filter((s) => !host.event.contactPhone[s] && guests.some((g) => g.side === s));
  const noMarathi = guests.filter((g) => !g.nameMr).length;
  const sheets = chunk(guests, PER_SHEET);
  const filtered = !!(ids || since || (side && !host.side));

  return (
    <EventShell host={host} current="slips">
      <style>{PRINT_CSS}</style>
      <div className="print:hidden">
        <PageHeader
          title="Slips"
          subtitle="A small slip for each printed card, with that family's QR code and short code. Cut along the dashed lines and put one in each card."
        />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] print:block">
        <div className="space-y-4 print:hidden">
          <section className="card p-[18px] sm:p-[22px]" aria-labelledby="which-slips">
            <h2 id="which-slips" className="mb-3 text-lg font-bold">
              Which slips
            </h2>
            {ids ? (
              <Alert tone="info">
                Showing {guests.length === 1 ? "one household's slip" : `${guests.length} selected slips`}.{" "}
                <Link href={`/host/e/${slug}/slips`} className="font-semibold underline">
                  Show all slips
                </Link>
              </Alert>
            ) : (
              <form className="space-y-4" action={`/host/e/${slug}/slips`}>
                {!host.side && (
                  <label className="block">
                    <span className="label">Side</span>
                    <select name="side" defaultValue={side ?? ""} className="input">
                      <option value="">Both sides</option>
                      <option value="bride">Bride&apos;s side</option>
                      <option value="groom">Groom&apos;s side</option>
                    </select>
                  </label>
                )}
                <label className="block">
                  <span className="label">
                    Only households added on or after <span className="font-normal text-ink-soft">(optional)</span>
                  </span>
                  <input type="date" name="since" defaultValue={since ?? ""} className="input" />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" className="btn btn-secondary">
                    Show
                  </button>
                  {filtered && (
                    <Link href={`/host/e/${slug}/slips`} className="btn btn-quiet btn-sm">
                      All slips
                    </Link>
                  )}
                </div>
              </form>
            )}
            <p className="mt-4 text-lg">
              <span className="font-display text-[2.5rem] leading-none text-kumkum">{guests.length.toLocaleString("en-IN")}</span> slip
              {guests.length === 1 ? "" : "s"} · <b>{sheets.length}</b> A4 sheet{sheets.length === 1 ? "" : "s"}
            </p>
          </section>

          {missingPhone.map((s) => (
            <Alert key={s} tone="error">
              No contact number for the <b>{s === "bride" ? "bride's side" : "groom's side"}</b>, so their slips have no &quot;call us&quot; line.
              {host.canManage && (
                <>
                  {" "}
                  <Link href={`/host/e/${slug}/settings`} className="font-semibold underline">
                    Add it in Event settings
                  </Link>
                  .
                </>
              )}
            </Alert>
          ))}
          {noMarathi > 0 && (
            <Alert tone="warn">
              {noMarathi} household{noMarathi === 1 ? " has" : "s have"} no Marathi name; their slips show the English name only.
            </Alert>
          )}

          <div className="rounded-[1.25rem] bg-sand px-5 py-4">
            <h2 className="mb-1.5 text-lg font-bold">Before you print</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                A4 paper, scale <b>100%</b> (not &quot;fit to page&quot;), headers and footers off.
              </li>
              <li>Print one sheet first and scan a QR code with your phone.</li>
              <li>Thicker paper (100 gsm or more) holds up better in the card.</li>
              <li>
                QR codes point to <span className="break-all">{base}</span>.
              </li>
            </ul>
          </div>

          <PrintButton disabled={guests.length === 0} count={guests.length} />
        </div>

        <div className="min-w-0">
          {guests.length === 0 ? (
            <div className="print:hidden">
              <EmptyState icon={Printer} title="No slips to print">
                {filtered ? "No households match these filters." : "Add households on the Guest list first."}
              </EmptyState>
            </div>
          ) : (
            <>
              <p className="mb-2 text-[0.9375rem] text-ink-soft print:hidden">
                {sheets.length === 1 ? "One sheet" : `${sheets.length} sheets`} · A4 · 8 slips, each about 97 × 70 mm
              </p>
              <div className="overflow-hidden print:overflow-visible">
                {sheets.map((page, i) => (
                  <div key={i} className="sheet">
                    {page.map((g) => (
                      <Slip
                        key={g.id}
                        g={g}
                        base={base}
                        eventName={eventName}
                        replyBy={replyBy}
                        phone={displayPhone(host.event.contactPhone[g.side])}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </EventShell>
  );
}
