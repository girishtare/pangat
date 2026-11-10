"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ disabled }: { disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => window.print()} className="btn btn-primary w-full">
      <Printer className="h-5 w-5" aria-hidden="true" />
      Print slips
    </button>
  );
}
