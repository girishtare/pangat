"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Phone, Search, SkipForward, X } from "lucide-react";
import type { MessageKind } from "@/lib/outreach";
import { ReplyBadge, SideBadge, WhatsAppIcon } from "../../../../ui/kit";
import { recordSend } from "./actions";
import { SendButton } from "./WhatsAppForms";

export interface ListRow {
  id: string;
  nameEn: string;
  nameMr: string | null;
  location: string | null;
  shortCode: string;
  side: "bride" | "groom";
  mobile: string | null; // shown as written
  replied: number;
  invited: number;
  invitationSent: string | null; // formatted
  reminders: string; // "0" or "2, last …"
  href: string | null; // wa.me link with the message, or null without a mobile
  sentBefore: boolean;
}

/**
 * The distribution list: tick households, then "Send to ticked" walks through
 * them one by one. A WhatsApp link opens one chat at a time, so each household
 * takes one tap (Open WhatsApp); Pangat moves on to the next and records it.
 */
export default function DistributionList({ slug, kind, rows, showSide }: { slug: string; kind: MessageKind; rows: ListRow[]; showSide: boolean }) {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<string[] | null>(null); // ids still to send, in order
  const [done, setDone] = useState<Set<string>>(new Set());
  const [queueTotal, setQueueTotal] = useState(0);
  const [query, setQuery] = useState("");
  // Search as you type: name (English or Marathi), mobile digits, place or code.
  const q = query.trim();
  const ql = q.toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const shown = q
    ? rows.filter(
        (r) =>
          r.nameEn.toLowerCase().includes(ql) ||
          (r.nameMr ?? "").includes(q) ||
          (r.location ?? "").toLowerCase().includes(ql) ||
          r.shortCode.toLowerCase() === ql ||
          (qDigits.length >= 4 && (r.mobile ?? "").replace(/\D/g, "").includes(qDigits)),
      )
    : rows;
  // "Tick all" acts on the households shown (all of them, or the ones found).
  const sendable = shown.filter((r) => r.href);
  const allTicked = sendable.length > 0 && sendable.every((r) => ticked.has(r.id));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const current = queue && queue.length ? byId.get(queue[0]) : null;

  const toggle = (id: string) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const next = () => setQueue((q) => (q ? q.slice(1) : q));
  const verb = kind === "invite" ? "invitation" : "reminder";

  return (
    <div>
      <label className="relative mt-4 block sm:max-w-[26rem]">
        <span className="sr-only">Search the list by name, mobile, place or code</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search name, mobile, place, code"
          className="input min-h-12 pl-11"
        />
      </label>
      {q && (
        <p className="mt-2 text-sm">
          {shown.length} of {rows.length} households match &quot;{q}&quot;. Ticked households stay ticked when you search again.
        </p>
      )}

      {/* Ticking and the send walk-through */}
      <div className="mt-4 rounded-[1.25rem] border border-line bg-paper-deep/70 p-3.5">
        {current ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-soft">
                Sending {queueTotal - queue!.length + 1} of {queueTotal}
              </p>
              <p className="wrap-names text-base font-bold">{current.nameEn}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={current.href!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void recordSend(slug, current.id, kind);
                  setDone((d) => new Set(d).add(current.id));
                  next();
                }}
                className="btn btn-whatsapp"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Open WhatsApp
              </a>
              <button type="button" onClick={next} className="btn btn-secondary">
                <SkipForward className="h-5 w-5" aria-hidden="true" />
                Skip
              </button>
              <button type="button" onClick={() => setQueue(null)} className="btn btn-quiet">
                <X className="h-5 w-5" aria-hidden="true" />
                Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-11 items-center gap-2.5 font-semibold">
              <input
                type="checkbox"
                checked={allTicked}
                disabled={sendable.length === 0}
                onChange={() =>
                  setTicked((t) => {
                    const n = new Set(t);
                    for (const r of sendable) {
                      if (allTicked) n.delete(r.id);
                      else n.add(r.id);
                    }
                    return n;
                  })
                }
                className="h-5 w-5 accent-kumkum"
              />
              {ticked.size ? `${ticked.size} ticked` : q ? "Tick all found with a mobile" : "Tick all with a mobile"}
            </label>
            <button
              type="button"
              disabled={ticked.size === 0}
              onClick={() => {
                const ids = rows.filter((r) => ticked.has(r.id) && r.href).map((r) => r.id);
                setDone(new Set());
                setQueueTotal(ids.length);
                setQueue(ids);
              }}
              className="btn btn-whatsapp"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Send {verb} to {ticked.size || "ticked"}
            </button>
          </div>
        )}
        {queue && queue.length === 0 && (
          <p className="mt-2 flex items-center gap-2 font-semibold text-leaf">
            <Check className="h-5 w-5" aria-hidden="true" />
            Done: WhatsApp opened for {done.size} household{done.size === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      {/* Laptop: table */}
      <div className="table-scroll mt-4 hidden rounded-[1.25rem] border border-line bg-card lg:block">
        <table className="table-p min-w-[820px]">
          <thead>
            <tr>
              <th className="w-12">
                <span className="sr-only">Tick</span>
              </th>
              <th className="text-left!">Household</th>
              <th>Mobile</th>
              <th>Replied</th>
              <th>Invitation sent</th>
              <th>Reminders</th>
              <th>
                <span className="sr-only">Send</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={done.has(r.id) ? "bg-leaf-soft/60" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={ticked.has(r.id)}
                    disabled={!r.href}
                    onChange={() => toggle(r.id)}
                    aria-label={`Tick ${r.nameEn}`}
                    className="h-5 w-5 align-middle accent-kumkum"
                  />
                </td>
                <td className="max-w-[16rem] text-left!">
                  <Link href={`/host/e/${slug}/guests/${r.id}`} className="wrap-names font-bold text-ink hover:text-kumkum hover:underline">
                    {r.nameEn}
                  </Link>
                  {showSide && (
                    <div className="mt-1">
                      <SideBadge side={r.side} />
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap">{r.mobile ?? <span className="font-bold text-kumkum">No mobile</span>}</td>
                <td>
                  <ReplyBadge replied={r.replied} invited={r.invited} />
                </td>
                <td className="whitespace-nowrap">{r.invitationSent ?? "—"}</td>
                <td className="whitespace-nowrap">{r.reminders}</td>
                <td>{r.href ? <SendButton slug={slug} householdId={r.id} kind={kind} href={r.href} sentBefore={r.sentBefore} /> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: cards */}
      <ul className="mt-4 space-y-3 lg:hidden">
        {shown.map((r) => (
          <li key={r.id} className={`card p-4 ${done.has(r.id) ? "border-leaf" : ""}`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={ticked.has(r.id)}
                disabled={!r.href}
                onChange={() => toggle(r.id)}
                aria-label={`Tick ${r.nameEn}`}
                className="mt-1 h-5 w-5 shrink-0 accent-kumkum"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/host/e/${slug}/guests/${r.id}`} className="wrap-names min-w-0 font-bold text-ink">
                    {r.nameEn}
                  </Link>
                  <ReplyBadge replied={r.replied} invited={r.invited} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                  {showSide && <SideBadge side={r.side} />}
                  {r.mobile ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-ink">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {r.mobile}
                    </span>
                  ) : (
                    <span className="font-bold text-kumkum">No mobile</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Invitation: {r.invitationSent ?? "not yet"} · Reminders: {r.reminders}
                </p>
              </div>
            </div>
            {r.href && (
              <div className="mt-3">
                <SendButton slug={slug} householdId={r.id} kind={kind} href={r.href} sentBefore={r.sentBefore} full />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
