# Sign-up setup (Supabase, Google, Resend)

Pangat's code for sign-up is in place; these settings live outside the code
and must be done once, by the owner. Project: Supabase `pangat`
(ref `sibsiwicyoawdysgqeft`). Site: https://pangat-tau.vercel.app

## 1. Supabase: allow sign-ups and set the site address

Authentication → Sign In / Providers → Email:
- **Allow new users to sign up**: on
- **Confirm email**: on

Authentication → URL Configuration:
- **Site URL**: `https://pangat-tau.vercel.app`
- **Redirect URLs**: add `https://pangat-tau.vercel.app/**`

## 2. Email sending through Resend

Supabase's own mailer only reaches members of your Supabase team, about two
emails an hour. Real users need a sending service.

1. Create an account at resend.com.
2. Domains → Add domain. This needs a domain you own (for example
   `pangat.in`); add the DNS records Resend shows, at your domain registrar.
   Without your own domain, Resend only delivers to your own address.
3. API Keys → Create API key (sending access).
4. Supabase → Authentication → Emails → SMTP Settings → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`
   - Username `resend`, password: the API key
   - Sender email: e.g. `noreply@<your domain>`, sender name `Pangat`
5. Authentication → Rate Limits: raise "emails sent per hour" (e.g. 100).

## 3. Email templates (links that work on phones)

Authentication → Emails → Templates. Replace the link in each with these, so
the link is checked on Pangat's server (works even when the email opens in a
different app from the one used to sign up):

**Confirm signup**
```html
<h2>Confirm your Pangat account</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/host">Confirm my email</a></p>
```

**Invite user** (co-owners)
```html
<h2>You've been added to an event on Pangat</h2>
<p>You are now a co-owner. Set your password to start:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept and set a password</a></p>
<p>Or sign in with Google using this email address.</p>
```

**Reset password**
```html
<h2>Choose a new Pangat password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>
```

## 4. Google sign-in

1. Google Cloud Console → create a project (e.g. "Pangat").
2. APIs & Services → OAuth consent screen: External; app name Pangat; your
   support email; add the domain if you have one. Publish the app (otherwise
   only test users can sign in).
3. Credentials → Create credentials → OAuth client ID → Web application:
   - Authorised redirect URI:
     `https://sibsiwicyoawdysgqeft.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client secret.
5. Supabase → Authentication → Sign In / Providers → Google: enable, paste
   them, save.

## 5. Before charging anyone

- Vercel's free (Hobby) plan is for non-commercial use: move to Pro first.
- Supabase's free plan pauses after a week without activity: consider Pro.
- Phone-number sign-up needs an SMS provider and Indian DLT registration
  (sender ID and templates); not built yet.
