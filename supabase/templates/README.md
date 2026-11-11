# Supabase email templates

Supabase sends the sign-in emails (invitation, confirm signup, reset password).
Their look is set in the Supabase dashboard, not in code. These files are the
source for what goes there.

## Invite user (co-owner invitation)

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
