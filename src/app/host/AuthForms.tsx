"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { MIN_PASSWORD } from "@/lib/auth";
import { requestPasswordReset, setPassword, signUp } from "./actions";

/** An error, in maroon, right under the fields it is about. */
function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} role="alert" className="text-[0.9375rem] text-kumkum">
      {text}
    </p>
  );
}

/** "We've sent it" states: the light-blue info box. */
function Sent({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex gap-3 rounded-xl border border-haldi bg-haldi-soft px-4 py-3.5">
      <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-haldi-deep" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function PasswordFields({ first, hint, error }: { first: string; hint?: string; error?: string }) {
  return (
    <>
      <label className="block">
        <span className="label">{first}</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          aria-invalid={error ? true : undefined}
          className={`input ${error ? "border-kumkum" : ""}`}
        />
        <span className="hint mt-1 block">At least {MIN_PASSWORD} characters.</span>
      </label>
      <label className="block">
        <span className="label">Type it again</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "password-error" : undefined}
          className={`input ${error ? "border-kumkum" : ""}`}
        />
        {hint && <span className="hint mt-1 block">{hint}</span>}
      </label>
      {error && <FieldError id="password-error" text={error} />}
    </>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);
  if (state && "sent" in state) {
    return (
      <Sent>
        Almost done. We&apos;ve emailed a link to <b>{state.sent}</b>. Open it to confirm your email, then sign in. Check your spam folder if
        it hasn&apos;t arrived in a few minutes.
      </Sent>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="email" required className="input" placeholder="you@example.com" />
      </label>
      <PasswordFields first="Choose a password" hint="We'll email you a link to confirm it's you." error={state && "error" in state ? state.error : undefined} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[3.25rem] w-full text-lg">
        {pending ? "Creating your account…" : "Create account"}
      </button>
      <p className="hint">Sign-up with a mobile number is coming later.</p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state && "sent" in state) {
    return <Sent>If that email has a Pangat account, a link to choose a new password is on its way. It works once and expires after an hour.</Sent>;
  }
  const error = state && "error" in state ? state.error : null;
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "reset-error" : undefined}
          className={`input ${error ? "border-kumkum" : ""}`}
          placeholder="you@example.com"
        />
      </label>
      {error && <FieldError id="reset-error" text={error} />}
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[3.25rem] w-full text-lg">
        {pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action} className="space-y-4">
      <PasswordFields first="New password" error={state?.error} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[3.25rem] w-full text-lg">
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
