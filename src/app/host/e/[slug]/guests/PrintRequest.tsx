"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePrintRequest } from "../slips/actions";

/**
 * The Guest list's "Print slips" column (owner, 14 Nov): a tick box, like the
 * Print column on Slips → Language. Ticked = on the print list; saved as you tick.
 */
export default function PrintRequest({ slug, id, name, onList }: { slug: string; id: string; name: string; onList: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useState(onList);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState(onList);
  if (onList !== seen && !pending) {
    setSeen(onList);
    setShown(onList);
  }
  const flip = (next: boolean) => {
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
      <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2" title={shown ? "On the print list" : "Add to the print list"}>
        <input type="checkbox" checked={shown} onChange={(e) => flip(e.target.checked)} className="h-5 w-5 accent-kumkum" />
        <span className="sr-only">Print the slip for {name}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1 text-sm text-kumkum">
          {error}
        </p>
      )}
    </div>
  );
}
