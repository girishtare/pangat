import { cookies } from "next/headers";
import { Link2Off } from "lucide-react";
import { getStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { isPlausibleToken } from "@/lib/token";
import { Divider, Wordmark } from "../../ui/kit";
import GuestFlow from "./GuestFlow";

export const dynamic = "force-dynamic";

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
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-4 py-12 text-center">
        <Wordmark small />
        <div className="card mt-8 w-full p-6">
          <Link2Off className="mx-auto h-10 w-10 text-haldi-deep" aria-hidden="true" />
          <p lang="mr" className="mt-3 text-lg">
            {t("mr", "notFound")}
          </p>
          <Divider className="my-4" />
          <p className="text-lg">{t("en", "notFound")}</p>
        </div>
      </main>
    );
  }

  const closed = Date.now() > new Date(view.event.cutoffAt).getTime();
  // QR codes on printed slips carry ?s=q so we can see which channel worked.
  const saved = (await cookies()).get("pangat_lang")?.value;
  const initialLang = saved === "en" || saved === "mr" ? saved : undefined;
  return <GuestFlow token={token} view={view} closed={closed} source={s === "q" ? "qr" : "link"} initialLang={initialLang} />;
}
