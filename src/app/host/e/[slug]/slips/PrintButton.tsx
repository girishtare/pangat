"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ disabled, count }: { disabled?: boolean; count: number }) {
  return (
    <button type="button" disabled={disabled} onClick={() => window.print()} className="btn btn-primary min-h-14 w-full text-lg">
      <Printer className="h-5 w-5" aria-hidden="true" />
      Print {count.toLocaleString("en-IN")} slip{count === 1 ? "" : "s"}
    </button>
  );
}
