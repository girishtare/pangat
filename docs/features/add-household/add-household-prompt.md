# Prompt for Claude Code: a compact "Add one household" pop-up

Paste everything below the line into Claude Code, opened in the Pangat repo.

---

Redesign the **Add one household** pop-up on the Guest list (`src/app/host/e/[slug]/guests/AddHouseholdForm.tsx`) so it fits on a laptop screen without scrolling, puts the English and Marathi side by side, has one translate button, and ends with two save buttons. One PR, then stop for my review. **Pangat is live:** change nothing about how households are stored, except the Marathi place described below.

## Reference designs

In `docs/features/add-household/`:

| file | what |
|---|---|
| `add-household-laptop.png` / `.html` | the pop-up at 1440 × 900: no scrolling, buttons in a footer |
| `add-household-phone.png` / `.html` | the pop-up on a phone: the form scrolls, the two buttons stay on screen |

The `.html` files are design-canvas exports. Read them for layout, sizes and copy; build with the existing classes (`.input`, `.choice`, `.choice-check`, `.btn`, `.label`, `.hint`) and components (`PopupButton`, `PhoneInput`, `InviteByField`, `useFormAction`).

## Layout (laptop, 640 px and wider)

- Open it with `PopupButton wide` (48rem), the same width as Expenses.
- **Name**: one group heading "Name", then two boxes side by side, labelled "In English" and "In Marathi (optional)".
- **Location**: a group heading "Location (where they stay, optional)", then "In English" and "In Marathi" side by side.
- **One "Suggest Marathi" button** under the Marathi column (right-aligned), with the hint "Fills both Marathi boxes from the English. Check before you save." to its left. Remove the per-field Suggest buttons from this form.
- A thin rule, then two-column rows:
  - **Side** | **Mobile** (label "Mobile (for WhatsApp; blank if none)"; drop the separate hint line).
  - **Language** (label "Language (slip, WhatsApp, reply page)"; drop the hint line) | **Send the invitation by** (drop the hint line). The WhatsApp rule stays exactly as it is now.
- **Invited to**: full width, the function pills on one line where they fit.
- **Guest Count** (narrow, about 10rem) | **Comments / Notes**: a single-line input on laptops. Notes stays 500 characters max; if what's typed is longer than the box, it scrolls inside the box.
- Pills, inputs and buttons stay at least 44 px tall.
- **Target:** no scrolling at 1440 × 900. At 1366 × 768 a little scrolling is fine, but the footer must stay visible.

## Phone (under 640 px)

- Name and Location each become a bordered group, with "In English" above "In Marathi".
- The button reads "Suggest Marathi for both" and goes full width under the Location group.
- Everything else stacks, one per row. The form scrolls.
- **The footer is sticky at the bottom of the pop-up**, so both save buttons are always visible. "Save household and close" is on top; "Save household and add new" is under it.

## Footer and saving

- The footer is sticky at the bottom of the pop-up on every screen size. A status line sits on the left (or on top on phones), and the two buttons on the right:
  - **Save household and add new** (secondary)
  - **Save household and close** (primary)
- Use two submit buttons with `name="then"` and the values `new` and `close`. Read the submitter in `useFormAction`'s submit handler.
- **Pressing Enter in a text box = "Save household and add new"**, because it's the safer choice when adding many in a row. Put that button first in the DOM, and use CSS `order` for the phone layout.
- **After "add new" succeeds:**
  - Clear the names, location (both languages), mobile, Guest Count and notes.
  - **Keep** Side, Language, Send the invitation by and Invited to. People enter many households of the same side in a row.
  - Show "✓ Added {name} · code {SHORTCODE}" in the footer status line. It stays until the next save.
  - Put the cursor back in "Name, In English".
  - Refresh the Guest list behind the pop-up, so the new row and the counts appear.
- **After "close" succeeds:** close the pop-up (`form.closest("dialog")?.close()`). Show the same "Added …" message as a success alert on the Guest list page, and refresh the list.
- **On an error:** keep everything typed (the existing `useFormAction` behaviour), show the error in the footer status line in maroon, and scroll the first bad field into view.
- While saving, both buttons are disabled and the clicked one reads "Saving…".

## Suggest Marathi (one button, both fields)

- One click asks for the household name (kind `household`) and the place (kind `place`) **in parallel**, using the existing `suggestMarathiAction`.
- **It only fills Marathi boxes that are empty.** If both are already filled, it replaces both and offers **Undo**, which puts back what was there.
- If an English box is empty, skip that one. If both are empty: "Type the English name or location first."
- One status line under the button: "Suggested. Check them before you save." / the error, with Undo.
- Factor the shared logic out of `MarathiInput` (for example a `useMarathiSuggest` hook), so the Edit household form and other pages keep working unchanged.

## Location in Marathi (no new column)

Marathi places already exist **per event**, keyed by the English place as typed: `events.place_names_mr` (migration 0031), edited on Event settings → Invitation card → Places in Marathi. **Use that.** Don't add a column to `households`.

- **The English location box gets a `<datalist>`** of the event's existing locations, so families at the same place are typed the same way. The map is keyed by the exact text, so this matters.
- When the English location matches a known place (on change or blur) and the Marathi box is empty, fill the Marathi from the map.
- **On save:**
  - If the Marathi box has text, set `place_names_mr[location] = marathi`, using the same server code Event settings uses, with the owner-or-side permission check it already has.
  - If that place already had a *different* Marathi spelling, overwrite it, and say so in the success message: "Marathi for {place} updated for every household there."
  - An empty Marathi box changes nothing in the map.
- **Co-owners:** they can add households today. Check whether they may write `place_names_mr`. If not, they still see and use the Marathi box filled from the map, but a new or changed Marathi place is saved only when the owner saves it. In that case, show the hint "Only the owner can save a new Marathi place."
- **Tell me in the PR which of these you implemented.**

## Must not change

- The `addHousehold` action's validation and rules: names, side, mobile, country code, location length, language, invite modes (WhatsApp needs a mobile), Invited to, Guest Count, notes, duplicate checks.
- The Excel import, the Edit household form, the guest pages, and the slips. (Making the Edit household form match is a later PR; don't do it now.)
- Accessibility: real labels for every box. Each "In English" / "In Marathi" label must still name its field, for example `aria-label="Name in English"`, because the group heading alone isn't read with the box.

## Process

1. Branch `ui/add-household-compact`.
2. **Don't run `npm install`, `next build` or `next dev` locally**: Windows Smart App Control blocks the native binaries. Push, and let CI and the Vercel preview build.
3. On the preview, using a **test event that you create** (never the live wedding):
   - add three households in a row with "add new";
   - check that Side, Language, Invite by and Invited to were kept;
   - use Suggest Marathi with both boxes empty, then with one filled, then with both filled (check Undo);
   - type a location that already exists and check the Marathi fills itself;
   - press Enter;
   - save with an error (WhatsApp ticked, no mobile);
   - save and close.
   - Check at 1440 × 900 (no scroll), 1366 × 768, 390 and 360 px wide. Post screenshots.
   - Delete the test event afterwards.
4. Record the change in `CLAUDE.md` (UI section). Stop.
