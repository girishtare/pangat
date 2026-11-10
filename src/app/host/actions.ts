"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { passwordProblem } from "@/lib/auth";
import { publicBaseUrl } from "@/lib/site";
import { hostClient } from "@/lib/supabase/session";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/* ---------- Sign in ---------- */

export type SignInState = { error: "invalid" | "wrong" | "unconfirmed" | "unavailable" } | null;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email.success || !password || password.length > 200) return { error: "invalid" };

  const supabase = await hostClient();
  if (!supabase) return { error: "unavailable" };

  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "unconfirmed" };
    // Same message for unknown email and wrong password.
    if (error.status && error.status >= 500) console.error("host sign-in failed", error.status, error.code);
    return { error: error.status && error.status >= 500 ? "unavailable" : "wrong" };
  }
  redirect("/host");
}

/** Google: Supabase sends the browser to Google, which returns to /auth/callback. */
export async function signInWithGoogle(): Promise<void> {
  const supabase = await hostClient();
  if (!supabase) redirect("/host/login?error=unavailable");
  const base = await publicBaseUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${base}/auth/callback?next=/host`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) {
    console.error("google sign-in failed", error?.status, error?.code);
    redirect("/host/login?error=google");
  }
  redirect(data.url);
}

/* ---------- Sign up ---------- */

export type SignUpState = { error: string } | { sent: string } | null;

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!email.success) return { error: "Enter a valid email address." };
  const problem = passwordProblem(password, confirm);
  if (problem) return { error: problem };

  const supabase = await hostClient();
  if (!supabase) return { error: "Sign-up isn't available right now." };
  const base = await publicBaseUrl();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: { emailRedirectTo: `${base}/host` },
  });
  if (error) {
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    if (error.code === "signup_disabled") return { error: "Sign-up is switched off at the moment." };
    if (error.code === "over_email_send_rate_limit") return { error: "Too many sign-ups just now. Please try again in an hour." };
    console.error("sign-up failed", error.status, error.code);
    return { error: "Sign-up failed. Please try again." };
  }
  // Email confirmation on: no session yet. (For an email that already has an
  // account, Supabase answers the same way, so this can't reveal who has one.)
  if (!data.session) return { sent: email.data };
  redirect("/host");
}

/* ---------- Forgotten password ---------- */

export type ResetState = { error: string } | { sent: true } | null;

export async function requestPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await hostClient();
  if (!supabase) return { error: "This isn't available right now." };
  const base = await publicBaseUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${base}/host/account/password` });
  if (error && error.code !== "user_not_found") {
    console.error("password reset failed", error.status, error.code);
    if (error.code === "over_email_send_rate_limit") return { error: "Too many requests just now. Please try again in an hour." };
  }
  // Same answer whether or not the account exists.
  return { sent: true };
}

/* ---------- Set a new password (after an invitation or a reset link) ---------- */

export type PasswordState = { error: string } | null;

export async function setPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const problem = passwordProblem(password, String(formData.get("confirm") ?? ""));
  if (problem) return { error: problem };
  const supabase = await hostClient();
  if (!supabase) return { error: "This isn't available right now." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your link has expired. Ask for a new one from the sign-in page." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "That's your current password. Choose a new one." };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    console.error("set password failed", error.status, error.code);
    return { error: "Saving the password failed. Please try again." };
  }
  redirect("/host");
}

export async function signOut(): Promise<void> {
  const supabase = await hostClient();
  await supabase?.auth.signOut();
  redirect("/host/login");
}
