# docs/design: superseded proposal (10 Nov 2026)

**Do not implement anything in this folder.** It is kept as history only.

These are the design boards and Claude Code prompts from the 10 Nov redesign
proposal (landing page, guest flow, host screens, account pages). Most of it was
built between 10 and 12 Nov, and the owner has changed the look since. Where this
folder and the app disagree, the app is right.

**Source of truth for the UI: `CLAUDE.md`, section "## UI"**, and the code in
`src/app/globals.css`, `src/app/fonts.ts` and `src/app/ui/`.

Known differences (not complete):

| These files say | Decided since |
|---|---|
| Rozha One + Mukta fonts, 17 px host body | IBM Plex Sans + Space Grotesk, Noto for Marathi; 15 px host body (12 Nov) |
| A drawn six-petal "Mark" | The real logos in `docs/brand` via `src/app/ui/Logo.tsx` (11 Nov) |
| Rail without To-do | Rail includes To-do |
| Freeze on 14 Dec | First count 20 Dec, last change 25 Dec |
| "Cap" | "Guest Count" (14 Nov) |
| One Slips page | Print list / Language / Print slips tabs (14 Nov) |
| No invitation mode, no location, no country codes | All three exist (12-14 Nov) |

The prompts here (`*-prompt.md`) must not be run again: re-running them would undo
those decisions.
