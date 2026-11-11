import "server-only";
import { createTransport } from "nodemailer";
import { emailCardHtml, emailCardText, type EmailCard } from "./emailDesign";

/**
 * Plain emails Pangat sends itself (Supabase sends the sign-in emails: invite,
 * confirm, reset). Today: telling someone who already has a Pangat account
 * that they've been added to an event.
 *
 * Sent over SMTP. For the pilot that's the owner's Gmail with an app password,
 * the same one Supabase's SMTP settings use. Environment variables:
 *   SMTP_USER   the sending address, e.g. name@gmail.com
 *   SMTP_PASS   its app password (secret)
 *   SMTP_HOST   default smtp.gmail.com
 *   SMTP_PORT   default 465 (TLS)
 *   SMTP_FROM   default "Pangat <SMTP_USER>"
 * Without SMTP_USER and SMTP_PASS nothing is sent and the caller says so.
 */
export type MailResult = "sent" | "not_set_up" | "failed";

/** One email in Pangat's design (src/lib/emailDesign.ts), with a plain-text copy. */
export async function sendCardMail(to: string, subject: string, card: EmailCard): Promise<MailResult> {
  return sendMail(to, subject, emailCardText(card), emailCardHtml(card));
}

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<MailResult> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return "not_set_up";
  const port = Number(process.env.SMTP_PORT ?? 465);
  try {
    const transport = createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transport.sendMail({ from: process.env.SMTP_FROM ?? `Pangat <${user}>`, to, subject, text, ...(html ? { html } : {}) });
    return "sent";
  } catch (e) {
    console.error("mail failed", e instanceof Error ? e.message : e);
    return "failed";
  }
}
