# Prompt for Claude Code: Expenses tab

Paste everything below the line into Claude Code, opened in the Pangat repo.

---

Add an **Expenses** tab: the owner lists every cost of the event, splits each one between the bride's side and the groom's side, records who paid what, and sees who owes whom. Build it in **two PRs**, and stop for my review after each.

This is beyond v1 scope (owner's request, 18 Nov; Pangat is already live, so build it now, but never touch the live event's data while testing). Add a line for it under "Stage 2" in `CLAUDE.md`.

## Reference designs

In `docs/features/expenses/`, each a `.png` plus `.html`:

| file | what |
|---|---|
| `expenses-web` | the tab on a laptop: summary, settle-up, due soon, filters, table |
| `expenses-edit-popup` | the add / edit pop-up (shown editing a shared expense) |
| `expenses-phone` | the tab on a phone |

- **The designs use the app's current look:** IBM Plex Sans and Space Grotesk, the real logo, the To-do tab in the rail.
- **Use the existing classes and components**: `.card`, `.btn`, `.input`, `.badge`, `.table-p`, `.choice`, `PageHeader`, `PopupButton`, `PhoneInput`, `useFormAction`. Don't copy the design files' inline styles.
- The `.html` files are design-canvas exports (`support.js`, `<x-dc>`, `<helmet>`). Read them for copy, sizes and colours only.
- **All names, vendors and amounts in them are sample data.**

## Who sees it

- **Owner only.** Add `{ key: "expenses", label: "Expenses", ownerOnly: true }` to the rail in `HostChrome.tsx` after Caterer numbers, and add it to `MobileNav`.
- The page uses `hostGate` and refuses anyone without `canManage`, exactly like Caterer numbers.
- In demo mode, show a short "Expenses need a database" message, as the sign-up page does.

## Data (migration `0029_expenses.sql`)

**Amounts are stored as whole paise in `bigint`. Never use floats.** Users type rupees ("1,20,000" or "120000.50"). Show them with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })`, adding paise only when there are any.

- **`expenses`**
  - `id uuid pk`, `event_id → events on delete cascade`
  - `title text` (1–120), `vendor text null` (≤120), `vendor_phone text null` (international form, checked with `normaliseMobile`)
  - `function_id uuid null → functions on delete set null` (null = "General")
  - `category text` with a check: catering, venue, decor, clothes, jewellery, gifts, music, photography, printing, travel_stay, rituals, other
  - `amount_paise bigint > 0`
  - `split text` check (`bride`, `groom`, `shared_pct`, `shared_amount`)
  - `bride_share_paise bigint`, `groom_share_paise bigint`: both ≥ 0, and a check that `bride + groom = amount`
  - `bride_pct_bp int null`: basis points, kept only for `shared_pct` so "60 / 40" redisplays exactly
  - `due_date date null` (when the rest is due), `bill_path text null`, `notes text null` (≤1000)
  - `created_by`, `created_at`, `updated_at`
- **`expense_payments`**
  - `id`, `expense_id → expenses on delete cascade`, `event_id`
  - `paid_on date`, `amount_paise bigint > 0`, `paid_by text` check (`bride`, `groom`)
  - `method text` check (upi, cash, bank, cheque, card), `note text null` (≤200)
  - `created_by`, `created_at`
- **`expense_settlements`** (PR B)
  - `id`, `event_id`, `from_side`, `to_side` (bride / groom, and different), `amount_paise > 0`
  - `paid_on`, `method`, `note`, `created_by`, `created_at`
- **RLS:** enable it on all three, with a **read** policy for the event's **owner only**, using the existing `private` helpers the way the caterer-numbers tables do. No write grants for `authenticated`. Writes go through server actions with the service-role key, as elsewhere.
- **Bills:** a new private Storage bucket `bills`.
  - Types: PDF, JPG, PNG, WebP. Maximum 20 MB.
  - Path `<event_id>/<expense_id>/<random>.<ext>`.
  - Upload straight from the browser through a one-time signed upload URL. View through a signed URL that lasts one hour. Copy the invitation-card pattern (`cardUploadTarget`, `CARD_TYPES` in `src/lib/store/admin.ts`).
  - Deleting an expense, or replacing its bill, removes the old file.

## Rules (put them in `src/lib/expenses.ts`, as pure functions with vitest tests)

1. **Split:**
   - `bride` → bride share = amount. `groom` → groom share = amount.
   - `shared_pct` → bride share = round(amount × pct), groom share = amount − bride share.
   - `shared_amount` → both entered, and they must add up to the amount exactly. Otherwise refuse with "The two shares must add up to ₹X."
   - "Half each" fills 50 / 50.
2. **Payments:** paid = the sum of the expense's payments, and it may not exceed the amount ("That's more than the ₹X still due."). Due = amount − paid.
3. **Status:** Paid (due = 0), Part paid (0 < paid < amount), Not paid (paid = 0).
4. **Settle up, for what's been paid so far.**
   - For each expense: bride's share of its paid amount = round(paid × bride share / amount); groom's = paid − that.
   - For each side: has paid = its payments + settlements it made − settlements it received.
   - Balance = has paid − its share of what's paid. The side with the negative balance owes the other the absolute amount.
   - Show "All square" when it is 0.
   - Also show each side's share of the total, "when everything is paid".
5. **Rounding:** do all maths in paise, rounding half up, so the two sides always add up exactly.
6. **Test with the sample in the design.** It must give Bride's side share ₹5,84,000, Groom's side ₹5,09,000, paid ₹7,18,000, due ₹3,75,000, and "Groom's side owes Bride's side ₹89,833". Also test: 0 payments; every expense one-sided; a settlement that clears the balance; rounding on odd amounts (₹1,001 at 33.33%).

## PR A: the tab, add / edit, payments, settle-up figures

- **Page** `/host/e/[slug]/expenses`, laid out as `expenses-web.png`:
  - Event line and `PageHeader` "Expenses", with "Only you, as the owner, see this page."
  - Summary cards: Total (with counts), Paid (with a green bar and %), Still due (count, and the next due date in maroon), and each side's share of the total (a maroon / sky bar with both amounts).
  - Settle-up card (sand): the headline "X's side owes Y's side ₹N", the four-column table, and the "when everything is paid" line. **The "Record a settlement" button arrives in PR B.**
  - "Due in the next 14 days" (light-blue box): expenses with money due whose due date is today to 14 days ahead, earliest first. **Overdue ones come first, in maroon, marked "overdue".**
  - Filters: search (title and vendor, filtering as you type, like the other lists), Function, Category, Who pays, Status. Use query params so filters survive a reload.
  - Table columns: Expense (title as the link that opens the pop-up; vendor and phone under it) · Function · Category · Amount · Who pays (mini bar plus "Shared 50 / 50" / "₹70,000 / ₹50,000" / "Bride's side only") · Paid (plus "by Bride's side" / "by Groom's side" / "both sides") · Due (amount plus "by 20 Dec") · Status badge · Bill (paperclip link, or "—").
    - **Function column left-aligned, the rest centred** (`.table-p`).
    - A totals row at the bottom.
    - Every column sorts. Default order: due date, then title.
  - Phone (`expenses-phone.png`): the summary as cards, settle-up, due soon, a Filter · Sort pop-up, and each expense as a stacked card.
  - **Empty state:** "No expenses yet. Add the first one: catering, hall, decor…" with the Add button.
- **Add / edit pop-up** (`PopupButton`, `useFormAction`, edit forms use `{ keep: true }`), laid out as `expenses-edit-popup.png`:
  - Fields: What is it?, Vendor, Vendor's phone (`PhoneInput`), Function (the event's functions plus "General"), Category, Total amount.
  - "Who pays for it": Bride's side only / Groom's side only / Shared, as `.choice` pills. Shared shows "Split by Percentage | Amount", a "Half each" button, the two side fields (each showing the other unit beside it), a live bar, and "✓ Adds up to ₹X" or a maroon error.
  - Payments: a list (date, amount, paid by, how, Remove) and an inline add row. Then "Paid ₹X · Still due ₹Y" and "Rest due by" (date).
  - Notes. "Delete expense" asks for confirmation and deletes its payments too. **In PR A, the bill box shows "Bills: coming next".**
- **Changing the amount or the split** when payments already exceed the new amount: refuse, with the message.

## PR B: settlements, bills, export

- **"Record a settlement"** pop-up: from side, to side (pre-filled from the balance), amount (pre-filled with what is owed), date, how, note.
  - Below the settle-up table, a "Settlements" list with Remove.
  - The balance includes them, and the headline becomes "All square" when cleared.
- **Bills:** the dashed upload box in the pop-up, the paperclip in the table opening the signed URL in a new tab, and "Replace" / "Remove" when one exists.
- **Export to Excel** (`/host/e/[slug]/expenses/export`, exceljs, like `exportGuests`). Three sheets:
  - **Expenses:** title, vendor, phone, function, category, amount, split, bride share, groom share, paid, due, due date, status, notes.
  - **Payments:** expense, date, amount, paid by, how, note.
  - **Settle up:** each side's share, has paid, balance.

  Amounts are numbers in rupees, formatted `₹#,##,##0`.

## Constraints

- UK/India English and Indian digit grouping everywhere.
- Text contrast at least 4.5:1. **Never use sky (`#aec4d4`) for text.**
- Touch targets at least 44 px. Works at 360 px with no sideways scroll; wide tables scroll inside their box.
- Times and dates as elsewhere (`src/lib/when.ts`).

## Process (each PR)

1. Branch `feat/expenses-a`, then `feat/expenses-b`.
2. **Don't run `npm install`, `next build` or `next dev` locally**: Windows Smart App Control blocks the native binaries. Push, and let CI and the Vercel preview build.
3. **Pangat is live with real guests.** The migration must be additive only: new tables, a new bucket and new policies, with nothing that alters or locks the existing tables. Apply it to Supabase the way earlier migrations were applied, and record it in `CLAUDE.md`.
4. On the preview (it uses the live database):
   - test on a **separate test event that you create**, never on the live wedding;
   - enter the six sample expenses from the design there, and check that every total, and the ₹89,833, match;
   - delete the test event when you're done, and say so in the PR;
   - check that a co-owner can't see the tab or open its URL;
   - check at 1440, 390 and 360 px wide.

   Post screenshots, or tell me what you couldn't check.
5. Stop after each PR.
