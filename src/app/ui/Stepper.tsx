"use client";

import { Minus, Plus } from "lucide-react";

/** − value + with large buttons. Controlled; also posts its value when given a name. */
export default function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  name,
  size = "md",
  lessLabel = "one less",
  moreLabel = "one more",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  name?: string;
  size?: "md" | "lg";
  lessLabel?: string;
  moreLabel?: string;
}) {
  const big = size === "lg";
  const btn = `flex shrink-0 items-center justify-center rounded-full border-2 border-kumkum bg-card text-kumkum disabled:border-line disabled:text-ink-soft ${
    big ? "h-14 w-14" : "h-11 w-11"
  }`;
  return (
    <div role="group" aria-label={label}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex items-center gap-3">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label}: ${lessLabel}`}>
          <Minus className={big ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
        </button>
        <output aria-live="polite" className={`min-w-[3ch] text-center font-display font-bold tabular-nums ${big ? "text-4xl" : "text-2xl"}`}>
          {value}
        </output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label}: ${moreLabel}`}>
          <Plus className={big ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
