"use client";

import { useMemo } from "react";
import { qrPath } from "@/lib/qr";

/**
 * A slip's QR code, drawn in the browser from its link (owner, 12 Nov: speed).
 * The page then carries only the link, not every code's drawing: with 400
 * slips that was most of the Slips page's weight.
 */
export function QrCode({ text, label, size = "30mm" }: { text: string; label: string; size?: string }) {
  const qr = useMemo(() => qrPath(text), [text]);
  const q = 4; // quiet zone, in modules
  const full = qr.size + 2 * q;
  return (
    <svg viewBox={`${-q} ${-q} ${full} ${full}`} style={{ width: size, height: size, flex: "none" }} shapeRendering="crispEdges" role="img" aria-label={label}>
      <rect x={-q} y={-q} width={full} height={full} fill="#fff" />
      <path d={qr.d} fill="#000" />
    </svg>
  );
}
