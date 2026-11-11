// Writes Supabase's "Invite user" email template from Pangat's email design.
// Pangat normally sends invitations itself (src/lib/store/admin.ts, sendInvite);
// Supabase's email, with this template, is the fallback when Pangat's email
// isn't set up or fails.
//   node scripts/build-email-templates.ts
// Then paste supabase/templates/invite.html into Supabase: Authentication →
// Emails → Invite user (the subject is in supabase/templates/README.md).
// Placeholders are Supabase's Go template fields; Pangat fills .Data when it
// sends the invitation (src/lib/store/admin.ts, sendInvite).
import { writeFileSync } from "node:fs";
import { coOwnerInviteCard, emailCardHtml } from "../src/lib/emailDesign.ts";

const or = (field: string, fallback: string) => `{{ if .Data.${field} }}{{ .Data.${field} }}{{ else }}${fallback}{{ end }}`;

// Pangat's own link (src/app/auth/confirm): it verifies on the server, so it
// works even when the email is opened in another browser or app.
const html = emailCardHtml(
  coOwnerInviteCard({
    fullName: or("full_name", "there"),
    invitedBy: or("invited_by", "The family"),
    eventName: or("event_name", "an event"),
    roleLabel: or("role_label", "Co-owner"),
    email: "{{ .Email }}",
    url: "{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite",
    siteUrl: "{{ .SiteURL }}",
  }),
  true,
);

writeFileSync(new URL("../supabase/templates/invite.html", import.meta.url), html);
console.log("wrote supabase/templates/invite.html");
