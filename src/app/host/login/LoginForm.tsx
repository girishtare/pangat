"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

const MESSAGES: Record<NonNullable<SignInState>["error"], string> = {
  invalid: "Enter your email address and password.",
  wrong: "That email and password don't match. Check them, or ask the family member who set up your account.",
  unavailable: "Sign-in isn't working right now. Please try again in a few minutes.",
};

export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-base font-semibold">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-4 py-3 text-lg"
        />
      </label>
      <label className="block">
        <span className="text-base font-semibold">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-4 py-3 text-lg"
        />
      </label>
      {state?.error && (
        <p role="alert" className="rounded-xl bg-kumkum/10 px-4 py-3 text-kumkum">
          {MESSAGES[state.error]}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="block w-full rounded-xl bg-kumkum px-5 py-4 text-xl font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
