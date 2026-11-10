import type { ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Side } from "@/lib/types";

/* Small, restrained wedding details: a marigold and a divider. */

export function Marigold({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="12" cy="6.2" rx="2.6" ry="4.2" fill="#e3a008" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3.4" fill="#c2410c" />
      <circle cx="12" cy="12" r="1.5" fill="#8c1c13" />
    </svg>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-linear-to-r from-transparent to-haldi/70" />
      <Marigold className="h-4 w-4" />
      <span className="h-px flex-1 bg-linear-to-l from-transparent to-haldi/70" />
    </div>
  );
}

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Marigold className={small ? "h-6 w-6" : "h-8 w-8"} />
      <span className={`font-display font-bold leading-none text-kumkum ${small ? "text-2xl" : "text-3xl"}`}>Pangat</span>
    </span>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5.1 5.24-1.37A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.82.83-3.03-.2-.31a8.2 8.2 0 1 1 6.95 3.85Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-1.98-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.31 2.75 2.75 0 0 0-.86 2.04c0 1.2.88 2.37 1 2.53.12.17 1.73 2.64 4.2 3.7.58.26 1.04.41 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.15-1.17-.06-.1-.22-.17-.47-.29Z" />
    </svg>
  );
}

/* Page structure */

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 font-display text-3xl font-bold text-kumkum sm:text-4xl">
            {Icon && <Icon className="h-8 w-8 shrink-0 text-haldi-deep" aria-hidden="true" />}
            <span className="min-w-0">{title}</span>
          </h1>
          {subtitle && <div className="mt-1 text-ink-soft">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      <Divider className="mt-4 max-w-md" />
    </header>
  );
}

export function Section({
  n,
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
  className = "",
  id,
  tone = "card",
}: {
  n?: number;
  icon?: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "card" | "plain";
}) {
  return (
    <section id={id} className={`${tone === "card" ? "card p-4 sm:p-6" : ""} scroll-mt-24 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {n !== undefined && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kumkum font-display text-lg font-bold text-white">
              {n}
            </span>
          )}
          {Icon && n === undefined && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-haldi-soft text-haldi-deep">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-kumkum sm:text-2xl">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-ink-soft">{subtitle}</div>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Stat({
  icon: Icon,
  value,
  label,
  sub,
  tone = "default",
  progress,
}: {
  icon?: LucideIcon;
  value: ReactNode;
  label: string;
  sub?: ReactNode;
  tone?: "default" | "warn" | "good" | "accent";
  progress?: { value: number; tone?: "good" | "warn" };
}) {
  const ring = { default: "", warn: "border-haldi/70 bg-haldi-soft/50", good: "border-leaf/30 bg-leaf-soft/50", accent: "border-kumkum/30 bg-kumkum-soft/50" }[tone];
  return (
    <div className={`card flex items-center gap-3 p-4 ${ring}`}>
      {Icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-haldi-soft text-haldi-deep">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-display text-3xl font-bold leading-tight text-ink">{value}</div>
        <div className="text-sm font-semibold text-ink-soft">{label}</div>
        {sub && <div className="text-xs text-ink-soft">{sub}</div>}
        {progress && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep" role="presentation">
            <div
              className={`h-full rounded-full ${progress.tone === "warn" ? "bg-haldi" : "bg-leaf"}`}
              style={{ width: `${Math.max(0, Math.min(100, progress.value))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* Badges */

export function SideBadge({ side }: { side: Side }) {
  return <span className={`badge ${side === "bride" ? "badge-bride" : "badge-groom"}`}>{side === "bride" ? "Bride" : "Groom"}</span>;
}

export function ReplyBadge({ replied, invited }: { replied: number; invited: number }) {
  if (replied === 0) return <span className="badge badge-no">No reply</span>;
  if (replied < invited) return <span className="badge badge-partly">Partly</span>;
  return <span className="badge badge-yes">Replied</span>;
}

/* Messages */

export function Alert({
  tone,
  children,
  role,
}: {
  tone: "error" | "success" | "warn" | "info";
  children: ReactNode;
  role?: "alert" | "status";
}) {
  const Icon = tone === "success" ? CircleCheck : tone === "info" ? Info : TriangleAlert;
  return (
    <div className={`alert alert-${tone}`} role={role ?? (tone === "error" ? "alert" : "status")}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-haldi-soft text-haldi-deep">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-3 font-display text-lg font-bold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-ink-soft">{children}</div>}
    </div>
  );
}

/** A label + value pair for stacked mobile cards. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}
