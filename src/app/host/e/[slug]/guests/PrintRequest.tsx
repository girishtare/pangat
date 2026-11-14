"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Printer } from "lucide-react";
import { savePrintRequest } from "../slips/actions";

/**
 * The Guest list's Slips column (owner, 14 Nov): "Print" puts the household's
 * slip on the print list (Slips → Print list); "Print Again" when its
 * invitation has gone out. Once on the list it says so, and a second tap
 * takes it off.
 */
export default function PrintRequest({ slug, id, name, onList, sent }: { slug: string; id: string; name: string; onList: boolean; sent: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useState(onList);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState(onList);
  if (onList !== seen && !pending) {
    setSeen(onList);
    setShown(onList);
  }
  const flip = () => {
    const next = !shown;
    setShown(next);
    start(async () => {
      const r = await savePrintRequest(slug, [id], next);
      if (!r.ok) {
        setShown(!next);
        setError(r.message ?? "Couldn't save. Please try again.");
      } else setError(null);
      router.refresh();
    });
  };
  return (
    <div className={pending ? "opacity-70" : undefined} aria-busy={pending}>
      <button
        type="button"
        onClick={flip}
        aria-pressed={shown}
        title={shown ? "On the print list (Slips tab). Tap to take it off." : "Add this household's slip to the print list"}
        className={`btn btn-sm min-h-10 whitespace-nowrap ${shown ? "btn-quiet text-leaf" : "btn-secondary"}`}
      >
        {shown ? <Check className="h-4 w-4" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
        {shown ? "On print list" : sent ? "Print Again" : "Print"}
        <span className="sr-only"> slip for {name}</span>
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-kumkum">
          {error}
        </p>
      )}
    </div>
  );
}
