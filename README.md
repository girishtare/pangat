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
- **Accounts**: anyone can sign up at `/host/signup` with Google or email and password (confirmed by email), and reset a forgotten password at `/host/forgot`. Email links land on `/auth/confirm`, Google on `/auth/callback`. One-time Supabase, Gmail (email sending) and Google setup: `docs/auth-setup.md`.
- **Owner and co-owners**: whoever creates an event owns it (settings, functions, caterer numbers, co-owners). The owner invites up to 3 co-owners per side by email; a co-owner sees and works on their side only. Enforced in the database (migration 0009).
- Host area at `/host`: a signed-in host's events (straight into the event if there is only one) and **Create an event** (`/host/new`): name, wedding date, optional reply cut-off (default 15 days before). A new event starts with Haldi (day before, 10 am), Wedding (11:30 am) and Reception (7 pm).
- Each event at `/host/e/<event>`: **Dashboard**, **Guest list** and, for hosts of both sides, **Event settings**: event name and cut-off, show rates, functions (rename, re-time, venue, map link, food yes/no, delete unless someone has replied, add e.g. Sangeet and optionally invite every household), and hosts (add by email with side and a starting password, remove).
- Guest list at `/host/e/<event>/guests`: download the event's **Excel template** (dropdowns for Side and Functions, Mobile kept as text, a "How to fill" sheet), fill it in Excel or Google Sheets, and upload it (`.xlsx` or `.csv`); or paste cells. Pangat checks every row, then adds. One row per household; header row with **Name** (required), Marathi name, Side, Mobile, Functions (blank = all), Cap. Mobiles are normalised to +91…; duplicates inside the paste and households already in the list are caught; a one-side host can only add to their side. "Add one household" uses the same checks. Each new household gets a token and a six-character short code.
- Household page (`/host/e/<event>/guests/<id>`, from the guest list or its search by name, mobile or code): record a reply taken by phone or in person (source `on_behalf`, signed with the host; works after the cut-off), edit details and invitations (functions already replied to can't be removed), delete if no reply, copy the guest's link.
- **Slips** tab: A4 sheets of 8 slips (about 97 × 70 mm, dashed cut lines): family name in Marathi and English, QR to `/r/<token>?s=q`, short code, reply-by date, and "no smartphone? call <number> and give your code" using the side's contact number from Event settings. Filter by side or "added on or after"; one slip from a household page. QR codes point at `PANGAT_PUBLIC_URL`, else Vercel's production domain.
- **WhatsApp** tab: per household, a button that opens WhatsApp (wa.me) with the invitation or reminder text and their own link filled in; each tap is recorded (`nudges`). Hosts of both sides can edit both texts (placeholders such as {name}, {link}). Also an **effort log** (minutes and calls spent chasing) for the review. Dashboard visits are recorded per host and shown in Event settings.
- **"Not us"**: a guest who opens a link that isn't theirs leaves their mobile; the guest is told nothing about matches. The request appears on the Guest list (and a banner on the Dashboard) for hosts of that side: send the matched household its own link on WhatsApp in one tap, or dismiss. At most 5 requests per link per day. Migration 0008.
- The guest page remembers English or Marathi on that phone (cookie `pangat_lang`).
- **Caterer numbers** tab (hosts of both sides): the family's baseline per function, a button to freeze the tool's expected headcount and veg/non-veg split (for 14 December), the number for the caterer (the higher of the two), actual counts on the day, and which number came closer. Migration 0006 (`function_numbers`).
- Forecast, validation, token, guest-list and pilot logic in `src/lib`, with tests in `tests`.
- Database schema in `supabase/migrations/0001_init.sql`.
- Supabase data layer in `src/lib/store/supabase.ts`.

## Not built yet

- Nothing from the v1 scope. See CLAUDE.md for what is still unverified.

## Not yet verified

- Host sign-in and the guest flow on the live site against Supabase. (The access rules themselves were tested in the database on 10 Nov: see CLAUDE.md.)
- The Marathi wording in `src/lib/i18n.ts`. Have a native reader check it before guests see it.

## Connecting Supabase

1. Create a project. In the SQL editor run `supabase/migrations/0001_init.sql`, then `0002_host_access.sql`, `0003_advisor_fixes.sql`, `0004_import_households.sql`, `0005_event_setup.sql`, `0006_pilot_numbers.sql`, `0007_slips_whatsapp_evidence.sql`, `0008_lookup_requests.sql` and `0009_roles_and_event_kind.sql`. For testing only, `supabase/seed/demo_wedding.sql` loads the sample wedding; re-running it clears all replies but keeps host links.
2. Authentication → Sign In / Providers: keep Email on, turn **off** "Allow new users to sign up". Hosts never sign themselves up.
3. Set these in Vercel (Project → Settings → Environment Variables, Production), then redeploy:
   - `SUPABASE_URL`: the project URL.
   - `SUPABASE_PUBLISHABLE_KEY`: the publishable (anon) key. Used only for host sessions; row-level security applies.
   - `SUPABASE_SERVICE_ROLE_KEY`: the secret key. Mark it **Sensitive**. Server-only; bypasses row-level security.

   Leave both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` unset to run in demo mode. None of these use the `NEXT_PUBLIC_` prefix: no browser code talks to Supabase.

## Adding a co-owner

The event's owner opens **Event settings → Owner and co-owners**, enters the person's email and side. If they already have a Pangat account they are added at once; otherwise they get an invitation email (or can sign in with Google using that address). Up to 3 per side.

