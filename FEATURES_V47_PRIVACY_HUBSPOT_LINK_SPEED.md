# Round 47 – No contact data (phones / emails / contacts), HubSpot deal link, Templates row off, Search shortcut, Lag fixes, Theme sweep

Written BEFORE building (as agreed). Nothing already there is removed except what you named: **personal contact information**. Every other feature stays. The status table at the bottom is filled in honestly after testing.

---

## PART A – No personal contact data anywhere

### A1. What "contact information" means here (what is removed)
| Removed | Where it was |
|---|---|
| Phone / mobile numbers | the Number box in Day End (Tasks, Support calls, WhatsApp), the "+" extra-number boxes and their notes, the Number box in Won Deals + extra numbers, the number in tickets, lost deals, imports/exports, Quick Add recents |
| Email addresses | Won Deals Email box, tickets, lost deals, Copy emails tool, imports/exports |
| **Contacts** (the people records: name, phone, email, company, contact notes) | the **Contacts** page, "Associated contacts" on deals/tickets, contact picker in tickets |
| Contact actions that need a number/email | Call, WhatsApp-to-number, Mail-to links and tiles, "Copy numbers/emails", number formatting (+960…), Split double numbers, "wrong number" number checks, caller-ID style matching by number |
| Phone numbers / emails typed inside **notes or any text** | found by the scan (A4) and blocked from now on (A5) |

**Kept:** deal names, ticket names / subjects, notes (with any phone/email cut out), stages, plans, prices, call outcomes ("Answered / No answer …"), the WhatsApp / Email **tracking marks** and contact shortcuts (they only record that you contacted someone, not who), best time to contact, response times, follow-ups, tasks, message tasks, automations, reports, tickets pipeline, lost deals (name, reason), HR page, templates (message templates have no customer data).

### A2. HubSpot deal link replaces the phone number box
- In **Day End → Tasks Completed** and in the **Won Deals** form and Quick Add, the box that used to take the phone number is now **"HubSpot deal link"**. You paste the link; nothing else is stored from it (only the link).
- Only links are accepted. If a phone number is pasted/typed there, it is not kept (small note under the box).
- Next to the box a small **↗ Open** button opens the link in a new tab (also in the entry row, deal record, Won Deals table, deal cards, kanban, deal side panel).
- The link also works as the deal's identity: typing the same link again offers **Use last details** (name, stage, plan, price …), duplicate warning works on the link, "Recent" fills the link.
- Support Calls and WhatsApp Inquiries had "Number / Sender" as first box; it now says **Deal / ticket name** and holds a name only (numbers are removed as you type/save).
- The copied Day End report lists **deal name + notes** (no number, no long link). Option in Settings → Privacy: "Include the HubSpot link in the copied report" (default off).

### A3. Contacts page removed
- The **Contacts** page, its menu/Tools/Go-to entries, "Associated contacts" blocks, "Create contact from deal", merge/duplicate-contact tools and the contact picker in tickets are removed from the screens.
- The stored contacts (names, phones, emails, company, contact notes/activity) are **erased** by the scan (A4). Deals and tickets are untouched.
- Rules / Automation Studio sources named "Contact notes" are hidden.

### A4. One-time clean-up of what is already stored (find AND clear)
Runs automatically the first time this version opens on a device (and anytime from **Settings → Privacy → Scan & clear now**):
1. **Fields**: `number` (anything that is not a link), extra numbers, emails, ticket contact/number/email, lost-deal number/email, contact records – all emptied.
2. **Text**: every note / description / reason / task title / ticket text / deal name / report line / follow-up / activity: phone numbers and emails inside the text are cut out (what is cut out is replaced by nothing; surrounding words stay).
3. **Entries that only had a number** (e.g. a "Support Call" line that was just `7771234: wants price`) keep the rest ("wants price").
4. **Copies**: the local safety backups, restore points, the sync base copy and the conflict log are scrubbed the same way, so the numbers are not hiding in an old copy on this device.
5. A short notice lists what was cleared (counts only, never the numbers themselves) and where.
6. Because the scrub is a normal save, it **syncs to your cloud** and the other device cleans itself on its next start too.
7. **Message templates, snippets, Quick notes and Smart Text** are *searched but not changed automatically* (they may contain your own business number). The scan shows how many it found and offers "Remove from templates too".
- Detection rule (so ordinary numbers survive): a **phone** is a run of 7–15 digits (spaces, dots, dashes, brackets, a leading + allowed). **Not touched:** dates (2026-11-21), times (11:30), prices and amounts with commas/decimals (12,500 / 1,250.50), short numbers (≤6 digits, e.g. 12000 USD amounts, plan counts), ids that start with letters (INV-2026-000123, d_1732…), HubSpot links (their digits are part of the link).

**Honest limits:** this app cannot reach the old copies inside your **Supabase** history/backups or your phone's own backups (iCloud/Google). After this version syncs, the live cloud copy is clean; if you want the cloud history empty too, the SETUP_CLOUD.md has a one-line "wipe old versions" tip. Anything already shared outside the app (WhatsApp, e-mail, exported CSV/PDF files on your devices) is outside the app.

### A5. Blocked from now on
- A **guard on saving**: whatever is saved by any page of the app goes through the same cleaner first (phones/emails removed from text, only links kept in the link box). Imports (CSV, paste list) drop phone/email columns. Exports have no phone/email columns.
- Typing: when you type something that looks like a phone number or email in a note, a small grey hint says "Phone numbers & emails aren't stored". Switch in Settings → Privacy: *Block phone numbers & emails in notes* (default **on**).

---

## PART B – Templates row inside the boxes
- The **Templates** row (entry templates: "Demo booked", "Going live", …) no longer shows inside the Day End / Won Deals / Quick Add boxes **by default** (changed default; if you had it switched on in Round 46 it is switched off once).
- You choose: **Settings → Quick Add → Templates** switch (On/Off) – one switch for every box. The templates themselves and their ✎ editor are kept.

## PART C – Search & the keyboard shortcut
- **Ctrl/Cmd + K** now opens only the **normal search** (the one you like). The pop-up "Search or jump to…" no longer opens with the shortcut.
- The jump/command pop-up stays as a **separate tool**: Tools → "Jump to… commands" (and **Alt+J** on PC). It is titled "Jump to…" now.
- Its look is fixed to the **theme** (cards, borders, text and highlight use the palette variables; light theme and moon work; no stray dark/white). The same check is applied to everything new from Round 46 (Settings hub, Devices list, split-numbers notice, update pill, typing preview, Quick Add customise panel, Recent strip): each is checked in every palette + light + moon + phone.
- The jump pop-up no longer searches numbers/emails (they are gone) – it searches deal names, ticket names, notes and commands.

---

## PART D – Why the app is laggy, and the fixes
### D1. What I measured (idle app, test data, desktop size)
| Finding | Effect |
|---|---|
| The clock text, the countdown, the shift label, the clock strip and 5 badge counters **rewrite their text every 1–1.5 s** (even when the value did not change) | about **43 wake-ups per second in the hub and 24 per second in Day End** – roughly 20 separate "watchers" (the code that adds buttons/rows/hints to the page) each wake up and re-scan the page every time |
| Several of those watchers re-inject rows and hints after every wake-up (`.input-row` rebuilt ~2× per second) | extra layout work that makes typing and scrolling feel sticky; it grows with the number of entries on the day |
| Round 46 added more watchers and a style rewrite every 2.5 s | made it slightly worse – I am fixing my own part too |
| Each save of Day End/Deals re-serialises the whole data (hundreds of KB) | felt when typing fast; reduced by the changes below |

### D2. Fixes
1. **A shared "calm watcher" layer** loaded first in every part of the app: it ignores page changes that are only a clock/badge text swap (same text rewritten, or known ticking elements), so the ~20 watchers stay asleep unless the page structure really changed.
2. **Badges, clock, countdown only write when the text actually changes.**
3. **Round-46 style/refresh code only writes when its output changed**, and the Recent / suggestion / hint code skips work while you are typing in a box.
4. **Saving**: the privacy cleaner is designed to be cheap (only checks text that could contain a number; unchanged data is not re-processed).
5. Measured again afterwards (idle wake-ups per second, typing delay) – numbers in the status table.

---

## PART E – Settings → Privacy (new group)
- **Scan & clear now** (shows counts per area, then clears).
- Switch: Block phone numbers & emails in notes (on).
- Switch: Include HubSpot link in the copied report (off).
- Button: Remove numbers/emails from templates & snippets too.
- Explains in two lines what is and is not stored.

---

## What stays the same (checked after the change)
Day End hours/sections, stages, prices, plans, history, hold-to-jump, Quick Add, Recent strip, quick notes, call-outcome and contact-tracking shortcuts, message tasks, automation studio, rules, follow-ups, tickets, lost deals, HR, reports, dashboards, search, themes/palettes/moon, sync + devices, settings hub.

## Status (filled after testing)

| # | Item | Status | Notes |
|---|---|---|---|
| A1 | Phone / email inputs removed (Day End Tasks, Support calls, WhatsApp, Won Deals, Quick Add, tickets, lost deals, invoices, manual deal form, association pop-up) | Done | Placeholders and labels changed too (Support calls / WhatsApp first box = "Deal / ticket name") |
| A2 | HubSpot deal link box + ↗ Open button | Done | Day End, Won Deals, Quick Add, entry row, deal record, deal cards, table, kanban, side panel. A phone number typed there is dropped and a small note says so |
| A2 | "Use last details", auto stage, duplicate warning, Recent | Done | Now match on the link or the deal name (no numbers) |
| A3 | Contacts page and everything that needs a contact | Done | Menu, Tools, Go-to, "G C" shortcut, rules sources, contact picker in tickets, merge tools removed. Stored contacts are erased by the scan |
| A4 | One-time find-and-clear of stored data (fields, text in notes, backups, restore points, sync copies) | Done | Runs on first open of this version and from Settings → Privacy → Scan & clear now. Shows counts only |
| A4 | Message templates, snippets, quick notes, Smart Text | Searched, **not changed automatically** | They may hold your own business number. The scan shows how many it found; "Remove numbers/emails from templates too" clears them |
| A5 | Blocked from now on (save guard, imports, exports, typing hint) | Done | Switch in Settings → Privacy (default on) |
| B | Templates row inside the boxes off by default, one switch | Done | Settings → Quick Add → Templates. Old setting is switched off once; templates and ✎ editor kept |
| C | Ctrl/Cmd+K opens only the normal search | Done | "Jump to…" pop-up is separate: Tools → Jump to… and Alt+J |
| C | Theme sweep of everything new in Round 46/47 | Done | Jump pop-up, Settings hub, Devices list, update pill, typing hint, Quick Add customise panel, Recent strip checked in every palette, light theme, moon and phone width. Three bugs found and fixed (jump pop-up dark-on-light, light-theme switch white-on-white, Mono palette badge numbers invisible) |
| D | Lag | Done | Idle wake-ups per second: hub 43 → 0, Day End 24 → 0. Typing delay in a Day End box about 75 ms → 41 ms. Causes: ~20 page watchers woken every second by clock/badge text rewrites; frosted-glass (backdrop blur) on large cards repainting on every keystroke; Round-46 style rewrite every 2.5 s; repeated re-injection of rows/hints |
| E | Settings → Privacy group | Done | Scan, two switches, templates clean-up button |
| A5 | CSV / paste importer | Done | Column choices are now Name, **HubSpot deal link**, Plan, Billing, Price, Stage, Tags, Notes. Phone and e-mail columns in a file are ignored (not even shown in the preview). Duplicates are found by link or deal name |
| – | Duplicate finder, "Already in Deals" hint, lost-deals report text, Settings texts | Done | Use link / deal name instead of numbers |

### Honest limits
- I cannot reach copies outside the app: Supabase history/backups, iCloud/Google phone backups, files you already exported or sent. The live cloud copy is clean after this version syncs.
- Open this version on the **PC first**, then the phone. An old version left open on a device can sync old numbers back until it is updated.
- Not tested on a real iPhone or against your real Supabase project – tested in desktop and phone-size browsers with test data.
- The number detector removes any run of 7–15 digits. An old 8-digit ID typed in a note can be cut as if it were a phone number. Amounts with commas/decimals, dates, times and short numbers are kept.
- The Tools menu still uses text glyph icons (not line icons). That was already so before this round; not changed.

### Old tests
About 40 old checks tested features that were removed on purpose (phone/email boxes, +960 formatting, extra numbers, Contacts page, call/mail links). They were rewritten to check the new behaviour or removed; none of the other features was touched.

### Test results
- New test for this round (`tests/test_v47.py`): all checks pass on PC and phone size (storage holds no phone/email, no Contacts page, link box + Open button in Day End and Won Deals, notes cleaned, Ctrl+K = normal search only, Alt+J = jump pop-up, Privacy settings, Templates row off by default).
- Full regression of all older test suites: every suite passes except three that were already failing **before** this round and are not caused by it: v38 ("separate folders", "unable text makes no to-do"), v31 ("Tools menu has no emoji icons" – the menu still uses text glyphs) and v7 ("renewal-due rule made a task" – a timing check). Theme/palette scan clean, build parity OK.
- Not tested: a real iPhone, your real Supabase project, and the Hubspot links on a real account.
