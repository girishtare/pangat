import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cardFileName, cardLines, cardTypeOf } from "@/lib/cardName";
import { cardSignedUrl, namedCardForGuest } from "@/lib/store/admin";
import { isPlausibleToken } from "@/lib/token";
import { cardFont } from "../../../cardFont";
import { paletteEFonts } from "../../../fonts";
import NamedCardView from "./NamedCardView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Invitation card · निमंत्रण पत्रिका" };

const shell = `${paletteEFonts} font-body-e min-h-screen bg-cream text-[17px] leading-[1.6] text-ink-e`;

/**
 * A guest opens their invitation card: /r/<token>/card?l=en|mr. The household's
 * token is the key (as for the reply page). With a name placement saved for
 * that card (Event settings), the guest's phone writes their name and place on
 * the envelope page; without one, they get the plain card. The file itself
 * stays private: a link that works for an hour.
 */
export default async function GuestCard({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ l?: string }> }) {
  const { token } = await params;
  const { l } = await searchParams;
  const lang = l === "mr" ? "mr" : "en";
  const card = isPlausibleToken(token) ? await namedCardForGuest(token, lang) : null;
  if (!card) redirect(`/r/${encodeURIComponent(token)}`);
  const url = await cardSignedUrl(card.path);
  if (!card.layout) redirect(url);

  const lines = cardLines(lang, card);
  const type = cardTypeOf(card.path);
  return (
    <main className={`${shell} flex flex-col items-center px-5 py-8`}>
      <NamedCardView
        url={url}
        type={type}
        lines={lines}
        layout={card.layout}
        lang={lang}
        family={cardFont.style.fontFamily}
        fontClass={cardFont.className}
        fileName={cardFileName(card.nameEn, type === "application/pdf" ? "pdf" : "jpg")}
        back={`/r/${encodeURIComponent(token)}`}
      />
    </main>
  );
}
