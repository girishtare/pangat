"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InviteVia } from "@/lib/store/supabase";
import { saveInviteSent } from "./inviteActions";

const VIA: { value: InviteVia; label: string }[] = [
  { value: "card", label: "Card" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "both", label: "Card and WhatsApp" },
];

/**
 * "Invitation sent" for one household, ticked by hand, and how it went out:
 * the printed card, WhatsApp, or both (owner, 12 Nov). Saved as soon as it
 * changes; ticking starts on Card, since the cards carry the printed slips.
 */
export default function InviteSent({ slug, id, name, via }: { slug: string; id: string; name: string; via: InviteVia | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useState<InviteVia | null>(via);
  const [error, setError] = useState<string | null>(null);
  // A refresh from the server (another host, another tab) wins once nothing is saving.
  const [seen, setSeen] = useState(via);
  if (via !== seen && !pending) {
    setSeen(via);
    setShown(via);
  }

  const save = (next: InviteVia | null) => {
    const before = shown;
    setShown(next);
    start(async () => {
      const r = await saveInviteSent(slug, id, next);
      if (!r.ok) {
        setShown(before);
        setError(r.message ?? "Couldn't save. Please try again.");
      } else setError(null);
      router.refresh();
    });
  };

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${pending ? "opacity-70" : ""}`} aria-busy={pending}>
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={shown !== null}
          onChange={(e) => save(e.target.checked ? "card" : null)}
          className="h-5 w-5 accent-kumkum"
          aria-label={`Invitation sent to ${name}`}
        />
        <span>{shown ? "Sent" : "Not sent"}</span>
      </label>
      {shown && (
        <select
          value={shown}
          onChange={(e) => save(e.target.value as InviteVia)}
          className="input min-h-10 w-auto py-1 text-sm"
          aria-label={`How the invitation went to ${name}`}
        >
          {VIA.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-kumkum">
          {error}
        </p>
      )}
    </div>
  );
}
