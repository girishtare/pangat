# Prompt for Claude Code: build the Pangat landing page

Paste everything below the line into Claude Code, opened in the Pangat repo.

---

Build Pangat's new public landing page at `/` (`src/app/page.tsx`), replacing the current plain home page. This is one stage: a single PR, then stop for my review.

## Reference design (read these first)

- `docs/design/landing/landing-web.html`: the web layout (1440 px wide, fluid down to phone width).
- `docs/design/landing/landing-mobile.html`: the phone layout (390 px).

These are design-canvas exports. Take the layout, spacing, colours, type sizes and copy from them. Don't copy their markup: they use inline styles and a canvas runtime (`support.js`, `<x-dc>`, `<helmet>`, `data-dc-script`). Rebuild the page as a normal Next.js server component with Tailwind v4 classes. **Use the copy exactly as written in the reference files**, English only.

## Page structure (top to bottom)

1. **Header** (sticky on web): the Pangat mark + wordmark on the left. On the right, "How it works" and "For families" anchor links (web only, hidden below `md`), then **Log in** (outline button) and **Sign up free** (filled maroon; the label is "Sign up" on phones).
2. **Hero**: a sand pill ("For Indian weddings and family functions"), the H1 "Know who is really coming.", a paragraph, two large buttons (**Create a free account**, **Log in**), and the line "Free · Nothing to install · Guests never sign up". On the right (stacked below on phones): a decorative phone mock-up of the guest "Is this invitation for you?" screen, with a floating "Wedding · expected 684" card showing a veg/non-veg bar. Mark the whole mock-up `aria-hidden="true"`; it is illustration, not UI.
3. **Problem band** (maroon background): "400 cards go out. 700 to 800 people are expected. Nobody knows the real number until the day." plus a short paragraph.
4. **How it works** (`id="how"`): three numbered cards (send each family its own link; they reply in a minute; you see the real number), each with a small inline stroke SVG icon. Three columns on web, stacked on phones.
5. **For families** (`id="families"`): two cards, "Made for the eldest guest" (sand background) and "Both sides, working together" (card background), each with a ✓ list.
6. **Final call to action** (dusty-blue background): "Start with your guest list.", **Create a free account** and **Log in**.
7. **Footer**: "Pangat — the traditional row of guests seated together for a wedding meal." The design has `[CONTACT EMAIL] · [PRIVACY LINK]` placeholders. **Leave them out**; don't invent an email address or a privacy page.

## Links

- Every "Sign up" / "Create a free account" → `/host/signup`.
- Every "Log in" → `/host/login`.
- Use `next/link`.
- Keep the existing **demo-mode** behaviour: when `isDemo()` is true, hide the sign-up and log-in buttons and show the existing demo section (guest-page links and host dashboard), restyled to match the new page.

## Colours (palette E). Add tokens; don't break the app

Add these to the `@theme inline` block in `src/app/globals.css`, alongside the existing ones:

| token | value | use |
|---|---|---|
| `--color-maroon` | `#790d16` | headings, primary buttons, problem band |
| `--color-maroon-dark` | `#5c0a11` | hover on maroon, text on sand |
| `--color-sand` | `#e5d3af` | panels, pill, card borders |
| `--color-cream` | `#f5efe1` | page background |
| `--color-sky` | `#aec4d4` | final CTA band, non-veg bar, the mark's centre |
| `--color-sky-ink` | `#4f6b80` | icons and ✓ marks in blue (text-safe on cream) |
| `--color-ink-e` | `#2e1a1c` | body text |
| `--color-ink-e-soft` | `#5e4446` | secondary text |
| `--color-card-e` | `#fffcf5` | cards |
| `--color-track` | `#ebe1cb` | empty part of the bar |

**Do not rename or change the existing `kumkum`, `haldi`, `paper`, `ink` tokens.** The rest of the app still uses them. Moving the whole app to palette E is a later, separate decision. Never use `sky` (`#aec4d4`) for text: it is about 1.5:1 on cream.

## Fonts (landing page only for now)

- Headings: **Rozha One** (weight 400 only; don't fake bold).
- Text: **Mukta** 400 / 600 / 700, body at **17 px** (Mukta runs small; 16 px is too small for older readers).
- Load both with `next/font/google` (`Rozha_One`, `Mukta`, subsets `latin`, `display: "swap"`) **inside the landing page or a route-group layout**, not in the root `layout.tsx`, so the host and guest screens keep Noto for now.
- Use Rozha only at 20 px and above.

## The mark

The design uses a new six-petal marigold mark: maroon petals, sky-blue centre. It's inline SVG in the reference header. Add it as a new `Mark` component, for example in `src/app/ui/kit.tsx`. **Don't change the existing `Marigold` / `Wordmark`**; the app still uses them.

## Constraints

- Mobile-first. It must work at 360 px with no sideways scroll, and inside WhatsApp's in-app browser. No images: inline SVG and CSS only, so the page stays light on patchy data.
- Touch targets at least 44 px; the hero buttons are 56 px.
- Text contrast at least 4.5:1 everywhere (white on maroon and ink on sky both pass).
- Real `<a>`/`<Link>` for every button; `aria-label` on the `<nav>`; decorative SVGs `aria-hidden`.
- UK/India English in any new copy.
- `layout.tsx` sets `robots: noindex`. Leave it. **Tell me** if you think the landing page should be indexable; that's my call, so don't change it.

## Process

1. Branch `ui/landing-page` from `main`.
2. **Don't run `npm install`, `next build` or `next dev` locally**: Windows Smart App Control blocks the native binaries. Push, and let CI (typecheck, tests, build) and the Vercel preview do the building.
3. Open a PR. In the description: what changed, and the files touched.
4. On the Vercel preview, check the page at 1440×900, 1366×768, 390 and 360 px wide. Post screenshots in the PR, or tell me what you couldn't check.
5. Stop. Don't restyle any other page in this PR.

## Done means

- `/` matches the reference design on web and phone.
- Sign-up and log-in links work.
- Demo mode still works.
- The host and guest pages look exactly as they did before.
- CI is green.
