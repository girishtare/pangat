/** Bride's side in maroon, groom's side in dusty blue (a fill, never text). */
export function Bar({ bridePct, className = "h-2.5" }: { bridePct: number; className?: string }) {
  return (
    <div className={`flex overflow-hidden rounded-full bg-haldi ${className}`} role="presentation">
      <div className="h-full bg-kumkum" style={{ width: `${Math.max(0, Math.min(100, bridePct))}%` }} />
    </div>
  );
}
