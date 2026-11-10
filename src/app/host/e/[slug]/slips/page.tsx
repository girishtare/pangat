import Link from "next/link";
import { Info, Layers, Printer, Ticket } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { chunk, displayPhone, guestLink } from "@/lib/outreach";
import { qrPath } from "@/lib/qr";
import { publicBaseUrl } from "@/lib/site";
import { listGuests, type GuestRow } from "@/lib/store/supabase";
import type { Side } from "@/lib/types";
import { Alert, EmptyState, Marigold, PageHeader } from "../../../../ui/kit";
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
.slip-inner { height: 100%; border: 0.35mm solid #b59a64; border-radius: 2.5mm; padding: 2.5mm 3mm; display: flex; flex-direction: column; }
@media screen {
  .sheet { margin: 0 auto 8mm; box-shadow: 0 2px 10px rgba(46,26,28,.18); }
  @media (max-width: 1023px) { .sheet { zoom: 0.9; } }
  @media (max-width: 760px) { .sheet { zoom: 0.68; } }
  @media (max-width: 560px) { .sheet { zoom: 0.5; } }
  @media (max-width: 420px) { .sheet { zoom: 0.44; } }
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
        <div className="flex items-center gap-1.5 text-kumkum" style={{ fontSize: "7.5pt" }}>
          <Marigold className="h-[3.2mm] w-[3.2mm]" />
          <span lang="mr" className="font-display font-semibold">
            {eventName}
          </span>
        </div>
        <div lang={g.nameMr ? "mr" : undefined} className="wrap-names mt-1 font-display" style={{ fontSize: "13.5pt", lineHeight: 1.2 }}>
          {g.nameMr || g.nameEn}
        </div>
        {g.nameMr && (
          <div className="wrap-names" style={{ fontSize: "9pt" }}>
            {g.nameEn}
          </div>
        )}
        <div className="mt-auto flex items-end gap-3">
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
          <div style={{ fontSize: "7.8pt", lineHeight: 1.3 }}>
            <div lang="mr">QR स्कॅन करून कोण कोण येणार ते कळवा.</div>
            <div>Scan to tell us who&apos;s coming.</div>
            <div className="mt-1">
              <span lang="mr">{replyBy.mr} पर्यंत</span> · Reply by {replyBy.en}
            </div>
            <div className="mt-1 text-kumkum">
              <span lang="mr">कोड</span> · Code
            </div>
            <div style={{ fontSize: "15pt", letterSpacing: "0.15em", lineHeight: 1.1 }} className="font-mono font-bold">
              {g.shortCode}
            </div>
            {phone && (
              <div className="mt-1" style={{ fontSize: "6.8pt" }}>
                <span lang="mr">स्मार्टफोन नाही? {phone} वर फोन करून कोड सांगा.</span> No smartphone? Call {phone} and give your code.
              </div>
            )}
          </div>
        </div>
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
          icon={Ticket}
          title="Slips"
          subtitle="One slip per household, to tuck into its card. Eight per A4 sheet; cut along the dashed lines."
        />

        <div className="card mb-6 grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {ids ? (
              <Alert tone="info">
                Showing {guests.length === 1 ? "one household's slip" : `${guests.length} selected slips`}.{" "}
                <Link href={`/host/e/${slug}/slips`} className="font-semibold underline">
                  Show all slips
                </Link>
              </Alert>
            ) : (
              <form className="grid gap-4 sm:grid-cols-2" action={`/host/e/${slug}/slips`}>
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
                  <span className="label">Only added on or after</span>
                  <input type="date" name="since" defaultValue={since ?? ""} className="input" />
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
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
            <div className="flex items-center gap-3 rounded-xl bg-haldi-soft/70 px-4 py-3">
              <Layers className="h-6 w-6 shrink-0 text-haldi-deep" aria-hidden="true" />
              <p className="text-lg">
                <b>{guests.length.toLocaleString("en-IN")}</b> slips on <b>{sheets.length}</b> sheet{sheets.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {missingPhone.map((s) => (
              <Alert key={s} tone="error">
                No contact number for the {s === "bride" ? "bride's" : "groom's"} side, so those slips leave out the &quot;no smartphone? call
                us&quot; line.
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
            <div className="flex gap-3 rounded-xl border border-line px-4 py-3 text-sm">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-haldi-deep" aria-hidden="true" />
              <p>
                <b>Print tip:</b> choose A4, scale 100% (&quot;Actual size&quot;), and turn off headers and footers. QR codes point to{" "}
                <span className="break-all font-mono">{base}</span>.
              </p>
            </div>
            <PrintButton disabled={guests.length === 0} />
          </div>
        </div>
      </div>

      {guests.length === 0 ? (
        <div className="print:hidden">
          <EmptyState icon={Printer} title="No slips to print">
            {filtered ? "No households match these filters." : "Add households on the Guest list first."}
          </EmptyState>
        </div>
      ) : (
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
      )}
    </EventShell>
  );
}
