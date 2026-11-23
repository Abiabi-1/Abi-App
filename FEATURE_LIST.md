# Day End Report + Deals Tracker → HubSpot-style CRM
### Feature list, fixes, and build plan

---

## 0. Ground rules (apply to every phase)

1. **Do not change anything that already exists.** Layout, colors, wording, buttons, report formats, export formats, copy formats, shortcuts and behavior stay exactly as they are today.
2. **Do not remove anything that already exists.** Nothing is deleted, hidden, merged away or replaced. Renames are the only exception, and only the ones requested below (Customers → Contacts, with Deals as the main record).
3. **Only add features and fix issues.** Every change is either a new capability or a fix for a listed issue.
4. **Existing data must survive.** All saved Day End days, deals, customers, tasks, notes, reminders and Smart text data must load unchanged. Any new fields are additive.
5. **Prove it, don't claim it.** After each phase, run a parity check: the same saved data must produce the same Final Report text, Deals report, Excel exports, Monthly/Yearly reports and Copy output as the current file.
6. Keep the original file untouched as a backup. All work happens on a copy.

---

## 1. Recommendation: app first, or add features to the HTML?

**Short answer: yes, turn it into a proper app first, but as a lossless conversion (no visible changes), and add the cloud part after that.** Don't do the cloud move and the new features in the same step.

### Why the single HTML file is the wrong place for this
- **Size.** The file is about 685 KB (roughly 8,100 lines). It is too big to read in one go, so every change means searching for the right spot, editing, and re-checking. That is where the usage goes.
- **Nested pages.** The Day End Report and Deals Tracker are stored as escaped text inside `iframe srcdoc` attributes. Every edit there needs special handling, which makes changes slower and easier to get wrong.
- **Risk to the "don't change anything" rule.** In one file, a small edit can touch something unrelated. In separate files, a change to Tickets can't affect the Day End Report.
- **HubSpot scope.** Tickets, multiple pipelines, associations between contacts, deals and tickets, saved views and reports would add several thousand lines to an already overloaded file.
- **Storage limits.** Everything lives in the browser's `localStorage`: one browser, one device, roughly 5 MB, and it is lost if browser data is cleared. Tickets with history and notes will grow this a lot.
- **File mode quirks.** Opened as a plain file, some browsers block storage (the page already shows a warning for this).

### Recommended order
| Phase | What | Visible change? |
|---|---|---|
| **A. Safety net** | Full backup export of all current data, snapshot of the current file, and automated parity tests (report text and exports compared before/after) | None |
| **B. Lossless conversion** | Split into a multi-file project (hub, Day End, Deals, Contacts, Tasks as separate modules). Same look, same data keys, same outputs. Installable as a PWA (works like an app on phone and desktop, works offline) | None |
| **C. Fix + core features** | Task-note merge fix, Contacts/Deals rename and Deals-as-main, Tickets, pipelines | Yes (the requested ones only) |
| **D. Cloud sync** | Login, database, multi-device sync, automatic backups. Local-first, so it still works offline | Adds a login and sync status only |
| **E. Reports and extras** | Dashboards, templates, automation, etc. (section 7) | Additive |

### Status
- **Phase A: done.** Original file kept untouched with its SHA-256, fixed test data, and golden outputs (day report, monthly/yearly/all-days reports, plan breakdown, Contacts list, Tasks) captured from the original.
- **Phase B: done.** The app is split into 28 small source files plus a build script. Rebuilding gives back **your current file byte for byte** (same SHA-256), and the browser parity check passes. The check was also confirmed to fail when a report title is altered.
- **Phase C-0: done.** Backup and Restore buttons in the top bar (section 8, Data management).
- **Phase C-1: done.** "Deals Tracker" renamed to **Won Deals** (visible labels only), and Day End task notes now show on Contacts (section 3).
- **Next:** Phase C-2, Lost Deals (section 5b).

### Cheaper alternative (not recommended for the full scope)
Keep the one file and add the new features as extra script blocks loaded alongside, which is how the recent polish and copy-button additions were done. That is fine for the task-note fix and the rename alone. For Tickets and pipelines it gets expensive and fragile quickly.

### Cloud notes
- Customer phone numbers and emails would be stored online, so the cloud database must require login and must never sit behind a public link.
- Suggested stack: **Supabase** (Postgres, which fits contacts ↔ deals ↔ tickets relationships, plus login and live sync) or **Firebase**. The current code already isolates data access so it can move to Firebase later. Either works; decision needed (section 9).
- I can build and test the project here. Creating the cloud account, project and hosting needs your own accounts, so you would do the sign-up steps and I would give exact instructions.

---

## 2. Current state (do not change; for reference)

**Hub / top bar:** Day End Report, Deals Tracker (with count badge), Customers, Tasks (with count badge), Smart text button, theme-synced light/dark, sliding tab pill and crossfade section switching, scroll-to-top/bottom shortcut.

**Day End Report:** hourly blocks with Tasks Completed, Support Calls, Whatsapp Inquiries, Tickets Attended, Other. Task entries hold number, deal, notes, stage, plan, billing, price (USD/MVR), registers, extra numbers with per-number notes, additional notes, WhatsApp/Email marks, Follow-up button. Quick Add panel, day/month/year views, Final Report, Copy, Download Report/HTML, Export day/all days (Excel), Import file, Paste report, Save App HTML, Reset, Edit.

**Deals Tracker:** deals are the Closed Won tasks, kept in sync with Day End. Add/edit deals, extra numbers with notes (Copy notes), Plan Breakdown by day/month/year/all time, Final Report, Monthly and Yearly reports, exports/imports, Quick Add.

**Customers:** contacts built automatically from deals and Day End tasks (one number + deal name pair), list and pipeline views, filters, duplicates review, import from deals, notes, activities, tasks, export, WhatsApp/Email marks.

**Tasks:** follow-ups, auto deal-stage tasks, "No response" folder, reminders and notifications, search, Open/Done/All.

---

## 3. Fix: task notes are not merged into Customers (becomes Contacts)

### What is wrong today
When Day End tasks are synced into customers, only the **number, extra numbers, email, deal name and time** are carried over. The task's **notes** are not. The customer profile only shows a deal's notes under its Deals tab, and only for Closed Won deals. So a task like "No response, will call tomorrow" or "Demo done, waiting on owner" never appears on the customer, even though it is the most useful context.

Also, only Closed Won tasks get a stable id. Other tasks are identified only by day, hour slot and position, which is not safe to link to if entries are later deleted or reordered.

### Required behavior
**Done (Phase C-1).** Implemented as below, with one design change: notes are read live from the Day End data instead of being copied, so nothing is stored twice and no ids are needed.

- Every Day End task, at any stage, appears on its contact's **timeline** as a "Day End task" entry showing: date and hour, stage, the full note text, per-number notes ("Number - Note" lines), additional notes, and plan/price when Closed Won.
- The contact's **Notes** tab gets a separate group, "From Day End tasks", shown read-only and clearly marked. Hand-written notes stay separate and are never touched.
- The contact gets a **Latest note** field (the newest task note) shown on the list, board cards and overview.
- Editing or deleting a task in Day End updates or removes its linked entry automatically. Nothing the user typed by hand is ever overwritten.
- Search on Contacts also searches these notes.
- No stored copies and no new ids. Reports, exports and copy text are unchanged (checked by the parity tests).

### Acceptance tests
1. Add a "No response" task with a note and extra numbers with notes: the note shows on the contact timeline and Notes tab.
2. Edit the note in Day End: the contact entry updates. Delete the task: the entry disappears.
3. A hand-written contact note stays exactly as typed after multiple syncs.
4. Existing saved data loads and its old tasks appear on contacts too.
5. Final Report, Deals report and all exports are byte-for-byte identical to before.

---

## 4. Data model (HubSpot-style, relational)

Three main records plus associations. Any record can be associated with any number of the others.

| Record | Role | Key fields |
|---|---|---|
| **Deal** (main record) | The center of the system. Today's Closed Won deals plus every other stage | Name, pipeline, stage, plan, billing, price USD/MVR, registers, owner, source, created, close date, notes, next follow-up |
| **Contact** | A person or business number linked to deals and tickets (today's "Customers") | Name, company, phones (primary first), emails, owner, type, tags, source, address, WhatsApp/Email marks, last contacted, latest note |
| **Ticket** | A support case linked to a contact and optionally a deal | Subject, description, pipeline, stage, priority, category, source (call/WhatsApp/email), owner, created, due, last activity, resolution notes |
| **Activity** | Notes, calls, WhatsApp, email, meetings, Day End task entries | Type, date/time, body, outcome, linked records |
| **Task** | Follow-ups and reminders | Title, due date/time, priority, status, reminder, linked records |

Associations: Deal ↔ Contacts, Deal ↔ Tickets, Contact ↔ Tickets, plus every record ↔ Activities and Tasks. The record page of each shows the others in a side panel.

---

## 5. Deals (replaces "Customers" as the main section)

The new pipeline section is named **Deals**. The existing "Deals Tracker" tab is now **Won Deals** and the cancellations tab is **Lost Deals** (see 5b). All Won Deals features stay exactly as they are.

- **Pipeline view (board)** and **List view**, switchable, like today's Customers views.
- **Multiple pipelines.** Add, rename, reorder and remove pipelines.
- **Editable stages** per pipeline: add, rename, reorder, recolor, remove. Removing a stage with deals in it forces a move-to-another-stage choice first. Nothing is lost.
- **Default pipeline matches today's stages** (Interested, Demo Completed, Going Live, Waiting on Contact, Closed Won All, Closed Lost All, No stage, etc.) so nothing changes on day one.
- Drag cards between stages; also a "Move to…" menu (already exists, keep it).
- Board card shows deal name, primary contact, number, plan/price, last activity, next task, ticket count, owner.
- **Deal record page** (three-column like HubSpot): properties on the left, activity timeline in the middle (notes, calls, WhatsApp, emails, Day End task notes, stage changes), associations on the right (contacts, tickets, tasks).
- **Associated contacts** with a "primary contact" flag. Add, create or unlink contacts from the deal page.
- **Associated tickets** shown on the deal with status; create a ticket from the deal.
- Stage history with date and time per change, and "time in stage".
- Totals per stage column (count and value), weighted value optional.
- Won/lost flow: close date, lost reason (dropdown, editable list).
- Filters: stage, owner, plan, billing, price range, created, close date, last contacted, has open tickets, has overdue tasks, tag, source. Save any filter set as a **saved view**.
- Bulk actions: move stage, assign owner, add tag, add task, export, archive.
- Existing features stay: WhatsApp/Email marks, duplicates review, import from deals, Import file, Paste report, Export Excel, Download Report, Copy.

## 5b. Won Deals (rename) and Lost Deals (new)

### Rename
- **Done.** The tab and page heading **Deals Tracker** are now **Won Deals**. Only visible labels changed (tab, page title, heading, the Customers shortcut button and a tooltip).
- Report text, export file names and saved-data keys stay as they are, because "Paste report" and "Import file" read those titles. Old reports and backups keep importing. If you want report titles renamed too, that is a separate, explicit step (see section 10).

### Lost Deals (cancellations), managed the same way as won deals
A new tab, **Lost Deals**, that mirrors Won Deals feature for feature:
- Fed automatically from Day End tasks with the stage **Closed Lost All**, the same way won deals come from "Closed Won All". Entries sync both ways.
- **Churn subsection:** Day End tasks with the stage **Churn** appear in their own subsection inside Lost Deals, with the same tools and reports, so customers who left are kept apart from deals that were never won.
- Add, edit and delete lost deals; extra numbers with notes and Copy notes; additional notes; day navigation and day chips; Quick Add panel.
- Fields: deal name, numbers, email, **cancel reason** (editable dropdown plus free text), plan they were on, billing cycle, **value lost** (USD/MVR), registers, cancel date, notes.
- Breakdown by plan and by reason, for All time / Day / Month / Year.
- Final Report, Monthly and Yearly reports, Copy, Download Report/HTML, Export Excel, Import file, Paste report, in the same format style as the won deals.
- Counts badge on the tab, like the won deals.
- Links to the contact and deal records, and an optional "win-back" task.
- Won vs lost summary: win rate, revenue won vs lost, per month.
- The Deals section (pipeline) shows the same records in its Closed Lost stage, so there is one source of truth.

**Decided:** Lost Deals is fed by **Closed Lost All** only, and **Churn** is a subsection of Lost Deals. No new stage is added and no existing stage changes.

---

## 6. Contacts (renamed from Customers)

- Same list and pipeline views and filters as today, under the name **Contacts**.
- Contact record page: properties, timeline (including merged Day End task notes), associated deals, associated tickets, tasks, notes.
- Multiple phones and emails with a primary one; phone numbers normalized for matching (+960 handling) without changing what the user typed.
- Companies are optional grouping (a business with several contact people).
- Duplicate detection with a merge that keeps all history, deals and tickets.
- Tags, lifecycle status (Active / Inactive / Archived), owner, source.
- Click-to-call (`tel:`) and click-to-WhatsApp (`wa.me`) links on every number.
- Everything existing on Customers stays.

---

## 7. Tickets (new section)

### Views
- **Pipeline (board)** and **List**, switchable, like HubSpot.
- **Multiple ticket pipelines**: add, rename, reorder and remove pipelines (for example Support, Onboarding, Billing).
- Stages are editable per pipeline: add, rename, reorder, recolor, remove (with move-to-stage prompt).

### Default pipeline (your list)
Pending · Today · Waiting on us · Waiting on contact · Closed this month · Closed all

**Decided: automatic.** **Pending, Waiting on us, Waiting on contact** and **Closed all** are real stages a ticket is moved between. **Today** (tickets due or touched today) and **Closed this month** (tickets closed in the current calendar month) fill themselves automatically, so they never go stale and you never drag a ticket into them. They appear as built-in smart columns and smart views, and can be shown or hidden. A ticket can appear in a smart column and in its real stage at the same time.

### Ticket record
- Subject, description, priority (Low/Medium/High/Urgent), category (editable list), source (Call / WhatsApp / Email / Walk-in / Day End), owner.
- Associated contact(s) and optional deal, shown on both sides.
- Created, last activity, due date/time, closed date, time to first response, time to close.
- Timeline with notes, status changes, linked tasks, and replies logged.
- Resolution notes, required (or prompted) when closing.

### Working with tickets
- Filters: pipeline, stage, priority, category, owner, contact, deal, source, created, due, overdue, closed this month.
- Search across subject, description, notes, contact name and number.
- Saved views (for example "My open tickets", "Overdue", "Waiting on contact over 3 days").
- Bulk actions: move stage, assign, set priority, close, export.
- Drag between stages; every move is logged with date and time.
- **Link from Day End:** the existing "Tickets Attended" entries stay exactly as they are; a button on each can create or link a ticket, and ticket activity can write back into the day's report. Nothing is removed from the Day End section.
- Create a ticket from a contact, a deal, a Day End entry, or a task.
- Reminders: ticket moved to "Waiting on contact" can auto-create a follow-up task after N days (configurable).
- Merge duplicate tickets, keeping history.
- Import and export (Excel/CSV), plus a Tickets report you can Copy or Download, in the same style as the other reports.

---

## 8. More HubSpot-style features worth adding

**Everywhere**
- Global search across contacts, deals, tickets, tasks and notes, with keyboard shortcut.
- Saved views, column picker and sortable columns on every list.
- Custom properties (add your own fields to contacts, deals and tickets).
- Activity logging: notes, calls, WhatsApp, email, meetings, with outcome.
- Undo for deletes and bulk actions; a Trash that keeps items 30 days.
- Full change history (who changed what and when) on every record.
- Message templates (WhatsApp and email) with merge fields, opened via `wa.me` / `mailto:`.
- Command palette and keyboard shortcuts.

**Tasks**
- Tasks linked to contacts, deals and tickets, with queues (Today, Overdue, Upcoming).
- Calendar view and recurring tasks.
- Existing reminders and notifications stay.

**Reports and dashboards**
- Deals: won/lost by month, revenue by plan and billing cycle, pipeline value by stage, conversion between stages, average time to close.
- Tickets: open by stage, created vs closed per day, average first response and resolution time, by category and source, SLA breaches.
- Activity: calls, WhatsApp, tickets, tasks per day or hour (builds on the Day End data already collected).
- Existing Final Report, Monthly and Yearly reports stay unchanged.

**Automation (light workflows)**
- Rules such as "when ticket is Waiting on contact for 3 days, create follow-up task".
- Auto-create a ticket when a Day End "Tickets Attended" entry is logged (optional).
- Auto-stage updates already exist for deal stages from task text; keep them.

**Data management**
- One-click full backup and restore (JSON), plus automatic backups.
- Import with column mapping and duplicate handling; export any list.
- Archive and restore, never hard-delete by accident.

---

## 9. App-level requirements (needed once this becomes an app)

- **Login and access control.** At minimum, a password-protected single user. If teammates will use it: roles, owner assignment and per-user views.
- **Cloud sync and backup.** Local-first: works offline, syncs when online, resolves conflicts predictably, with automatic daily backups.
- **Migration of existing data.** One-time, verified import of everything in the current localStorage (days, deals, customers, tasks, notes, reminders, Smart text) with a before/after count check.
- **PWA install.** Installable on phone and desktop, works offline, notifications for reminders.
- **Mobile layout.** Every new screen usable on a phone.
- **Performance.** Lists stay fast with thousands of contacts, deals and tickets.
- **Light/dark theme and the current look** preserved on every new screen, using the same styling as the Deals Tracker and Day End Report.
- **Automated tests.** Parity tests for reports and exports, plus tests for sync, associations and pipelines.
- **Error handling.** Clear message if storage or the network is unavailable, never silent data loss.
- **Privacy.** Customer data only behind login, encrypted in transit, no public links.

---

## 10. Decisions

### Made
1. **App-first:** yes. Phases A, B, C-0 and C-1 are done.
2. **Backend:** **Supabase** (Postgres, login, live sync).
3. **Users:** just you now, built so teammates can be added later. Every table carries a workspace id and an owner id with row-level security from day one, so inviting someone later means adding a row and a sign-in, not rebuilding. Roles and permissions screens are not built until needed.
4. **Names:** the old Deals Tracker is **Won Deals**; new **Lost Deals** tab; the pipeline section is **Deals**; Customers becomes **Contacts**; plus **Tickets**.
5. **Lost Deals source:** **Closed Lost All** only, with **Churn** as a subsection of Lost Deals.
6. **Report titles:** stay as they are for now ("Deals Report" etc.), so old imports keep working.
7. **Ticket smart columns:** automatic (Today, Closed this month).
8. **Ticket categories and priorities:** start with sensible defaults (categories: Billing, Setup, Training, Bug, Hardware, Feature request, Other; priorities: Low, Medium, High, Urgent), and you can add and remove your own.
9. **Attachments and screenshots on tickets:** not needed.

### Still open
None right now.

---

## 11. Build order and acceptance

1. Phase A: snapshot, parity tests, golden outputs. **Done.**
2. Phase B: lossless conversion, identical file and outputs. **Done.**
3. Phase C-0: Backup / Restore button (one-click JSON of all data). **Done.**
4. Phase C-1: rename to Won Deals, and the task-note merge fix (section 3) with its acceptance tests. **Done.**
5. Phase C-2: Lost Deals with the Churn subsection (section 5b).
6. Phase C-3: Contacts rename and Deals as the main record with associations.
7. Phase C-4: pipelines (add/remove/edit) for deals.
8. Phase C-5: Tickets with pipelines, Day End link, reports.
9. Phase D: Supabase login, cloud sync, backups, data migration.
10. Phase E: reports, automation, templates, custom properties.

**After every phase:** nothing existing changed, nothing existing removed, and the parity checks pass (the only allowed differences are the ones you asked for, listed by name). If a check fails, that phase is not finished.


## Phase C-1b — Cloud login + sync (done)
- Supabase email/password sign-in, local-first sync of Day End Report, Won Deals, Contacts, Tasks; installable (PWA); multi-user-ready schema (workspaces + RLS). Inert until `config.js` is filled. See SETUP_CLOUD.md. Tests: tests/test_cloud.py (mock server, two devices). Smart text now syncs too (same phrase = same entry on every device); only the theme stays per-device.


## Phase C-2 / C-3 (part) / C-5 (first version) — done
- **Lost Deals tab** (Closed Lost All) with a **Churn** subsection: day/month/year/all filters, search, cancel reasons (editable list), notes, value lost, add/delete hand-added entries, reason and plan breakdowns, won-vs-lost rate, Copy report, Export Excel (CSV). Read live from Day End, stored in `lostDeals_v1`.
- **Contacts**: the Customers tab and header are now called Contacts (report titles unchanged so old imports still work).
- **Tickets tab**: pipelines (add/rename/delete), editable stages (add/rename/reorder/remove with move prompt, "closed" flag), board + list, automatic Today and Closed this month columns, priorities and categories you can edit, notes timeline with stage history, resolution required to close, search/filters/overdue, Copy report, Export CSV. Stored in `tickets_v1`.
- **Still to do:** Deals pipeline section (multiple deal pipelines, deal record page with associations), ticket links from Contacts/Day End, saved views, reports dashboards.
- Tests: tests/test_lost.py, tests/test_tickets.py, tests/test_cloud.py, tests/test_features.py, parity check (allowed changes: the Customers to Contacts rename).


## Round 2 (implemented, see FEATURES_V2.md)
- **Deals tab** (new, after Won Deals): one record per deal built live from Day End; Sales board/list + your own pipelines with editable stages; deal record with properties, timeline, associated contacts, tickets, notes; Quick Add; Excel / Download Report / Copy / Import file / Paste report.
- **Tickets** follow Day End "Tickets Attended" live; contact/number picker; Quick Add; all import/export ways.
- **Lost Deals**: selectable plan, billing, automatic price, extra registers (Professional), Quick Add, all import/export ways.
- **Smart text**: "Learn from existing data" + sync across devices.
- **Mobile**: labelled Smart text / Cloud / Backup / Restore row under the tabs, hover-only buttons always visible on touch, bigger tap targets, 16px inputs (no iOS zoom), bottom-sheet dialogs, snap-scrolling boards, safe-area spacing.


## Round 3 (implemented, see FEATURES_V3.md)
- **New app switcher**: tabs scroll in their own box with fade edges; Search + Tools buttons; nothing spills out at any width (tested at 320 to 1600 px). Small screens put Smart text, Cloud, Backup and Restore in the Tools menu.
- **Deals pipeline = Contacts pipeline** (same stage list, same order, same card look); a test compares them.
- **Dashboard** (new tab): today, deals per stage, win rates, won/lost, MRR, follow-ups due, renewals in 30 days, lost reasons (churn separate), daily and weekly report (Copy / Download / Excel).
- **Deals**: tags, saved filters, bulk select (move/tag/delete), follow-up date (also appears in Tasks), start/renewal dates, custom fields, click-to-call and click-to-WhatsApp, message templates, extra Excel columns.
- **Tools menu**: global search (Ctrl/Cmd+K), duplicate finder, Trash (30 days, Restore) and activity log, message templates, weekly backup reminder, follow-up notifications.
- Offline: the app opens from cache and works from local data; the Cloud pill shows offline status.

## Round 4 additions
- Won Deals: Revenue & Renewals panel (won this month, MRR, ARR, due in 30 days, overdue, 12-month chart; every box opens a list), per-deal Revenue line, Due chip, Activation date, Due date, Mark renewed (stored in `billing_v1`, synced + backed up). Reports list renewals.
- Dashboard: every tile, stage bar and lost reason opens a searchable list popup (Copy / Excel / Download).
- Deals board matches Contacts pipeline; compact filter popups; tab reorder + Customize sections; phone Quick "+" button.

## Round 5 additions (FEATURES_V5.md)
- Automations: rules scan Day End, Won Deals, Contacts notes, Tickets, Lost, Deals; phrase modes (similar meaning with typos/synonyms, contains, all words, exact, starts with, regex, NOT), filters (stage, plan, billing, price, age/no-update), schedule (weekdays, time window, how often), actions (folder, title/notes templates, due, reminder, priority, notify), Test rule, Run, templates, import/export, editable synonyms.
- Task folders: add / rename / recolor / icon / reorder / delete; Move to… on every task; No response time customisable (minutes/hours/days), own phrases, auto on/off.
- Dashboard builder: Customize, own widgets (any data, filters, measure, grouping, colour), hide/show tiles, period switch; all pressable.
- Tickets cards: Move to…; Day End style stage tones on Tickets / Deals / Contacts columns.

## Round 6 — one colour language (FEATURES_V6_COLORS.md)
Stripes, tiles, widgets, folders, chips and titles added in rounds 4–5 now use only the Day End headline look (theme accent gradient, soft accent-tinted cards). Day End Report unchanged.


## Round 7
Analytics section, navigation drawer, Deals·Contacts·Tickets sub-sections with automatic + manual associations (Manage), tickets board on the Contacts pipeline, 10 widget display types with drag-to-reorder, duplicate-merge fix, filters in Deals/Tickets/Lost, automation upgrades (built-in No response card, renewals, tag/ticket actions, undo, triggers). See FEATURES_V7.md.

## Round 8 (design) — see FEATURES_V8_DESIGN.md
Shared design-system layer, uniform page headers, Dashboard "Today / Needs attention", phone Kanban fix.

## Round 9 — see FEATURES_V9_NAV_VISUAL.md
Deals as parent section (Contacts, Tickets, Won, Lost beneath), side-menu drop-down, trail bar, premium visual refinement.

## Round 10
Pure-black redesign: transparent blended top bar, Quick-Add-style compressing nav panel, glyph tiles, Deals icon tiles. See FEATURES_V10_BLACKOUT_DESIGN.md

## Round 11
HubSpot-style boards, compact toolbars, rows pop-up, stage order/colours, auto stage, reach tiles, filigree, moon timer. See FEATURES_V11_HUBSPOT_MOON.md

## Round 12 – records as pages, one app, blood moon & night sky
Full-page Deal/Contact/Ticket records (Overview + Activities); Day End & Won Deals unified visually (texture, black boxes, shared theme); realistic blood moon without outline; night-sky shift card; moon light across tabs; new simple icon set. See FEATURES_V12_RECORDS_UNIFIED.md.

## Round 21 – Colour palettes + workflow
See FEATURES_V21_PALETTES_AND_WORKFLOW.md. 7 palettes for everything (moon, glow, textures included), calm mode, Today view, stuck deals, goals, quick log chips, keyboard shortcuts.

## Round 22 – Moon colour fix
See FEATURES_V22_MOON_PALETTE_FIX.md.

## Round 23 – Same headings, bulk select, HubSpot gaps
See FEATURES_V23_HEADINGS_BULK_HUBSPOT_GAPS.md.

## Round 24 – Everything remaining
See FEATURES_V24_EVERYTHING_REMAINING.md (templates, CSV import, bulk edit, undo/restore points, lists, reminders, workflows, forecast, empty states).

## Round 25 — Time clock, exact time, HR suite
Clock in/out + breaks with exact times, shown in Day End reports and exports; exact times on entries, notes, tasks and timelines; HR & Time overlay with 22 sections (attendance, timesheets, leave, holidays, shifts, pay & overtime, expenses, goals, reviews, learning, documents, people/org chart, on/offboarding, announcements, requests, mood/pulse, policies, hiring, analytics, audit, settings). See FEATURES_V25_HR_AND_TIME.md.

## Round 26 — HR gaps + remaining CRM features
Adjustable exact times in Day End, clock on the moon card, leave years/carry-over, full audit, time tracker, rota/swaps, review cycles/360, surveys, benefits/assets, document files, payroll extras, sortable tables, saved views, owners, call log, renewals board, speed reports, swipe-to-complete, duplicate warning. See FEATURES_V26_HR_GAPS_AND_REMAINING.md.

## Round 27 — Finish and consistency
Filigree surface on HR page/dialogs/clock strip in all palettes, moon above HR page, attached files in backup+sync, column picker on grid lists, owner filter + chips (Deals/Contacts/Tickets), goal roll-up, new full theme/monkey test.

## Round 28 — Cloud hardening, stars + moon everywhere, one heading design
Cloud request timeout/watchdog/IndexedDB fallback, stars + moon on Today panel and over Day End, three-level engraved heading contract across all sections and palettes, light-theme HR fixes, new test_v28 + stall test.

## Round 29 — Notes smart text, copy chips, pick-a-time clock, stage fix, Black palette, emails, phone format
Smart text in every note box; hover copy chips (number / deal / notes / email / all); 🕒 pick-a-time + double-click delete for clock entries; HR ☰ All tab menu + People → HR & Time in the left menu; moon shows live clock state; stage follows latest task/note only (⚑ flag instead of No response / Waiting); email/WhatsApp red only when the latest note says unable; optional emails per number linked to contacts; Black palette with white moon; Quick rule builder, folder rename/icon for all folders; +960 phone auto-format toggle. See FEATURES_V29_NOTES_COPY_CLOCK_BLACK_EMAIL.md.

## Round 30 — Scroll buttons, customizable menus, snippets, attendance fill
Hover ‹ › scroll buttons on every horizontal bar (press = next, hold = end); Customize pop-up for Side menu / Top bar / Tools menu with themed switches; HR & Time group with scrollable sub-sections in the side menu; Snippets text expander (76 starters, commands, manager, import/export, cloud sync); Attendance fill from Day End; count pills never leak; moon says clocked in; copy chips on Contacts/Tickets/Tasks/Lost rows. See FEATURES_V30_SCROLL_MENUS_SNIPPETS_ATTENDANCE.md.

## Round 31 — MDV format, clock strip, HR side menu, 4-icon copy group, theme icons, smart text, template categories
HR page scroll button fixed (was under the overlay); MDV toggle (tiny, hover-only, 7 digits → +960-777-7777, notes never formatted); 🕒 icons removed (long-press / right-click picks a time), clock strip has no box; ☰ side menu inside HR; copy chips → 4 small line icons inside each entry, invisible until hover; all colour-emoji icons drawn as line icons; smart text learns from all saved data continuously; message templates with separate name/message boxes and categories (add / rename / remove / move).

## Round 31b — MDV button moved next to Copy notes / + Note; turning it on reformats every number box; Tools menu switch


## Round 32
Moon time-left + clocked-in/break line (hub + Day End); bigger moon and layout; transparent Break; email linked to contact by number; Copy notes fix; automation folders hardened + 6 templates; deal stage auto-pick; faster hold-to-clear; darker Black palette with stars; Follow-ups & goals dashboard; weekly/daily summary; duplicate warning; smart paste; auto-backup + restore; new-version notice; offline pill; voice notes. See FEATURES_V32_MOON_EMAIL_AUTOMATION_STAGE_BLACK.md for honest status.


## Round 33
Today screen, call-back queue, deal timeline, health dots + next action, snooze presets, insights/charts/forecast, streaks, month report, CSV export, quick-note chips, use-last-details, time-aware notes, clock-out check, Alt shortcuts. See FEATURES_V33_EFFICIENCY_BATCH2.md.

## Round 34
Mobile starfield + moon double-tap, two-tap delete, weekly schedule/off days/shift edit, salary slips, HR mobile layout, funnel + conversion (Analytics > Insights), pipeline jump bar, quick-add button, round checkboxes, Black palette layers, command palette (Ctrl+K), bulk owner/follow-up/log, paste list, CSV import, recurring tasks, daily start screen, autocomplete, recents, entry templates, promise tracker, email composer, suggested messages. See FEATURES_V34_MOBILE_HR_PIPELINE_BLACK_EFFICIENCY3.md for honest status.

## Round 35
Call outcomes + best hours to call (per contact and average), time-based auto order of Tasks and Order-by menus everywhere, Smart rules (triggers/actions/templates/run history), moon echo behind dialogs, Deeper insights (weekly review, months with arrows and pacing, win/loss, plans and prices, productivity, objections, phrases, scripts, data quality), duplicate merge + undo, number cleaner, tap-a-number menu, calendar, app lock, haptics, share/save report. See FEATURES_V35 md for what is not done.

## Round 36
Edit history + restore, swipe actions, one-hand dock, focus mode, greetings + renewal messages, snooze with time of day, stuck-deal chips, open-ticket chips, objection tags, .xlsx import, smart paste in forms, Day End draft, invoices, shortcuts, styled chart tooltips, dashboard Your day + KPI arrows + arrange tiles, Tasks/Won Deals/Lost filters, tappable numbers on every list, touch copy chips, HR bar on phones, fixes (sections vanishing in Analytics, email draft restore).

## Round 37 – typing on phones, runaway rows, notes, quick-note editor
- Fixed the runaway duplicate "Templates" rows that made the Day End form jump and broke extra number / notes / copy / save.
- Typing preview bar above the keyboard (hub, Day End, Won Deals, Quick Add); typed box kept clear of the keyboard.
- No jump to top while typing (scroll guard, redraw keeps scroll, cloud sync never reloads while a box is focused).
- "Use last details" is now a popup in an empty part of the screen.
- ✎ editor for quick notes and templates (rename, remove, add, reset).

## Round 38 – contact filter, WhatsApp Today / Email Today tasks, long-text preview
- Day End filter chips: WhatsApped, Unable to WhatsApp, To WhatsApp, Emailed, Unable to email, To email (with counts).
- Tap-to-mark Contact row in every entry form; automatic tasks in "WhatsApp Today" and "Email Today" folders, closed when the contact is logged.
- Long-text preview popup beside the box when Smart Text has nothing to offer.

## Round 39 – moon hold, saved-entry copy format, feature parity
- Press and hold the moon for 1 second (Day End moon, hub moon in every section, moon tab) opens Day End Quick Add; a short tap still behaves as before.
- Saved Day End entries copy in the line-by-line / extra-number format.
- Quick notes, templates, ✎ editors and Contact row (auto WhatsApp Today / Email Today tasks) now in Won Deals form, Won Deals Quick Add and the hub record note box; contact filter bar over Won Deals.

## Round 40 – activity tiles scroller, glass scrollbars, design base
- Support Calls / Whatsapp / Tickets / Other tiles: equal size, scroll sideways like the Pipeline.
- Glass scrollbars (transparent, no lines) in every document; design base (`DESIGN_BASE.md`) and audit (`tests/test_v40_design.py`); fonts/borders aligned on new features.

## Round 41 – mobile/desktop speed pack + Message Templates page
- Templates page: scroll categories, copy, use, move, select mode, drag to category, category manager, favourites/recent.
- Bottom bar, comfort panel, installable app + shortcuts, pull to refresh, sent-check, voice quick add, saver/calm modes.
- Entry helpers: repeat-caller hint, suggestions, duplicate guard, one-tap follow-up, keyboard hints, pinned/sticky filters, Won Deals drafts.

## Round 42 – Go to entry + no auto light/dark
- Stage-breakdown pop-up (Day End and Won Deals): "Go to entry" button opens the day/hour and highlights where it was entered.
- Auto light/dark by time of day removed.

## Round 43 – Fast sync
- Saves in ~1 s, checks every 6 s, live push (Supabase Realtime, optional one SQL line), sync on change / leave / return, reload-loop guard.

## Round 44 – App logo
- Your clock artwork is now the home-screen icon (iPhone/Android), installed-app icon (incl. maskable), and browser tab icon.
