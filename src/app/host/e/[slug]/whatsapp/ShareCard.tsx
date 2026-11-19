"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cardFileName } from "@/lib/cardName";
import { makeNamedCard } from "../../../../ui/namedCard";
import { cardsToShare, recordSend } from "./actions";

/** Whether this browser can hand files to other apps (phones: yes; most laptops: no). */
export function canShareFiles(): boolean {
  try {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [new File(["%PDF-"], "card.pdf", { type: "application/pdf" })] })
    );
  } catch {
    return false;
  }
}

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

type Phase = { s: "idle" } | { s: "making" } | { s: "ready"; files: File[] } | { s: "shared" } | { s: "error"; message: string };

/**
 * Share card (owner, 19 Nov): on a phone, makes the household's invitation
 * card with their name on it (in their language; Both = both cards) and hands
 * it, with the invitation message, to the phone's share sheet. The host picks
 * WhatsApp and then the contact: a share can't open a chat by number. Counts as
 * the WhatsApp invitation going out, like Send invitation.
 */
export function ShareCardButton({
  slug,
  householdId,
  text,
  family,
  fontClass,
}: {
  slug: string;
  householdId: string;
  /** The invitation message, as on Send invitation. */
  text: string;
  family: string;
  fontClass: string;
}) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<Phase>({ s: "idle" });
  useEffect(() => setSupported(canShareFiles()), []);
  if (!supported) return null;

  const share = async (files: File[]) => {
    try {
      await navigator.share({ files, text });
      setPhase({ s: "shared" });
      void recordSend(slug, householdId, "invite");
    } catch (e) {
      // Cancelled, or the tap that started it is too long ago: one more tap shares.
      if (e instanceof DOMException && (e.name === "AbortError" || e.name === "NotAllowedError")) setPhase({ s: "ready", files });
      else setPhase({ s: "error", message: "The phone couldn't share the card. Try again, or use Send invitation." });
    }
  };

  const make = async () => {
    setPhase({ s: "making" });
    try {
      const res = await cardsToShare(slug, householdId);
      if (!res.ok) {
        setPhase({ s: "error", message: res.message });
        return;
      }
      const files: File[] = [];
      for (const c of res.cards) {
        const r = await fetch(c.url);
        if (!r.ok) throw new Error(`card download answered ${r.status}`);
        const raw = await r.arrayBuffer();
        let blob = new Blob([raw.slice(0)], { type: c.type });
        if (c.layout) {
          try {
            blob = await makeNamedCard(raw, c.type, c.lines, c.layout, family, c.lang);
          } catch (e) {
            // The plain card is still worth sending.
            console.warn("named card failed; sharing the plain card", e);
          }
        }
        files.push(new File([blob], cardFileName(c.name, EXT[blob.type] ?? "pdf"), { type: blob.type }));
      }
      // Straight to the share sheet while the tap still counts; otherwise one more tap.
      const active = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive;
      if (active) await share(files);
      else setPhase({ s: "ready", files });
    } catch (e) {
      console.error("share card failed", e);
      setPhase({ s: "error", message: "Couldn't prepare the card. Check the connection and try again." });
    }
  };

  const base = "btn btn-sm w-full whitespace-nowrap";
  return (
    <div>
      {/* Loads the card font, which the drawing waits for. */}
      <span aria-hidden="true" className={`${fontClass} invisible absolute`}>
        अ <i>a</i>
      </span>
      {phase.s === "ready" ? (
        <button type="button" onClick={() => void share(phase.files)} className={`${base} btn-whatsapp`}>
          <Share2 className="h-5 w-5" aria-hidden="true" />
          Card ready: share now
        </button>
      ) : phase.s === "shared" ? (
        <button type="button" onClick={() => void make()} className={`${base} bg-leaf-soft text-leaf`}>
          <Check className="h-5 w-5" aria-hidden="true" />
          Card shared · share again
        </button>
      ) : (
        <button type="button" onClick={() => void make()} disabled={phase.s === "making"} className={`${base} btn-secondary`}>
          {phase.s === "making" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          ) : (
            <Share2 className="h-5 w-5" aria-hidden="true" />
          )}
          {phase.s === "making" ? "Preparing the card…" : phase.s === "error" ? "Try again: share card" : "Share card with their name"}
        </button>
      )}
      {phase.s === "error" && (
        <p role="alert" className="mt-1 text-sm font-semibold text-kumkum">
          {phase.message}
        </p>
      )}
    </div>
  );
}
