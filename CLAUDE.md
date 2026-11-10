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
- **Caterer's final count is due 15 December 2026.** The tool's number is needed by 14 December.

## Timeline

- 12 Nov: open decisions answered; family's baseline order written down, one number per function.
- 20 Nov: guest lists frozen, one mobile number per household.
- 22 Nov: v1 live.
- 23 to 24 Nov: dry run with ten relatives, at least two over 65.
- 25 Nov: slips printed; remaining cards go out with them, each followed by the WhatsApp link.
- 6 Dec: first nudge to pending households. 12 Dec: phone round.
- 14 Dec: expected headcount set beside the family's baseline.
- 28 Dec: arrivals counted per function. 3 Jan 2027: review.

## How the pilot is judged

Three numbers: **baseline** (what the family would have ordered anyway), **predicted** (the tool's figure on 14 December) and **actual** (counted on the day). The tool has earned its place only if predicted is closer to actual than baseline is.

## Decided

- If the tool's number and the parents' number disagree on 14 December, **the higher of the two goes to the caterer**. So this wedding cannot show a saving; it is a measurement run. Record both numbers and the actual count, and judge the tool on accuracy only.

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

## Open decisions (owner has not answered)

1. ~~Which functions get their own headcount, and which are catered?~~ Answered 10 Nov: hosts set this per event on the page (each function has its own headcount and a "food served" flag).
2. Is the groom's side in the tool with its own login, or do they hand over one number?
3. ~~Does each card map to one household, and is there a soft cap on heads per card?~~ Answered 10 Nov: one card = one household, with an optional soft cap (Cap column). The cap is stored but not yet enforced on the guest form.
4. How far can the caterer's count move after 15 December, and at what cost?
5. Is the menu all-vegetarian? If so, drop the diet question.

## v1 scope

In: one event with several functions; guest list import; one token per household used for QR, WhatsApp link and a six-character phone-in code; printable slip sheet; bilingual guest page; "not us" mobile lookup with host approval queue; mark on behalf; dashboard by function, side and diet; expected headcount; WhatsApp nudges through prefilled share links from a family member's own phone; one host role per side.

Out: space, chairs, vendors, seating; WhatsApp Business API; ads; payments; native app; guest logins; card design.

## Stage 2 (next), in suggested order

1. Host sign-in (Supabase Auth) and RLS policies so each host sees only their side. Then enable `/host` outside demo mode. **Code written 10 Nov (migration 0002, `/host/login`, `src/proxy.ts`); RLS tested in SQL; owner signed in on the live site and saw the both-sides dashboard. Done.**
2. Guest list import from a sheet, add a late household, token and short-code generation (`src/lib/token.ts`). **Code written 10 Nov: `/host/guests`, `src/lib/guestlist.ts`, migration 0004 (atomic `import_households`, service role only). Import function tested in SQL; the page not yet used live.**
   Also (owner's call, 10 Nov: "everything that needs a change should be on page"): events are created on the page with Haldi/Wedding/Reception by default; functions, event details, show rates and hosts are edited on Event settings (hosts of both sides only). Routes are per event: `/host/e/<slug>`. Migration 0005; `PANGAT_EVENT_SLUG` is gone.
3. Mark on behalf (source `on_behalf`, `updated_by` = host).
4. Printable slips: household name, QR to `/r/<token>?s=q`, short code, English and Marathi.
5. "Not us" mobile lookup and approval queue.
6. WhatsApp nudge links (`https://wa.me/<number>?text=...`) for pending households.

## Technical notes

- Next.js 16 (App Router), React 19, Tailwind v4, Supabase, zod 4, vitest. Versions match the owner's Sutradhar project, except Next is 16.4.6 (security fixes).
- Hosting: Vercel, project `pangat`, production URL https://pangat-tau.vercel.app (`pangat.vercel.app` belongs to someone else; the other `*.vercel.app` aliases sit behind Vercel's login), deployed by Vercel's Git integration on every push to `main`; functions pinned to Mumbai (`bom1`, `vercel.json`) next to the Supabase database. Moved off Cloudflare Workers on 10 Nov: its Next.js adapter needed build workarounds and its Node proxy support is experimental. Vercel Hobby is non-commercial; selling Pangat would need Pro. CI (GitHub Actions) runs typecheck, test and build.
- Repo: github.com/girishtare/pangat (private). Environment variables are listed in README.
- Do not build or install locally: Windows Smart App Control on the owner's PC blocks new native npm binaries (rolldown, rollup). Push and let CI and Vercel build.
- Guests never reach the database directly. Server code uses the service-role key and looks households up by token. RLS is on with no anonymous policies. Keep it that way.
- Hosts sign in with email and password (owner creates accounts; public sign-up off, because Supabase's built-in email only reaches org members). `/host` reads with the host's own session (publishable key), so RLS limits it to their event and side; hosts have read-only policies and the `authenticated` role has no write grants. Writes stay server-side with the service-role key. Policy helpers are in the unexposed `private` schema.
- Env vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret). No `NEXT_PUBLIC_` prefix: no browser code uses them, and NEXT_PUBLIC_ values are frozen at build time.
- `src/lib/store` has two implementations behind one interface: `demo.ts` (in memory) and `supabase.ts`. The app uses demo mode when the Supabase env vars are missing.
- Forecast: `expected = confirmed heads x yesShowRate + pending households x average heads per yes x pendingShowRate`. Defaults 0.90 and 0.40 are guesses, stored per event.
- Departures from the original spec: replies are yes or no only (no "maybe"); the form asks total people and vegetarian count (no adults and children split).

## Verification status (updated 10 November 2026)

- CI passes: type-check, 18 tests under vitest, Next build.
- On the former Cloudflare site (demo mode, stage 1 code): `/`, `/r/demo-family-1` and `/host` load; a guest reply (demo-family-3) submitted, survived reload, showed on `/host` with correct expected figures, and a changed reply updated the dashboard without double-counting. Unknown tokens show a bilingual "link isn't valid" message.
- Demo mode on Workers keeps data per isolate, so replies can vanish or not appear on `/host`. Supabase is needed before the dry run.
- Seen in testing: the English/Marathi choice is not remembered on reload (page reverts to Marathi); Marathi view mixes Devanagari dates with Latin digits and "AM/PM" in headcounts and times.
- Supabase project `pangat` (ref `sibsiwicyoawdysgqeft`, Mumbai, free plan) created 10 Nov; migrations 0001 to 0003 and the demo-wedding seed applied; security advisor clean. RLS tested in SQL with throwaway users (rolled back): bride host sees 4 households/10 invites, groom host 4/9, both-sides host 8/19, signed-in non-host 0; anon read and host writes are refused.
- Live on Vercel against Supabase (10 Nov): home page shows no demo box; `/host` redirects to `/host/login`; a guest reply via `/r/demo-family-6?s=q` saved to `responses` with source `qr`, correct heads/veg/arrival, and one `response_history` row per function.
- Host sign-in confirmed live (10 Nov): owner's account, linked to both sides of `demo-wedding`, signed in and saw "Both sides". A one-side host on the live site has not been tried; RLS for one side was tested in SQL.
- The seed re-run on 10 Nov deleted the event and, by cascade, all host links. `supabase/seed/demo_wedding.sql` now saves and restores host links.
- Free Supabase projects pause after a week without activity; a pause would break guest links.
- Marathi strings in `src/lib/i18n.ts` are a first draft and need a native reader.

## Do not

- Do not put node_modules-heavy experiments or secrets in this folder; it syncs through OneDrive.
- Do not open or copy the "Keys & PW" text files in the parent AppStudio folder.
