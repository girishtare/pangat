import { t } from "@/lib/i18n";
import { splitLead } from "@/lib/text";
import { paletteEFonts } from "../../fonts";
import Logo from "../../ui/Logo";

const shell = `${paletteEFonts} font-body-e min-h-screen bg-cream text-[17px] leading-[1.6] text-ink-e`;

/**
 * A guest link that doesn't match any household: the same bilingual message as
 * before, now with a 404 status (15 Nov end-to-end test: it answered 200).
 */
export default function GuestLinkNotFound() {
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
