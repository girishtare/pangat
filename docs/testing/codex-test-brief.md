# Pangat: testing brief for Codex

Written 12 November 2026. This is a guide to what has been built so you can test all of it thoroughly. **`CLAUDE.md` is the source of truth.** `README.md` is out of date in places (see "Docs known to be stale" at the end).

## 1. What Pangat is

Pangat is a web app that tells a wedding host how many guests are really coming, per function (Haldi, Wedding, Reception and so on), split into veg and non-veg.

How guests and hosts use it:
- Each invited **household** gets a personal link. Guests reach it by QR code on a printed slip, by WhatsApp message, or by a six-character code read out on the phone to a host.
- Guests reply with no account: coming yes or no per function, how many people, how many of them vegetarian, and roughly when they'll arrive.
- **Hosts** sign in and get a dashboard, guest-list management, printable slips, WhatsApp nudges, a to-do list and a record of caterer numbers.

**Pilot:** a real family wedding on **28 December 2026**, about 400 households on the bride's and groom's sides. The live event is in production now with about 100+ bride-side households.

**Do not touch the live event.** Its slug is `manali-and-anish-wedding-jhie`. Never write to it, reply on its guests' links, or change its settings. See section 9 for how to get safe test data.

## 2. Stack and how it runs

| Part | Detail |
|---|---|
| App | Next.js 16.4.6 App Router, React 19, Tailwind v4, TypeScript, zod 4 |
| Data | Supabase (Postgres plus Auth plus Storage). Project ref `sibsiwicyoawdysgqeft`, Mumbai, Free plan |
| Hosting | Vercel, production https://pangat-tau.vercel.app. Functions run in Mumbai (`bom1`, set in `vercel.json`). Every push to `main` deploys to production |
| CI | GitHub Actions runs `npm run typecheck`, `npm test` (vitest) and `npm run build` |
| Tests | `tests/*.test.ts`: unit tests for the pure logic in `src/lib` |
| Other libraries | exceljs (writes the template), read-excel-file (reads uploads), uqr (QR codes), nodemailer (Gmail SMTP), lucide-react |

**Owner's PC:** do not run `npm install` or builds on it. Windows Smart App Control blocks new native npm binaries. Run in your own sandbox, or rely on CI.

**Demo mode:** with no Supabase environment variables, the app uses an in-memory store (`src/lib/store/demo.ts`). That gives a sample wedding with eight households, no sign-in, and data that resets on restart. Most host features need Supabase. Demo mode covers mainly the guest flow and the dashboard.

**Environment variables:**
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret)
- optional `SMTP_USER` and `SMTP_PASS`
- optional `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`
- optional `PANGAT_PUBLIC_URL`

None of them has the `NEXT_PUBLIC_` prefix.

## 3. Security model (test this hard)

- **Guests never reach the database directly.** Guest pages and actions run on the server with the service-role key and look a household up only by its token. RLS is on, with **no anonymous policies**.
- **Tokens** are 22 URL-safe characters (128 bits). `isPlausibleToken` accepts `^[A-Za-z0-9_-]{8,64}$`. An unknown token shows a bilingual "link isn't valid" page.
- **Short codes** are 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, with no I, L, O, 0 or 1. Only a signed-in host can look one up, through Guest list search. There is no public code entry.
- **Hosts** read through their own session (publishable key), so RLS limits each host to their events and side. The `authenticated` role has **read-only** policies and no write grants. Every write is a server action using the service-role key, after a server-side check of role and side. Policy helpers live in the unexposed `private` schema.
- **Roles per event:**
  - **Owner**: the creator. Sees both sides and does everything.
  - **Co-owners**: up to 3 per side. A co-owner can cover both sides, and then counts against each side. Co-owners see and change their own side only. Owner-only areas:
    - Caterer numbers. Migration 0017 also blocks it at database level.
    - Event settings changes.
    - Co-owner management.
    - Deleting the event.
- `src/proxy.ts` refreshes the Supabase session on `/host/*` with `getUser()`. Pages use `getClaims()`, which checks the ES256 token locally, through `signedInUser` and `hostGate` in `src/lib/host.ts`, both wrapped in React `cache()`.
- `safeNext()` (`src/lib/auth.ts`) accepts only paths on this site after sign-in. Test it with `//evil.example`, `javascript:`, absolute URLs and encoded variants.
- **"Not us" requests** never reveal whether a mobile matched a household. The limit is 5 requests per link per day.
- **Invitation card PDFs** are in a private Storage bucket, `cards`. A guest gets a signed URL valid for 1 hour through `/r/<token>/card?l=en|mr`, and only their household's side. Hosts upload through a one-time signed upload link, 20 MB maximum.

**Attacks worth trying:**
- A one-side co-owner calling server actions for a household or task on the other side, with forged IDs.
- A co-owner calling owner-only actions:
  - `saveEvent`, `inviteHost`, `dropHost`, `removeEvent`, `freezePredicted`, `saveBaselines`
  - card upload actions
- A signed-in user who is not a host of the event.
- Reading or writing tables directly through the Supabase REST API with the publishable key, both anonymous and authenticated.
- Token enumeration and timing on `/r/<token>`.
- Card route access for another side's PDF.
- Over-long or odd input on every form: zod limits, Marathi text, emoji, HTML or script in names, notes and WhatsApp texts.
- CSV or formula injection in the Excel template and upload.

## 4. Routes

| Route | Who | What |
|---|---|---|
| `/` | public | Landing page |
| `/r/<token>` | guest | Reply page. Also takes `?s=q` (came by QR), `?l=en\|mr` (open in that language) |
| `/r/<token>/card?l=en\|mr` | guest | Redirects to a signed URL for the household side's invitation PDF |
| `/host/login`, `/host/signup`, `/host/forgot`, `/host/account/password` | anyone | Account pages: Google or email and password. Minimum password length is 10 |
| `/auth/confirm`, `/auth/callback` | - | Email-link landing (types email, invite, recovery, email_change) and Google OAuth callback |
| `/host` | host | Your events. With exactly one event it goes straight into it. `?all=1` always lists them |
| `/host/new` | signed in | Create an event. Wedding only; starts with Haldi (day before, 10:00 am), Wedding (11:30 am), Reception (7:00 pm); cut-off defaults to 15 days before |
| `/host/e/<slug>` | host | Dashboard. `?side=both\|bride\|groom` for the owner |
| `/host/e/<slug>/guests` | host | Guest list. `?q=`, `?sort=name\|side\|mobile\|location\|code\|invited\|replied\|cap`, `?dir=asc\|desc`, `?page=`. Default sort is name A to Z |
| `/host/e/<slug>/guests/template` | host | Downloads the event's Excel template |
| `/host/e/<slug>/guests/<id>` | host | Household page: record a reply on their behalf, edit, delete, copy link, one slip |
| `/host/e/<slug>/slips` | host | Language of each slip, and Print slips (8 per A4) |
| `/host/e/<slug>/whatsapp` | host | Distribution list, message texts, effort log |
| `/host/e/<slug>/todo` | host | People helping and tasks |
| `/host/e/<slug>/numbers` | owner | Caterer numbers (pilot record) |
| `/host/e/<slug>/settings` | host (edits: owner) | Event details, functions, owner and co-owners, card PDFs, delete event |

## 5. Features and the rules to verify

### 5.1 Guest reply (`src/app/r/[token]/`, `src/lib/validate.ts`)

**The flow:**
1. "Is this you?" ("This isn't us" leads to the mobile form).
2. A reply per invited function: coming yes or no; if yes, people, vegetarian count and arrival (early, on time or late).
3. A summary.
4. The guest can change the reply until the event cut-off.

**Language:**
- English or Marathi, remembered in the `pangat_lang` cookie.
- `?l=` from a one-language slip applies only if the guest hasn't chosen a language before.
- Marathi uses 0-9 digits, and times read "10:00 am" in both languages.

**Validation:**
- Heads are 1 to `MAX_HEADS` (30) when coming.
- Veg can't exceed heads.
- At most 20 answers.
- Every invited function must be answered exactly once. An unknown or duplicate function ID is rejected.
- After the cut-off a guest gets "closed". Hosts can still record replies on their behalf.

**Food per function** (`functions.catered`, `functions.veg_only`):
- **No food:** veg and non-veg are stored as 0, and the diet question is hidden.
- **Veg only:** the veg question is hidden, and everyone counts as veg, even for older replies.

**Sources:** `qr` when `?s=q` is present, otherwise `link`. Host replies are `on_behalf`.

**Change detection** (`src/lib/store/changed.ts`, `replyChanged`):
- Only replies that actually changed are written.
- Re-sending an unchanged reply adds no `response_history` row.
- A host correcting one function doesn't turn the guest's other replies into "on behalf".

**Layout:**
- On the summary, function names wrap whole, never mid-word.
- The veg and non-veg split sits on the same line as the date and time.

**Soft cap:** a household's cap never stops a guest replying with more people.

### 5.2 "Not us" (`reportNotUs`, `src/lib/lookup.ts`, migration 0008)

**The guest side:**
- The guest enters a mobile. It's normalised to +91, and an invalid one gives `bad_mobile`.
- The answer is the same whether or not a household matched.
- Limit: 5 per link per day.

**The host side:**
- The request shows in a queue on the Guest list and as a banner on the Dashboard.
- Each request has a one-tap WhatsApp send of the matched household's own link, or Dismiss.

**Visibility:**
- A one-side host sees a request if the opened link or the matched household is on their side.
- The other side's household details stay hidden (`canSeeLookup` and `canNameMatch`).

### 5.3 Dashboard (`src/app/host/Dashboard.tsx`, `src/lib/forecast.ts`)

**Per function, in two groups:**
- **Cards (households):** Invited, Yes, No, Waiting, Replied.
- **People:** Invited, Confirmed, Veg, Non-veg, Expected.

**Forecast:**
- `expected = confirmed heads × yesShowRate + pending people × pendingShowRate`.
- A pending card's people = its cap. With no cap, it's the function's average heads per "yes".
- The rates are stored per event, with defaults of 0.90 and 0.40. The owner has chosen to keep 0.40.

**Side scoping** (`src/lib/sides.ts`):
- The owner sees Both, then each side.
- A co-owner sees only their side.
- The owner can switch with `?side=`.

**Also:**
- "N people invited" on the cards, plus a count of cards with no cap.
- Dashboard visits are recorded per host for the review.

Verify the numbers by hand against the database for a mix of these cases:
- yes, no and pending replies
- cap and no cap
- veg-only and no-food functions

### 5.4 Guest list (`src/app/host/e/[slug]/guests/`, `src/lib/guestlist.ts`, `src/lib/template.ts`)

**Adding households:**
- **Add a household** opens a pop-up. **Import from Excel** does too: upload `.xlsx` or `.csv`, or paste cells.
- Every row goes through a check step that shows problems before saving. The save uses the atomic `import_households` RPC, which only the service role can call.

**Excel template:**
- It's built per event, so its columns follow that event's functions.
- Columns: Name (required), Marathi name, Side, Mobile (kept as text), Location, **one Yes/blank column per function** (headed with the function's name; at least one Yes per household; no "all"), Cap, Comments / Notes.
- A "How to fill" sheet, and dropdowns for Side and Yes/blank.
- Only the "Guests" sheet is read.
- Older formats still import: a single "Functions" column (comma list; blank or "all" = every function).
- A Yes/No column whose header isn't a current function gives a sheet-level problem. This catches renamed functions.

**Normalising and limits:**
- Mobiles are normalised to +91.
- Location: 80 characters at most. Notes: 500.

**Duplicates** (`sameHousehold`):
- **Same side and same mobile** is the same household.
- **Same side and same name** is the same household only when neither mobile nor location tells them apart. A blank doesn't count as different.
- Duplicates are caught both within the paste and against existing households.

**One-side hosts:** a one-side co-owner can only add to their own side.

**List:**
- 50 a page, with Previous and Next above and below.
- Every column sorts, with blanks last.
- On phones a Sort by menu replaces the clickable headers.

**Search** (`LiveSearch`):
- It updates `?q=` 250 ms after typing stops and works as a plain form without JavaScript.
- It matches name (English or Marathi), place, notes, mobile and code.
- A new search goes back to page 1.

**Flags and counts:**
- Households over their cap are flagged ("N replied"), and an "over their cap" card links to `?sort=cap&dir=desc`.
- Count cards turn into an all-clear ("All N have a Marathi name") when nothing is missing.

**Household page:**
- Record a reply on their behalf.
- Edit details and invitations. A function that has already been replied to can't be removed.
- Delete, only if there is no reply.
- Copy the guest link.

### 5.5 Slips (`src/app/host/e/[slug]/slips/`)

**Language of each slip tab:**
- Set per household or for ticked households: English, Marathi or Both (`households.slip_lang`, default Both).
- Search by name or place, and filter by language.
- A Location column appears from 640 px; on phones it shows under the name.

**Print slips tab:**
- 8 per A4. The print geometry is 194 × 281 mm.
- The screen shows one A4 sheet at a time, with Previous and Next and "Sheet 2 of 9 · slips 9–16 of 72".
- A search starts again at sheet 1.

**What each slip shows:**
- Household name.
- QR code to `/r/<token>?s=q`, plus `&l=` for one-language slips.
- Short code.
- Reply-by date, written "24th December 2026".
- The side's contact number for "no smartphone? call …".
- With Both, Marathi lines come first, then English.

**QR codes:**
- They are drawn in the browser (`src/app/ui/QrCode.tsx`).
- The print copy of every ticked slip is built only when printing starts: `beforeprint` plus `flushSync`, which also covers Ctrl+P.
- The owner printed a sheet and the codes scan correctly.

**To test:**
- Every ticked slip prints, not just the visible sheet.
- Printing with nothing ticked.
- Odd counts, for example 9 slips.
- Very long names in both scripts.
- Each QR code decodes to the right household's link.

### 5.6 WhatsApp (`src/app/host/e/[slug]/whatsapp/`, `src/lib/outreach.ts`)

**Distribution list:**
- Pending households, 50 a page on the client.
- Ticks and "Tick all" cover every page and act on the households shown.
- The search filters on the client: name (English or Marathi), place, code and mobile digits.

**Sending:**
- The send button opens `https://wa.me/<number>?text=…`, prefilled with the invitation or reminder text.
- Each send is recorded in `nudges`.

**Message texts:**
- They are editable.
- Placeholders: `{name_en} {name_mr} {event_en} {event_mr} {date_en} {date_mr} {phone} {link}`. The old forms `{name} {event} {date}` still work.

**Card link:** the message carries the household's card link in its slip language.

**Effort log:** minutes and calls spent chasing replies, for the review.

**To test:**
- Encoding of Marathi text and line breaks in the wa.me URL.
- Households with no mobile.
- A placeholder used twice or misspelt.

### 5.7 To-do (`src/app/host/e/[slug]/todo/`, `src/lib/todo.ts`, migrations 0011 and 0012)

**People helping:**
- Full name, mobile and side. They never sign in.
- The owner and co-owners are added automatically by a trigger that keeps them in step with `hosts`. The owner appears as "Both sides".
- A co-owner who still has tasks can't be removed until those tasks are reassigned.

**Tasks:**
- Title, note, optional function, deadline, and status (to do, in progress or done).
- Overdue is worked out in IST.
- A WhatsApp button sends a task to its person.

**Who sees what:**
- The owner sees both sides; a co-owner sees only theirs.
- This uses RLS on read and a side check on every write.

**Search:** it matches task, note, person and function. It sits on the side-filter row.

### 5.8 Caterer numbers (owner only; `src/app/host/e/[slug]/numbers/`, `src/lib/pilot.ts`, migrations 0006, 0010 and 0017)

**What's on the tab, per function:**
- **Family's guess** (the baseline). The code and database call it `baseline`.
- **Freeze:** snapshots Pangat's expected headcount and its veg/non-veg split as the first count. The pilot is judged on this number.
- **Freeze revised:** a later revised count. It's refused until a first freeze exists.
- **To the caterer:** the higher of the baseline and the latest frozen number (the revised one if there is one).
- **Actual counts on the day:** the total only for veg-only functions.
- **Verdict:** whichever was closer to the actual count, Pangat's number or the family's guess, or a tie. The verdict card goes first once actual counts exist.

**Caterer dates** are set in Event settings. The first count is due 20 Dec, and the last change is 25 Dec. The live event currently says 24 Dec, which needs fixing.

**Questions to answer:**
- Can `freezePredicted` be run twice? It overwrites the first freeze; there is no guard. Is that acceptable for the pilot record?
- What does `readCount` do with blank, negative, decimal or huge input?

### 5.9 Event settings (`src/app/host/e/[slug]/settings/`)

**Event details:**
- English and Marathi names, cut-off, show rates, side contact numbers, caterer due and final dates.
- Four invitation PDFs: bride's and groom's side, each in English and Marathi.
- Delete the event: a warning, then a 5-second countdown that Cancel or Escape stops. Everything in the event is deleted in one statement, but people's accounts stay.

**Functions:**
- Add, rename, re-time, venue and map link.
- Food: veg and non-veg, veg only, or no food.
- Delete a function, unless someone has replied to it.
- A new function can optionally invite every household.

**Owner and co-owners:**
- Invite by name, email, mobile and side.
- A new person gets Supabase's invitation email. Someone who already has an account is added at once and gets a Pangat email.
- Edit, Send again and Remove.
- Remove deletes the account only if the person hosts nothing else and nothing they recorded points at the account.

### 5.10 Suggest Marathi (`src/app/ui/MarathiInput.tsx`, `src/lib/suggest.ts`, `src/lib/marathi.ts`)

**Where and how it works:**
- A Suggest button sits next to every Marathi name field: event, functions, and household add and edit.
- It reads the English field from the same form and asks Gemini (`gemini-3.8-flash`, low thinking). It falls back to Claude if only `ANTHROPIC_API_KEY` is set.
- It fills the field. Nothing is saved until the host saves, and Undo restores the old value.
- Signed-in hosts only.

**Rules** (`SUGGEST_SYSTEM`):
- Keep every name and add nothing.
- Honorifics are kept.
- "Late" becomes स्वर्गीय.
- "and family" becomes सहपरिवार, with no आणि.
- Tare is written तरे, not तारे.
- The output must be Devanagari only (`cleanSuggestion`).

**To test:**
- Empty English.
- Over 200 characters.
- Prompt-injection text in the English field.
- The API being down.

### 5.11 Accounts and emails

**Sign-up and sign-in:**
- Open sign-up with Google, or with email and password confirmed by email (Gmail SMTP).
- Password reset.
- Minimum password length is 10.
- Google sign-in links to an existing email account with the same address.

**Emails:**
- All emails share one design (`src/lib/emailDesign.ts`).
- Supabase's invitation template is in `supabase/templates/invite.html`.

**Choose a password page:** names the event and side when the person co-owns exactly one event.

## 6. UI rules to check

**Palette:**
- Maroon, sand, cream and dusty blue only, with no yellow. The one exception is the logo's saffron dot.
- `haldi` `#aec4d4` is never used for text.
- Focus ring: `3px solid #4f6b80`.

**Fonts and sizes:**
- English: IBM Plex Sans for text and Space Grotesk 600 for headings.
- Marathi: Noto Sans for text and Noto Sans Devanagari for headings.
- Host pages have a 15 px body. The guest page is 17 px.
- Inputs are 16 px on phones, so iOS doesn't zoom.

**Times:** always hh:mm am/pm.

**Responsive:**
- No sideways scroll at 360 px.
- Reviewed at 1440×900, 1366×768, 390 and 360.
- On phones, tables become stacked cards or scroll inside their box.

**Forms:**
- Typed forms use `useFormAction`, so a validation error keeps what was typed.
- Navigation links show a spinner while the next page loads (`NavPending`).

**Accessibility:**
- Labels, `role="alert"` on errors, and `aria-sort` on sortable headers.
- Keyboard use of the pop-ups (`<dialog>`).
- Escape cancels the delete countdown.

## 7. Database (`supabase/migrations/0001`–`0020`)

**Main tables:**
- `events` (with `kind`)
- `functions` (`catered`, `veg_only`, `sort_order`)
- `households` (`token`, `short_code`, `side`, `mobile`, `soft_cap`, `slip_lang`, `location`, `notes`)
- `invites` (household × function)
- `responses` and `response_history` (history cascades with the household, migration 0018)
- `hosts` (role and side)
- `lookup_requests`
- `function_numbers`
- `nudges`, `effort_log`, `dashboard_views`
- `helpers`, `tasks`

**RPC:** `import_households` (service role only).

**Storage:** bucket `cards` (private).

**Things to check:**
- Run the Supabase security advisor; it should be clean.
- RLS for each role: anonymous, signed in but not a host, one-side co-owner, both-sides co-owner, owner.
- Cascades on deleting an event and deleting a household.

## 8. Existing automated tests

`tests/` covers:
- auth (`safeNext`, password rules)
- events (dates and slugs)
- forecast
- guestSort
- guestlist (parsing, duplicates, templates)
- lookup visibility
- the Marathi cleaner
- outreach (placeholders, wa.me links)
- pilot (to-caterer, verdict)
- sides
- template
- text
- todo
- token
- validate
- when (time formatting)

**Not covered:**
- Server actions
- RLS
- Pages and components
- Excel round-trip with real files
- Printing
- End-to-end flows

Integration and end-to-end tests (for example Playwright against a local build with a Supabase branch or a local Supabase) would be the biggest gain.

## 9. Test data and rules of engagement

**Production database:**
- It holds the real wedding.
- Work on a **separate Supabase project or branch**, or a local Supabase, with migrations 0001–0020 applied and `supabase/seed/demo_wedding.sql` loaded.
- That seed creates a `demo-wedding` event with sample households and replies. Re-running it clears replies but keeps host links.

**If you must use the live site:**
- Create a throwaway event of your own through `/host/new`, and delete it afterwards.
- Never reply on real guests' links.
- Never send WhatsApp messages or emails to real people.

**Test accounts:**
- Create your own.
- Supabase Free plan email sending is rate-limited, and confirmation emails go out through the owner's Gmail, so keep sign-ups few.

**Never commit secrets.** The repo folder syncs through OneDrive.

**Report findings** with steps, the expected result, the actual result and a severity, ranked by impact on the 28 December pilot: wrong headcounts, data leaking across sides, guests unable to reply, and printing problems come first.

## 10. Docs known to be stale

- `README.md`:
  - Mentions a single "Functions" column in the template; it is now one Yes column per function.
  - Says public sign-up is off; sign-up has been open since 10 Nov.
  - Lists the migrations only up to 0010.
  - Says "food yes/no"; it is now three choices.
- `src/lib/pilot.ts`: the header comment says "frozen on 14 December"; it's 19 December.
- `CLAUDE.md` says the caterer's last date is 25 December. The live event's setting says 24 December.
