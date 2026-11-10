"use client";

export default function PrintButton({ disabled }: { disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => window.print()} className="rounded-xl bg-kumkum px-5 py-3 font-semibold text-white disabled:opacity-50">
      Print slips
    </button>
  );
}
