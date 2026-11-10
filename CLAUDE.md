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

1. Which functions get their own headcount, and which are catered?
2. Is the groom's side in the tool with its own login, or do they hand over one number?
3. Does each card map to one household, and is there a soft cap on heads per card?
4. How far can the caterer's count move after 15 December, and at what cost?
5. Is the menu all-vegetarian? If so, drop the diet question.

## v1 scope

In: one event with several functions; guest list import; one token per household used for QR, WhatsApp link and a six-character phone-in code; printable slip sheet; bilingual guest page; "not us" mobile lookup with host approval queue; mark on behalf; dashboard by function, side and diet; expected headcount; WhatsApp nudges through prefilled share links from a family member's own phone; one host role per side.

Out: space, chairs, vendors, seating; WhatsApp Business API; ads; payments; native app; guest logins; card design.

## Stage 2 (next), in suggested order

1. Host sign-in (Supabase Auth) and RLS policies so each host sees only their side. Then enable `/host` outside demo mode.
2. Guest list import from a sheet, add a late household, token and short-code generation (`src/lib/token.ts`).
3. Mark on behalf (source `on_behalf`, `updated_by` = host).
4. Printable slips: household name, QR to `/r/<token>?s=q`, short code, English and Marathi.
5. "Not us" mobile lookup and approval queue.
6. WhatsApp nudge links (`https://wa.me/<number>?text=...`) for pending households.

## Technical notes

- Next.js 16 (App Router), React 19, Tailwind v4, Supabase, zod 4, vitest. Versions match the owner's Sutradhar project.
- Guests never reach the database directly. Server code uses the service-role key and looks households up by token. RLS is on with no anonymous policies. Keep it that way.
- `src/lib/store` has two implementations behind one interface: `demo.ts` (in memory) and `supabase.ts`. The app uses demo mode when the Supabase env vars are missing.
- Forecast: `expected = confirmed heads x yesShowRate + pending households x average heads per yes x pendingShowRate`. Defaults 0.90 and 0.40 are guesses, stored per event.
- Departures from the original spec: replies are yes or no only (no "maybe"); the form asks total people and vegetarian count (no adults and children split).

## Verification status on 10 November 2026

- Type-check passes. The 13 logic tests passed under a stand-in runner, not under vitest.
- `npm install`, `npm run build`, `npm test` and the pages in a browser have **not** been run. Do this first.
- `src/lib/store/supabase.ts` and the migration have not been run against a live project.
- Marathi strings in `src/lib/i18n.ts` are a first draft and need a native reader.

## Do not

- Do not put node_modules-heavy experiments or secrets in this folder; it syncs through OneDrive.
- Do not open or copy the "Keys & PW" text files in the parent AppStudio folder.
