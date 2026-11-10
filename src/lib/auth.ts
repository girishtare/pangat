/** Minimum password length for host accounts (Supabase's own minimum is lower). */
export const MIN_PASSWORD = 10;

/**
 * Where to send someone after sign-in. Only paths on this site: anything
 * else (another host, "//evil.example", "javascript:") falls back to /host,
 * so sign-in links can't be used to bounce people to another website.
 */
export function safeNext(next: string | null | undefined, fallback = "/host"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

/** The email-link types our /auth/confirm route accepts (Supabase verifyOtp types). */
export const EMAIL_LINK_TYPES = ["email", "invite", "recovery", "email_change"] as const;
export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function isEmailLinkType(v: string | null): v is EmailLinkType {
  return !!v && (EMAIL_LINK_TYPES as readonly string[]).includes(v);
}

/** Basic password check shared by sign-up, reset and set-password. */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return "That password is too long.";
  if (confirm !== undefined && password !== confirm) return "The two passwords don't match.";
  return null;
}
