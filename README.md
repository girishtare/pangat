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
- Host area at `/host`: a signed-in host's events (straight into the event if there is only one) and **Create an event** (`/host/new`): name, wedding date, optional reply cut-off (default 15 days before). A new event starts with Haldi (day before, 10 am), Wedding (11:30 am) and Reception (7 pm).
- Each event at `/host/e/<event>`: **Dashboard**, **Guest list** and, for hosts of both sides, **Event settings**: event name and cut-off, show rates, functions (rename, re-time, venue, map link, food yes/no, delete unless someone has replied, add e.g. Sangeet and optionally invite every household), and hosts (add by email with side and a starting password, remove).
- Guest list at `/host/e/<event>/guests`: download the event's **Excel template** (dropdowns for Side and Functions, Mobile kept as text, a "How to fill" sheet), fill it in Excel or Google Sheets, and upload it (`.xlsx` or `.csv`); or paste cells. Pangat checks every row, then adds. One row per household; header row with **Name** (required), Marathi name, Side, Mobile, Functions (blank = all), Cap. Mobiles are normalised to +91…; duplicates inside the paste and households already in the list are caught; a one-side host can only add to their side. "Add one household" uses the same checks. Each new household gets a token and a six-character short code.
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

1. Create a project. In the SQL editor run `supabase/migrations/0001_init.sql`, then `0002_host_access.sql`, `0003_advisor_fixes.sql`, `0004_import_households.sql` and `0005_event_setup.sql`. For testing only, `supabase/seed/demo_wedding.sql` loads the sample wedding; re-running it clears all replies but keeps host links.
2. Authentication → Sign In / Providers: keep Email on, turn **off** "Allow new users to sign up". Hosts never sign themselves up.
3. Set these in Vercel (Project → Settings → Environment Variables, Production), then redeploy:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the publishable (anon) key. Used only for host sessions; row-level security applies.
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret key. Mark it **Sensitive**. Server-only; bypasses row-level security.

   Leave both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` unset to run in demo mode. None of these use the `NEXT_PUBLIC_` prefix: no browser code talks to Supabase.

## Adding a host

On the event's **Event settings** page (hosts of both sides): email, side, and a starting password if they don't have a Pangat sign-in yet. Give them the password in person or by phone. A one-side host sees and adds guests only for that side.

The very first account has to be created in Supabase (Authentication → Users → Add user, Auto confirm on); after that, everything is on the page.

QR codes on printed slips should point at `/r/<token>?s=q` so replies record which channel was used.
