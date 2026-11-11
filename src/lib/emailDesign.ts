/*
 * Pangat's email design: one card on cream, maroon and gold, the logo on top.
 * Used for Pangat's own emails (added as a co-owner, removed) and, through
 * scripts/build-email-templates.ts, for Supabase's invitation template, so
 * both look the same.
 *
 * Email clients ignore most CSS: everything is a table with inline styles.
 * Web fonts don't load in Gmail, so headings fall back to Georgia and text to
 * Arial; the look survives that.
 *
 * No imports: the build script runs this file directly with Node.
 */

export interface EmailCard {
  /** Small label in the pill at the top, e.g. "Co-owner invitation". */
  badge: string;
  heading: string;
  /** "Hi Manali," */
  greeting: string;
  paragraphs: string[];
  /** The event box: name, then "Your role" and its value. */
  event?: { name: string; role: string };
  button?: { label: string; url: string };
  /** A line under the button, e.g. the Google sign-in hint. */
  afterButton?: string;
  /** Last small line, e.g. "If you weren't expecting this…". */
  footnote: string;
  /** Absolute URL of the site, for the logo image. */
  siteUrl: string;
}

const C = {
  page: "#f5efe1",
  card: "#fffcf5",
  line: "#e5d3af",
  gold: "#b59a64",
  pill: "#f2e8d2",
  maroon: "#790d16",
  ink: "#2e1a1c",
  soft: "#5e4446",
};
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'Noto Sans', Arial, Helvetica, sans-serif";

/** Escapes text for HTML. Template placeholders ({{ … }}) pass through unchanged. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Values are escaped here; pass `raw` strings (already safe HTML or template code) via rawHtml. */
export function emailCardHtml(c: EmailCard, rawHtml = false): string {
  const t = (s: string) => (rawHtml ? s : esc(s));
  const logo = `${c.siteUrl.replace(/\/+$/, "")}/brand/pangat-logo-en.png`;
  const p = (s: string) =>
    `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};">${t(s)}</p>`;
  const divider = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 22px;"><tr>
<td style="width:110px;border-top:1px solid ${C.gold};font-size:0;line-height:0;">&nbsp;</td>
<td style="padding:0 10px;font-family:${SERIF};font-size:14px;line-height:1;color:${C.gold};">&#10022;</td>
<td style="width:110px;border-top:1px solid ${C.gold};font-size:0;line-height:0;">&nbsp;</td>
</tr></table>`;
  const event = c.event
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px;border:1px solid ${C.line};border-radius:12px;">
<tr><td style="padding:16px 20px 12px;font-family:${SERIF};font-size:18px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;color:${C.maroon};border-bottom:1px solid ${C.line};">${t(c.event.name)}</td></tr>
<tr><td style="padding:12px 20px 16px;font-family:${SANS};font-size:15px;color:${C.ink};">Your role&nbsp;&nbsp;&nbsp;<strong style="color:${C.maroon};">${t(c.event.role)}</strong></td></tr>
</table>`
    : "";
  const button = c.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;"><tr>
<td align="center" bgcolor="${C.maroon}" style="border-radius:10px;">
<a href="${t(c.button.url)}" style="display:block;padding:15px 20px;font-family:${SANS};font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">${t(c.button.label)}</a>
</td></tr></table>`
    : "";
  const after = c.afterButton
    ? `<p style="margin:0 0 22px;font-family:${SANS};font-size:13px;line-height:1.5;color:${C.soft};text-align:center;">${t(c.afterButton)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${t(c.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:18px;">
<tr><td style="padding:14px 18px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" style="font-family:${SERIF};font-size:20px;line-height:1;color:${C.gold};">&#10048;</td>
<td align="right" style="font-family:${SERIF};font-size:20px;line-height:1;color:${C.gold};">&#10048;</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:4px 32px 0;">
<img src="${logo}" width="158" height="64" alt="Pangat" style="display:block;width:158px;height:64px;border:0;">
</td></tr>
<tr><td align="center" style="padding:18px 32px 0;">
<span style="display:inline-block;padding:7px 18px;border-radius:999px;background:${C.pill};font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;color:${C.maroon};">${t(c.badge)}</span>
</td></tr>
<tr><td align="center" style="padding:18px 32px 0;">
<h1 style="margin:0;font-family:${SERIF};font-size:30px;line-height:1.2;font-weight:bold;color:${C.maroon};">${t(c.heading)}</h1>
</td></tr>
<tr><td style="padding:18px 32px 0;">${divider}</td></tr>
<tr><td style="padding:0 32px;">
<p style="margin:0 0 14px;font-family:${SANS};font-size:18px;font-weight:bold;color:${C.ink};">${t(c.greeting)}</p>
${c.paragraphs.map(p).join("\n")}
${event}
${button}
${after}
</td></tr>
<tr><td style="padding:0 32px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${C.line};padding-top:16px;text-align:center;">
<p style="margin:0 0 6px;font-family:${SERIF};font-size:15px;font-weight:bold;color:${C.maroon};">Pangat &mdash; a little more organised, so you can focus on celebrating.</p>
<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.soft};">${t(c.footnote)}</p>
</td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** The same card as plain text, for mail clients that don't show HTML. */
export function emailCardText(c: EmailCard): string {
  const lines = [c.greeting, "", ...c.paragraphs.flatMap((x) => [x, ""])];
  if (c.event) lines.push(c.event.name, `Your role: ${c.event.role}`, "");
  if (c.button) lines.push(`${c.button.label}: ${c.button.url}`, "");
  if (c.afterButton) lines.push(c.afterButton, "");
  lines.push("Pangat", c.footnote);
  return lines.join("\n");
}

/** The co-owner invitation: the same card whether Pangat or Supabase sends it. */
export function coOwnerInviteCard(v: {
  fullName: string;
  invitedBy: string;
  eventName: string;
  roleLabel: string;
  email: string;
  /** The sign-in link: Pangat's /auth/confirm?token_hash=…&type=invite. */
  url: string;
  siteUrl: string;
}): EmailCard {
  return {
    badge: "Co-owner invitation",
    heading: "An invitation to help bring everyone together",
    greeting: `Hi ${v.fullName},`,
    paragraphs: [
      `${v.invitedBy} has invited you to co-own ${v.eventName} on Pangat.`,
      "Pangat helps your family keep guest replies and the headcount in one place. Accept your invitation to get started.",
    ],
    event: { name: v.eventName, role: v.roleLabel },
    button: { label: "Accept invitation & set password", url: v.url },
    afterButton: `Already use Google? Sign in with Google using ${v.email}.`,
    footnote: `If you weren't expecting this invitation, check with ${v.invitedBy} before accepting.`,
    siteUrl: v.siteUrl,
  };
}
