import { SIDE_NAME } from "@/lib/expenses";
import { hostGate } from "@/lib/host";
import { loadRepliedHouseholds, type StoredReply } from "@/lib/store/replies";
import type { ResponseSource } from "@/lib/types";
import { shortStamp } from "@/lib/when";
import { Alert, PageHeader, Section } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { ClearReplies, type ReplyRow } from "./ClearReplies";

export const dynamic = "force-dynamic";

const CHANNEL: Record<ResponseSource, string> = {
  qr: "QR code",
  link: "WhatsApp link",
  code: "Phone-in code",
  on_behalf: "On behalf",
};

export default async function Admin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gate = await hostGate(slug);
  if (!gate.ok) {
    if (gate.reason === "demo") {
      return (
        <main className="mx-auto max-w-lg px-4 py-16">
          <Alert tone="info">Admin needs a database, so it isn&apos;t available in demo mode.</Alert>
        </main>
      );
    }
    return <GateMessage gate={gate} title="Admin" />;
  }
  const { host } = gate;

  if (host.role !== "owner") {
    return (
      <EventShell host={host} current="admin">
        <PageHeader title="Admin" />
        <Alert tone="info">Only the event&apos;s owner can open Admin.</Alert>
      </EventShell>
    );
  }

  const households = await loadRepliedHouseholds(host.client, host.event.id);

  const describe = (fn: (typeof host.functions)[number], r: StoredReply) => {
    if (r.status === "no") return `${fn.name.en}: No`;
    const split = fn.catered && !fn.vegOnly ? ` (${r.nonveg} non-veg, ${r.veg} veg)` : "";
    return `${fn.name.en}: Yes · ${r.heads}${split}`;
  };

  const rows: ReplyRow[] = households.map((h) => {
    const lines = host.functions.flatMap((fn) => {
      const reply = h.replies.find((r) => r.functionId === fn.id);
      return reply ? [describe(fn, reply)] : [];
    });
    const latest = h.replies.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
    return {
      id: h.id,
      nameEn: h.nameEn,
      nameMr: h.nameMr,
      sideLabel: SIDE_NAME[h.side],
      location: h.location,
      placeMr: h.location ? (host.event.placeNamesMr[h.location] ?? null) : null,
      mobile: h.mobile,
      shortCode: h.shortCode,
      lines,
      last: `${CHANNEL[latest.source]} · ${shortStamp(latest.updatedAt)}`,
    };
  });

  return (
    <EventShell host={host} current="admin">
      <PageHeader title="Admin" subtitle="Only you, the event's owner, can see this page." />
      <Section
        title="Clear a reply"
        subtitle="For test replies and mistakes. It deletes the household's reply and its history, so they count as waiting again. Their link, QR code and short code keep working. Numbers already frozen on Caterer numbers don't change."
      >
        <ClearReplies slug={slug} rows={rows} />
      </Section>
    </EventShell>
  );
}
