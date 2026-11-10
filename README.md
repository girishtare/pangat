# Pangat

Know who is really coming. Guests reply through a personal link or QR code; the host sees a headcount per function.

Stage 1 of the v1 spec plus stage 2 item 1 (host sign-in), 10 November 2026. Live at https://pangat-tau.vercel.app (Vercel project `pangat`, functions in Mumbai `bom1`, next to the Supabase database), deployed on every push to `main`. It runs against Supabase with the sample wedding loaded. Project context for Claude Code is in `CLAUDE.md`.

## Run it

```
npm install
npm run dev
```

Open http://localhost:3000. With no `.env.local`, the app runs in **demo mode**: a sample wedding with eight households, held in memory and reset on restart. The home page links to each guest page and to the host dashboard.

Other commands: `npm test`, `npm run typecheck`, `npm run build`. Do not run these on the owner's Windows PC (see CLAUDE.md); GitHub Actions runs them on every push.

## What is built

- Guest flow at `/r/<token>`: "is this you?", reply per function (coming, headcount, vegetarian count, arrival), summary, change until the cut-off. Marathi and English.
- Host dashboard at `/host`: replies and expected headcount per function, split by side for hosts of both sides. With Supabase connected it needs sign-in at `/host/login` (email and password) and shows only the host's side, enforced by row-level security (`supabase/migrations/0002_host_access.sql`). In demo mode it is open.
- Guest list at `/host/guests` (signed-in hosts): paste rows from Google Sheets or Excel (or CSV), check them, then add. One row per household; header row with **Name** (required), Marathi name, Side, Mobile, Functions (blank = all), Cap. Mobiles are normalised to +91…; duplicates inside the paste and households already in the list are caught; a one-side host can only add to their side. "Add one household" uses the same checks. Each new household gets a token and a six-character short code.
- Forecast, validation, token and guest-list logic in `src/lib`, with tests in `tests`.
- Database schema in `supabase/migrations/0001_init.sql`.
- Supabase data layer in `src/lib/store/supabase.ts`.

## Not built yet

- Mark on behalf.
- Printable slips with QR codes and short codes.
- "Not us" mobile-number lookup and approval queue.
- WhatsApp nudge links.

## Not yet verified

- Host sign-in and the guest flow on the live site against Supabase. (The access rules themselves were tested in the database on 10 Nov: see CLAUDE.md.)
- The Marathi wording in `src/lib/i18n.ts`. Have a native reader check it before guests see it.

## Connecting Supabase

1. Create a project. In the SQL editor run `supabase/migrations/0001_init.sql`, then `0002_host_access.sql`, `0003_advisor_fixes.sql` and `0004_import_households.sql`. For testing only, `supabase/seed/demo_wedding.sql` loads the sample wedding; re-running it clears all replies but keeps host links.
2. Authentication → Sign In / Providers: keep Email on, turn **off** "Allow new users to sign up". Hosts never sign themselves up.
3. Set these in Vercel (Project → Settings → Environment Variables, Production), then redeploy:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the publishable (anon) key. Used only for host sessions; row-level security applies.
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret key. Mark it **Sensitive**. Server-only; bypasses row-level security.
   - `PANGAT_EVENT_SLUG`: slug of the event the host dashboard shows (defaults to `demo-wedding`).

   Leave both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` unset to run in demo mode. None of these use the `NEXT_PUBLIC_` prefix: no browser code talks to Supabase.

## Adding a host

1. Supabase → Authentication → Users → Add user: their email and a password, with "Auto confirm" on. Give them the password in person or by phone.
2. In the SQL editor, link them to the event and a side (`'bride'`, `'groom'`, or `null` for both):

```sql
insert into hosts (event_id, user_id, side)
select e.id, u.id, 'bride'
from events e, auth.users u
where e.slug = 'demo-wedding' and u.email = 'host@example.com';
```

A signed-in user without a `hosts` row sees a "not a host of this event" message and no data.

QR codes on printed slips should point at `/r/<token>?s=q` so replies record which channel was used.
