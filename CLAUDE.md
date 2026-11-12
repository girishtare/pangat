# Pangat: project context

Pangat is a web app that tells an event host how many guests are really coming. Guests reply through a personal link or QR code; the host gets a headcount per function, split by veg and non-veg. (The project was briefly called "Aagman" during planning; Pangat is the name.)

Read `README.md` for how to run it and what is and isn't built.

## Owner preferences

- Direct, terse answers. Candid pushback, no validation.
- Tag confidence: [Certain], [Likely], [Guessing].
- Staged, reviewable outputs. Do not build several stages in one go.
- UK/India English spelling.

## The pilot (this is the deadline)

- First real event: a family wedding on **28 December 2026**.
- About 400 printed cards (200 per side, bride and groom). The family expects 700 to 800 people to turn up; the invited total has not been counted.
- Cards are already printed, so each named card gets a separately printed slip with that household's QR code and short code, in English and Marathi.
- First cards go out Friday 13 November to close family, without slips. Those households are entered by hand.
- **Caterer's first count is due 20 December 2026; the caterer accepts changes until 25 December** (owner confirmed 11 Nov; set in Event settings). The tool's number is frozen the day before, 19 December. (Planned as 15 and 24 Dec until 11 Nov.)

## Timeline

- 12 Nov: open decisions answered; family's baseline order written down, one number per function.
- 20 Nov: guest lists frozen, one mobile number per household.
- 22 Nov: v1 live.
- 23 to 24 Nov: dry run with ten relatives, at least two over 65.
- 25 Nov: slips printed; remaining cards go out with them, each followed by the WhatsApp link.
- 6 Dec: first nudge to pending households. 12 Dec: phone round.
- 19 Dec: Pangat's number frozen beside the family's baseline (Caterer numbers). 20 Dec: first count to the caterer. 25 Dec: last change to the caterer.
- 28 Dec: arrivals counted per function. 3 Jan 2027: review.

## How the pilot is judged

Three numbers: **baseline** (what the family would have ordered anyway), **predicted** (the tool's figure frozen on 19 December) and **actual** (counted on the day). The tool has earned its place only if predicted is closer to actual than baseline is.

## Decided

- 10 Nov: **open sign-up** for commercial use. Google and email/password now; phone OTP later (needs an SMS provider and DLT registration). Email: the owner's Gmail via SMTP for the pilot (no domain yet); Resend once a domain is bought. Each event has one **owner** (its creator) and up to **3 co-owners per side**; co-owners work on their side only. Event kinds: wedding only for now (`events.kind`). Setup steps: `docs/auth-setup.md`. Verified live 10 Nov: Google sign-in links to the existing email account; a co-owner invitation (groom side) was accepted and the invitee signed in. Supabase Site URL must be the production URL, or email links point at localhost. Owner also confirmed: self sign-up by email (confirmation email via Gmail) and password reset both work. Before charging: Vercel Pro (Hobby is non-commercial).

- If the tool's number and the parents' number disagree on 19 December, **the higher of the two goes to the caterer**. So this wedding cannot show a saving; it is a measurement run. Record both numbers and the actual count, and judge the tool on accuracy only.

- 11 Nov (owner): co-owner view tested by the owner, all good. Marathi wording on the guest page and in WhatsApp messages accepted as is. The family's baseline per function has been discussed with them. "Coming soon" event kinds on Create an event: decide in December (for now Wedding only). Supabase: the owner keeps the project active so it doesn't pause. Vercel Pro and commercial launch only after this wedding.

- 11 Nov, end-to-end test on a throwaway event: replies are written only when they change (`src/lib/store/changed.ts`), so a host correcting one function no longer turns the guest's other replies into "on behalf", and re-sending an unchanged reply adds no history row. Caterer numbers are readable by the owner only at database level too (migration 0017). Supabase is on the Free plan: leaked-password protection needs Pro (turn on after the wedding); minimum password length set to 10 in Supabase by the owner.

## Evidence to collect for the 3 January decision

The owner will decide after 3 January whether the product is sold on savings or on certainty. That decision needs these recorded during the pilot, not reconstructed afterwards:

- Parents' number, the tool's number and the actual count, per function.
- Predicted and actual veg to non-veg split.
- Replies by channel: QR, WhatsApp link, phone-in code, on behalf.
- Share of households that replied unaided, and how many changed their reply.
- Hours the family spent chasing replies, and how many phone calls.
- Whether the parents looked at the dashboard, and whether it changed anything they did.

## Kill switches

- Lists not frozen by 20 Nov: drop printed slips, WhatsApp links only.
- Fewer than 5 of 10 dry-run guests finish unaided: simplify the form or collect by phone.
- Under 60% of households replied by 10 Dec: caterer gets the family's estimate; the tool's figure is one input.

## Open decisions (all answered)

1. ~~Which functions get their own headcount, and which are catered?~~ Answered 10 Nov: hosts set this per event on the page (each function has its own headcount and a Food choice: veg and non-veg, veg only, or no food).
2. ~~Is the groom's side in the tool with its own login, or do they hand over one number?~~ Answered 11 Nov: co-owners. Each side gets up to 3 co-owners with their own logins, working on their side only.
3. ~~Does each card map to one household, and is there a soft cap on heads per card?~~ Answered 10 Nov: one card = one household, with an optional soft cap (Cap column). Owner, 11 Nov: the cap stays a flag only (Guest list shows households over their cap); it never stops a guest replying.
4. ~~How far can the caterer's count move after 15 December, and at what cost?~~ Answered 10 Nov; dates moved 11 Nov: the caterer accepts changes until **25 December**. The pilot is still judged on the tool's number frozen on 19 December; a later update to the caterer (up to 25 Dec) is frozen separately as the "revised count" on the Caterer numbers tab (migration 0010); the caterer then gets the higher of baseline and the revised number. Caterer dates are Event settings.
5. ~~Is the menu all-vegetarian? If so, drop the diet question.~~ Answered 10 Nov: both veg and non-veg are served, so the vegetarian question stays.

## v1 scope

In: one event with several functions; guest list import; one token per household used for QR, WhatsApp link and a six-character phone-in code; printable slip sheet; bilingual guest page; "not us" mobile lookup with host approval queue; mark on behalf; dashboard by function, side and diet; expected headcount; WhatsApp nudges through prefilled share links from a family member's own phone; one host role per side.

Out: space, chairs, vendors, seating; WhatsApp Business API; ads; payments; native app; guest logins; card design.

## Stage 2 (next), in suggested order

1. Host sign-in (Supabase Auth) and RLS policies so each host sees only their side. Then enable `/host` outside demo mode. **Code written 10 Nov (migration 0002, `/host/login`, `src/proxy.ts`); RLS tested in SQL; owner signed in on the live site and saw the both-sides dashboard. Done.**
2. Guest list import from a sheet, add a late household, token and short-code generation (`src/lib/token.ts`). **Code written 10 Nov: `/host/guests`, `src/lib/guestlist.ts`, migration 0004 (atomic `import_households`, service role only). Import function tested in SQL; the page not yet used live.**
   Also (owner's call, 10 Nov: "everything that needs a change should be on page"): events are created on the page with Haldi/Wedding/Reception by default; functions, event details, show rates and hosts are edited on Event settings (hosts of both sides only). Routes are per event: `/host/e/<slug>`. Migration 0005; `PANGAT_EVENT_SLUG` is gone.
   Excel (owner, 10 Nov): per-event template at `/host/e/<slug>/guests/template` (exceljs, writing only) and `.xlsx` upload (read-excel-file, reading untrusted files), both feeding the same check step. Only the "Guests" sheet is imported. Functions (owner, 12 Nov): one column per function headed with its name, Yes/blank dropdown, at least one Yes per household; no "all" choice. The import still reads an older single "Functions" column (comma list, blank or "all" = every function) from pastes and old files. Owner confirmed 10 Nov: template dropdowns and upload work in both Excel and Google Sheets.
3. Mark on behalf (source `on_behalf`, `updated_by` = host). **Built 10 Nov on the household page, with edit/delete household and guest-list search. Pilot record built too: Caterer numbers tab (baseline, freeze on 19 Dec, to caterer, actual, verdict), migration 0006. Still to build for the evidence list: hours/calls chasing log, dashboard-view tracking.**
4. Printable slips: household name, QR to `/r/<token>?s=q`, short code, English and Marathi. **Built 10 Nov: Slips tab (8 per A4), side contact numbers in Event settings. Owner confirmed: printed slip QR scans to the right reply page.**
5. "Not us" mobile lookup and approval queue. **Built 10 Nov: guest leaves a mobile (no match revealed), host queue on the Guest list with one-tap WhatsApp send or dismiss; migration 0008. Language choice now remembered (cookie).**
6. WhatsApp nudge links (`https://wa.me/<number>?text=...`) for pending households. **Built 10 Nov: WhatsApp tab with invitation and reminder texts (editable), sends recorded in `nudges`; effort log and dashboard-view tracking for the review. Migration 0007. Owner confirmed: the WhatsApp button opens the prefilled message and the link works.**

7. To-do list (owner, 11 Nov; beyond v1 scope): a To-do tab for every host. People helping (full name, mobile, side; they never sign in) and tasks (title, note, optional function, deadline, status to do / in progress / done), with a WhatsApp button to send a task. The owner sees both sides; a co-owner only theirs (RLS on read, side check on every write). The owner and co-owners are on People helping by default, kept in step with `hosts` by a trigger: the owner as "Both sides", names typed in on Event settings (Google name or email until then); a co-owner with tasks can't be removed until the tasks are reassigned. Migrations 0011 and 0012.

## Technical notes

- Next.js 16 (App Router), React 19, Tailwind v4, Supabase, zod 4, vitest. Versions match the owner's Sutradhar project, except Next is 16.4.6 (security fixes).
- Hosting: Vercel, project `pangat`, production URL https://pangat-tau.vercel.app (`pangat.vercel.app` belongs to someone else; the other `*.vercel.app` aliases sit behind Vercel's login), deployed by Vercel's Git integration on every push to `main`; functions pinned to Mumbai (`bom1`, `vercel.json`) next to the Supabase database. Moved off Cloudflare Workers on 10 Nov: its Next.js adapter needed build workarounds and its Node proxy support is experimental. Vercel Hobby is non-commercial; selling Pangat would need Pro. CI (GitHub Actions) runs typecheck, test and build.
- Repo: github.com/girishtare/pangat (private). Environment variables are listed in README.
- Do not build or install locally: Windows Smart App Control on the owner's PC blocks new native npm binaries (rolldown, rollup). Push and let CI and Vercel build.
- Guests never reach the database directly. Server code uses the service-role key and looks households up by token. RLS is on with no anonymous policies. Keep it that way.
- Hosts sign in with email and password (owner creates accounts; public sign-up off, because Supabase's built-in email only reaches org members). `/host` reads with the host's own session (publishable key), so RLS limits it to their event and side; hosts have read-only policies and the `authenticated` role has no write grants. Writes stay server-side with the service-role key. Policy helpers are in the unexposed `private` schema.
- Env vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret); optional `SMTP_USER`/`SMTP_PASS` (emails) and `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` (Suggest Marathi). No `NEXT_PUBLIC_` prefix: no browser code uses them, and NEXT_PUBLIC_ values are frozen at build time.
- `src/lib/store` has two implementations behind one interface: `demo.ts` (in memory) and `supabase.ts`. The app uses demo mode when the Supabase env vars are missing.
- Forecast: `expected = confirmed heads x yesShowRate + people on pending cards x pendingShowRate`, where a pending card's people = its cap, or the function's average heads per yes when it has no cap (owner, 12 Nov: "use the cap to count the number of people"; before that every pending card counted the average). Defaults 0.90 and 0.40 are guesses, stored per event. The dashboard table shows Cards (households) and People (caps added up, plus how many cards have no cap).
- Departures from the original spec: replies are yes or no only (no "maybe"); the form asks total people and vegetarian count (no adults and children split).

## UI

- Palette (one for the whole app): maroon, sand, cream, dusty blue. Values live once in `:root` in `src/app/globals.css`; the Tailwind names point at them. Old names kept: `kumkum` = maroon, `haldi` = dusty blue `#aec4d4` (fills, bars, borders only, never text), `haldi-deep` `#4f6b80` (blue for text and icons), `paper` = cream, `line` = sand. Plus `sand`, `sand-soft`, `sand-deep`, and aliases used by landing and guest pages (`maroon`, `cream`, `sky`, `sky-ink`, `ink-e`, `card-e`). No yellow anywhere. Leaf and WhatsApp greens unchanged. Focus ring `3px solid #4f6b80`.
- Invitation card (owner, 11 Nov): each side has its own card; the owner uploads four PDFs (bride's and groom's side, English and Marathi) on Event settings → Event details (private Storage bucket `cards`, `events.card_<side>_<lang>_path`, migrations 0015 and 0016; a guest gets their household's side; browser uploads straight to Storage through a one-time signed link, 20 MB max). WhatsApp links can't carry files, so guests get a link (`/r/<token>/card?l=en|mr`, a signed URL for an hour) in the WhatsApp message and a button on the reply page, in their household's slip language (Both: both cards).
- Emails (owner, 11 Nov): one design for every email (`src/lib/emailDesign.ts`: card on cream, logo, pill, maroon heading, event box, maroon button). Pangat's own emails (added as co-owner, removed) use it via `sendCardMail` (needs SMTP_USER/SMTP_PASS). Supabase's invitation uses the same design: `supabase/templates/invite.html`, built by `node scripts/build-email-templates.ts` and pasted into Supabase (steps in `supabase/templates/README.md`); Pangat sends name, event, inviter and role as invite data.
- Logo (owner, 11 Nov): originals in `docs/brand` (English and Marathi). `public/brand/pangat-logo-en.png` and `-mr.png` are made from them (white made transparent, cropped, 160 px tall), shown by `src/app/ui/Logo.tsx` (`lang`, height by class). Used on the host rail, Your events, landing header, sign-in pages, and the guest page (in the guest's language). The logo's saffron dot is the one exception to "no yellow". Printed slips keep the plain word. Favicon (owner, 12 Nov): from `docs/brand/pangat-favicon-icon.png` (saffron dot over a maroon arc), made by `scripts/make-icons.ps1` into `src/app/icon.png` (512, transparent), `apple-icon.png` (180, on cream) and `favicon.ico` (32 + 48); Next serves them by file convention.
- Fonts (owner, 12 Nov: "sleek, like Sutradhar"; replaces the 11 Nov Noto Sans + Playfair setup): English as in Sutradhar, IBM Plex Sans for text (`font-sans`) and Space Grotesk 600 for headings (`font-display`, -0.01em); Marathi unchanged: Noto Sans in text and Noto Sans Devanagari 700 in headings, reached by fallback because the English fonts have no Devanagari, so Marathi is drawn at the same size as the English around it. Loaded once in `src/app/fonts.ts` on `<html>`. Sizes on host and sign-in pages: body 15 px (Sutradhar's 14 plus one), buttons 15, labels and tables 14, hints 13, badges 12, inputs 16 on phones (iOS zoom) and 15 from 640 px; page titles 24/28 px, section titles 21, card and pop-up titles 18. Tailwind `text-base`/`text-lg`/`text-xl` on host pages were stepped down one notch to sit against the 15 px body. The guest reply page, the landing page and printed slips keep their own sizes (guest page 17 px for older guests); only their font faces changed. Emails keep their own fonts (email clients rarely load web fonts).
- Times are always hh:mm am/pm (`10:00 am`, `03:00 pm`), via `src/lib/when.ts` on host pages and `formatWhen` (2-digit hour) on the guest page. Native date-and-time inputs show the browser's own format.
- Shared classes in globals.css: .btn, .input, .card, .badge, .alert, .table-p (first column left, the rest centred, cells vertically centred), .table-scroll (long tables scroll inside their box with the header pinned), .choice (+ .choice-check for tick-box pills, .choice-no, .choice-sky). Shared pieces in `src/app/ui`: kit.tsx (Mark, PageHeader, Section, Alert…), Stepper (`guest` variant), MobileNav, PopupButton (a button that opens a form in a `<dialog>`).
- Event shell (`src/app/host/HostChrome.tsx`): laptop rail = logo, tabs (Dashboard, Guest list, Slips, WhatsApp, To-do, Caterer numbers, Event settings), All events between two rules, then the signed-in email and Sign out at the bottom; the event's name (English · Marathi, same size and colour) sits on one line above every page. Phones keep the Menu bar.
- Food per function (owner, 11 Nov): Event settings offers Veg and non-veg / Veg only / No food (`functions.catered`, `functions.veg_only`, migration 0019). Veg only: guests aren't asked the veg question and everyone counts as veg (also in the dashboard for older replies); counted on the day asks the total only.
- Forms people type into use `useFormAction` (`src/app/ui/useFormAction.ts`), not `useActionState` with `<form action>`: React resets such a form even on a validation error, wiping what was typed. The hook submits from `onSubmit`, keeps the fields on an error and resets on success. Button-only forms (Remove, Freeze, Send again) stay on `useActionState`.
- Guest list: every column sorts (`?sort=name|side|mobile|location|code|invited|replied|cap&dir=asc|desc`, `src/lib/guestSort.ts`; blanks last; phones get a Sort by menu). A household whose reply has more people than its cap is flagged ("N replied") and counted in an "over their cap" card; the cap still doesn't stop guests.
- Location and Comments / Notes (owner, 12 Nov; migration 0020): `households.location` (where they stay, a short place like "Borivali, Mumbai", 80 chars) and `households.notes` (500 chars), on Add / Edit household, the guest list (Location column, sortable and searchable; notes under the name) and the Excel template (Location after Mobile, Comments / Notes last). Duplicates: same side and name is the same household only when neither mobile nor location tells them apart (`sameHousehold` in `src/lib/guestlist.ts`; blank doesn't count as different); same mobile on the same side is still the same household.
- Marathi uses 0-9 digits everywhere (`MR_LOCALE = "mr-IN-u-nu-latn"` in `src/lib/i18n.ts`), and times read "10:00 am" in both languages; owner, 11 Nov.
- Account pages (sign in, create account, forgot password, choose a password): `AuthShell` in `src/app/host/AuthBits.tsx`, logo centred, one card, secondary link below; errors in maroon under the field (`role="alert"`); sent states in the light-blue box; Google button per Google's light-theme guidelines. Choose a password names the event and side when the person co-owns exactly one event. Create an event: slim top bar, Wedding only, starting functions with their real dates.
- Page notes: Dashboard switches Both / Bride's / Groom's with `?side=` (owner only; co-owners get their side). Caterer numbers says "family's guess" (code and database keep `baseline`); the verdict card goes first once counts exist. Guest list: "+ Add a household" and "Import from Excel" open pop-ups. Slips: each household's slip prints in its own language, English, Marathi or both (`households.slip_lang`, default both, migration 0014), set on the Slips page's Language of each slip tab (search by name or place, filter by language, per household or for ticked households; a Location column from 640 px, under the names on phones, so slips can be set by where families stay); `?lang=` filters to one language. A one-language slip's QR adds `&l=` so the reply page opens in that language unless the guest chose one before. With both, Marathi lines first, then English (name, "scan" lines and "no smartphone" line; owner, 12 Nov); reply-by date as "24th December 2026"; print geometry fixed (194 x 281 mm, 8 per A4). Print slips shows one A4 sheet at a time on screen, with Previous / Next and "Sheet 2 of 9 · slips 9-16 of 72" above and below (owner, 12 Nov); a search starts again at sheet 1; printing still uses every ticked slip. On screen the slip header is indented clear of the tick box (`.slip-pick`); print is unchanged. Your events (`/host?all=1`): centred cards with a large Open event button.
- Searches filter as you type (owner, 12 Nov). Guest list and To-do (server pages) use `LiveSearch` (`src/app/ui/LiveSearch.tsx`): it writes `?q=` 250 ms after typing stops, keeps the other parameters, and is a plain GET form without JavaScript. WhatsApp distribution list and both Slips tabs filter on the client. Every list search matches name (English or Marathi) and place; the Guest list, WhatsApp list and Print slips also match mobile and code; To-do matches task, note, person and function.
- Tables on phones: stacked cards where the key number must stay visible; otherwise the table scrolls inside its box. A screen-reader-only label in a scroll box needs the box `position: relative`, or it widens the page.
- Reviewed live at 1440x900, 1366x768, 390 and 360 px; no sideways scroll at 360.
- Review tip: the browser pane's emulation crops screenshots. Load pages in same-origin iframes on the pane (390 and 360 px side by side, or 1440 px scaled with CSS transform) so the sign-in carries over; shift the iframe with translateY to see further down. If the pane is hidden, set a viewport size with resize_window first.
- Review data: to test on the live site without touching the real event, create a `demo-wedding` event in SQL (the seed's households, some replies), add the owner's account as its host, review, then delete the event (and its lookup requests, function numbers, tasks and helpers). Done this way for PRs 16-31.
- Merging a PR deploys to production: the owner approves each merge; database migrations are applied only with the owner's OK.

## Verification status (updated 10 November 2026)

- CI passes: type-check, 18 tests under vitest, Next build.
- On the former Cloudflare site (demo mode, stage 1 code): `/`, `/r/demo-family-1` and `/host` load; a guest reply (demo-family-3) submitted, survived reload, showed on `/host` with correct expected figures, and a changed reply updated the dashboard without double-counting. Unknown tokens show a bilingual "link isn't valid" message.
- Demo mode on Workers keeps data per isolate, so replies can vanish or not appear on `/host`. Supabase is needed before the dry run.
- Supabase project `pangat` (ref `sibsiwicyoawdysgqeft`, Mumbai, free plan) created 10 Nov; migrations 0001 to 0003 and the demo-wedding seed applied; security advisor clean. RLS tested in SQL with throwaway users (rolled back): bride host sees 4 households/10 invites, groom host 4/9, both-sides host 8/19, signed-in non-host 0; anon read and host writes are refused.
- Live on Vercel against Supabase (10 Nov): home page shows no demo box; `/host` redirects to `/host/login`; a guest reply via `/r/demo-family-6?s=q` saved to `responses` with source `qr`, correct heads/veg/arrival, and one `response_history` row per function.
- Host sign-in confirmed live (10 Nov): owner's account signed in and saw "Both sides". The sample event `demo-wedding` was deleted from the live database on 10 Nov at the owner's request; the seed file stays for testing. A one-side host on the live site has not been tried; RLS for one side was tested in SQL.
- The seed re-run on 10 Nov deleted the event and, by cascade, all host links. `supabase/seed/demo_wedding.sql` now saves and restores host links.
- Free Supabase projects pause after a week without activity; a pause would break guest links.
- Marathi strings in `src/lib/i18n.ts` are a first draft and need a native reader.
- Suggest Marathi (owner, 11 Nov): a Suggest button on every Marathi name field (event name on Create an event and Event settings, function names, household add/edit; `src/app/ui/MarathiInput.tsx`). It reads the English field of the same form, asks the model (`src/lib/suggest.ts`, rules and checks in `src/lib/marathi.ts`) and fills the field; nothing is saved until the host saves, and Undo restores the old value. Signed-in hosts only. Provider (owner, 11 Nov: Gemini): `GEMINI_API_KEY` → `gemini-3.8-flash` via generateContent v1beta (key in the `x-goog-api-key` header, LOW thinking; 3.5 Flash-Lite changed names in a live test on 11 Nov); else `ANTHROPIC_API_KEY` → Claude Opus 5.5. Gemini's free tier lets Google use the names sent; billing on the project stops that. Not yet: suggestions on Excel import and for WhatsApp texts. Other languages later need per-language name storage (after the wedding).

## Do not

- Do not put node_modules-heavy experiments or secrets in this folder; it syncs through OneDrive.
- Do not open or copy the "Keys & PW" text files in the parent AppStudio folder.
