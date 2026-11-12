"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InviteVia } from "@/lib/store/supabase";
import { saveInviteSent } from "./inviteActions";

const CHOICES: { value: InviteVia | ""; label: string }[] = [
  { value: "", label: "Not Sent" },
  { value: "card", label: "Card" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "both", label: "Card & WA" },
];

/**
 * Whether one household's invitation has gone out, and how: one drop-down,
 * Not Sent / Card / WhatsApp / Card & WA (owner, 12 Nov; was a tick box
 * plus a drop-down). Saved as soon as it changes.
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
    <div className={pending ? "opacity-70" : undefined} aria-busy={pending}>
      <select
        value={shown ?? ""}
        onChange={(e) => save(e.target.value === "" ? null : (e.target.value as InviteVia))}
        aria-label={`Invitation for ${name}`}
        className={`input min-h-10 w-auto py-1 text-sm ${shown ? "border-leaf font-semibold" : ""}`}
      >
        {CHOICES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-sm text-kumkum">
          {error}
        </p>
      )}
    </div>
  );
}
