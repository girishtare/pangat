"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
    <Link href={`/host/e/${slug}/guests/${item.opened.id}`} className="font-bold text-kumkum underline">
      {item.opened.name}
    </Link>
  ) : (
    <b>{item.opened.name}</b>
  );

  return (
    <li className="flex flex-col gap-3 rounded-[14px] bg-card px-4 py-3.5 lg:flex-row lg:items-center lg:gap-5">
      <div className="min-w-0 flex-1">
        <p className="wrap-names">
          Someone opened the link for {opened} and said it isn&apos;t them. Their mobile: <b className="whitespace-nowrap">{item.mobile}</b>
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {item.when} ·{" "}
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
      </div>
      {done ? (
        <p role="status" className={`shrink-0 text-sm font-semibold ${done.ok ? "text-leaf" : "text-kumkum"}`}>
          {done.text}
        </p>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2">
          {item.match.kind === "named" && item.match.sendHref && (
            <a
              href={item.match.sendHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => resolve("sent")}
              className="btn btn-whatsapp"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Send their link on WhatsApp
            </a>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => resolve("dismissed")}
            className="inline-flex min-h-11 items-center font-bold text-kumkum underline underline-offset-4 hover:text-kumkum-dark"
          >
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
    <section className="mt-6 rounded-[1.25rem] border border-haldi bg-haldi-soft p-4 sm:p-5" aria-labelledby="wrong-link-title">
      <h2 id="wrong-link-title" className="text-xl font-bold">
        Wrong-link requests · {items.length} waiting
      </h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Guests who opened a link that wasn&apos;t theirs and left their mobile. They were only told the family will be in touch.
      </p>
      <ul className="mt-3 grid gap-3">
        {items.map((item) => (
          <Row key={item.id} slug={slug} item={item} />
        ))}
      </ul>
    </section>
  );
}
