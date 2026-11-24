import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { isPlausibleToken } from "@/lib/token";
import { cardFont } from "../../cardFont";
import { paletteEFonts } from "../../fonts";
import GuestFlow from "./GuestFlow";

export const dynamic = "force-dynamic";

// Palette E, body 17 px. Marathi keeps its 1.65 line height (globals.css :lang(mr)).
const shell = `${paletteEFonts} font-body-e min-h-svh bg-cream text-[17px] leading-[1.6] text-ink-e`;

export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string; l?: string }>;
}) {
  const { token } = await params;
  const { s, l } = await searchParams;
  const view = isPlausibleToken(token) ? await getStore().getHouseholdByToken(token) : null;

  if (!view) notFound(); // the bilingual "link isn't valid" page, with a 404 (not-found.tsx)

  const closed = Date.now() > new Date(view.event.cutoffAt).getTime();
  // QR codes on printed slips carry ?s=q so we can see which channel worked.
  // Per household (owner, 24 Nov): the cookie is scoped to this link's path, so a phone that opens several
  // families' links (one person forwarding them) doesn't carry one family's choice to the next.
  const saved = (await cookies()).get("pangat_lang_hh")?.value;
  // The guest's own earlier choice wins; else the link's language (?l=, on one-language slips and WhatsApp links);
  // else the household's language, Both opening in Marathi (owner, 14 Nov). They can always switch.
  const fromHousehold = view.household.lang === "en" ? "en" : view.household.lang ? "mr" : undefined;
  const pick = saved === "en" || saved === "mr" ? saved : l === "en" || l === "mr" ? l : fromHousehold;
  const initialLang = pick === "en" || pick === "mr" ? pick : undefined;
  return (
    <div className={shell}>
      <GuestFlow
        token={token}
        view={view}
        closed={closed}
        source={s === "q" ? "qr" : "link"}
        initialLang={initialLang}
        cardFont={{ family: `${cardFont.style.fontFamily}, serif`, className: cardFont.className }}
      />
    </div>
  );
}
