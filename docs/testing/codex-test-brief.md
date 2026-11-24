# Pangat: project summary and test brief for Codex

Written 24 November 2026. It replaces the 12 November brief. **Read all of it before you start.**

You will **take control of Chrome** and test the live site end to end, as a careful QA tester, then write a report (section 9). The Chrome profile is already signed in to Pangat as the owner of a real wedding, so the safety rules in section 2 come first and override everything else.

`CLAUDE.md` in the repository is the source of truth for decisions and details. `README.md` is out of date in places; trust this brief and `CLAUDE.md` over it.

---

## 1. What Pangat is

Pangat tells a family hosting an Indian wedding how many guests are really coming to each function (Haldi, Wedding, Reception and so on), split into veg and non-veg, so they can give the caterer a better number.

- **Guests** have no account. Each invited **household** has a personal link, reached three ways:
  - a QR code on a printed slip that goes with the paper invitation card;
  - a WhatsApp message sent from a family member's own phone (a short link, `/i/<code>`);
  - a six-character code read out to a host on the phone (the host then records the reply).

  On the reply page they say, for each function: coming yes or no, how many people, how many of them are non-vegetarian, and roughly when they'll arrive.
- **Hosts** sign in (Google, or email and password). The **owner** created the event and sees both sides (bride's and groom's). **Co-owners**, up to 3 per side, see and change only their own side.
- The app is in **English and Marathi**. Marathi uses ordinary 0–9 digits, and times read like "10:00 am" in both languages.

**The pilot.** A real family wedding on **28 December 2026** is live in the app now (177 households, bride's side so far). It is judged on three numbers per function: the family's guess, Pangat's number frozen on 19 December, and the count on the day. Pangat earns its place only if its number is closer to the real count than the family's guess.

**Live site:** https://pangat-tau.vercel.app

### Stack (for context; you are testing in the browser, not the code)

| Part | Detail |
|---|---|
| App | Next.js 16 (App Router), React 19, Tailwind v4, TypeScript, zod 4 |
| Data | Supabase: Postgres, Auth, Storage. Row-level security on every table, no anonymous policies |
| Hosting | Vercel, functions in Mumbai. Every merge to `main` deploys to production |
| CI | GitHub Actions: typecheck, vitest unit tests (21 files, about 170 tests), build |
| Keep-warm | A database cron job opens `/r/keepwarm00`, `/i/keepwarm00` and `/host/login` every 5 minutes, so you will see those requests in logs. They are expected |

---

## 2. Safety rules (follow exactly)

1. **Do not touch the real wedding.** It is "Manali and Anish Wedding", address `/host/e/manali-and-anish-wedding-jhie`.
   - Do not open, change, add to or delete anything in it: Dashboard, Guest list, Slips, WhatsApp, To-do, Caterer numbers, Expenses, Event settings, Admin.
   - Do not open any of its guests' reply links.
   - If Pangat drops you into that event (it does when you host only one event), go to **All events** (`/host?all=1`) straight away.
2. **Make your own throwaway event** and do all testing in it:
   - **All events → Create an event.** Name it "QA Test Wedding", wedding date about six weeks from today.
   - Put "QA TEST" in every household name you add.
   - Delete it at the end (section 8).
3. **Never send anything to a real person.**
   - WhatsApp buttons open `wa.me` (or the phone's share sheet). Read the message, then **close the tab without sending**.
   - Use clearly fake numbers: +91 90000 00001, 90000 00002 and so on; for another country, +971 50 000 0001.
   - **Do not invite co-owners by email** unless the person running this test gives you an address of theirs.
4. **No real files.** For invitation cards and expense bills, upload a small image or PDF you make yourself (a screenshot of a blank page is fine), in your test event only.
5. **Do not change account settings, passwords or sign-in methods.** Do not sign out unless a test needs it; if you must, stop and ask the person running the test to sign back in.
6. **Browser confirm dialogs.** Several buttons ask "Are you sure?" with the browser's `confirm()`. Accept them only inside your test event. If any confirm or delete appears for the real wedding, cancel it, stop, and report it.
7. **Do not print.** Use Print preview (Ctrl+P), then Cancel.
8. **Do not merge, push, or change the repository, Supabase or Vercel.** You are testing only.

---

## 3. Settled decisions: do not report these as bugs

The owner has decided these; report them only if the app doesn't do what is described.

- Caterer dates: first count due 20 December, last change 24 December. Pangat's number is frozen the day before the first count (19 December).
- Replies are **yes or no** only; there is no "maybe".
- The guest page asks **"How many non-vegetarian?"**, starting at 0, with "Vegetarian: N" worked out underneath. Arrival starts at "On time".
- A household's **Guest Count** (cap) is a flag only. It never stops a guest replying with more people; the Guest list just shows "over their Guest Count".
- Show rates default to 90% (people who said yes) and 40% (people on cards that haven't replied).
- **Veg only** functions don't ask the diet question and count everyone as veg. **No food** functions ask no diet question.
- The real wedding has no groom's-side households yet, and some households have no mobile. Both are expected.
- A guest's own language choice beats the slip's or link's language, on that phone, for that household only.

---

## 4. Features (what to test)

### 4.1 Accounts (`/host/login`, `/host/signup`, `/host/forgot`, `/host/account/password`)
- Sign in with Google, or email and password (at least 10 characters). Anyone can sign up; email confirmation and password reset come by email.
- After sign-in: **All events** (`/host`, or `/host?all=1` to always list them) with **Create an event** (`/host/new`): English name and Marathi name (with **Suggest Marathi**), wedding date, reply cut-off (default 15 days before). Wedding is the only event kind; others say "coming soon". A new event starts with Haldi (day before, 10:00 am), Wedding (11:30 am) and Reception (7:00 pm).
- Each event lives at `/host/e/<event>`. The left rail (laptop) or Menu (phone) has: Dashboard, Guest list, Slips, WhatsApp, To-do, and for the owner only Caterer numbers, Expenses, Event settings and Admin. The event's name sits above every page.

### 4.2 Event settings (owner)
- **Event details:** English and Marathi name, reply cut-off (moving it earlier warns about printed slips), show rates, each side's contact number (with a country-code drop-down; printed on slips), the caterer's two dates.
- **Invitation card:** four slots (bride's / groom's side × English / Marathi). Each takes a PDF or JPG, PNG or WebP up to 20 MB, with View, Replace and Remove.
  - **Name on the envelope:** per uploaded card, a preview of page 1 with a real household's name and place, buttons to move and resize, Save. An "Add सहपरिवार / and family" tick. Whole page / Close-up switch.
  - **Places in Marathi:** every distinct household location written once in Marathi ("Suggest the missing ones"); used on the Marathi card.
- **Functions:** name (with Suggest Marathi), date and time, venue, map link; Food: Veg and non-veg / Veg only / No food; an **icon** from 35 (the icon follows the name as you type, e.g. Sangeet → music; icons another function uses are greyed out; two functions can't share one). Add a function (optionally inviting every household); delete one unless someone has replied to it.
- **Owner and co-owners:** invite by name, email, mobile and side (both, bride's, groom's); up to 3 per side; edit, Send again, Remove.
- **Delete this event:** a warning, then a countdown that Cancel or Escape stops.

### 4.3 Guest list
- **Count cards:** households; no mobile; no Marathi name; invitations not fully sent (tap to filter); over their Guest Count. A card turns into an all-clear when nothing is missing.
- **Search** filters as you type (about a quarter of a second after you stop): name in English or Marathi, place (English or Marathi), notes, mobile, code.
- **Sorting and pages:** household name A to Z by default; every column header sorts, blanks last; phones get a Sort by menu. 50 households a page with Previous / Next.
- **Columns:** Household (Marathi name and notes underneath), Guest Count, Side, Mobile, Location (Marathi place after the English), Code, Invited to (function icons, legend above), Replied, **Invitation mode** (an envelope for card and/or a WhatsApp icon, each with a "sent" tick box that turns green), **Print slips** (a tick box = on the print list; WhatsApp-only households show "—").
- **+ Add a household** (wide pop-up):
  - Name and Location, each "In English" | "In Marathi" side by side, with one **Suggest Marathi** for both (fills only empty boxes, with Undo).
  - Side | Mobile (country-code drop-down, India first), Language (मराठी / English / Both) | Send the invitation by (Card / WhatsApp; **WhatsApp can't be ticked without a mobile** and a tap shows a red "Enter phone number to enable the checkbox."), Invited to (one tick per function), Guest Count | Notes.
  - The English location offers the event's known places; a known place fills its Marathi.
  - Footer: **Save household and add new** (keeps side, language, invitation and functions; clears the rest; says "Added … · code …") and **Save household and close**.
  - Duplicates are refused: same side and mobile; or same side and name when neither mobile nor location tells them apart.
- **Import from Excel** (pop-up): download the event's template (Name, Marathi name, Side, Country code, Mobile, Location, Language, Send the invitation by, one Yes column per function, Guest Count, Comments / Notes, plus a "How to fill" sheet and drop-downs). Upload `.xlsx` or `.csv`, or paste cells. Every row is checked first; problems are listed per row; the button says "Fix N rows to add households" while any row has a problem.
- **Export to Excel:** a "Guest list" sheet with every household and each function's reply ("Yes · 4 (2 veg)", "No", "Waiting").
- **Household page** (click a name; it opens in a **new tab**):
  - **Details and invitations:** the same layout as Add. "‹ Save and back to Guest list" saves and closes the tab (it was opened from the list), and the Guest list tab refreshes itself.
  - **Record a reply on their behalf** (phone call or in person): per function yes or no, people, Non-veg (starts at 0 for a new reply), arrival. Works after the cut-off. After saving, the tab closes as above.
  - Copy the guest's link.
  - **Delete household**: only when they haven't replied, with a warning that their printed QR and code stop working for good.

### 4.4 Guest reply page (`/r/<token>`, short link `/i/<code>`)
Open these in a **new incognito window**, so the owner's session isn't involved.
- **First screen:** the invitation, with **card buttons** when a card is uploaded (two side by side for a "Both" household: "मराठी पत्रिका" / "इंग्रजी पत्रिका"). The card is made on the page with the household's name on the envelope. First tap opens it in a new tab; after that the button is a menu: Open, Save, Share (Share only where the phone can share files). Then "Is this invitation for you?" with **Yes, that's us** / **No, this isn't us**. This screen is sized to fit a phone inside WhatsApp (about 575 px tall at 360 px wide).
- **Reply form, per function:** Coming yes / no; if yes, how many people (1 to 30), **how many non-vegetarian** (starts at 0; "Vegetarian: N" underneath; changing the people count keeps the non-veg number), arrival (early / on time / a little late). Veg-only and no-food functions skip the diet question.
- **Summary** reads like "1 non-veg, 2 veg", then Send. The reply can be changed until the cut-off; after it the page shows the reply as closed (card buttons still work).
- **Language:** opens in the guest's own earlier choice **for that household on that phone**; otherwise the link's `?l=` (one-language slips and WhatsApp links carry it); otherwise the household's language ("Both" opens in Marathi). The guest can switch any time, and the switch is remembered for that household only.
- **"No, this isn't us":** the guest leaves a mobile (country box shows "+91"; tapping it lists every country). The answer is the same whether or not the number matches a household, at most 5 requests per link per day. Hosts see the request on the Guest list (and a banner on the Dashboard): one-tap WhatsApp of the matched household's own link, or Dismiss.
- A made-up link such as `/r/notarealtoken123` shows a bilingual "link isn't valid" page (HTTP 404).
- Source is recorded: `?s=q` on the URL = came by QR; otherwise WhatsApp link; host-recorded = on behalf.

### 4.5 Dashboard
- One card per function: **Expected**, Confirmed, veg / non-veg, a yes / no / waiting bar, and how many replied.
- **All the numbers** table: Cards (households): Invited, Yes, No, Waiting, Replied. People: Invited (Guest Counts added up, plus how many cards have none), Confirmed, Veg, Non-veg, Expected.
- **Expected** = confirmed people × 90% + people on cards that haven't replied × 40%. A waiting card's people = its Guest Count, or the function's average people per "yes" when it has none.
- The owner switches Both / Bride's / Groom's (`?side=`). A co-owner sees only their side, whatever the address says.

### 4.6 Slips (printed QR slips), three tabs
- **Print list** (opens first): households put on the list from the Guest list; Take off, Clear the list, **Print these N slips**.
- **Language:** each household's slip language; search; Side, Location and Language filters with counts (each counts within the ones before it); set one household or tick several; the Print column here *is* the print list (saved as you tick).
- **Print slips:** one A4 sheet (8 slips, portrait) at a time on the left with Previous / Next and "Sheet 2 of 9 · slips 9–16 of 72"; **Additional filters** pop-up (Side, Location, Language, added on or after) and **Print N slips** on the right. Print-list slips start ticked and come first; the rest are greyed out. Only ticked slips print. WhatsApp-only households never appear.
- **Each slip:** event name, household name, QR code, short code, "reply by 24th December 2026" (from the cut-off), and "No smartphone? Call <side's number> and give your code". One-language slips are in that language and their QR adds `&l=`; "Both" slips put Marathi first.

### 4.7 WhatsApp
- **Message** tab: invitation and reminder texts (the owner can edit; placeholders such as `{name_en}`, `{name_mr}`, `{event_en}`, `{date_mr}`, `{phone}`, `{link}`), with a preview. A household gets only its language's paragraphs; "Both" gets Marathi then English, then the link once.
- **Distribution list**, with Invitation and Reminder:
  - **Invitation** leaves off every household that has replied (any channel). It has no Replied column. WhatsApp-mode households show **Send invitation**; card-only households with a mobile show **Add to WA invitation** (then it becomes Send invitation); once sent, **Send again**. On phones, **Share card with their name** makes the household's card(s) and opens the share sheet.
  - **Reminder** lists only WhatsApp-invited households that haven't answered every function, and has a Replied column.
  - Sorted by name by default; every column sorts; 50 a page; tick several and "Send to ticked" walks through them in order.
  - Sending marks WhatsApp as sent (Guest list's Invitation mode turns green).
- **Time spent chasing:** log minutes and phone calls.

### 4.8 To-do
- **People helping:** full name, mobile (country code), side. The owner and co-owners are on it automatically.
- **Tasks:** title, note, optional function, deadline, status To do / In progress / Done (changes as you tap and dims while saving). Overdue tasks are marked. A WhatsApp button sends a task to its person. Search (task, note, person, function) and side filter.
- A co-owner sees and edits only their side.

### 4.9 Caterer numbers (owner only)
1. **Family's guess** per function.
2. **Freeze the first count**: "Freeze the day before the caterer needs the first count (freeze on 19 December; due 20 December)". It snapshots Pangat's Expected and its veg / non-veg split (asks to confirm; freezing again replaces it).
3. **Freeze a revised count** later (only after a first freeze; until the caterer's last date).
4. **To the caterer:** the higher of the family's guess and the latest frozen number.
5. **Counted on the day:** Total, Veg, Non-veg (total only for veg-only and no-food functions).
6. **Which number was closer?** Per function and overall, Pangat or the family's guess, with bars; plus the **non-veg share**: "Pangat 38% (260 non-veg, 420 veg) · on the day 42% (290 non-veg, 400 veg) · 4 points apart", and an average line under the headline. Inputs accept whole numbers 0 to 100,000.

### 4.10 Expenses (owner only)
- **Summary** tab: totals, per side, **Settle up** (who owes whom, rounded to whole rupees, with **Record a settlement** and a Settlements list), due soon.
- **All expenses** tab (`?tab=all`): the list with sorting and filters.
- **Add / edit expense** pop-up: title, function (or General), category, total, who pays (Bride's side only / Groom's side only / Shared by percentage or by amount), payments (date, amount, how, and "Paid by" only for shared expenses; a payment can be edited), rest due by, notes, and a **bill** (PDF / JPG / PNG / WebP up to 20 MB; View, Replace, Remove).
- **Export to Excel:** Expenses, Payments and Settle up sheets.

### 4.11 Admin (owner only)
- **Clear a reply:** every household with a reply, with its answers per function, channel and time; search by name, place, mobile or code. **Clear reply** shows the reply in a confirm, then deletes it and its history; the household is back to waiting and its link still works. Frozen caterer numbers don't change.

### 4.12 Co-owners (side limits)
- The menu hides Caterer numbers, Expenses, Event settings and Admin; opening them by address shows "Only the event's owner …".
- Guest list, Slips, WhatsApp lists, To-do and Dashboard show only their side; another side's household page is "not found".
- Every save checks the side and role on the server. (Checked live on 24 November by making a test account a co-owner; **trying to save across sides has not been tested live**.)

### 4.13 Looks and layout
- One palette: maroon, sand, cream, dusty blue; no yellow (except the saffron dot in the logo).
- English text IBM Plex Sans, headings Space Grotesk; Marathi Noto Sans / Noto Sans Devanagari.
- Times always "10:00 am" style.
- **No sideways scrolling at 360 px** anywhere; tables become stacked cards or scroll inside their box on phones.
- Errors appear under the field; forms keep what you typed after an error.

---

## 5. Test plan

Record evidence as you go: what you did, what you expected, what happened, and screenshots of problems. Test at a normal laptop width first (about 1366 × 768), then repeat key screens at 390 px and 360 px wide with Chrome DevTools' device toolbar.

### A. Set up
1. Go to `/host?all=1`. Create "QA Test Wedding". Try Suggest Marathi on the name.
2. Event settings → Functions: add "Sangeet" (the icon should follow the name), set Wedding to **No food** and Reception to **Veg only**, try giving two functions the same icon (refused).
3. Event details: set both sides' contact numbers (one +91, one +971; fake), caterer dates (first count about 5 weeks out, last change a few days later).

### B. Households
1. Add about 10 households by hand: both sides; with and without mobile; one +971 number; each language (Marathi, English, Both); Card only, WhatsApp only, both; different Guest Counts and one with none; a location (some typed two ways, e.g. "Pune" and "pune "); notes. Use **Save and add new** for most and **Save and close** for one.
2. Check WhatsApp can't be ticked without a mobile (red message).
3. Try a duplicate (same name and side, no mobile or location). It should be refused.
4. Download the Excel template, check its columns and drop-downs, fill 6 rows: a bad mobile, an unknown country code, WhatsApp with no mobile, no function ticked, a duplicate of an existing household, and one good row. Upload; each problem should be reported on its row and only the good row added.
5. Guest list: sort every column; search by part of a name, a Marathi name, a place, the last 4 digits of a mobile, a code; tick and untick the Invitation mode "sent" boxes and Print slips.
6. Open a household (new tab): edit details and use "Save and back" (tab closes, list refreshes); record a reply on their behalf. Try deleting one with no reply (allowed, with a warning) and one that has replied (blocked).
7. Export to Excel and compare with the list.

### C. Guest reply flow (incognito)
For 4 households, copy the link from the household page (or the short link from a WhatsApp message preview) and open it in **incognito**:
1. Language: an English household opens in English, a Marathi one in Marathi, a Both one in Marathi. Switch language on one, then open a different household: it must keep its own language.
2. Reply: yes to some, no to others; people and non-veg counts (try non-veg above people, people 0 when coming, people above the Guest Count, 31 people); a no to everything.
3. Reload: the reply is still there. Change it.
4. "No, this isn't us" with a fake mobile (and a bad one); check the request on the Guest list and the Dashboard banner; Dismiss it.
5. `/r/notarealtoken123` and `/i/zzzzzzzzzz`: the bilingual "link isn't valid" page.
6. At 360 px: the first screen fits without scrolling (default text size); nothing cut off.

### D. Dashboard
1. Check every number by hand against your replies: confirmed people, veg and non-veg (Reception counts everyone as veg; Wedding shows no food), Expected with the formula in 4.5.
2. Switch Both / Bride's / Groom's.

### E. Slips
1. Put 3 households on the print list from the Guest list; check the Print list tab and the Language tab's Print column agree.
2. Language tab: change one household, then several at once; filters and counts.
3. Print slips: print-list slips first and ticked; Previous / Next; Additional filters; Print preview shows only ticked slips, 8 per A4 portrait, nothing cut off (try a long name in both scripts). **Cancel.**
4. Check one QR code decodes to that household's link (with `&l=` for one-language slips).

### F. WhatsApp
1. Message preview has the placeholders filled in; a Marathi-only household gets only Marathi.
2. Distribution list: sort; Send invitation vs Add to WA invitation; households that replied are not on Invitation; Reminder shows only WhatsApp-invited households.
3. Click one **Send invitation**, read the wa.me message (right language, one link that opens the reply page), **close without sending**; the household now shows sent (Send again) and its Guest list icon is green.
4. Log minutes and calls under Time spent.

### G. To-do
Add a person helping (fake number) and two tasks; change status; search; WhatsApp button (close without sending); an overdue deadline shows as overdue.

### H. Caterer numbers
1. Family's guess for each function; try negative, decimal and very large values (refused).
2. Freeze the first count (accept the confirm); check it matches the Dashboard's Expected and split; freeze a revised count; check "To the caterer".
3. Enter counts on the day; check the verdict, the bars and the non-veg share lines by hand.

### I. Expenses
Add three expenses (one bride's side, one groom's side, one shared 60/40) with partial payments; attach a small test bill and view it; check Settle up by hand; record a settlement; edit a payment; export to Excel; delete one expense.

### J. Invitation card
Upload a small test image or PDF to one card slot; View; set the name position and Save; open that side's guest link (incognito) and use the card button (open, then the menu). Remove the card.

### K. Admin
Clear one test household's reply; check it shows as waiting on the Guest list and Dashboard, and its link opens the reply form again.

### L. Phone width
At 390 px and 360 px: Dashboard, Guest list, Add a household, household page, Slips tabs, WhatsApp list, To-do, Caterer numbers, Expenses, Event settings, Admin, guest reply page. No sideways scrolling; nothing cut off or overlapping.

### M. Co-owner (only if given a second account)
Invite it as a groom's-side co-owner of your test event. In incognito, signed in as them: check the menu, the owner-only pages by address, that only groom's-side households show everywhere, that a bride's-side household page by address is "not found", and try to change a bride's-side household through any form you can reach.

---

## 6. Things not yet tested by anyone (higher value)

- A co-owner trying to save something on the other side (section 5 M).
- Share card on a real phone (Android and iPhone), and the card's name placement on a PDF and an image card.
- Print preview with the current slip sizes and very long names; real paper.
- Excel round trip with a messy real-world file (merged cells, extra sheets, numbers stored as numbers).
- Expenses bills end to end.
- Large lists: the Guest list, Slips and WhatsApp list with 150+ households (create them by import in your test event).

## 7. Severity guide

At least **Major**: anything that could give a wrong headcount or split, show one side's guests to the other side's co-owner, stop a guest from replying, open a guest's page in the wrong household, break a printed QR code or spoil printed slips, or lose a reply. Report only what you saw; mark guesses as guesses.

## 8. Clean up

1. Event settings → Event details → **Delete this event**, for "QA Test Wedding" only. Check the name before confirming.
2. Check `/host?all=1` still lists "Manali and Anish Wedding". Do not open it.
3. Close any incognito windows.

## 9. Report

1. **Summary:** what you tested, how long it took, what you could not test and why.
2. **Bugs**, most serious first. For each: title, severity (Blocker / Major / Minor / Cosmetic), page and screen width, steps to reproduce, expected, actual, screenshot.
3. **Confusing wording or layout**, separate from bugs.
4. **What worked:** a short list.
