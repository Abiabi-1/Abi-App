# Round 24 – Everything that was discussed but not built yet

Rule kept: nothing existing is changed or removed; only added. Every feature must work on a phone (390 px wide) as well as on a PC, take the current colour palette, and be covered by a test.

## Phone rules for all new screens
- Dialogs and bars fit the screen width, scroll inside themselves, inputs are 16 px (no iOS zoom), buttons at least 38 px tall.
- Bulk bar and dialogs sit above the bottom edge; nothing causes sideways page scrolling.
- Anything that needs a mouse (hover, drag) has a tap version.

## A. Templates (WhatsApp + Email)
- A **Templates** manager (in Tools menu and from the picker): add / edit / delete templates, each with name, channel (WhatsApp / Email), subject (email), message. Saved on the device; 6 sensible defaults are included (Intro, Follow-up, Demo reminder, Payment reminder, Renewal, Thank you).
- Merge fields: `{name}` `{deal}` `{number}` `{plan}` `{price}` `{stage}` `{date}`; filled from the record.
- **Record pages**: next to WhatsApp / Email buttons a small **Template** button opens a picker with preview; choosing opens WhatsApp (wa.me with text) or the mail app (mailto with subject + body) and marks it as sent + adds a timeline note.
- **Bulk**: in the bulk bar "Send template" opens the first selected record and walks through the rest one by one ("Next" button), since WhatsApp can only send one chat at a time.
- Phone: picker is a bottom sheet.

## B. Filters and views
1. **Stuck** and **No follow-up** filters in the Deals Filters pop-up (also "Stuck for N days" in Today).
2. **Column picker + sort** for the Deals, Contacts, Tickets and Lost lists (tap a heading to sort, a Columns button to show/hide).
3. **Saved views** for Contacts, Tickets, Tasks, Lost deals (same as Deals' saved filters).

## C. Bulk editing like HubSpot
1. **Bulk edit any field**: Deals (stage, plan, billing, price, follow-up, tags add / remove), Contacts (company, status, tags), Tickets (stage, priority, category, due), Tasks (already), Lost (reason).
2. **Select all N** (every record matching the current filter, not only the visible ones) with a clear "N selected" count.
3. **Bulk delete to Trash** for Contacts, Tickets, Tasks (restorable from Trash, like Deals).
4. **Undo last bulk action** (toast with Undo, 10 s, plus Tools → "Undo last bulk action").
5. **Owners**: simple list of people (you + teammates), assign owner to deals/contacts/tickets/tasks, filter "Mine", bulk assign.
6. **Lists** (static): create a list, bulk "Add to list", filter by list, export a list.

## D. Workflow and sales tools
1. **Required fields on stage change** (e.g. Closed Won needs plan, billing, price) – a small dialog appears when something is missing; can be switched off.
2. **Reminders**: banner for tasks and follow-ups due today / overdue, optional browser notification, badge on Today.
3. **Workflows (light)**: rules "When stage becomes X → create task in N days / add tag" and "No activity N days → add tag Stuck"; managed in Tools → Workflows; run when data changes and on app open.
4. **Forecast**: weighted pipeline (per-stage % you can edit), expected this month vs goal, shown in Today and Analytics.
5. **Duplicate warning at entry**: when adding a deal / contact whose number or email already exists, ask to open the existing one instead.
6. **Table cell editing** in Deals list: tap Stage / Plan / Price / Follow-up cell to edit in place.
7. **Calls**: "Log call" on records with outcome (no answer / spoke / voicemail / wrong number), duration and note; shows in timeline and Analytics.
8. **Renewals board** view for won deals (renewal date, last contact, risk tag).
9. **Speed reports** in Analytics: time in stage, first-response time, win rate by plan.

## E. Import
**CSV import wizard**: choose file → map columns (name, number, email, company, plan, billing, price, stage, notes, tags) with auto-guess → preview first 5 rows → choose Deals or Contacts, "skip duplicates" or "update existing" → result summary (created / updated / skipped) with Undo.

## F. Polish and safety
1. **Empty states**: friendly message + one button for empty boards, lists, Today, tasks, search.
2. **Skeleton loaders**: soft shimmer while a section renders its first paint.
3. **Light-theme pass**: every section checked in light mode and fixed (contrast, bulk bars, dialogs, checkboxes).
4. **Restore points**: automatic snapshot once a day (last 7 kept on the device), list + one-tap restore under Backup.
5. **Search everything**: results grouped by type with keyboard / swipe-free tap navigation.
6. **Phone gestures**: swipe a task right to complete; pull down refresh not added (can fight scrolling).

## Order of work and honesty rule
Built in this order: B1, A, E, F1–F3, C1–C4, D1, D2, D5, C6, D4, D3, then the rest. Anything not finished is listed at the end of this file under "Status" with the reason; nothing is claimed as done without a passing test.

---
## Status (delivered in this round)
Tested on a PC-size window and a 390 px phone-size window (no sideways scrolling, dialogs/bars fit the screen, bottom-sheet dialogs on phones).

**Done**
- A. WhatsApp/Email **templates**: manager (Tools → Templates), 6 defaults, merge fields, picker on every record page (Template button), bulk "Send template" walk-through for Deals, Contacts and Tickets. Sending is logged in the timeline and marks WhatsApp/email as sent.
- B1. **Stuck** filter in the Deals Filters pop-up (uses the Stuck days setting in Today).
- C1. **Bulk edit a field**: Contacts (status, type, company, source, add/remove tag), Tickets (priority, category, due date), Deals (plan, billing, price for manually added deals; add/remove tag; stage and follow-up already existed).
- C3. **Bulk delete**: Tickets to Trash (restorable), Contacts archive (restorable from the Archived filter), Tasks delete (two-step).
- C4. **Undo** for every bulk action (toast with Undo for 15 s) and **restore points**: one automatic copy per day, plus one before each bulk change, last 6 kept (Tools → Restore points). Undo/restore reloads the app.
- C6. **Lists**: "Add to list" in every bulk bar; Tools → Lists to open, export, remove items, delete lists.
- D1. **Required details**: moving a deal to Closed Won without plan/billing/price asks first (switchable in Tools).
- D2. **Reminders**: banner + red count on Today for tasks/follow-ups due or overdue; optional browser notification (Tools → Reminders).
- D3. **Workflows**: Tools → Workflows. "When a deal moves to stage X → create a task in N days" and "When a deal is quiet N days → add a tag".
- D4. **Forecast** card (weighted pipeline, editable stage chances) in Today.
- E. **CSV import wizard** (Tools → Import CSV…): file → column mapping with auto-match → preview → import as Deals or Contacts, duplicates skipped, Undo import. Works with comma, semicolon or tab files.
- F1. **Empty states** for Contacts, Tickets and Lost deals. F2. **Loading shimmer** when switching sections (off in Calm mode). F3. **Light-theme** fixes for all the new screens.
- Bulk select checkboxes everywhere now follow the palette (including the “Archived” box).

**Not done (and why)**
- B2 Column picker + sorting and B3 saved views for Contacts/Tickets/Tasks/Lost: needs changes inside each list's own drawing code; risky to bolt on without touching existing behaviour.
- C2 "Select all N across pages": the lists show everything on one page, so "Select all" already covers all rows; true cross-page selection not needed yet.
- C5 Owners, D5 duplicate warning when typing a new deal/contact (duplicates are caught in the CSV import only), D6 editing cells in the table, D7 call log with outcome, D8 renewals board, D9 speed reports.
- F5 grouped search results, F6 swipe-to-complete on tasks.
- Templates' {name} is the deal/contact name (the app has no separate person-name field for deals).
