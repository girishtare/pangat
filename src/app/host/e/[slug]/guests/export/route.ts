import { hostGate } from "@/lib/host";
import { buildGuestExport, type ExportHousehold } from "@/lib/exportGuests";

export const dynamic = "force-dynamic";

/**
 * The guest list as an Excel file (owner, 14 Nov). Read with the host's own
 * session, so row-level security keeps a co-owner to their side.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) {
    return new Response("Sign in as a host of this event to download the guest list.", {
      status: gate.reason === "signed_out" ? 401 : 403,
    });
  }
  const { host } = gate;
  const { data, error } = await host.client
    .from("households")
    .select(
      "side, name_en, name_mr, mobile, location, soft_cap, notes, short_code, slip_lang, invite_via, invites(function_id), responses(function_id, status, heads, veg)",
    )
    .eq("event_id", host.event.id)
    .range(0, 9999);
  if (error) return new Response("Couldn't read the guest list. Please try again.", { status: 500 });

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const households: ExportHousehold[] = ((data ?? []) as any[]).map((r) => ({
    side: r.side,
    nameEn: r.name_en,
    nameMr: r.name_mr,
    mobile: r.mobile,
    location: r.location ?? null,
    softCap: r.soft_cap,
    notes: r.notes ?? null,
    shortCode: r.short_code,
    slipLang: r.slip_lang === "en" || r.slip_lang === "mr" ? r.slip_lang : "both",
    inviteVia: r.invite_via === "card" || r.invite_via === "whatsapp" || r.invite_via === "both" ? r.invite_via : null,
    functionIds: (r.invites ?? []).map((i: { function_id: string }) => i.function_id),
    replies: (r.responses ?? []).map((x: { function_id: string; status: string; heads: number; veg: number }) => ({
      functionId: x.function_id,
      status: x.status,
      heads: Number(x.heads) || 0,
      veg: Number(x.veg) || 0,
    })),
  }));

  const file = await buildGuestExport({
    eventName: host.event.name,
    functions: host.functions.map((f) => ({ id: f.id, name: f.name, catered: f.catered, vegOnly: f.vegOnly })),
    households,
  });
  // Date in India, e.g. 2026-11-14.
  const day = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const side = host.side ? `-${host.side}` : "";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pangat-guest-list-${slug}${side}-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
