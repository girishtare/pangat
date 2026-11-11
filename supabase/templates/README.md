# Supabase email templates

Supabase sends the sign-in emails (invitation, confirm signup, reset password).
Their look is set in the Supabase dashboard, not in code. These files are the
source for what goes there.

## Invite user (co-owner invitation)

Pangat normally sends the invitation itself, in its own design: Supabase makes
the sign-in link (no email) and Pangat emails it through Gmail
(`SMTP_USER`/`SMTP_PASS`). Supabase's own invitation email, with this template,
is only the fallback: when Pangat's email isn't set up or fails. Paste it anyway
so the fallback looks the same and its link goes through `/auth/confirm`.

`invite.html` is generated from Pangat's email design (`src/lib/emailDesign.ts`):

    node scripts/build-email-templates.ts

To use it:

1. Supabase dashboard → project **pangat** → **Authentication** → **Emails** → **Invite user**.
2. **Subject:** `Your Pangat co-owner invitation`
3. **Body:** select all, delete, and paste the whole of `invite.html`.
4. **Save**.

Pangat fills these when it sends an invitation (`sendInvite` in `src/lib/store/admin.ts`):
`.Data.full_name`, `.Data.invited_by`, `.Data.event_name`, `.Data.role_label`.
Each has a fallback in the template, so an invitation sent another way still reads well.
