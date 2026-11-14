import Link from "next/link";
import { Languages, ListChecks, Printer, SlidersHorizontal } from "lucide-react";
import { hostGate } from "@/lib/host";
import { sortGuests } from "@/lib/guestSort";
import { chunk, displayPhone, guestLink } from "@/lib/outreach";
import { QrCode } from "../../../../ui/QrCode";
import { publicBaseUrl } from "@/lib/site";
import { listGuests, type GuestRow, type SlipLang } from "@/lib/store/supabase";
import { slipDate } from "@/lib/when";
import type { Side } from "@/lib/types";
import { Alert, EmptyState, PageHeader, PageTabs } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { PrintButton, SlipSelection, SlipSheets } from "./SlipSelection";
import PrintList from "./PrintList";
import PopupButton from "../../../../ui/PopupButton";
import SlipLanguages from "./SlipLanguages";

export const dynamic = "force-dynamic";

const PER_SHEET = 8; // 2 x 4 on A4: each slip about 97 x 70 mm

/** Each household's slip is printed in its own language: English, Marathi, or both (English lines first). */
const LANG_LABEL: Record<SlipLang, string> = { both: "English and Marathi", en: "English only", mr: "Marathi only" };

/*
 * Print geometry is fixed: A4, 8 mm margins, a 194 x 281 mm sheet split 2 x 4.
 * On screen the sheet is only shrunk with `zoom` (never in print), so phones
 * see the whole sheet without sideways scrolling.
 */
const PRINT_CSS = `
@page { size: A4; margin: 8mm; }
.sheet { width: 194mm; height: 281mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); background: white; }
.slip { border: 0.3mm dashed #9a8f86; padding: 3.5mm; overflow: hidden; color: #2e1a1c; }
.slip-cell { position: relative; min-height: 0; display: grid; } /* a slip plus its screen-only tick box */
.slip-pick .slip-inner > :first-child { padding-left: 5.5mm; } /* on screen, the header starts clear of the tick box */
.slip-fill { min-height: 0; display: grid; }
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
  /* Wide boxes: the 8 slips 4 across, 2 down (owner, 14 Nov). Scaled to fit by SlipSheets. */
  .sheet.sheet-wide { width: 388mm; height: 140mm; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 1fr); margin-left: 0; }
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
  event,
  replyBy,
  phone,
}: {
  g: GuestRow;
  base: string;
  event: { en: string; mr: string | null };
  replyBy: { en: string; mr: string };
  phone: string | null;
}) {
  const lang = g.slipLang;
  const eventName = lang === "en" ? event.en : event.mr || event.en;
  const qrLink = guestLink(base, g.token, "qr", lang === "both" ? undefined : lang);
  const en = lang !== "mr";
  const mr = lang !== "en";
  // The family's name: Marathi on top when Marathi is printed and known; English only on English slips.
  const mainName = mr && g.nameMr ? g.nameMr : g.nameEn;
  const subName = lang === "both" && g.nameMr ? g.nameEn : null;
  return (
    <div className="slip">
      <div className="slip-inner">
        <div className="flex items-center justify-between gap-2 border-b border-kumkum pb-[1.2mm] font-bold uppercase text-kumkum" style={{ fontSize: "6.8pt", letterSpacing: "0.06em" }}>
          <span lang={mr ? "mr" : "en"} className="min-w-0 truncate">
            {eventName}
          </span>
          <span lang={lang === "mr" ? "mr" : "en"} className="shrink-0">
            {lang === "mr" ? "पंगत" : "Pangat"}
          </span>
        </div>
        <div className="mt-[2mm] flex min-h-0 flex-1 gap-[3mm]">
          <div className="min-w-0 flex-1">
            <div lang={mainName === g.nameMr ? "mr" : "en"} className="wrap-names font-display text-kumkum" style={{ fontSize: "12.5pt", lineHeight: 1.2 }}>
              {mainName}
            </div>
            {subName && (
              <div className="wrap-names" style={{ fontSize: "8.5pt", lineHeight: 1.25 }}>
                {subName}
              </div>
            )}
            <div className="mt-[2mm]" style={{ fontSize: lang === "both" ? "8.5pt" : "9.5pt", lineHeight: 1.35 }}>
              {/* Marathi first, then English, like the name above (owner, 12 Nov). One point up, regular weight (owner, 12 Nov). */}
              {mr && (
                <>
                  <div lang="mr">
                    QR स्कॅन करून कोण कोण येणार ते कळवा.
                  </div>
                  <div lang="mr">{replyBy.mr} पर्यंत.</div>
                </>
              )}
              {en && (
                <>
                  <div className={mr ? "mt-[1.6mm]" : undefined}>Scan to tell us who&apos;s coming.</div>
                  <div>Reply by {replyBy.en}.</div>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-none flex-col items-center">
            <QrCode text={qrLink} label={`QR code for ${g.nameEn}`} />
            <div className="text-kumkum" style={{ fontSize: "6.5pt" }}>
              {mr && <span lang="mr">कोड</span>}
              {lang === "both" && " · "}
              {en && "Code"}
            </div>
            <div className="font-display" style={{ fontSize: "13pt", letterSpacing: "0.2em", lineHeight: 1.1 }}>
              {g.shortCode}
            </div>
          </div>
        </div>
        {phone && (
          <div className="mt-[1.5mm] border-t border-line pt-[1.2mm]" style={{ fontSize: lang === "both" ? "7.2pt" : "8pt", lineHeight: 1.3 }}>
            {mr && <div lang="mr">स्मार्टफोन नाही? {phone} वर फोन करून कोड सांगा.</div>}
            {en && <div>No smartphone? Call {phone} and give your code.</div>}
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
  searchParams: Promise<{ side?: string; since?: string; ids?: string; lang?: string; tab?: string; place?: string; list?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="Slips" />;
  const { host } = gate;

  // By household name, A to Z, on every tab and in print (owner, 12 Nov).
  const all = sortGuests(await listGuests(host.client, host.event.id), "name", "asc");
  const onList = all.filter((g) => g.printRequested);
  // Three tabs (owner, 14 Nov): the print list first, then Language, then Print slips.
  const tab: "list" | "language" | "print" = sp.tab === "language" ? "language" : sp.tab === "print" || sp.ids ? "print" : "list";
  const base = `/host/e/${slug}/slips`;
  const header = (
    <div className="print:hidden">
      <PageHeader
        title="Slips"
        subtitle="A small slip for each printed card, with that family's QR code and short code. Cut along the dashed lines and put one in each card."
      />
      <PageTabs
        label="Slips"
        current={tab}
        tabs={[
          { key: "list", label: "Print list", href: base, icon: ListChecks, count: onList.length },
          { key: "language", label: "Language", href: `${base}?tab=language`, icon: Languages },
          { key: "print", label: "Print slips", href: `${base}?tab=print`, icon: Printer },
        ]}
      />
    </div>
  );

  if (tab === "list") {
    return (
      <EventShell host={host} current="slips">
        {header}
        <section className="card p-[18px] sm:p-[22px]" aria-labelledby="print-list">
          <h2 id="print-list" className="font-display text-[1.3125rem] text-kumkum">
            Print list
          </h2>
          <p className="mb-4 mt-0.5 text-[0.9375rem] text-ink-soft">
            Slips asked for with <b>Print</b> or <b>Print Again</b> on the Guest list. Print them together, then clear the list.
          </p>
          <PrintList
            slug={slug}
            showSide={!host.side}
            rows={onList.map((g) => ({
              id: g.id,
              nameEn: g.nameEn,
              nameMr: g.nameMr,
              side: g.side,
              location: g.location,
              lang: g.slipLang,
              sent: g.inviteVia !== null,
            }))}
          />
        </section>
      </EventShell>
    );
  }

  if (tab === "language") {
    return (
      <EventShell host={host} current="slips">
        {header}
        <section className="card p-[18px] sm:p-[22px]" aria-labelledby="slip-lang">
          <h2 id="slip-lang" className="font-display text-[1.3125rem] text-kumkum">
            Language of each slip
          </h2>
          <p className="mb-4 mt-0.5 text-[0.9375rem] text-ink-soft">
            Each household&apos;s slip prints in the language chosen here, saved as you tap. Its QR code opens the reply page in the same
            language (Both: the guest picks). New households start on Both.
          </p>
          {all.length === 0 ? (
            <EmptyState icon={Languages} title="No households yet">
              Add households on the Guest list first.
            </EmptyState>
          ) : (
            <SlipLanguages
              slug={slug}
              showSide={!host.side}
              rows={all.map((g) => ({ id: g.id, nameEn: g.nameEn, nameMr: g.nameMr, side: g.side, location: g.location, lang: g.slipLang }))}
            />
          )}
        </section>
      </EventShell>
    );
  }

  const side: Side | null = host.side ?? (sp.side === "bride" || sp.side === "groom" ? sp.side : null);
  const ids = sp.ids ? new Set(sp.ids.split(",")) : null;
  const fromList = sp.list === "1";
  const since = sp.since && /^\d{4}-\d{2}-\d{2}$/.test(sp.since) ? sp.since : null;
  // Optional filter: only the slips printed in one language (e.g. to print the Marathi ones on their own).
  const lang: SlipLang | null = sp.lang === "en" || sp.lang === "mr" || sp.lang === "both" ? sp.lang : null;
  // Where households stay (owner, 12 Nov): one place at a time, or "-" for no place given.
  // The choices are the places on the side shown, spelt as first typed, case ignored.
  const placeKey = (s: string | null) => (s ?? "").trim().toLowerCase();
  const places = [
    ...new Map(
      all
        .filter((g) => (!side || g.side === side) && placeKey(g.location))
        .map((g) => [placeKey(g.location), g.location!.trim()] as const)
        .reverse(),
    ).values(),
  ].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  const placeCount = (key: string) => all.filter((g) => (!side || g.side === side) && placeKey(g.location) === key).length;
  const noPlace = placeCount("");
  const place = sp.place === "-" ? "-" : (places.find((p) => placeKey(p) === placeKey(sp.place ?? null)) ?? null);
  const inView = all.filter(
    (g) =>
      (!side || g.side === side) &&
      (!ids || ids.has(g.id)) &&
      (!fromList || g.printRequested) &&
      (!since || g.createdAt.slice(0, 10) >= since) &&
      (!place || placeKey(g.location) === (place === "-" ? "" : placeKey(place))),
  );
  const guests = lang ? inView.filter((g) => g.slipLang === lang) : inView;

  const siteBase = await publicBaseUrl();
  const replyBy = slipDate(host.event.cutoffAt);

  const missingPhone = (["bride", "groom"] as const).filter((s) => !host.event.contactPhone[s] && guests.some((g) => g.side === s));
  const noMarathi = guests.filter((g) => g.slipLang !== "en" && !g.nameMr).length;
  const sheets = chunk(guests, PER_SHEET);
  // The filters in "Additional filters" (not the one-off ?ids= or the print list).
  const filterBits = [
    side && !host.side ? (side === "bride" ? "Bride's side" : "Groom's side") : null,
    place ? (place === "-" ? "No location given" : place) : null,
    lang ? LANG_LABEL[lang] : null,
    since ? `Added on or after ${since}` : null,
  ].filter(Boolean) as string[];
  const filtered = filterBits.length > 0;

  return (
    <EventShell host={host} current="slips">
      <style>{PRINT_CSS}</style>
      {header}

      <SlipSelection ids={guests.map((g) => g.id)}>
        <div className="print:hidden">
          {ids && (
            <div className="mb-3">
              <Alert tone="info">
                Showing {guests.length === 1 ? "one household's slip" : `${guests.length} selected slips`}.{" "}
                <Link href={`${base}?tab=print`} className="font-semibold underline">
                  Show all slips
                </Link>
              </Alert>
            </div>
          )}
          {fromList && (
            <div className="mb-3">
              <Alert tone="info">
                Showing the {guests.length} slip{guests.length === 1 ? "" : "s"} on the print list.{" "}
                <Link href={`${base}?tab=print`} className="font-semibold underline">
                  Show all slips
                </Link>{" "}
                ·{" "}
                <Link href={base} className="font-semibold underline">
                  Back to the print list
                </Link>
              </Alert>
            </div>
          )}
          {filtered && (
            <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem]">
              <span className="font-semibold">Filters:</span>
              {filterBits.join(" · ")}
              <Link href={`${base}?tab=print${fromList ? "&list=1" : ""}`} className="font-semibold text-kumkum underline">
                Clear
              </Link>
            </p>
          )}
        </div>

        {guests.length === 0 ? (
          <div className="print:hidden">
            <EmptyState icon={Printer} title="No slips to print">
              {fromList ? "The print list is empty." : filtered || ids ? "No households match these filters." : "Add households on the Guest list first."}
            </EmptyState>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[0.9375rem] text-ink-soft print:hidden">
              {guests.length.toLocaleString("en-IN")} slip{guests.length === 1 ? "" : "s"} · {sheets.length === 1 ? "one sheet" : `${sheets.length} sheets`} · A4 · 8 slips,
              each about 97 × 70 mm
            </p>
            <SlipSheets
              perSheet={PER_SHEET}
              items={guests.map((g) => ({
                id: g.id,
                name: g.nameEn,
                nameMr: g.nameMr,
                location: g.location,
                code: g.shortCode,
                slip: <Slip g={g} base={siteBase} event={host.event.name} replyBy={replyBy} phone={displayPhone(host.event.contactPhone[g.side])} />,
              }))}
            />
          </>
        )}

        {/* Below the sheet (owner, 14 Nov): notes on the left; on the right, Additional filters on top and Print at the bottom. */}
        <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] print:hidden">
          <div className="space-y-3">
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
              <h2 className="mb-1.5 text-base font-bold">Before you print</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  A4 paper, scale <b>100%</b> (not &quot;fit to page&quot;), portrait, headers and footers off.
                </li>
                <li>Print one sheet first and scan a QR code with your phone.</li>
                <li>Only ticked slips print (tick box in each slip&apos;s corner), packed 8 to a sheet.</li>
                <li>Thicker paper (100 gsm or more) holds up better in the card.</li>
                <li>
                  QR codes point to <span className="break-all">{siteBase}</span>.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div>
              <PopupButton
                title="Additional filters"
                className="btn btn-secondary w-full"
                label={
                  <>
                    <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                    Additional filters{filtered ? ` (${filterBits.length})` : ""}
                  </>
                }
              >
                <form className="space-y-4 p-5" action={base}>
                  <input type="hidden" name="tab" value="print" />
                  {fromList && <input type="hidden" name="list" value="1" />}
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
                  {(places.length > 0 || place) && (
                    <label className="block">
                      <span className="label">Location</span>
                      <select name="place" defaultValue={place ?? ""} className="input">
                        <option value="">Every location</option>
                        {places.map((p) => (
                          <option key={p} value={p}>
                            {p} ({placeCount(placeKey(p))})
                          </option>
                        ))}
                        {noPlace > 0 && <option value="-">No location given ({noPlace})</option>}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="label">Language</span>
                    <select name="lang" defaultValue={lang ?? ""} className="input">
                      <option value="">Every language</option>
                      <option value="en">English slips only</option>
                      <option value="mr">Marathi slips only</option>
                      <option value="both">English-and-Marathi slips only</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">
                      Only households added on or after <span className="font-normal text-ink-soft">(optional)</span>
                    </span>
                    <input type="date" name="since" defaultValue={since ?? ""} className="input" />
                  </label>
                  <p className="text-sm text-ink-soft">
                    {(["en", "mr", "both"] as const)
                      .map((l) => `${guests.filter((g) => g.slipLang === l).length} ${l === "en" ? "English" : l === "mr" ? "Marathi" : "both languages"}`)
                      .join(" · ")}{" "}
                    shown now.{" "}
                    <Link href={`${base}?tab=language`} className="font-semibold text-kumkum underline">
                      Change languages
                    </Link>
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="btn btn-primary">
                      Show
                    </button>
                    {filtered && (
                      <Link href={`${base}?tab=print${fromList ? "&list=1" : ""}`} className="btn btn-quiet btn-sm">
                        Clear filters
                      </Link>
                    )}
                  </div>
                </form>
              </PopupButton>
              {filtered && <p className="mt-1.5 text-sm text-ink-soft">{filterBits.join(" · ")}</p>}
            </div>
            <PrintButton />
          </div>
        </div>
      </SlipSelection>
    </EventShell>
  );
}
