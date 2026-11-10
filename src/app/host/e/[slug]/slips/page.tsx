import Link from "next/link";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { chunk, displayPhone, guestLink } from "@/lib/outreach";
import { qrPath } from "@/lib/qr";
import { publicBaseUrl } from "@/lib/site";
import { listGuests, type GuestRow } from "@/lib/store/supabase";
import type { Side } from "@/lib/types";
import { EventHeader, GateMessage } from "../../../HostChrome";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const PER_SHEET = 8; // 2 x 4 on A4: each slip about 97 x 70 mm

const PRINT_CSS = `
@page { size: A4; margin: 8mm; }
.sheet { width: 194mm; height: 281mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); background: white; }
.slip { border: 0.3mm dashed #999; padding: 4mm; overflow: hidden; display: flex; flex-direction: column; color: #2b1d16; }
@media screen { .sheet { margin: 0 auto 10mm; box-shadow: 0 1px 6px rgba(0,0,0,.2); } }
@media print { body { background: white !important; } .sheet { break-after: page; } .sheet:last-child { break-after: auto; } }
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
      <div style={{ fontSize: "7.5pt" }} className="text-kumkum">
        {eventName}
      </div>
      <div style={{ fontSize: "13pt", lineHeight: 1.2 }} className="font-bold">
        {g.nameMr || g.nameEn}
      </div>
      {g.nameMr && <div style={{ fontSize: "9pt" }}>{g.nameEn}</div>}
      <div className="mt-auto flex items-end gap-3">
        <svg
          viewBox={`${-q} ${-q} ${qr.size + 2 * q} ${qr.size + 2 * q}`}
          style={{ width: "31mm", height: "31mm", flex: "none" }}
          shapeRendering="crispEdges"
          role="img"
          aria-label={`QR code for ${g.nameEn}`}
        >
          <rect x={-q} y={-q} width={qr.size + 2 * q} height={qr.size + 2 * q} fill="#fff" />
          <path d={qr.d} fill="#000" />
        </svg>
        <div style={{ fontSize: "8pt", lineHeight: 1.3 }}>
          <div>QR स्कॅन करून कोण कोण येणार ते कळवा.</div>
          <div>Scan to tell us who&apos;s coming.</div>
          <div className="mt-1">
            {replyBy.mr} पर्यंत · Reply by {replyBy.en}
          </div>
          <div className="mt-1">कोड · Code</div>
          <div style={{ fontSize: "15pt", letterSpacing: "0.15em" }} className="font-mono font-bold">
            {g.shortCode}
          </div>
          {phone && (
            <div className="mt-1" style={{ fontSize: "7pt" }}>
              स्मार्टफोन नाही? {phone} वर फोन करून कोड सांगा. No smartphone? Call {phone} and give your code.
            </div>
          )}
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

  return (
    <>
      <style>{PRINT_CSS}</style>
      <main className="mx-auto max-w-4xl px-5 py-10 print:hidden">
        <EventHeader host={host} current="slips" />
        <h2 className="mt-6 text-2xl font-semibold">Slips</h2>
        <p className="mt-1">
          One slip per household, to tuck into its card: the family&apos;s name, a QR code for their own reply link, and their short
          code. Eight slips per A4 sheet; cut along the dashed lines.
        </p>

        <form className="mt-4 flex flex-wrap items-end gap-3" action={`/host/e/${slug}/slips`}>
          {!host.side && (
            <label className="block">
              <span className="text-sm font-semibold">Side</span>
              <select name="side" defaultValue={side ?? ""} className="mt-1 block rounded-xl border-2 border-haldi/60 bg-white px-3 py-2">
                <option value="">Both sides</option>
                <option value="bride">Bride&apos;s side</option>
                <option value="groom">Groom&apos;s side</option>
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold">Only added on or after</span>
            <input type="date" name="since" defaultValue={since ?? ""} className="mt-1 block rounded-xl border-2 border-haldi/60 bg-white px-3 py-2" />
          </label>
          <button type="submit" className="rounded-xl border-2 border-kumkum px-4 py-2 font-semibold text-kumkum">
            Show
          </button>
          {(ids || since || (side && !host.side)) && (
            <Link href={`/host/e/${slug}/slips`} className="self-center text-sm text-kumkum underline">
              All slips
            </Link>
          )}
        </form>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <b>{guests.length}</b> slips on <b>{sheets.length}</b> sheets. QR codes point to <span className="font-mono">{base}</span>.
          </p>
          {missingPhone.map((s) => (
            <p key={s} className="rounded-xl bg-kumkum/10 px-3 py-2 text-kumkum">
              No contact number for the {s === "bride" ? "bride's" : "groom's"} side, so those slips leave out the &quot;no smartphone? call
              us&quot; line. Add it in Event settings.
            </p>
          ))}
          {noMarathi > 0 && (
            <p className="rounded-xl bg-haldi/20 px-3 py-2">
              {noMarathi} household{noMarathi === 1 ? " has" : "s have"} no Marathi name; their slips show the English name only.
            </p>
          )}
          <p>In the print dialog choose A4, scale 100% (&quot;Actual size&quot;), and turn off headers and footers.</p>
        </div>
        <div className="mt-4">
          <PrintButton disabled={guests.length === 0} />
        </div>
      </main>

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
    </>
  );
}
