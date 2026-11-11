"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

const MESSAGES: Record<NonNullable<SignInState>["error"], string> = {
  invalid: "Enter your email address and password.",
  wrong: "That email and password don't match. Try again or reset your password.",
  unconfirmed: "Please confirm your email first: open the link we emailed you when you signed up.",
  unavailable: "Sign-in isn't working right now. Please try again in a few minutes.",
};

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  const wrong = state?.error === "wrong" || state?.error === "invalid";
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="username" required className="input" placeholder="you@example.com" />
      </label>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="label mb-0">
            Password
          </label>
          <Link href="/host/forgot" className="text-sm font-semibold text-kumkum underline underline-offset-2">
            Forgot your password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={wrong || undefined}
          aria-describedby={state?.error ? "signin-error" : undefined}
          className={`input ${wrong ? "border-kumkum" : ""}`}
        />
        {state?.error && (
          <p id="signin-error" role="alert" className="mt-1.5 text-[0.9375rem] text-kumkum">
            {MESSAGES[state.error]}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[3.25rem] w-full text-lg">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
