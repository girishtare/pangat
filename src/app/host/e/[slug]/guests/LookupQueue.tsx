"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2Off, Phone } from "lucide-react";
import { WhatsAppIcon } from "../../../../ui/kit";
import { resolveLookupAction } from "./lookupActions";

export interface LookupItem {
  id: number;
  when: string;
  mobile: string;
  opened: { id: string | null; name: string };
  /** none = no household has this mobile; hidden = on the other side (one-side host). */
  match: { kind: "none" } | { kind: "hidden" } | { kind: "same" } | { kind: "named"; id: string; name: string; sendHref: string | null };
}

function Row({ slug, item }: { slug: string; item: LookupItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ ok: boolean; text: string } | null>(null);
  const resolve = (status: "sent" | "dismissed") =>
    start(async () => {
      const r = await resolveLookupAction(slug, item.id, status);
      setDone(
        r.ok
          ? { ok: true, text: status === "sent" ? "Marked as sent." : "Dismissed." }
          : { ok: false, text: "Couldn't update this request. Refresh the page and try again." },
      );
      router.refresh();
    });

  const opened = item.opened.id ? (
    <Link href={`/host/e/${slug}/guests/${item.opened.id}`} className="font-semibold text-kumkum underline">
      {item.opened.name}
    </Link>
  ) : (
    <b>{item.opened.name}</b>
  );

  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <p className="wrap-names">
        Someone opened the link for {opened} and said it isn&apos;t them.
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          <Phone className="h-4 w-4" aria-hidden="true" />
          {item.mobile}
        </span>
        <span>{item.when}</span>
      </p>
      <p className="mt-2 text-sm">
        {item.match.kind === "named" && (
          <>
            That mobile belongs to{" "}
            <Link href={`/host/e/${slug}/guests/${item.match.id}`} className="font-semibold text-kumkum underline">
              {item.match.name}
            </Link>
            . Send them their own link.
          </>
        )}
        {item.match.kind === "same" && <>That mobile is on the same household. They may not recognise the name on the card; call them.</>}
        {item.match.kind === "hidden" && <>That mobile belongs to a household on the other side; a host of that side will see this too.</>}
        {item.match.kind === "none" && (
          <>No household has this mobile. If they should be invited, add them below, then send the invitation from the WhatsApp tab.</>
        )}
      </p>
      {done ? (
        <p role="status" className={`mt-3 text-sm font-semibold ${done.ok ? "text-leaf" : "text-kumkum"}`}>
          {done.text}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {item.match.kind === "named" && item.match.sendHref && (
            <a
              href={item.match.sendHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => resolve("sent")}
              className="btn btn-whatsapp btn-sm"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Send their link
            </a>
          )}
          <button type="button" disabled={pending} onClick={() => resolve("dismissed")} className="btn btn-quiet btn-sm">
            Dismiss
          </button>
        </div>
      )}
    </li>
  );
}

export default function LookupQueue({ slug, items }: { slug: string; items: LookupItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="card mt-6 border-kumkum/30 bg-kumkum-soft/50 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-xl text-kumkum">
        <Link2Off className="h-6 w-6" aria-hidden="true" />
        Wrong-link requests ({items.length})
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Guests who opened a link that wasn&apos;t theirs and left their mobile. They were only told the family will be in touch.
      </p>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <Row key={item.id} slug={slug} item={item} />
        ))}
      </ul>
    </section>
  );
}
