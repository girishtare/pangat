# Prompt for Claude Code: restyle the guest reply flow

Paste everything below the line into Claude Code, opened in the Pangat repo.

---

Restyle the guest reply flow (`/r/[token]`) to the new design. **This changes the look only. Every behaviour stays exactly as it is.** One stage: a single PR, then stop for my review.

## Reference designs (read these first)

All are in `docs/design/guest-flow/`, phone size (390 px):

| file | screen | shown in |
|---|---|---|
| `guest-1-isthisyou.html` | "Is this invitation for you?" | Marathi |
| `guest-2-reply.html` | reply form, full length: one function "coming" with counters, the wedding with arrival time, one "can't come" | Marathi |
| `guest-3-thanks.html` | thank you + reply summary + change button | Marathi |
| `guest-4-notus.html` | "Not us": mobile number form, with the error and the after-send message | English |
| `guest-5-invalid.html` | invalid link, both languages | both |

These are design-canvas exports. Take the layout, spacing, colours, sizes and component styling from them. Don't copy their markup: they use inline styles and a canvas runtime (`support.js`, `<x-dc>`, `<helmet>`, `data-dc-script`). The names, dates, venues and counts in them are sample data. **All real text still comes from `src/lib/i18n.ts` and the household/event data.**

## Files in scope

- `src/app/r/[token]/page.tsx` (the invalid-link state)
- `src/app/r/[token]/GuestFlow.tsx` (all the other states)
- `src/app/ui/Stepper.tsx`: add a size or variant if needed, but **don't break its use on the host household page**.
- `src/app/globals.css` and `src/lib/i18n.ts`: only as described below.

## Depends on the landing-page PR

The landing-page prompt (`docs/design/landing/landing-page-prompt.md`) adds the palette E colour tokens (`maroon`, `maroon-dark`, `sand`, `cream`, `sky`, `sky-ink`, `ink-e`, `ink-e-soft`, `card-e`, `track`), the `Mark` component and the Rozha One + Mukta fonts.

- **If that PR is merged**, reuse them.
- **If it isn't**, add them exactly as that prompt describes, in this PR.

The landing prompt loaded the fonts on the landing page only. Now two routes need them, so move the `next/font` setup into one shared module (for example `src/app/fonts.ts`) and apply its variables on the landing page and the `/r/[token]` page. **Host screens stay on Noto** and the old tokens. Don't touch them.

## Look, per the reference designs

- Page background cream; cards `card-e` with a sand border, radius about 18 px.
- **Type:**
  - Mukta, body 17 px.
  - Rozha One (weight 400; never fake bold) for the event name, function names, the household name and the counter numbers. Never below 20 px.
  - Keep `:lang(mr)` line-height at 1.65.
- **Screen 1:**
  - A small Mark + "Pangat" top-left; a language button top-right showing the *other* language (as today).
  - The event in a sand panel with a maroon double inset border.
  - The household name in its own card.
  - The question at about 22 px, bold.
  - Two 60 px buttons: Yes (filled maroon), Not us (maroon outline).
- **Screen 2:**
  - A compact header with the event name and the language button.
  - One card per function: name, then day · time · venue · map link.
  - "Coming" / "Can't come" as two 54 px choices. Coming selected = maroon fill, white text, ✓. Can't come selected = `ink-e-soft` fill, white text, ✓. Unselected = white with a sand border.
  - Counters with 48 px round − / + buttons (maroon outline; disabled = sand border, muted text) and the number in Rozha about 28 px.
  - The non-veg count under the veg label.
  - Arrival choices as three 48 px buttons; the selected one is `sky` fill, `sky-ink` border, ink text.
  - Submit as a full-width 60 px maroon button.
- **Screen 3:**
  - A sand circle with a maroon tick.
  - "Thank you" in Rozha about 32 px.
  - A summary card: one row per function, the function name in Rozha.
  - The "change until" date in a light-sky info box (`#dfe8ef` with a `sky` border).
  - "Change our reply" as a maroon outline button.
- **Screen 4:**
  - Back link top-left.
  - The heading in Rozha.
  - The mobile field with a fixed `+91` prefix, 22 px digits, a maroon border and a sky focus ring.
  - The error below it in maroon with an icon.
  - Send as a full-width maroon button.
  - The after-send thank-you shown as the light-sky info box.
- **Screen 5:** the Mark, then one card with the Marathi message (Rozha heading), a sand divider, then the English message.
- **Replies closed** (not drawn): reuse screen 3's light-sky info box for the `closed` text, and hide the change button.

## Copy

- Keep every existing `i18n.ts` string and its current wording.
- Show the event name from the data (Marathi when available). **Don't hard-code** "यांचा शुभविवाह" or the sample names.
- The designs add two lines that aren't in the app yet. Add each as a new `i18n.ts` key in both languages:
  - Screen 1, small text at the bottom: "It takes a minute · No sign-up needed" / "उत्तर द्यायला एक मिनिट लागेल · नोंदणीची गरज नाही".
  - Screen 2, under the submit button: "You can change this until {date}" / "{date}पर्यंत आपण उत्तर बदलू शकता". Use `formatDay(view.event.cutoffAt, lang)` for the date.
- **Don't add** screen 4's line "Your number is only shared with the family". I haven't confirmed that's true.
- Flag the new Marathi strings in the PR description: they need a native reader's check.

## Must not change

- The flow and its states: is-this-you → reply → thank-you; not-us; closed; invalid link.
- The server actions, validation and error messages, "Please answer for every function", the "Sending…" pending state.
- The `?s=q` QR source tracking, the `pangat_lang` cookie, and Marathi as the default language.
- The vegetarian question only for catered functions; the counter limits (1–30, starts at 2); veg ≤ heads.
- Accessibility: keep `fieldset`/`legend` per function, `aria-pressed` on choices, `aria-live` on counter values, real `<button>` and `<label>` elements.
- The host household page's use of `Stepper`.

## Constraints

- Works at 360 px with no sideways scroll, and inside WhatsApp's in-app browser. No images: inline SVG and CSS only.
- Touch targets at least 44 px.
- Text contrast at least 4.5:1. **Never use `sky` (`#aec4d4`) for text.**
- No layout jump when switching language: long Marathi text wraps.
- UK/India English in any new English copy.

## Process

1. Branch `ui/guest-flow` from `main` (or from `ui/landing-page` if that PR is still open; say which in the PR).
2. **Don't run `npm install`, `next build` or `next dev` locally**: Windows Smart App Control blocks the native binaries. Push, and let CI and the Vercel preview build.
3. Open a PR listing the files touched and the new i18n keys.
4. On the Vercel preview, open a real guest link (demo mode or a test household) and check all states at 390 and 360 px wide, in both languages:
   - is-this-you
   - reply with one "can't come"
   - the "answer every function" error
   - thank-you
   - change reply
   - not-us with a bad number, then a good one
   - an invalid token

   Post screenshots, or tell me what you couldn't check.
5. Stop. Don't restyle host screens in this PR.

## Done means

- All five screens match the references on a phone, in Marathi and in English.
- Every existing behaviour works exactly as before: the tests in `tests/` still pass and CI is green.
- Host pages look exactly as they did before.
