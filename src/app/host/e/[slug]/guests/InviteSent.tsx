"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Mail } from "lucide-react";
import type { InviteMode, InviteModes } from "@/lib/invites";
import { WhatsAppIcon } from "../../../../ui/kit";
import { saveInviteSent } from "./inviteActions";

/**
 * The Guest list's "Invitation mode" cell (owner, 14 Nov): an icon for each
 * way this household is to be invited (printed card, WhatsApp), each with a
 * tick box for "sent". Saved as soon as it changes.
 */
export default function InviteSent({ slug, id, name, modes }: { slug: string; id: string; name: string; modes: InviteModes }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState({ card: modes.cardSent, wa: modes.waSent });
  const [error, setError] = useState<string | null>(null);
  // A refresh from the server (another host, another tab) wins once nothing is saving.
  const key = `${modes.cardSent}|${modes.waSent}`;
  const [seen, setSeen] = useState(key);
  if (key !== seen && !pending) {
    setSeen(key);
    setSent({ card: modes.cardSent, wa: modes.waSent });
  }

  const save = (mode: InviteMode, on: boolean) => {
    setSent((s) => ({ ...s, [mode]: on }));
    start(async () => {
      const r = await saveInviteSent(slug, id, mode, on);
      if (!r.ok) {
        setSent((s) => ({ ...s, [mode]: !on }));
        setError(r.message ?? "Couldn't save. Please try again.");
      } else setError(null);
      router.refresh();
    });
  };

  const box = (mode: InviteMode, label: string, icon: ReactNode) => (
    <label
      title={`${label}: ${sent[mode] ? "sent" : "not sent yet"}`}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border-2 px-2 ${sent[mode] ? "border-leaf bg-leaf-soft text-leaf" : "border-line bg-card text-ink-soft"}`}
    >
      {icon}
      <input type="checkbox" checked={sent[mode]} onChange={(e) => save(mode, e.target.checked)} className="h-5 w-5 accent-leaf" />
      <span className="sr-only">
        {label} sent to {name}
      </span>
    </label>
  );

  return (
    <div className={pending ? "opacity-70" : undefined} aria-busy={pending}>
      <div className="inline-flex flex-wrap items-center gap-1.5">
        {modes.card && box("card", "Card", <Mail className="h-5 w-5" aria-hidden="true" />)}
        {modes.wa && box("wa", "WhatsApp", <WhatsAppIcon className="h-5 w-5" />)}
        {!modes.card && !modes.wa && <span className="text-ink-soft">—</span>}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-kumkum">
          {error}
        </p>
      )}
    </div>
  );
}
