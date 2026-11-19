"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// A household's page opens in its own tab from the Guest list (owner, 19 Nov).
// When it saves, it tells the Guest list tab (same browser) to refresh, and
// closes itself. A BroadcastChannel carries the message; the localStorage
// "storage" event is the fallback for browsers without it.

const CHANNEL = "pangat-guests";

/** Tell other tabs of this event that a household changed. */
export function announceSaved(slug: string) {
  const msg = { slug, at: Date.now() };
  try {
    const c = new BroadcastChannel(CHANNEL);
    c.postMessage(msg);
    c.close();
  } catch {}
  try {
    localStorage.setItem(CHANNEL, JSON.stringify(msg));
  } catch {}
}

/**
 * Closes this tab if it was opened as a new tab from the list (nothing to go
 * back to). Opened in the same tab, it stays: returns false.
 */
export function closeIfOpenedAsTab(): boolean {
  if (window.history.length > 1) return false;
  window.close();
  return true;
}

/** On the Guest list: refresh when a household of this event is saved in another tab. */
export function useRefreshOnSave(slug: string) {
  const router = useRouter();
  useEffect(() => {
    const onMsg = (data: unknown) => {
      if (data && typeof data === "object" && (data as { slug?: unknown }).slug === slug) router.refresh();
    };
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (e) => onMsg(e.data);
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CHANNEL || !e.newValue || channel) return;
      try {
        onMsg(JSON.parse(e.newValue));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [slug, router]);
}

/** Renders nothing; refreshes the page it sits on when a household is saved elsewhere. */
export function RefreshOnSave({ slug }: { slug: string }) {
  useRefreshOnSave(slug);
  return null;
}
