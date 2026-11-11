// Writes Supabase's "Invite user" email template from Pangat's email design,
// so the invitation looks like Pangat's own emails.
//   node scripts/build-email-templates.ts
// Then paste supabase/templates/invite.html into Supabase: Authentication →
// Emails → Invite user (the subject is in supabase/templates/README.md).
// Placeholders are Supabase's Go template fields; Pangat fills .Data when it
// sends the invitation (src/lib/store/admin.ts, sendInvite).
import { writeFileSync } from "node:fs";
import { emailCardHtml } from "../src/lib/emailDesign.ts";

const or = (field: string, fallback: string) => `{{ if .Data.${field} }}{{ .Data.${field} }}{{ else }}${fallback}{{ end }}`;

const html = emailCardHtml(
  {
    badge: "Co-owner invitation",
    heading: "An invitation to help bring everyone together",
    greeting: `Hi ${or("full_name", "there")},`,
    paragraphs: [
      `${or("invited_by", "The family")} has invited you to co-own ${or("event_name", "an event")} on Pangat.`,
      "Pangat helps your family keep guest replies and the headcount in one place. Accept your invitation to get started.",
    ],
    event: { name: or("event_name", "Your event"), role: or("role_label", "Co-owner") },
    button: { label: "Accept invitation & set password", url: "{{ .ConfirmationURL }}" },
    afterButton: "Already use Google? Sign in with Google using {{ .Email }}.",
    footnote: `If you weren't expecting this invitation, check with ${or("invited_by", "the family")} before accepting.`,
    siteUrl: "{{ .SiteURL }}",
  },
  true,
);

writeFileSync(new URL("../supabase/templates/invite.html", import.meta.url), html);
console.log("wrote supabase/templates/invite.html");
