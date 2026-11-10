# Pangat: product brief for a UI redesign

*Plain-language description of what Pangat is and does today, written for a designer (human or AI) creating a new visual design. Every screen and rule below already exists and works; the job is to make it look and feel wonderful without changing what it does.*

---

## 1. What Pangat is, in one paragraph

Pangat tells the family hosting an Indian wedding how many guests are really coming. Instead of guessing from a stack of printed invitation cards, every invited family ("household") gets its own personal reply link, by WhatsApp and as a QR code on a slip tucked into their printed card. The family opens it on their phone, says who is coming to each wedding function (Haldi, Wedding, Reception…), how many people, and how many eat vegetarian, in Marathi or English. The hosts see live headcounts per function, split by veg and non-veg, plus an "expected" number that allows for people who haven't replied yet. That expected number is what they give the caterer.

The name: a *pangat* is the traditional row of guests seated together for a wedding meal.

## 2. Why it exists (the problem)

- A typical Maharashtrian wedding sends out around 400 printed cards and expects 700–800 people, but nobody knows the real number until the day.
- The caterer needs a final count weeks earlier (in our first wedding, on 15 December for a 28 December wedding; it can still change until 24 December).
- Families ring each other for weeks to find out who is coming. Over-ordering wastes food and money; under-ordering embarrasses the hosts.
- Pangat replaces guesswork and phone-chasing with a reply from each family, and gives a defensible number.

## 3. Who uses it

| Person | Who they are | Device and skill | What they need |
|---|---|---|---|
| **Guest family** | Relatives and friends invited to the wedding, many over 60 | A phone, opened from WhatsApp or by scanning a QR code; often low tech confidence; may prefer Marathi | Understand the invitation in seconds, reply in under a minute, without signing up or typing much |
| **Owner** | The person who set up the event in Pangat (usually from the bride's or groom's family) | Phone and laptop | Set up the event, load the guest list, send links, watch the numbers, decide the caterer's count |
| **Co-owner** | Up to 3 helpers on each side (bride's side, groom's side), e.g. parents, siblings | Mostly phone; parents may be 60+ | See and work on their own side's guests only: send links, record replies taken by phone |
| **Caterer** (indirect) | Receives the number | — | One clear number per function, veg and non-veg |

**Design for the eldest user.** Large text, big tap targets, very clear single actions, no jargon, nothing that relies on hover or small icons.

## 4. Brand and feel today (to be elevated, not replaced)

- **Mood:** warm, festive, family, trustworthy; an Indian wedding, not a corporate SaaS. Celebratory but calm and uncluttered.
- **Current colours:** *kumkum* red `#8C1C13` (primary, buttons, headings), *haldi* turmeric yellow `#E3A008` (accents, borders, table headers), *paper* cream `#FDF8EF` (background), *ink* dark brown `#2B1D16` (text), WhatsApp green for "send on WhatsApp" buttons.
- **Type:** must render Devanagari (Marathi) beautifully alongside English; today uses Noto Sans and Noto Sans Devanagari. Marathi text is often longer than English.
- **Language:** every guest-facing screen is bilingual (Marathi first by default, one tap to switch to English, and the choice is remembered on that phone). Host screens are English for now.
- **Words used in the product:** "household" (one invited family = one card), "function" (one part of the wedding: Haldi, Wedding, Reception, Sangeet…), "side" (bride's side or groom's side), "reply", "expected", "baseline".

## 5. Where it runs

- A website, mobile-first. Guests always arrive on a phone. Hosts use phone and laptop. There is no app to install.
- Printed output: an A4 sheet of slips (see 7.6). Everything else is on screen.
- WhatsApp is the main channel. Pangat opens WhatsApp with a message already written; the host presses send from their own phone.

---

## 6. The guest experience (the most important screens)

The guest opens their personal link, e.g. from WhatsApp or by scanning the QR on their slip. No sign-in, ever.

### 6.1 "Is this you?"
- Top: language switch (मराठी / English).
- "You are invited" · the event name (e.g. the couple's wedding) · **the household's name** (e.g. "Shri. A. Joshi & family", shown in Marathi when available).
- Question: "Is this invitation for you?"
- Two big buttons: **Yes, that's us** · **No, this isn't us**.

### 6.2 The reply form (after "Yes")
- Intro line: "Help us host you well. Tell us who's coming."
- One card per function they are invited to (not every household is invited to every function). Each card shows: function name, day and time, venue.
- Per function: two big choices **Coming** / **Can't come**.
- If Coming:
  - **How many people?** with − and + buttons (1 to 30), starting at 2.
  - **How many vegetarian?** with − and + (only for functions where food is served), with "Non-vegetarian: N" worked out automatically.
  - **When will you arrive?** Early / On time / A little late.
- One big button at the end: **Send our reply**.
- If something is missing: "Please answer for every function."

### 6.3 Thank you / your reply
- "Thank you! We look forward to seeing you." (or a gentler line if they can't come).
- A summary per function: "Coming: 4 people (3 veg)" or "Can't come".
- "You can change this until 13 December" and a **Change our reply** button that reopens the form with their answers filled in.
- After the cut-off date: replies are closed; "Please call the family for any change."

### 6.4 "No, this isn't us"
- "Sorry about that. Enter your mobile number and the family will send you your own link."
- A mobile number field and **Send**, plus **Back**.
- Then: "Thank you. The family will check and send you your own link on WhatsApp." (It never reveals whether the number was found.)

### 6.5 Invalid link
- A friendly bilingual "This link isn't valid. Please check the invitation or call the family."

---

## 7. The host experience

### 7.1 Public pages
- **Home:** what Pangat does (three short points), **Create a free account**, **Sign in**.
- **Create account:** **Continue with Google**, or email + password (confirmed by an email link). "Sign-up with a mobile number is coming later."
- **Sign in:** Google, or email + password; links to create an account and "Forgot your password?".
- **Forgot password:** enter email → "If that email has an account, a link is on its way."
- **Choose a password:** reached from an invitation email or a reset email.

### 7.2 Your events
- List of events the person owns or helps with, each showing the event name, first date, and their role ("Owner" or "Co-owner, Bride's side").
- **Create an event** button. (Someone with only one event goes straight into it.)

### 7.3 Create an event
- **Kind of event:** Wedding (others "coming soon").
- Event name in English and Marathi, wedding date, optional reply cut-off (default 15 days before the wedding).
- It starts with three functions automatically: **Haldi** (the day before, 10 am), **Wedding** (11:30 am), **Reception** (7 pm), all editable later.

### 7.4 Inside an event: navigation
A header with the event name (English and Marathi), the signed-in person and their role, and tabs:
**Dashboard · Guest list · Slips · WhatsApp · Caterer numbers · Event settings** (the last two only for the owner) · Sign out.

### 7.5 Dashboard (the "how many are coming" screen)
- A table per side the person may see. The owner sees "Both sides" first, then "Bride's side" and "Groom's side"; a co-owner sees only their side.
- One row per function with: invited households · yes · no · pending · % replied · confirmed people · veg · non-veg · **Expected** (highlighted, the key number).
- A line explaining Expected: "confirmed × 90% + pending households × average people per household × 40%" (the percentages are adjustable per event).
- A banner when guests have said "this isn't us" and are waiting for their correct link.
- *This is the screen the parents look at. It should feel like good news at a glance, with the expected number per function big and clear.*

### 7.6 Guest list
- Counts: households, how many have no mobile, how many have no Marathi name.
- **Wrong-link requests** at the top when any are waiting: "Someone opened the link for X and said it isn't them. Their mobile: …", with **Send their link on WhatsApp** or **Dismiss**.
- **Add one household:** English name, Marathi name, side, mobile, which functions they're invited to, optional cap (most people on this card).
- **Import from Excel:**
  1. Download the Excel template (it already lists this event's functions, with dropdowns).
  2. Fill it in, in Excel or Google Sheets.
  3. Choose the file → Pangat checks every row and shows each as new / already on the list / problem (with the row number and the reason) → **Add N households**.
  Pasting cells is also possible.
- **Households table** with search (name, mobile or code): name (English and Marathi), side, mobile, six-character short code, invited to, replied (yes / partly / no), cap. Each name opens the household page.

### 7.7 Household page
- Name, side, mobile, short code; **Copy guest link**; **Print this slip**.
- **Reply:** record a reply taken by phone or in person (same questions as the guest form). Shows how the last reply arrived ("by the guest, from the QR code" / "from their link" / "by a host, on their behalf").
- **Details and invitations:** edit names, mobile, cap, side, and which functions they're invited to.
- **Delete household** (only if they haven't replied).

### 7.8 Slips (printing)
- Explanation, filters (side, "only added on or after"), counts, warnings (e.g. "no contact number for the groom's side"), print tips, **Print slips**.
- The printed sheet: A4 with 8 slips (about 97 × 70 mm each) and dashed cut lines. Each slip shows: event name, the household name (Marathi large, English below), a QR code (about 31 mm), "Scan to tell us who's coming" in both languages, "Reply by 13 December", the six-character code in large letters, and "No smartphone? Call 98765 43210 and give your code."
- *The slip goes inside a printed wedding card that is already designed, so it should be elegant, quiet and readable, not loud.*

### 7.9 WhatsApp
- Two tabs: **Invitation (after the card)** and **Reminder (to pending households)**.
- The message text (Marathi then English, with the family's own link), editable by the owner, with placeholders like {name}, {date}, {link}, and a preview.
- A list of households still to do (or all): name, mobile, replied?, when the invitation was sent, reminders sent, and a green **Send invitation / Send reminder** button that opens WhatsApp with the message ready.
- **Time spent chasing replies:** log date, minutes, phone calls and a note; running totals.

### 7.10 Caterer numbers (owner only)
1. **Family's baseline:** the number the family would have ordered anyway, one per function, written down before replies arrive.
2. **The tool's number:** "Tool now" (live) beside "Tool frozen" (fixed on 14 December with a **Freeze** button), with a veg/non-veg split, and **To the caterer** = the higher of baseline and the frozen tool number.
3. **Actual count on the day:** total, veg and non-veg per function.
4. **Which number was closer?** For each function, how far off the family's baseline and Pangat were, and which won.
- *This screen tells the story of whether Pangat worked. It deserves a clear, satisfying visual comparison.*

### 7.11 Event settings (owner only)
- **Event details:** names, reply cut-off, the two "show rate" percentages, and a contact phone number for each side (printed on slips).
- **Functions:** each editable (names, date and time, venue, map link, "food served"), deletable unless someone has replied; **Add a function** (e.g. Sangeet), optionally inviting every household.
- **Owner and co-owners:** table (email, role, last signed in, dashboard visits); **Invite a co-owner** by email and side, up to 3 per side.

---

## 8. Rules the design must respect

- One household = one printed card = one link, one QR code and one short code.
- Guests never sign in. Hosts sign in with Google or email.
- A co-owner never sees the other side's guests or names.
- The vegetarian question appears only for functions where food is served.
- Replies can be changed by the guest until the cut-off date; after that only hosts can record changes.
- All times are Indian Standard Time.
- The expected-headcount formula and the "higher number goes to the caterer" rule are fixed decisions.

## 9. States to design for

- Empty states (no events, no households, nobody replied yet, all invitations sent).
- Loading and saving ("Sending…", "Checking…").
- Errors in plain words (wrong password, file can't be read, row problems in an import).
- Success confirmations (reply sent, households added, copied, saved).
- After the cut-off date (guest page closed).
- Long Marathi names and event names; households with no Marathi name or no mobile.

## 10. Accessibility and practical constraints

- Many guests and some hosts are over 65: minimum 16–18px body text on phones, large buttons, high contrast, generous spacing, no reliance on colour alone.
- Works on cheap Android phones over patchy mobile data: light pages, few images.
- Must work inside WhatsApp's in-app browser.
- Print layout for slips must stay exact: A4, 8 per sheet, 100% scale.

## 11. Not part of Pangat (don't design for these)

Seating, chairs or venue layout; vendor management; payments; ads; a native app; guest accounts; designing the printed wedding card itself.

## 12. Coming later (leave room, don't design in detail)

- Other kinds of events besides weddings (sides may not apply to them).
- Sign-up with a mobile number.
- Its own web address (currently on a temporary address).
