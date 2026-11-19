"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { MARATHI_MAX } from "@/lib/marathi";
import { suggestMarathiAction } from "../../../../host/suggestActions";
import { savePlacesMr } from "./actions";

/**
 * Places in Marathi (owner, 19 Nov): each place the households stay at, written
 * once in Marathi for the Marathi card's envelope. Suggest fills blanks with
 * the Marathi suggestion (Gemini), to check before saving. A blank place
 * prints as typed.
 */
export default function PlacesMarathi({ slug, places, saved }: { slug: string; places: { en: string; count: number }[]; saved: Record<string, string> }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...saved }));
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, start] = useTransition();
  const written = places.filter((p) => values[p.en]?.trim()).length;
  const changed = places.some((p) => (values[p.en] ?? "").trim() !== (saved[p.en] ?? ""));

  const suggestOne = async (en: string): Promise<boolean> => {
    const r = await suggestMarathiAction("place", en);
    if (r.ok) setValues((v) => ({ ...v, [en]: r.text }));
    else setStatus({ ok: false, text: r.message });
    return r.ok;
  };
  const suggestMissing = async () => {
    const todo = places.filter((p) => !values[p.en]?.trim()).map((p) => p.en);
    let done = 0;
    setStatus(null);
    // A few at a time, so 40 places take seconds, not minutes.
    for (let i = 0; i < todo.length; i += 4) {
      setBusy(`Suggesting ${Math.min(i + 4, todo.length)} of ${todo.length}…`);
      const results = await Promise.all(todo.slice(i, i + 4).map(suggestOne));
      done += results.filter(Boolean).length;
    }
    setBusy(null);
    setStatus({ ok: true, text: `Suggested ${done} of ${todo.length}. Check them, then Save.` });
  };

  return (
    <details className="rounded-[14px] border border-line bg-card p-4" open={written < places.length}>
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 font-bold">
        <span>Places in Marathi</span>
        <span className={`badge ${written === places.length ? "badge-yes" : "badge-no"}`}>
          {written} of {places.length} written
        </span>
      </summary>
      <p className="hint mt-1">
        For the Marathi card&apos;s envelope: each place is written once and used for every household from there. A place left blank prints in English, as typed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!!busy || saving || written === places.length} onClick={suggestMissing} className="btn btn-secondary btn-sm min-h-11">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {busy ?? "Suggest the missing ones"}
        </button>
        <button
          type="button"
          disabled={saving || !changed || !!busy}
          onClick={() =>
            start(async () => {
              const r = await savePlacesMr(slug, values);
              setStatus(r ? { ok: r.ok, text: r.message } : null);
              router.refresh();
            })
          }
          className="btn btn-primary btn-sm min-h-11"
        >
          {saving ? "Saving…" : "Save places"}
        </button>
      </div>
      {status && <p className={`mt-2 text-sm font-semibold ${status.ok ? "text-leaf" : "text-kumkum"}`}>{status.text}</p>}
      <div className="table-scroll mt-3 rounded-lg border border-line">
        <table className="table-p">
          <thead>
            <tr>
              <th scope="col">Place, as typed</th>
              <th scope="col">Households</th>
              <th scope="col">In Marathi</th>
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <tr key={p.en}>
                <td>{p.en}</td>
                <td>{p.count}</td>
                <td className="min-w-[14rem]">
                  <div className="flex items-center gap-2">
                    <input
                      lang="mr"
                      value={values[p.en] ?? ""}
                      maxLength={MARATHI_MAX.place}
                      onChange={(e) => setValues((v) => ({ ...v, [p.en]: e.target.value }))}
                      aria-label={`${p.en} in Marathi`}
                      className="input min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={async () => {
                        setBusy(`Suggesting ${p.en}…`);
                        await suggestOne(p.en);
                        setBusy(null);
                      }}
                      aria-label={`Suggest Marathi for ${p.en}`}
                      title="Suggest"
                      className="btn btn-quiet btn-sm h-11 w-11 p-0"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
