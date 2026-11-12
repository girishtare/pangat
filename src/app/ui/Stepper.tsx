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
  variant = "app",
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
  /** "guest": palette E look for the guest reply page (48 px buttons, Space Grotesk number); size is ignored. */
  variant?: "app" | "guest";
  lessLabel?: string;
  moreLabel?: string;
}) {
  const big = size === "lg";
  const guest = variant === "guest";
  const btn = guest
    ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-maroon bg-card-e text-maroon disabled:border-sand disabled:text-[#9c8a6c]"
    : `flex shrink-0 items-center justify-center rounded-full border-2 border-kumkum bg-card text-kumkum disabled:border-line disabled:text-ink-soft ${
        big ? "h-14 w-14" : "h-11 w-11"
      }`;
  const icon = guest || big ? "h-6 w-6" : "h-5 w-5";
  const number = guest
    ? "min-w-8 text-center font-heading-e text-[28px] font-bold leading-none tabular-nums"
    : `min-w-[3ch] text-center font-display tabular-nums ${big ? "text-4xl" : "text-2xl"}`;
  return (
    <div role="group" aria-label={label}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className={`flex items-center ${guest ? "gap-2.5" : "gap-3"}`}>
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${label}: ${lessLabel}`}>
          <Minus className={icon} aria-hidden="true" />
        </button>
        <output aria-live="polite" className={number}>
          {value}
        </output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${label}: ${moreLabel}`}>
          <Plus className={icon} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
