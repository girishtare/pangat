import { hostGate } from "@/lib/host";
import { buildGuestTemplate } from "@/lib/template";

export const dynamic = "force-dynamic";

/** The guest-list Excel template for this event, with its functions in the dropdown. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) {
    return new Response("Sign in as a host of this event to download the template.", {
      status: gate.reason === "signed_out" ? 401 : 403,
    });
  }
  const { host } = gate;
  const file = await buildGuestTemplate({
    eventName: host.event.name,
    functions: host.functions.map((f) => f.name),
    hostSide: host.side,
  });
  const side = host.side ? `-${host.side}` : "";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pangat-guests-${slug}${side}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
