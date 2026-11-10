"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hostClient } from "@/lib/supabase/session";

export type SignInState = { error: "invalid" | "wrong" | "unavailable" } | null;

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(200),
});

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "invalid" };

  const supabase = await hostClient();
  if (!supabase) return { error: "unavailable" };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for unknown email and wrong password.
    if (error.status && error.status >= 500) console.error("host sign-in failed", error.status, error.code);
    return { error: error.status && error.status >= 500 ? "unavailable" : "wrong" };
  }
  redirect("/host");
}

export async function signOut(): Promise<void> {
  const supabase = await hostClient();
  await supabase?.auth.signOut();
  redirect("/host/login");
}
