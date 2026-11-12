import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "../ui/Logo";
import { signInWithGoogle } from "./actions";

/**
 * The account pages' frame (sign in, create account, forgot password, choose a
 * password): phone-first single column, the logo centred at the top, one card
 * with the title and form, and a secondary line below the card.
 */
export function AuthShell({ title, subtitle, children, below }: { title: string; subtitle?: ReactNode; children: ReactNode; below?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[28rem] flex-col px-4 pb-10 pt-8 sm:pt-12">
      <Link href="/" className="mx-auto rounded-lg" aria-label="Pangat home">
        <Logo decorative className="h-12 sm:h-14" />
      </Link>
      <div className="card mt-6 p-5 sm:p-7">
        <h1 className="font-display text-[1.5rem] leading-tight text-kumkum sm:text-[1.625rem]">{title}</h1>
        {subtitle && <div className="mt-1.5 text-ink-soft">{subtitle}</div>}
        <div className="mt-5">{children}</div>
      </div>
      {below && <div className="mt-6 text-center">{below}</div>}
    </main>
  );
}

/** A short notice inside the card (demo mode, a link that didn't work). */
export function AuthNote({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-4 py-3 ${tone === "error" ? "border-kumkum/30 bg-kumkum-soft text-kumkum-dark" : "border-haldi bg-haldi-soft text-ink"}`}
    >
      {children}
    </p>
  );
}

/**
 * "Continue with Google", styled to Google's sign-in button guidelines (light
 * theme: white, #747775 outline, #1F1F1F text, the standard four-colour G).
 * A plain form post, so it works without JavaScript.
 */
export function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-5 text-[0.9375rem] font-semibold text-[#1F1F1F] transition-colors hover:bg-[#F8F8F8]"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-sm text-ink-soft">
      <span className="h-px flex-1 bg-line" />
      or with email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export const LINK_ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or ask for a new link.",
  google: "Google sign-in didn't work. Please try again, or use your email.",
  unavailable: "Sign-in isn't available right now. Please try again shortly.",
};
