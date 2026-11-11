import { cookies } from "next/headers";
import { getStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { splitLead } from "@/lib/text";
import { isPlausibleToken } from "@/lib/token";
import { paletteEFonts } from "../../fonts";
import GuestFlow from "./GuestFlow";
import Logo from "../../ui/Logo";

export const dynamic = "force-dynamic";

// Palette E, body 17 px. Marathi keeps its 1.65 line height (globals.css :lang(mr)).
const shell = `${paletteEFonts} font-body-e min-h-screen bg-cream text-[17px] leading-[1.6] text-ink-e`;

export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { token } = await params;
  const { s } = await searchParams;
  const view = isPlausibleToken(token) ? await getStore().getHouseholdByToken(token) : null;

  if (!view) {
    const [mrLead, mrRest] = splitLead(t("mr", "notFound"));
    const [enLead, enRest] = splitLead(t("en", "notFound"));
    return (
      <main className={`${shell} flex flex-col items-center justify-center px-5 py-6 text-center`}>
        <Logo lang="mr" className="h-16" />
        <div className="mt-5 w-full max-w-md rounded-[18px] border border-sand bg-card-e px-[18px] py-[22px]">
          <h1 lang="mr" className="font-heading-e text-[26px] font-bold [font-synthesis-weight:none] leading-[1.4] text-maroon">
            {mrLead}
          </h1>
          {mrRest && (
            <p lang="mr" className="mt-1.5 text-lg">
              {mrRest}
            </p>
          )}
          <div aria-hidden="true" className="my-[18px] h-px bg-sand" />
          <h2 lang="en" className="font-heading-e text-2xl font-bold [font-synthesis-weight:none] leading-[1.3] text-maroon">
            {enLead}
          </h2>
          {enRest && (
            <p lang="en" className="mt-1.5 text-lg">
              {enRest}
            </p>
          )}
        </div>
        <p className="mt-[18px] text-[15px] text-ink-e-soft">Pangat</p>
      </main>
    );
  }

  const closed = Date.now() > new Date(view.event.cutoffAt).getTime();
  // QR codes on printed slips carry ?s=q so we can see which channel worked.
  const saved = (await cookies()).get("pangat_lang")?.value;
  const initialLang = saved === "en" || saved === "mr" ? saved : undefined;
  return (
    <div className={shell}>
      <GuestFlow token={token} view={view} closed={closed} source={s === "q" ? "qr" : "link"} initialLang={initialLang} />
    </div>
  );
}
