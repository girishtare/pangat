"use client";

import { useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A button that opens its content in a pop-up (a modal <dialog>): Escape, the
 * close button or a click on the dimmed backdrop closes it. The content stays
 * mounted, so a half-filled form or an import check survives closing.
 */
export default function PopupButton({
  label,
  title,
  className = "btn btn-primary",
  children,
}: {
  label: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId(); // one per pop-up, even when many share a title (e.g. "Edit task")
  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={id}
        className="card m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto p-0"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close(); // click on the backdrop
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-card px-5 py-3.5">
          <h2 id={id} className="font-display text-2xl text-kumkum">
            {title}
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-quiet btn-sm" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </dialog>
    </>
  );
}
