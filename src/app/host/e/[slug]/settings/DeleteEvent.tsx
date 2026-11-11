"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2, TriangleAlert, X } from "lucide-react";
import { removeEvent } from "./actions";

const SECONDS = 5;

/**
 * "Delete this event": a warning pop-up, then a 5-second countdown shown on
 * both buttons. Cancel (or Escape, or closing the pop-up) during the countdown
 * stops it; doing nothing deletes the event when it reaches 0.
 */
export default function DeleteEvent({ slug, eventName, households }: { slug: string; eventName: string; households: number }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [left, setLeft] = useState<number | null>(null); // null: not counting
  const [error, setError] = useState<string | null>(null);
  const [deleting, start] = useTransition();

  // Tick once a second; at 0, delete.
  useEffect(() => {
    if (left === null) return;
    if (left === 0) {
      start(async () => {
        const r = await removeEvent(slug);
        if (r?.ok) {
          router.replace("/host?all=1");
          router.refresh();
        } else {
          setError(r?.message ?? "The event couldn't be deleted. Please try again.");
          setLeft(null);
        }
      });
      return;
    }
    const t = setTimeout(() => setLeft((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, slug, router]);

  const stop = () => setLeft(null);
  const close = () => {
    if (deleting) return;
    stop();
    dialog.current?.close();
  };
  const counting = left !== null && left > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setLeft(null);
          dialog.current?.showModal();
        }}
        className="btn border-kumkum bg-card text-kumkum hover:bg-kumkum-soft"
      >
        <Trash2 className="h-5 w-5" aria-hidden="true" />
        Delete this event
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="delete-event-title"
        onCancel={(e) => {
          e.preventDefault(); // Escape: same as Cancel
          close();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close(); // click on the backdrop
        }}
        className="card m-auto w-[calc(100%-2rem)] max-w-lg p-0 text-base outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-kumkum-soft px-5 py-4">
          <h2 id="delete-event-title" className="flex items-center gap-2 font-display text-[1.375rem] leading-tight text-kumkum">
            <TriangleAlert className="h-6 w-6 shrink-0" aria-hidden="true" />
            Delete this event?
          </h2>
          <button type="button" onClick={close} disabled={deleting} className="btn btn-quiet btn-sm" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <p>
            <b>{eventName}</b> will be deleted for everyone, with{" "}
            {households === 0 ? "its" : households === 1 ? "its one household and" : `all ${households.toLocaleString("en-IN")} households and`}{" "}
            replies, functions, slips, WhatsApp records, tasks, people helping and caterer numbers. Co-owners lose access.
          </p>
          <p className="rounded-xl border-2 border-kumkum bg-kumkum-soft px-4 py-3 font-bold text-kumkum">
            A deleted event can never be recovered.
          </p>
          {counting && (
            <p className="text-ink-soft" aria-live="polite">
              Deleting in {left} second{left === 1 ? "" : "s"}. Press Cancel to keep the event.
            </p>
          )}
          {error && <p className="font-semibold text-kumkum">{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={close} disabled={deleting} className="btn btn-secondary">
              {counting ? `Cancel (${left})` : "Cancel"}
            </button>
            <button
              type="button"
              onClick={() => setLeft(SECONDS)}
              disabled={left !== null || deleting}
              className="btn btn-primary min-w-[13rem]"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
              {deleting || left === 0 ? "Deleting…" : counting ? `Deleting in ${left}…` : "Yes, delete the event"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
