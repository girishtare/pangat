import { cookies } from "next/headers";
import { getStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { isPlausibleToken } from "@/lib/token";
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
      <main className="mx-auto max-w-md px-5 py-16 text-center text-lg">
        <p>{t("mr", "notFound")}</p>
        <p className="mt-4">{t("en", "notFound")}</p>
      </main>
    );
  }

  const closed = Date.now() > new Date(view.event.cutoffAt).getTime();
  // QR codes on printed slips carry ?s=q so we can see which channel worked.
  const saved = (await cookies()).get("pangat_lang")?.value;
  const initialLang = saved === "en" || saved === "mr" ? saved : undefined;
  return <GuestFlow token={token} view={view} closed={closed} source={s === "q" ? "qr" : "link"} initialLang={initialLang} />;
}
