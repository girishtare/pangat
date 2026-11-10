"use client";

import { useActionState } from "react";
import { MIN_PASSWORD } from "@/lib/auth";
import { requestPasswordReset, setPassword, signUp } from "./actions";

const input = "mt-1 block w-full rounded-xl border-2 border-haldi/60 bg-white px-4 py-3 text-lg";
const primary = "block w-full rounded-xl bg-kumkum px-5 py-4 text-xl font-semibold text-white disabled:opacity-60";

function Alert({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-xl bg-kumkum/10 px-4 py-3 text-kumkum">
      {text}
    </p>
  );
}

function PasswordFields() {
  return (
    <>
      <label className="block">
        <span className="font-semibold">Password</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} className={input} />
        <span className="mt-1 block text-sm">At least {MIN_PASSWORD} characters.</span>
      </label>
      <label className="block">
        <span className="font-semibold">Password again</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} className={input} />
      </label>
    </>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);
  if (state && "sent" in state) {
    return (
      <p role="status" className="rounded-xl bg-green-50 px-4 py-4 text-lg text-green-900">
        Almost done. We&apos;ve emailed a link to <b>{state.sent}</b>. Open it to confirm your email, then sign in. Check your spam folder if
        it hasn&apos;t arrived in a few minutes.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="font-semibold">Email</span>
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <PasswordFields />
      {state && "error" in state && <Alert text={state.error} />}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state && "sent" in state) {
    return (
      <p role="status" className="rounded-xl bg-green-50 px-4 py-4 text-lg text-green-900">
        If that email has a Pangat account, a link to choose a new password is on its way. It works once and expires after an hour.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="font-semibold">Email</span>
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      {state && "error" in state && <Alert text={state.error} />}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action} className="space-y-4">
      <PasswordFields />
      {state?.error && <Alert text={state.error} />}
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
