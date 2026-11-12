"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

/**
 * A search box for server-rendered lists that filters as you type (owner, 12 Nov).
 * It writes `?q=` to the address (keeping the other parameters, like sort and
 * filters) a moment after typing stops, so the page re-renders with the
 * matches and the search survives a reload or a shared link. Without
 * JavaScript it is a plain GET form, as before.
 */
export function LiveSearch({
  label,
  placeholder,
  className = "",
  param = "q",
}: {
  /** For screen readers: what the box searches. */
  label: string;
  placeholder: string;
  className?: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Back / forward or a "Show all" link changed the address: follow it.
  useEffect(() => setValue(current), [current]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const push = (next: string) => {
    const qs = new URLSearchParams(params.toString());
    const v = next.trim();
    qs.delete("page"); // a new search starts again on page 1
    if (v) qs.set(param, v);
    else qs.delete(param);
    const s = qs.toString();
    start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };

  return (
    <form
      action={pathname}
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        push(value);
      }}
    >
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          type="search"
          name={param}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => push(v), 250);
          }}
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          aria-busy={pending}
          className={`input min-h-12 pl-11 ${pending ? "opacity-80" : ""}`}
        />
      </label>
    </form>
  );
}
