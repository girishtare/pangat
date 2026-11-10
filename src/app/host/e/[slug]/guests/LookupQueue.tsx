"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resolveLookupAction } from "./lookupActions";

export interface LookupItem {
  id: number;
  when: string;
  mobile: string;
  opened: { id: string | null; name: string };
  /** null = no household has this mobile; hidden = on the other side (one-side host). */
  match: { kind: "none" } | { kind: "hidden" } | { kind: "same" } | { kind: "named"; id: string; name: string; sendHref: string | null };
}

function Row({ slug, item }: { slug: string; item: LookupItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const resolve = (status: "sent" | "dismissed") =>
    start(async () => {
      const r = await resolveLookupAction(slug, item.id, status);
      setDone(r.ok ? (status === "sent" ? "Marked as sent." : "Dismissed.") : "Couldn't update. Refresh and try again.");
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
    <li className="rounded-xl border border-haldi/60 bg-white p-3 text-sm">
      <p>
        {item.when}: someone opened the link for {opened} and said it isn&apos;t them. Their mobile: <b>{item.mobile}</b>.
      </p>
      <p className="mt-1">
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
          <>No household has this mobile. If they should be invited, add them on this page, then send the invitation from the WhatsApp tab.</>
        )}
      </p>
      {done ? (
        <p className="mt-2 text-green-900">{done}</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {item.match.kind === "named" && item.match.sendHref && (
            <a
              href={item.match.sendHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => resolve("sent")}
              className="rounded-xl bg-[#1f8f4e] px-3 py-2 font-semibold text-white"
            >
              Send their link on WhatsApp
            </a>
          )}
          <button type="button" disabled={pending} onClick={() => resolve("dismissed")} className="text-kumkum underline disabled:opacity-50">
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
    <section className="mt-6 rounded-xl border-2 border-kumkum/40 bg-kumkum/5 p-4">
      <h2 className="text-xl font-semibold">Wrong-link requests ({items.length})</h2>
      <p className="mt-1 text-sm">
        Guests who opened a link that wasn&apos;t theirs and left their mobile. They were told only that the family will be in touch.
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <Row key={item.id} slug={slug} item={item} />
        ))}
      </ul>
    </section>
  );
}
