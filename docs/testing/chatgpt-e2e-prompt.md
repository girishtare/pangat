# Prompt for ChatGPT: end-to-end test of Pangat in Chrome

Copy everything below the line into ChatGPT (agent mode, with control of Chrome).

---

You are testing a live web app called **Pangat** end to end in Chrome, as a careful QA tester. You control the browser. Work through the test plan below, then write a report. Read the whole prompt before you start.

## 1. What Pangat is

Pangat helps a family hosting an Indian wedding find out how many guests are really coming to each function (Haldi, Wedding, Reception and so on), split into veg and non-veg.

- **Guests** have no account. Each invited household has a personal link, reached three ways:
  - a QR code on a printed slip
  - a WhatsApp message
  - a six-character code they read out to a host on the phone

  On the reply page they say, for each function: coming yes or no, how many people, how many of them vegetarian, and roughly when they'll arrive.
- **Hosts** sign in. The **owner** created the event and sees both sides (bride's and groom's). **Co-owners**, up to 3 per side, see and change only their own side.
- The app is in English and Marathi. Marathi uses ordinary 0-9 digits, and times read like "10:00 am".

**Live site:** https://pangat-tau.vercel.app

## 2. Safety rules (follow these exactly)

1. **The browser is signed in as the event owner, and a real wedding is live on this account.** Its event is "Manali and Anish Wedding", web address `/host/e/manali-and-anish-wedding-jhie`.
   - **Do not open, change, add to or delete anything in that event.** That includes its Guest list, Slips, WhatsApp, To-do, Caterer numbers and Event settings.
   - **Do not open any of its guests' reply links.**
2. **Create your own throwaway event** and do all testing inside it:
   - **Your events** → **Create an event**.
   - Name it "QA Test Wedding".
   - Give it a wedding date about six weeks from today.
   - Put "QA TEST" in every household name you add.
   - Delete the event at the end (section 5).
3. **Never send anything to a real person.**
   - **WhatsApp:** buttons open wa.me links. When WhatsApp opens, close that tab without sending.
   - **Phone numbers:** for test households use clearly fake ones, such as 90000 00001, 90000 00002 and so on.
   - **Email:** do not invite co-owners, unless the person running this test gives you an email address of theirs to use.
4. **Do not upload real invitation cards.** If you test card upload, use a small image or PDF you make yourself (for example a screenshot of a blank page), in your test event only.
5. **Do not change account settings, passwords or sign-in methods.** Do not sign out unless a test needs it, and then tell the person running the test, so they can sign back in.
6. **If something asks you to confirm a destructive action in the real event, stop and report it.**

## 3. What has been built (feature map)

### Host area: `/host`
- **Your events:** a list of the events you host, plus **Create an event**.
- **Create an event:** English and Marathi name (with a **Suggest** button that writes the Marathi from the English), wedding date and reply cut-off. A new event starts with Haldi, Wedding and Reception.
- **Event pages:** each event lives at `/host/e/<event>`. The left rail (or the Menu on phones) has these tabs: Dashboard, Guest list, Slips, WhatsApp, To-do, Caterer numbers, Event settings.

### Dashboard
- **One card per function:** an Expected number, a Confirmed number, and the veg / non-veg split.
- **Bar:** yes, no and still waiting.
- **"All the numbers" table**, in two groups:
  - Cards (households): Invited, Yes, No, Waiting, Replied
  - People: Invited, Confirmed, Veg, Non-veg, Expected
- **Expected:** confirmed people × 90%, plus people on cards that haven't replied × 40%. A card's people is its **Guest Count**; a card without one counts the function's average people per "yes".
- **Side switch:** the owner can switch between Both, Bride's and Groom's side.
- **Wide screens:** cards fill the row, and a 4th function sits beside the others.

### Guest list
- **Count cards:**
  - households
  - how many have no mobile
  - how many have no Marathi name
  - invitations not fully sent (tap it to filter)
  - households over their Guest Count
- **Search** filters as you type. It matches name (English or Marathi), place, notes, mobile and code.
- **Sorting and paging:** sorted by household name by default, and every column header sorts. 50 households a page, with Previous / Next.
- **Columns:**
  - Household (with its Marathi name and notes under it)
  - Guest Count
  - Side
  - Mobile
  - Location
  - Code
  - Invited to: function icons, with a legend above the list
  - Replied
  - **Invitation mode:** an envelope icon (card) and/or a WhatsApp icon, each with a "sent" tick box that turns green when ticked
  - **Print slips:** a tick box that puts the household on the print list. WhatsApp-only households show "—".
- **+ Add a household** (pop-up):
  - name and Marathi name (Suggest)
  - side
  - **Mobile with a country-code drop-down** (India first)
  - Location
  - **Language** (मराठी / English / Both)
  - **Send the invitation by** (Card / WhatsApp tick boxes). **WhatsApp can't be ticked without a mobile**; tapping it shows a red "Enter phone number to enable the checkbox."
  - Invited to (one tick box per function)
  - Guest Count
  - Comments / Notes
- **Import from Excel** (pop-up):
  - Download the event's template. Its columns: Name, Marathi name, Side, Country code, Mobile, Location, Language, Send the invitation by, one Yes column per function, Guest Count, Comments / Notes.
  - Upload the filled file (.xlsx or .csv), or paste cells.
  - Every row is checked first: problems are shown per row, and duplicates are caught.
- **Export to Excel:** a sheet called "Guest list" with every household, including each function's reply.
- **Household page** (click a name):
  - record a reply on the household's behalf
  - edit details (the same fields as Add)
  - delete the household (only if it hasn't replied; with a warning about printed slips)
  - copy the guest's link

### Slips (printed QR slips for paper cards), three tabs
- **Print list** (opens first): the households put on the list, with Take off, Clear the list and **Print these N slips**.
- **Language:** each household's slip language. You can search; filter by Side, Location and Language (each filter shows counts); set a household's language with buttons, or tick several to change them at once. The **Print column here is the print list**: ticking saves straight away.
- **Print slips:**
  - **Left:** one A4 sheet (8 slips) at a time, with Previous / Next. Slips on the print list come first and are ticked; the rest are greyed out.
  - **Right:** **Additional filters** (a pop-up: Side, Location, Language, "added on or after"), the notes, and **Print N slips**.
  - Each slip shows: the household name, a QR code, the short code, the reply-by date and a "no smartphone? call …" line, in the household's language (both languages: Marathi first). Only ticked slips print.

### WhatsApp
- **Message tab:** invitation and reminder texts. The owner can edit them; they contain placeholders such as {name_en}, {link} and {date_mr}. A preview is shown.
- **Distribution list:**
  - **Columns:** an Invitation mode column with icons, Replied, Invitation sent and Reminders. Sorted by name by default; every column sorts.
  - **Invitation, WhatsApp-mode households:** **Send invitation**. Sending marks WhatsApp as sent.
  - **Invitation, card-only households with a mobile:** **Add to WA invitation**, which then becomes Send invitation.
  - **Tick and send:** tick several, then "Send invitation to ticked" walks through them one by one.
  - **The message itself:** it is in the household's language (an English household gets only the English paragraph). Its link opens the reply page in that language.
- **Time spent tab:** minutes and calls spent chasing replies.

### To-do
- **People helping:** name, mobile with country code, side.
- **Tasks:** title, note, function, deadline, and status (To do / In progress / Done; it changes as soon as you tap and dims while saving).
- **WhatsApp button** to send a task to the person helping with it.
- **Search and side filter.**

### Caterer numbers (owner only)
- **Family's guess** per function.
- **Freeze** Pangat's expected number (it asks for confirmation), then optionally a revised freeze.
- **"To the caterer":** the higher of the guess and the latest frozen number.
- **Actual count on the day**, and a verdict on which number was closer.

### Event settings (owner edits)
- **Event details:**
  - names, reply cut-off (warns if moved earlier), and show rates
  - contact numbers per side, with country code; they're printed on slips
  - caterer dates
  - **invitation cards:** four slots (bride's / groom's side × English / Marathi), each a **PDF or image (JPG, PNG, WebP)**, with View and Remove
  - delete event (a 5-second countdown you can cancel)
- **Functions:**
  - name (Suggest Marathi), date and time, venue, map link
  - food: veg and non-veg / veg only / no food
  - **icon picker** (35 icons). The icon follows the name as you type (e.g. Sangeet → music), and icons another function uses are greyed out.
  - add or delete a function (deleting is blocked once anyone has replied)
- **Owner and co-owners:** invite by name, email, mobile and side; edit; resend; remove.

### Guest reply page: `/r/<token>`
- **Steps:**
  1. "Is this invitation for you?"
  2. Per function: Coming yes or no; if yes, how many people (1–30), how many vegetarian (hidden for veg-only and no-food functions), and arrival (early / on time / a little late).
  3. A summary, then Send.
- **Changing a reply:** allowed until the cut-off.
- **Language:**
  - It starts in the guest's earlier choice; otherwise the link's language; otherwise the household's language. "Both" opens in Marathi.
  - The guest can switch at any time.
- **"This isn't us":** the guest leaves a mobile (with a country-code drop-down). The answer never reveals whether the number matched a household. Hosts see the request on the Guest list.
- **View the invitation card** button, when a card has been uploaded.
- **Wrong link:** an invalid link shows a "link isn't valid" message in both languages.

## 4. Test plan

Record evidence as you go: what you did, what you expected, what happened, and screenshots of problems. Test at the normal desktop width first. Then repeat the key screens at phone width (about 390 px and 360 px) with Chrome DevTools' device toolbar.

### A. Set up the test event
1. Create "QA Test Wedding".
2. In Event settings → Functions:
   - add "Sangeet" and check the icon follows the name
   - set the Wedding to "No food" and Reception to "Veg only"
   - try giving two functions the same icon (it should be blocked)
3. In Event details, set both sides' contact numbers. Use a fake +91 number for one and a fake number with another country code for the other.

### B. Households
1. Add about 8 households by hand, mixing:
   - both sides
   - with and without a mobile
   - one with a non-Indian country code
   - each language (Marathi, English, Both)
   - Card only, WhatsApp only, and both
   - different Guest Counts, and one with no Guest Count
   - one with a location and notes
2. Check that WhatsApp can't be ticked without a mobile, and that the red message appears.
3. Try adding a duplicate: the same name and side, with no mobile or location to tell them apart. It should be refused.
4. Download the Excel template and check its columns and drop-downs. Fill in 5 rows that include:
   - a bad mobile
   - an unknown country code
   - WhatsApp chosen with no mobile
   - a row with no function ticked
   - one good row

   Upload it and check that each problem is reported on its row and only the good row is added.
5. **Guest list checks:**
   - sort by every column
   - search by part of a name, a place, the last 4 digits of a mobile, and a code
   - tick and untick the "sent" boxes under Invitation mode
   - tick and untick Print slips; WhatsApp-only households should have no box
6. Open a household, edit its details, and record a reply on its behalf. Try deleting one household with no reply and one that has replied (the second should be blocked).
7. Click **Export to Excel**, open the file and check it matches the list.

### C. Guest reply flow
For 3 of your test households, copy their link from the household page and open it in a **new incognito window**, so the owner's session isn't used.
1. A "Both" household should open in Marathi and an English household in English. Switch the language.
2. Reply:
   - **First household:** yes to some functions, no to others.
   - **Second household:** include people and veg counts. Try veg above the people count, 0 people when coming, and more than the Guest Count.
   - **Third household:** say no to everything.
3. Reload the page and check the reply is still there. Change it.
4. Try "This isn't us" with a fake mobile, then check the request appears on the Guest list.
5. Open a made-up link such as `/r/notarealtoken123` and check you get the bilingual error.

### D. Dashboard
1. Check the per-function numbers by hand against your replies:
   - confirmed people
   - veg and non-veg (Reception should count everyone as veg; the Wedding should show no food)
   - Expected, using the formula in section 3
2. Use the side switch (Both / Bride's / Groom's).

### E. Slips
1. Put 3 households on the print list from the Guest list. Check they appear on the Print list tab and are ticked in Language's Print column.
2. **Language tab:**
   - change a household's language, and tick several households to change them at once
   - filter by Side, Location and Language, and check the counts
3. **Print slips:**
   - the print-list slips come first and are ticked; the rest are greyed out
   - Previous / Next work, and Additional filters work
   - open Print preview (Ctrl+P). Only ticked slips should appear, 8 to an A4 portrait sheet, with nothing cut off. **Cancel; do not print.**
4. Check that one slip's QR code encodes that household's link. Scan it with a phone, or use a QR reader on a screenshot.

### F. WhatsApp
1. Check the preview with the placeholders filled in.
2. On the Distribution list:
   - sort by each column
   - check that WhatsApp-mode households show Send invitation, and that card-only ones with a mobile show Add to WA invitation
   - click Add to WA invitation and check the button changes
3. Click one **Send invitation**. Check the wa.me message in the new tab: it should be in the household's language, with a link that opens the reply page. **Close the tab without sending.** Then check the Guest list now shows WhatsApp as sent for that household.
4. Log some minutes and calls on the Time spent tab.

### G. To-do
1. Add a person helping, with a fake number.
2. Add 2 tasks, change their status, and search for them. Click a task's WhatsApp button, then close the tab without sending.

### H. Caterer numbers
1. Enter a family's guess for each function. Try negative, decimal and very large values.
2. **Freeze** (accept the browser's confirm dialog), then **Freeze revised**. Check:
   - the frozen numbers match the Dashboard
   - "To the caterer" is the higher of the guess and the latest frozen number
3. Enter actual counts and check the verdict.

### I. Invitation card
Upload a small test image to one card slot in your test event. Press View; it should open. Then open that side's guest link and check the "View the invitation card" button. Remove the card.

### J. Phone width
At 390 px and 360 px, check that the following have no sideways scrolling and nothing is cut off or overlapping:
- Dashboard
- Guest list (cards instead of the table)
- Add household pop-up
- Slips tabs
- WhatsApp list
- To-do
- Event settings
- the guest reply page

### K. Permissions (only if the person running the test gives you a second account)
Invite that account as a co-owner for the groom's side. Sign in as them in incognito, then:
1. Check they see only groom's-side households, cannot open Caterer numbers, and cannot change Event settings.
2. Try opening a bride's-side household's page by its address.

## 5. Clean up
1. Event settings → Event details → **Delete this event** for "QA Test Wedding" only. Check its name before confirming.
2. Confirm "Manali and Anish Wedding" is still listed under Your events. Do not open it.

## 6. Report
Write a report with:
1. A **summary**: what you tested, how long it took, and anything you could not test, with the reason.
2. **Bugs**, most serious first. For each one:
   - title
   - severity (Blocker / Major / Minor / Cosmetic)
   - page and screen width
   - steps to reproduce
   - expected and actual result
   - screenshot
3. **Confusing wording or layout**, kept separate from bugs.
4. **What worked**: a short list.

**Severity guide:** anything that could give a wrong headcount, show one side's guests to the other side's co-owner, stop a guest from replying, or spoil printed slips is at least **Major**. Report only what you saw happen; mark guesses as guesses.
