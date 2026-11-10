# Prompt for Claude Code: new look for the host screens (dashboard and caterer numbers)

Paste everything below the line into Claude Code, opened in the Pangat repo.

---

Move the host screens to the new Pangat look, and restyle the **Dashboard** and **Caterer numbers** pages to the reference designs. One stage: a single PR, then stop for my review.

## Reference designs (read these first)

In `docs/design/host/`:

| file | what |
|---|---|
| `host-dashboard-web.png` / `.html` | Dashboard, laptop (1440 px), with the event rail |
| `host-dashboard-phone.png` / `.html` | Dashboard, phone (390 px), with the Menu bar |
| `host-caterer-web.png` / `.html` | Caterer numbers, laptop, shown **after** the wedding with all numbers filled in |

- **The PNGs show the look.** The `.html` files give exact sizes, colours and copy.
- **Don't copy the markup.** The `.html` files are design-canvas exports: inline styles plus a canvas runtime (`support.js`, `<x-dc>`, `<helmet>`, `data-dc-script`). Rebuild them with the existing components (`kit.tsx`, `HostChrome.tsx`) and Tailwind v4.
- **All numbers in them are sample data.** Real values come from `forecast`, `sides` and the store, exactly as today.

The guest-flow and landing designs, for consistency, are in `docs/design/guest-flow/` and `docs/design/landing/`.

## Part 1: switch the whole app to the new palette and fonts

So that no host screen is left in the old red-and-yellow look, change the **values** of the existing tokens in `src/app/globals.css`, not their names. Every page then follows automatically.

| existing token | new value |
|---|---|
| `kumkum` | `#790d16` |
| `kumkum-dark` | `#5c0a11` |
| `kumkum-soft` | `#f2e4d8` |
| `paper` | `#f5efe1` |
| `paper-deep` | `#ebe1cb` |
| `card` | `#fffcf5` |
| `ink` | `#2e1a1c` |
| `ink-soft` | `#5e4446` |
| `line` | `#e5d3af` |
| `haldi` | `#aec4d4` (dusty blue: fills, bars, borders only) |
| `haldi-deep` | `#4f6b80` (the blue that is safe for text and icons) |
| `haldi-soft` | `#dfe8ef` |

- **Leave `leaf`, `leaf-soft` and `whatsapp` as they are.**
- **Add new tokens:** `sand` = `#e5d3af` (panels: event card, "how Expected works" box, the highlighted Expected column) and `sand-deep` = `#b59a64` (the family's-guess bar).
- **If the landing or guest-flow PRs already added `maroon`, `cream`, `sky` and so on,** make them aliases of the tokens above, so there is one source of truth.
- **Fix every place where a yellow was hard-coded:**
  - `.btn-haldi:hover` `#cf9106`
  - the `.alert-warn` colours
  - the `.input:focus` ring `rgb(227 160 8 / .35)`
  - `.table-p tbody tr:hover`
  - the `Marigold` SVG in `kit.tsx`, which becomes the new six-petal `Mark`: maroon petals, `#aec4d4` centre. See the rail logo in `host-dashboard-web.html`.

  Grep for `#e3a008`, `#8c1c13`, `#c2410c`, `227 160 8` and `251 238 203`.
- **Focus ring:** `:focus-visible` must be `3px solid #4f6b80`. The new `haldi` (`#aec4d4`) is too faint on cream for a focus ring.
- **Fonts:** in `layout.tsx`, swap Noto for **Rozha One** (display, weight 400 only, used at 20 px and above) and **Mukta** (400/600/700, body **17 px**). Both cover Devanagari. Keep `"Nirmala UI", system-ui` as the fallback. Remove any `font-bold` on `font-display` text, because Rozha has no bold and faked bold looks smeared. If the landing PR already set up a shared fonts module, reuse it.
- **Contrast:**
  - text at least 4.5:1;
  - never put text in `haldi` (`#aec4d4`);
  - `.badge-groom` and `.badge-partly` must use `haldi-deep` text on `haldi-soft`, not yellow.

## Part 2: event shell (`HostChrome.tsx` / `MobileNav.tsx`)

Match the rail in `host-dashboard-web.png`:

- the Mark + "Pangat" at the top;
- a sand event card with the English name (Rozha), the Marathi name, the first date and "You are the owner" or the co-owner's side;
- 48 px nav links, the active one filled maroon with white text;
- the signed-in name, "All events" and "Sign out" at the bottom.

Phone: keep the existing Menu bar pattern, restyled as in `host-dashboard-phone.png`. **Don't change which tabs each role sees.**

## Part 3: Dashboard (`Dashboard.tsx`, `e/[slug]/page.tsx`)

- **Title:** "How many are coming", with "Updated just now · replies close on {cut-off}" under it.
- **Side switch:** replace today's stacked "By side" table with a **Both sides / Bride's side / Groom's side** segmented control. Implement it as links with a `?side=` query param, server-rendered, with no client state. Owner only. A co-owner sees their own side with no switch, exactly as today.
  - **This is a behaviour change. Call it out in the PR.**
  - `scopesFor` and `factsFor` decide what each person may see. Never show a co-owner the other side.
- **Wrong-link banner:** the existing waiting-lookup banner becomes the light-blue info box with a "Send their links" button to the guest list.
- **One card per function**, as in the PNG:
  - name, then day · time;
  - "EXPECTED" label and the expected number in Rozha, about 64 px (56 px on phone);
  - "Confirmed N · veg N · non-veg N";
  - a households bar: yes = `kumkum`, no = `haldi`, not replied = `paper-deep` track;
  - counts "N yes · N no · N waiting · X% of N replied".

  The wedding-day main function gets a 2 px maroon border. Use the existing `catered` / `main` flag if there is one, **otherwise skip the highlight**; don't invent one.
- **Legend line** under the cards, and the **"How Expected is worked out"** sand box. It must use the event's real rates (`show rate` percentages) and the real average people per household, not 90% / 40% / 2.2 hard-coded.
- **"All the numbers" table** (laptop only; on phone the cards carry the yes / no / waiting / replied counts as a 4-up row instead).
  - Columns: Function · Invited · Yes · No · Waiting · Replied · Confirmed · Veg · Non-veg · **Expected**.
  - **The Function column is left-aligned; every other column is centred.**
  - The Expected column has a sand header and a light-sand body, with numbers in Rozha.
  - Wrap it in an `overflow-x: auto` box.
- **Footnote:** "Invited, yes, no and waiting count households (one card each). Confirmed, veg and non-veg count people."

## Part 4: Caterer numbers (`e/[slug]/numbers/page.tsx`, `NumbersForms.tsx`)

- **UI label:** say **"Family's guess"** wherever the UI says "baseline"; the parents don't know the word. **Keep `baseline` in code, the database and tests.** The step 1 subtitle stays the existing explanation, reworded with "family's guess".
- **Order:**
  - **Once the actual counts are saved:** the verdict card goes **first**, then 1 · Family's guess, 2 · Pangat's number, 3 · Counted on the day.
  - **Before that:** steps 1–3 in order, with the verdict card at the bottom as an empty state: "Fill in the counts on the day to see which number was closer."
- **Verdict card** (2 px maroon border):
  - "Pangat was closer for N of M functions" (or "The family's guess was closer for…", or a tie), in Rozha about 36 px;
  - "Across all functions, the family's guess was off by X people; Pangat was off by Y";
  - then per function: name, "N came", a pill for the winner (maroon fill with ✓ when Pangat wins, sand when the family's guess wins), and two horizontal bars, family's guess (`sand-deep`) and Pangat (`kumkum`). Bar length = how far off it was, scaled to the largest miss on the page. Labels read "12 too many" / "34 too few".
  - Footnote: "Shorter bar = closer to the real count."
  - **Use the existing verdict logic** (`verdicts`, `baselineWins`). Don't re-implement it.
- **Step 2 table:** Function · Family's guess · Pangat now · Pangat frozen · Veg · non-veg · **To the caterer** (sand-highlighted, Rozha), plus a light-blue "Frozen on {date, time}" pill.
  - **Keep everything that exists:** the first-count freeze, the **revised count** freeze (migration 0010), the confirm texts, "caterer then", due and final dates. The design doesn't show the revised freeze; place it below the table in the same style.
  - Alignment as on the dashboard: Function column left, everything else centred.
- **Step 3:** one fieldset per function, with Total / Veg / Non-veg number inputs (48 px tall) and a "Save counts" button.

## Must not change

- Data, server actions, permissions, RLS, the forecast formula, the verdict rules, the freeze rules.
- Which pages and tabs each role can see.
- The guest pages' behaviour; they only pick up the new token values.
- The **print layout of slips**. Check the slips page still prints 8 per A4 at 100%. The colour change is fine; the layout must not move.

## Constraints

- Works at 360 px with no sideways scroll; tables scroll inside their box.
- Touch targets at least 44 px.
- No images: inline SVG and CSS.
- UK/India English.

## Process

1. Branch `ui/host-theme` from `main`. If the guest-flow or landing PRs are still open, say in the PR how this one relates to them.
2. **Don't run `npm install`, `next build` or `next dev` locally**: Windows Smart App Control blocks the native binaries. Push, and let CI and the Vercel preview build.
3. Open a PR listing the files touched and the side-switch behaviour change.
4. On the Vercel preview, check:
   - as owner and as a co-owner: Dashboard, Caterer numbers before and after counts, Guest list, Household, Slips (print preview), WhatsApp, Event settings;
   - at 1440, 1366, 390 and 360 px wide.

   Post screenshots, or tell me what you couldn't check.
5. Stop. Don't redesign the other host pages' layouts in this PR; they only get the new colours and fonts.

## Done means

- The Dashboard and Caterer numbers pages match the reference designs.
- Every other page has the new colours and fonts, with no yellow or old red left.
- Slips still print correctly.
- CI is green.
