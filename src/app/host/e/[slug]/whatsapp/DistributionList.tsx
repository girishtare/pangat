"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Mail, Phone, Plus, Search, SkipForward, X } from "lucide-react";
import type { InviteModes } from "@/lib/invites";
import { saveInviteModes } from "../guests/inviteActions";
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
  /** When the WhatsApp invitation went (ISO), for sorting. */
  invitationSentAt: string | null;
  reminders: string; // "0" or "2, last …"
  reminderCount: number;
  href: string | null; // wa.me link with the message, or null without a mobile
  sentBefore: boolean;
  /** How they are to be invited, and what has gone out (owner, 14 Nov). */
  invite: InviteModes;
}

/** The Invitation mode icons: envelope = card, WhatsApp; green once sent. */
function ModeIcons({ m, wa }: { m: InviteModes; wa: boolean }) {
  const chip = (sent: boolean) => `inline-grid h-8 w-8 place-items-center rounded-lg ${sent ? "bg-leaf-soft text-leaf" : "bg-paper-deep text-ink-soft"}`;
  return (
    <span className="inline-flex gap-1">
      {m.card && (
        <span className={chip(m.cardSent)} title={`Card: ${m.cardSent ? "sent" : "not sent yet"}`}>
          <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="sr-only">Card {m.cardSent ? "sent" : "not sent"}</span>
        </span>
      )}
      {wa && (
        <span className={chip(m.waSent)} title={`WhatsApp: ${m.waSent ? "sent" : "not sent yet"}`}>
          <WhatsAppIcon className="h-[18px] w-[18px]" />
          <span className="sr-only">WhatsApp {m.waSent ? "sent" : "not sent"}</span>
        </span>
      )}
    </span>
  );
}

/**
 * The distribution list: tick households, then "Send to ticked" walks through
 * them one by one. A WhatsApp link opens one chat at a time, so each household
 * takes one tap (Open WhatsApp); Pangat moves on to the next and records it.
 */
const PER_PAGE = 50;

/** The list's sortable columns (owner, 14 Nov): household name A to Z by default. */
type SortKey = "name" | "mobile" | "mode" | "replied" | "sent" | "reminders";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Household" },
  { key: "mobile", label: "Mobile" },
  { key: "mode", label: "Invitation mode" },
  { key: "replied", label: "Replied" },
  { key: "sent", label: "Invitation sent" },
  { key: "reminders", label: "Reminders" },
];
const byName = (a: ListRow, b: ListRow) => a.nameEn.localeCompare(b.nameEn, "en", { sensitivity: "base", numeric: true });
/** Card only, then card and WhatsApp, then WhatsApp only; more sent first within each. */
const modeRank = (r: ListRow) => (r.invite.wa ? (r.invite.card ? 2 : 3) : 1) * 10 - (r.invite.cardSent ? 1 : 0) - (r.invite.waSent ? 1 : 0);
function sortRows(rows: ListRow[], key: SortKey, dir: "asc" | "desc"): ListRow[] {
  const sign = dir === "desc" ? -1 : 1;
  // Blanks (no mobile, never sent) last whichever way.
  const blanksLast = (a: string | null, b: string | null) => (a === b ? 0 : a === null ? 1 : b === null ? -1 : sign * a.localeCompare(b));
  const cmp = (a: ListRow, b: ListRow): number => {
    switch (key) {
      case "name":
        return sign * byName(a, b);
      case "mobile":
        return blanksLast(a.mobile, b.mobile);
      case "mode":
        return sign * (modeRank(a) - modeRank(b));
      case "replied":
        return sign * ((a.invited ? a.replied / a.invited : 0) - (b.invited ? b.replied / b.invited : 0));
      case "sent":
        return blanksLast(a.invitationSentAt, b.invitationSentAt);
      case "reminders":
        return sign * (a.reminderCount - b.reminderCount);
    }
  };
  return [...rows].sort((a, b) => cmp(a, b) || byName(a, b));
}

export default function DistributionList({ slug, kind, rows, showSide }: { slug: string; kind: MessageKind; rows: ListRow[]; showSide: boolean }) {
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  // "Add to WA invitation" (owner, 14 Nov): a card-only household with a mobile gets WhatsApp too; the button then
  // becomes "Send invitation". Shown at once; saved on the household.
  const [addedWa, setAddedWa] = useState<Set<string>>(new Set());
  const [adding, startAdding] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);
  const isWa = (r: ListRow) => r.invite.wa || addedWa.has(r.id);
  const addToWa = (r: ListRow) => {
    setAddedWa((s) => new Set(s).add(r.id));
    startAdding(async () => {
      const res = await saveInviteModes(slug, r.id, r.invite.card, true);
      if (!res.ok) {
        setAddedWa((s) => {
          const n = new Set(s);
          n.delete(r.id);
          return n;
        });
        setAddError(res.message ?? "Couldn't save. Please try again.");
      } else setAddError(null);
    });
  };
  // Invitations go by WhatsApp only to households with WhatsApp as a mode; reminders to anyone with a mobile.
  const canSend = (r: ListRow) => !!r.href && (kind !== "invite" || isWa(r));
  const sendCell = (r: ListRow, full = false) =>
    !r.href ? null : canSend(r) ? (
      <SendButton slug={slug} householdId={r.id} kind={kind} href={r.href} sentBefore={r.sentBefore} full={full} />
    ) : (
      <button
        type="button"
        disabled={adding}
        onClick={() => addToWa(r)}
        className={`btn btn-secondary btn-sm whitespace-nowrap ${full ? "w-full" : ""}`}
        title="Invite them on WhatsApp too, as well as by card"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add to WA invitation
      </button>
    );
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
  // Sorted by name unless a column header (or the phone menu) says otherwise.
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const sorted = sortRows(shown, sort.key, sort.dir);
  const sortBy = (key: SortKey) => {
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
    setPage(0);
  };
  const th = (key: SortKey, label: string, className = "") => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => sortBy(key)}
          className={`inline-flex items-center gap-1 rounded-md px-1 font-bold hover:text-kumkum ${active ? "text-kumkum" : ""}`}
          title={`Sort by ${label.toLowerCase()}`}
        >
          {label}
          <Icon className={`h-4 w-4 ${active ? "" : "opacity-40"}`} aria-hidden="true" />
        </button>
      </th>
    );
  };
  // 50 a page (owner, 12 Nov: speed). Ticks and "Tick all" cover every page.
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const at = Math.min(page, pages - 1);
  const pageRows = sorted.slice(at * PER_PAGE, (at + 1) * PER_PAGE);
  // "Tick all" acts on the households shown (all of them, or the ones found), on every page.
  const sendable = shown.filter(canSend);
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
            {/* Search sits on the right of this row, next to Send (owner, 12 Nov); stacked on phones. */}
            <div className="flex flex-col gap-3 sm:ml-auto sm:flex-row sm:items-center">
              <label className="relative block w-full sm:w-[20rem] lg:w-[22rem]">
                <span className="sr-only">Search the list by name, mobile, place or code</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Search name, mobile, place, code"
                  className="input min-h-12 pl-11"
                />
              </label>
              <button
              type="button"
              disabled={ticked.size === 0}
              onClick={() => {
                // In the order shown (sorted), WhatsApp-mode households only for an invitation.
                const ids = sortRows(rows, sort.key, sort.dir)
                  .filter((r) => ticked.has(r.id) && canSend(r))
                  .map((r) => r.id);
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
          </div>
        )}
        {queue && queue.length === 0 && (
          <p className="mt-2 flex items-center gap-2 font-semibold text-leaf">
            <Check className="h-5 w-5" aria-hidden="true" />
            Done: WhatsApp opened for {done.size} household{done.size === 1 ? "" : "s"}.
          </p>
        )}
      </div>
      {addError && <p className="mt-2 text-sm font-semibold text-kumkum">{addError}</p>}
      {q && (
        <p className="mt-2 text-sm">
          {shown.length} of {rows.length} households match &quot;{q}&quot;. Ticked households stay ticked when you search again.
        </p>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={() => setPage(at - 1)} disabled={at === 0} className="btn btn-secondary btn-sm min-h-10">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </button>
          <p className="text-center text-sm" aria-live="polite">
            <span className="font-semibold">
              Page {at + 1} of {pages}
            </span>
            <span className="text-ink-soft max-sm:block">
              <span className="max-sm:hidden"> · </span>
              {at * PER_PAGE + 1}–{Math.min(shown.length, (at + 1) * PER_PAGE)} of {shown.length}
            </span>
          </p>
          <button type="button" onClick={() => setPage(at + 1)} disabled={at >= pages - 1} className="btn btn-secondary btn-sm min-h-10">
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {/* Laptop: table */}
      <div className="table-scroll mt-4 hidden rounded-[1.25rem] border border-line bg-card lg:block">
        <table className="table-p min-w-[960px]">
          <thead>
            <tr>
              <th className="w-12">
                <span className="sr-only">Tick</span>
              </th>
              {th("name", "Household", "text-left!")}
              {th("mobile", "Mobile")}
              {th("mode", "Invitation mode")}
              {th("replied", "Replied")}
              {th("sent", "Invitation sent")}
              {th("reminders", "Reminders")}
              <th>
                <span className="sr-only">Send</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className={done.has(r.id) ? "bg-leaf-soft/60" : ""}>
                <td>
                  <input
                    type="checkbox"
                    checked={ticked.has(r.id)}
                    disabled={!canSend(r)}
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
                  <ModeIcons m={r.invite} wa={isWa(r)} />
                </td>
                <td>
                  <ReplyBadge replied={r.replied} invited={r.invited} />
                </td>
                <td className="whitespace-nowrap">{r.invitationSent ?? "—"}</td>
                <td className="whitespace-nowrap">{r.reminders}</td>
                <td>{sendCell(r) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: cards, with the same sorting as a menu */}
      <div className="mt-4 flex items-end gap-2 lg:hidden">
        <label className="block flex-1">
          <span className="label">Sort by</span>
          <select
            value={sort.key}
            onChange={(e) => {
              setSort((s) => ({ ...s, key: e.target.value as SortKey }));
              setPage(0);
            }}
            className="input"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-32">
          <span className="sr-only">Direction</span>
          <select value={sort.dir} onChange={(e) => setSort((s) => ({ ...s, dir: e.target.value === "desc" ? "desc" : "asc" }))} className="input">
            <option value="asc">A → Z, low → high</option>
            <option value="desc">Z → A, high → low</option>
          </select>
        </label>
      </div>
      <ul className="mt-3 space-y-3 lg:hidden">
        {pageRows.map((r) => (
          <li key={r.id} className={`card p-4 ${done.has(r.id) ? "border-leaf" : ""}`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={ticked.has(r.id)}
                disabled={!canSend(r)}
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
                  <ModeIcons m={r.invite} wa={isWa(r)} />
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
            {r.href && <div className="mt-3">{sendCell(r, true)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
