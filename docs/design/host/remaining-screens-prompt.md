# Prompt for Claude Code: restyle the remaining host and sign-in screens

Paste everything below the line into Claude Code, opened in the Pangat repo.

---

Restyle the remaining host and account screens to the reference designs. **This changes the look only. Every behaviour stays exactly as it is.**

## Before you start

This builds on the host-theme PR (`docs/design/host/host-screens-prompt.md`). That PR switched the colour tokens, the Rozha One and Mukta fonts, the `Mark` component and the event rail.

- **If that PR isn't merged, stop and tell me.** Don't redo its work here.

Do this in **two PRs**, one after the other. Stop after each for my review:

- **PR A: host pages.** Guest list, household page, slips, WhatsApp, event settings.
- **PR B: account pages.** Sign in, create account, forgot password, choose a password, your events, create an event.

## Reference designs

Host pages, in `docs/design/host/`, each a `.png` plus `.html`:

| design | page in the code |
|---|---|
| `host-guest-list` | `app/host/e/[slug]/guests/page.tsx` (+ `AddHouseholdForm`, `ImportForm`, `LookupQueue`) |
| `host-household` | `app/host/e/[slug]/guests/[id]/page.tsx` (+ `HouseholdForms`) |
| `host-slips` | `app/host/e/[slug]/slips/page.tsx` (+ `PrintButton`) |
| `host-whatsapp` | `app/host/e/[slug]/whatsapp/page.tsx` (+ `WhatsAppForms`) |
| `host-settings` | `app/host/e/[slug]/settings/page.tsx` (+ `SettingsForms`) |

Account pages, in `docs/design/account/`:

| design | page in the code |
|---|---|
| `account-sign-in` | `app/host/login/` |
| `account-create` | `app/host/signup/` |
| `account-forgot-password` | `app/host/forgot/` |
| `account-choose-password` | `app/host/account/password/` |
| `account-your-events` | `app/host/page.tsx` (events list) |
| `account-create-event` | `app/host/new/` (+ `NewEventForm`) |

How to use them:

- **The PNGs show the look; the `.html` files give exact sizes, colours and copy.**
- The `.html` files are design-canvas exports. Don't copy their markup: they use inline styles, a canvas runtime (`support.js`, `<x-dc>`, `<helmet>`, `data-dc-script`), and pull in the side menu with `<dc-import name="Rail">`. That menu is the event rail you built in the host-theme PR, so reuse it.
- **All names, numbers, emails and dates in them are sample data.** Real data comes from the store, exactly as today.

## Shared patterns (use them everywhere)

- **Page title:** Rozha One, about 40 px, maroon (`kumkum`), with a short `ink-soft` line under it.
- **Cards:** `card` background, `line` border, radius about 20 px, padding about 22 px. Card titles in Rozha about 24 px.
- **Inputs:** 48–52 px tall, 2 px `line` border, radius 12 px, white background. The label sits above in bold; optional fields add "(optional)" in `ink-soft`.
- **Buttons:**
  - Primary: maroon fill.
  - Secondary: maroon outline on `card`.
  - WhatsApp actions: `whatsapp` green fill, white text, chat icon.
  - Minimum 44 px tall everywhere.
- **Choice pills for "invited to" functions:** checked = `haldi-soft` fill with a `haldi-deep` border; unchecked = white with a `line` border. A real checkbox inside, not a styled div.
- **Badges:**
  - Bride = `kumkum-soft` / `kumkum`.
  - Groom = `haldi-soft` / `haldi-deep`.
  - Replied = `leaf-soft` / `leaf`.
  - Partly = `haldi-soft` / `haldi-deep`.
  - No reply = `paper-deep` / `ink-soft`.
- **Info boxes:** `haldi-soft` with a `haldi` border. Warnings: `kumkum-soft` with maroon text and a triangle icon.
- **Tables:** `paper-deep` header row. **The first column is left-aligned; every other column is centred.** Each table sits in an `overflow-x: auto` box. Below `lg`, keep the existing stacked-card version for phones.
- **Short codes:** Rozha with wide letter-spacing.

## PR A: host pages

1. **Guest list:**
   - three count cards (households with a per-side split, no mobile, no Marathi name);
   - the wrong-link queue as an info box with one row per request (WhatsApp send + Dismiss);
   - "Add one household" and "Import from Excel" side by side on laptop, stacked on phone. Import shows its 3 numbered steps and, after checking, the new / already-on-list / problem pills plus the row-numbered problem list;
   - the households table with search.

   **Keep every existing rule:** import validation, the cap, "only invited functions".
2. **Household page:**
   - header card: names in English and Marathi, side badge, mobile, code; "Copy guest link" and "Print this slip" buttons;
   - "Reply" card: show how the last reply arrived (existing source text), with compact per-function controls;
   - "Details and invitations" card;
   - a dashed "Delete household" box, its button disabled with the reason when they've replied (existing rule).
3. **Slips:**
   - the controls column (filters, counts, warnings, print tips, Print button), with the sheet preview beside it on laptop.
   - **THE PRINT LAYOUT IS FIXED:** A4, 8 per sheet, about 97 × 70 mm, 100% scale, the existing `@media print` rules and the on-screen `zoom` trick. Restyle only inside each slip: a thin maroon rule under the event line, the Marathi name in Rozha and maroon, the English name under it, then the scan text, the QR and the code. **Don't change sizes, the QR size (about 31 mm) or the cut lines.**
   - **Use a real QR code from `lib/qr.ts`.** The design's QR is a placeholder.
   - Print one sheet in Chrome's print preview and attach the PDF to the PR.
4. **WhatsApp:**
   - Invitation / Reminder as a segmented control;
   - message editor and live preview side by side (preview in a sand panel, with the message in a chat-bubble card);
   - the to-do table with green send buttons;
   - the time-spent log card with totals.

   **Keep the existing default message text from `lib/hostMessages.ts`.** The wording in the design is only a sample.
5. **Event settings:**
   - Event details card, with the two show-rate fields worded as "Of those who say yes, how many come?" and "Of households that never reply, how many come?";
   - contact numbers for slips, the missing one with a maroon border and a placeholder hint;
   - Functions card: one expanded function being edited, the others as summary rows with Edit;
   - Owner and co-owners table plus the invite form.

   **Keep all the limits:** 3 co-owners per side, delete only if no replies, owner only.

## PR B: account pages

1. **Sign in, create account, forgot password, choose a password:**
   - phone-first single column: the Mark + "Pangat" centred at the top, one card with the form, the secondary link below the card;
   - errors in maroon right under the field, with `role="alert"`;
   - after-send states in the info box;
   - "Choose a password" reached from a co-owner invitation names the event and side it is for, when that information is available.
2. **Google button:** use **Google's official "Sign in with Google" button styling and logo** from Google's branding guidelines. The design shows a plain placeholder. Don't draw your own G.
3. **Your events:**
   - a slim top bar (Mark + Pangat, email, Sign out);
   - event cards with the English and Marathi names, a role badge (Owner = maroon fill; Co-owner = blue badge showing the side), date, household count, replied bar and %;
   - "+ Create an event".

   Keep "a single event goes straight in".
4. **Create an event:**
   - Kind of event as large choices: Wedding selected; others disabled with "coming soon". **Ask me which names to show.** The design says Party and Reunion. If I don't answer, show one disabled "More kinds coming soon".
   - names in English and Marathi, wedding date, reply cut-off (with the 15-day default note);
   - a sand panel listing the three starting functions with their computed dates;
   - "Create event".

## Must not change

- Auth flows, redirects, Supabase calls, RLS, server actions, validation messages' meaning, role and side visibility, import rules, the print layout, the default WhatsApp texts.

## Constraints

- Works at 360 px with no sideways scroll.
- Touch targets at least 44 px.
- Text contrast at least 4.5:1.
- No images except Google's official button asset.
- UK/India English.

## Process (each PR)

1. Branch from `main`: `ui/host-pages` (PR A), then `ui/account-pages` (PR B).
2. **Don't run `npm install`, `next build` or `next dev` locally**: Windows Smart App Control blocks the native binaries. Push, and let CI and the Vercel preview build.
3. On the Vercel preview, check every page as owner and as co-owner, at 1440, 1366, 390 and 360 px wide. Include:
   - an import with a bad row;
   - a household that has replied (delete disabled);
   - the slips print preview;
   - sign-in with a wrong password;
   - forgot password.

   Post screenshots, or tell me what you couldn't check.
4. Stop after each PR for my review.

## Done means

- Each page matches its reference design.
- Behaviour is unchanged.
- Slips print exactly as before.
- CI is green.
