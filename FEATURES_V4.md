# FEATURES_V4 — polish, parity and renewals (plan only, nothing built yet)

Written for Abi. Implementation starts only when Abi says so, and follows this file top to bottom.

## 0. Rules that apply to every item
1. Do not change or remove anything that already exists. Only add and fix.
2. **Same feature, same place, same behaviour.** If a feature exists in one section and the same kind of thing exists in another, the feature is added there too (section 4 is the full list).
3. **One source of truth.** A fact (a deal's stage, plan, billing, price, activation date, renewal date) is stored once and read everywhere. Setting it in one place shows it in every other place.
4. **Shared building blocks.** Board, list, filter panel, popup, record sheet, exports and Quick Add are built once (`hubKit`) and used by all sections, so sections cannot drift apart again.
5. Every fix gets an automatic test. A "parity test" lists the features of every section and fails if one section is missing something it should have.
6. A change is only "done" when it was checked on desktop (1280px) and phone (390px), dark and light, with real-looking data in every stage (not only empty data).

## 1. Problems found (with the cause)
| # | Problem | Cause | Fix (section) |
|---|---|---|---|
| P1 | Deals board is still not like the Contacts pipeline | In the Deals board the empty stage columns shrink to 132px stubs, the board does not fill the page height, cards have no "Move to…" menu, Sales cards cannot be moved at all, and the filter/toolbar block pushes the board down. Contacts pipeline has full-height columns, a "Move to…" menu on each card, drag, totals. The two use separate code, so they differ | Rebuild Deals board on the same shared board used by Contacts (5) |
| P2 | Filters take most of the screen on many sections | Every filter is its own always-visible dropdown row | One compact filter bar everywhere (3) |
| P3 | Dashboard numbers cannot be pressed | Tiles are static text | Drill-down popups like Day End (6) |
| P4 | Won Deals cannot be explored by plan and billing the way Day End can | The "Closed Won All · Plans" grid exists only in Day End | Plan and billing grid, pressable, in Won Deals and everywhere (7) |
| P5 | Won Deals shows little data: no revenue per month, no due dates, no activation date | Not built | Revenue, due dates, activation date, renewals everywhere (8) |
| P6 | Sections cannot be reordered | Fixed order | Customisable tab order (9) |
| P7 | Weekly backup banner overlaps the "Saved" status in Won Deals | Banner sits in the top-right corner over page content | Banner becomes a small bar under the header that pushes content down, or a Tools-menu dot (2.6) |
| P8 | Look is uneven between old and new sections, desktop and phone | Each section has its own CSS | Design system (2) |
| P9 | Quick Add tab covers content on the right edge, and a floating scroll button covers cards on phone | Fixed floating elements | Quick Add becomes a "+" button in the header actions on phone, a side tab on desktop only when there is room (2.7) |

## 2. Design system ("Calm Glass", version 2)
Keeps the current colours (dark: black and red, light: soft blue) and fonts. Only structure, spacing and motion are unified.

2.1 **Tokens** (one place): radius 10/14/20, spacing 4/8/12/16/24, shadow 1 (card) and 2 (popup), motion 150ms/250ms ease-out, tap target 44px on touch, text sizes (title 1.5rem, section 1rem, body .9rem, small .78rem).
2.2 **Page header (every section)**: icon tile, title, one-line subtitle on the left; on the right the 2 main actions (e.g. + New, Quick Add) and a "⋯ More" menu holding Export Excel, Download Report, Copy, Import file, Paste report, Custom fields. This removes the long row of buttons that fills the top of Deals, Lost, Tickets, Contacts.
2.3 **Cards**: same radius, border, shadow, hover lift (only on devices that can hover), 150ms press feedback on touch. Same empty-state card in every section (icon, one line, one button).
2.4 **Popups**: on desktop a centred panel with blurred backdrop; on phone a bottom sheet with a drag handle, swipe down to close, safe-area padding, max 92% height, internal scroll. One shared popup component for record view, filters, Quick Add forms, drill-downs, pickers.
2.5 **Motion**: section switch crossfade (exists), list items fade in, popups slide 12px, no layout jumps, `prefers-reduced-motion` respected. Skeleton shimmer while a big list renders (over 300 rows).
2.6 **Notices**: backup reminder, "update available", cloud conflicts and toasts use one notice bar under the header (stacked, dismissible), never floating over content.
2.7 **Floating elements**: scroll-to-top/bottom button moves to the bottom-left and hides while scrolling; Quick Add is a header "+" on phone; on desktop the side tab stays but hides when the window is under 1100px wide.
2.8 **Header**: keeps the new tab scroller; adds the "Customize" entry (9). Active tab auto-centres. Count badges stay.
2.9 **Typography/density**: a "Comfortable / Compact" switch in the Tools menu (compact = smaller row height in lists and tables, good for a big PC screen).
2.10 **Light and dark parity**: every new surface checked in both; contrast of text, chips and badges at least 4.5:1.
2.11 **Phone specifics**: list rows become two-line cards (name + number on line 1, stage/plan/price chips on line 2), tables never scroll sideways (columns collapse), boards snap one column at a time with a column switcher strip on top ("Lead 3 · Interested 5 · …"), long-press a card for the quick actions sheet, pull-to-refresh runs a cloud sync.

## 3. Filters: one compact bar, everywhere
Applies to: Day End days list, Won Deals, Deals, Lost Deals, Tickets, Contacts, Tasks, Dashboard (period), Trash.
3.1 Always visible: search box, a **Filters (n)** button (n = active filters), a view switch (List/Board where it exists), and the page's main action.
3.2 **Filters button** opens a popover on desktop (anchored under the button, two columns) and a bottom sheet on phone. Inside: every filter the section already has (nothing removed), "Reset", "Apply" (phone) and live apply (desktop), "Save as filter…" and the saved filters list.
3.3 **Active filter chips** under the bar: each chip shows "Stage: Interested ✕". One tap removes it. Chips scroll sideways on phone.
3.4 Quick presets row (scrolls): Today, This week, This month, Overdue, Has follow-up, Open tickets. Presets are section-specific and also saved filters.
3.5 Sort control (Name, Last activity, Price, Renewal date, Stage) in the same popover, remembered per section.
3.6 Saved filters work in every section (today only Deals) and sync through the cloud.
3.7 The filter bar takes at most one line (56px) on desktop and one line on phone; the page content starts right under it.
3.8 Test: at 390px and 1280px the list/board starts within 220px of the top of the section on every section; every old filter still exists in the popover (compared against a list captured before the change).

## 4. Feature parity matrix (go through everything, apply everywhere similar exists)
Legend: ● has it now, ○ missing and must be added, – not meaningful.

| Feature | Day End | Won Deals | Deals | Lost | Tickets | Contacts | Tasks | Dashboard |
|---|---|---|---|---|---|---|---|---|
| Pressable stat tiles → popup list with details | ● | ● | ○ | ○ | ○ | ○ | ○ | ○ |
| Plan × billing grid, pressable, with price totals | ● | ○ | ○ | ○ | – | ○ | – | ○ |
| Select plan, billing, auto price, extra registers (Professional) | ● | ● | ● | ● | – | ○ (deal fields) | – | – |
| Activation date + renewal date | ○ | ○ | partly | ○ | – | ○ | – | ○ (view) |
| Monthly revenue, next due | ○ | ○ | partly | – | – | ○ | – | partly |
| Quick Add | ● | ● | ● | ● | ● | ○ | ○ | – |
| Export Excel / Download Report / Copy / Import file / Paste report | ● | ● | ● | ● | ● | ● | ○ | partly |
| Search | ○ | ○ | ● | ● | ● | ● | ● | ○ |
| Filters (compact bar, chips, saved filters) | ○ | ○ | partly | ○ | ○ | ○ | ○ | – |
| Tags | ○ | ○ | ● | ○ | ○ | ○ | ○ | – |
| Custom fields | ○ | ○ | ● | ○ | ○ | ○ | ○ | – |
| Bulk select (move, tag, delete) | ○ | ○ | ● | ○ | ○ | ○ | ○ | – |
| Follow-up date (also creates a Task) | ○ | ○ | ● | ○ | ○ | ● | ● | shows due |
| Click-to-call / WhatsApp / mail on numbers and emails | partly (marks) | ○ | ● | ○ | ○ | partly | ○ | ○ |
| Message templates button on records | ○ | ○ | ● | ○ | ○ | ○ | ○ | – |
| Board view with "Move to…" and drag | – | ○ | rebuild | ○ | ● | ● | ○ | – |
| Record sheet (one popup with properties, timeline, linked items) | ○ | ○ | ● | ○ | ● | ● | ○ | – |
| Linked items shown (deal ↔ contacts ↔ tickets ↔ tasks) | ○ | ○ | ● | ○ | ● | ● | ○ | – |
| Trash with Restore + activity log | ○ | ○ | ● | ● | ● | archive only | ○ | – |
| Undo toast after delete/move | ○ | ○ | ○ | ○ | ○ | ○ | ○ | – |
| Smart text suggestions in note fields | ● | ● | ○ | ○ | ○ | ○ | ○ | – |
| Copy button on text, hold-to-add notes | ● | ● | ○ | ○ | ○ | ○ | ○ | – |
| Cloud sync | ● | ● | ● | ● | ● | ● | ● | – |
| Mobile card layout + bottom-sheet popups | partly | partly | partly | partly | partly | partly | partly | partly |

Rule for the work: for every ○ above, add the feature using the shared building block; for "partly", finish it. A parity test reads this matrix (kept as `tests/parity_matrix.json`) and checks each ● and each newly added cell in the running app.

## 5. Deals board rebuild (fix P1)
5.1 Extract the Contacts pipeline board (columns, cards, Move-to select, drag, totals) into the shared board and use it in Contacts and Deals. Both read the same stage list.
5.2 Columns: full page height, equal width (250–340px), all stage columns the same size even when empty (empty ones show "Nothing here" and stay droppable). Column header shows count and total USD.
5.3 Cards: deal name, number with call/WhatsApp buttons, plan·billing chip, price chip, renewal chip (date + days), tag chips, follow-up chip, open tickets chip, contact count, "Move to…" select.
5.4 Moving a card in the Sales pipeline changes the stage for real: it logs a Day End entry for that deal with the new stage (same as editing the stage in Day End) so Day End, Contacts, Won/Lost Deals and the Dashboard all agree. A toast offers Undo. (Before this was read-only; this is the main change.)
5.5 Custom pipelines keep working as now.
5.6 Group-by switch like Contacts (Stage / Type / Plan).
5.7 Test: build data with deals in every stage; Deals board counts per stage must equal Contacts pipeline counts and Dashboard counts; moving a card updates all three; the first column header is visible without scrolling.

## 6. Dashboard drill-down (fix P3)
6.1 Every tile, bar, reason, follow-up and renewal row is pressable. Press opens the shared popup with the list behind the number (name, number, stage, plan, price, date, last note) and the same row actions as Day End popups (open record, call, WhatsApp, change stage, add note).
6.2 Popups have search, Copy, Excel, Download Report.
6.3 Tiles: Calls today (repeat vs new like Day End), Tasks, WhatsApp, Tickets, Deals, Open tickets, Follow-ups due, MRR (opens Revenue breakdown), Won/Lost 7 days and month, Win rates (opens the won and lost lists), Churn.
6.4 Period switch on the dashboard (Today / 7 days / Month / Year / All) like Lost Deals.
6.5 Add cards: Revenue this month vs last month, Renewals next 30/60/90 days (bar by week), Overdue renewals, Goals (see 11.3).

## 7. Won Deals gets the Day End strengths (fix P4, P5)
7.1 Add the **Closed Won All · Plans** grid (plan rows × Monthly / Biannual / Annual / No billing) with counts and totals in USD and MVR. Every cell is pressable and opens the popup list, exactly like Day End, honouring the day/month/year scope of the page.
7.2 The same grid appears in Deals, Contacts (by their deal), Lost Deals (lost value by plan) and the Dashboard.
7.3 **Revenue panel** in Won Deals: this month's revenue (what bills this month), MRR (monthly-equivalent), ARR, last month, a 12-month bar chart (revenue per month by activation/renewal dates), split by plan and billing, USD and MVR switch.
7.4 **Due column** in the Won Deals list: next due date, days left, status chip (Overdue / Due in ≤7 days / Upcoming / No date), sortable and filterable (the Filters popover gets "Due: overdue / next 7 / next 30 / none").
7.5 **Activation date field** on every won entry (add form, edit form, Quick Add, Excel import/export, report). If unknown it stays empty and the status says "No date".
7.6 More data columns/tiles in Won Deals: price per deal, registers, billing, activation, next due, tenure (months since activation), lifetime value so far, owner/tags if set.
7.7 Excel/Report/Import carry the new fields (Activation date, Next due) without breaking old files (missing columns are fine).

## 8. Activation and renewals everywhere (fix P5)
8.1 **One store** `billing_v1`, synced: key = deal key (last 9 digits of number + deal name) → `{activation, renewalOverride, renewedOn:[dates], note}`. One helper (`hubRenew`) reads and writes it. Every section that shows or edits plan/billing also shows and edits activation date and renewal through that helper.
8.2 Where the fields appear: Day End task row (when stage is Closed Won All) and its editor, Won Deals add/edit/Quick Add, Deals record and Quick Add, Lost Deals entry (activation shown for churn: how long they were a customer), Contacts deal fields, Dashboard (read), Tickets (shows the customer's plan and next due on the ticket sheet).
8.3 **Next due** = activation date (or last renewed date) + billing cycle (1 / 6 / 12 months); if a manual renewal date is set it wins. Never due for Free plan.
8.4 **Mark renewed** button on a deal: records the renewal date, moves next due forward by one cycle, adds a note to the timeline, and updates revenue. Undo available.
8.5 Reminders: renewals within 7 days create a Task automatically ("Renewal due — Name", due on the date) and show in the Dashboard and Tasks; they disappear when marked renewed.
8.6 Calendar-style **Renewals view** (Tools menu and Dashboard card): list grouped by week for the next 90 days with totals, Copy / Excel / Download Report.
8.7 Migration: for existing won deals with no activation date, nothing is guessed. A banner offers "Set activation date from the day the deal was marked Closed Won" as an optional one-tap fill that the user can undo.
8.8 Test: set an activation date in Won Deals, check the Deal record, Contacts deal, Dashboard renewals and Day End row all show the same date and next due; mark renewed in one place and all update; cloud merge of two devices keeps both edits.

## 9. Customisable section order (fix P6)
9.1 **Hold and drag** a tab to move it (phone: hold 400ms until it lifts and vibrates, then drag; desktop: drag immediately). Others slide out of the way; the order saves instantly.
9.2 **Customize** in the Tools menu: list with up/down buttons (works without dragging, good for accessibility), a switch to hide a section, "Reset to default".
9.3 Stored in `hub_order_v1`, synced. A hidden section is still reachable from Search and the Tools menu ("Show hidden sections").
9.4 The first section in the order opens when the app starts.
9.5 Test: reorder with drag and with buttons, reload, the order persists, the sliding highlight and crossfade still work, cloud sync keeps it.

## 10. Quick Add, record sheet and popups (shared)
10.1 One Quick Add component used by Day End, Won, Deals, Lost, Tickets, Contacts and Tasks with the same fields in the same order (number, name, email, plan, billing, registers, price, activation, notes, tags, follow-up).
10.2 One record sheet component (header with name and actions, property grid, linked items, timeline, templates, notes) used by Deals, Contacts, Won Deals, Lost Deals, Tickets and Tasks.
10.3 One row-actions set: Open, Call, WhatsApp, Mail, Change stage, Add note, Add follow-up, New ticket, Copy, Delete (to Trash).

## 11. Features suggested earlier and not yet built (now included)
11.1 Contacts in Trash; real merge of duplicate contacts and deals (preview, choose the surviving values, undo); duplicates from Day End can be merged into one record view.
11.2 Undo toast after any delete, move or bulk action (10 seconds).
11.3 Goals: daily and monthly targets for calls, won deals and revenue with progress bars on the Dashboard.
11.4 Deal health: flag deals with no activity for X days (setting), shown on cards, rows and Dashboard.
11.5 Automation rules: for example "Interested and no activity for 3 days → create a follow-up task". Simple rule list with on/off switches.
11.6 Stage history: when a deal entered each stage and how long it stayed, on the record sheet and as average days per stage on the Dashboard.
11.7 Pricing options: discount (% or amount) with reason, custom price override, show USD or MVR as the main currency (switch), discount shown in revenue.
11.8 Invoice / receipt: printable page for a won deal (PDF through the browser print), with your details and the plan, billing, price and dates.
11.9 Import wizard: choose any Excel/CSV, map its columns to fields, preview rows, then import (for every section).
11.10 Bulk message: choose a template and a filter, step through each deal with one tap to open WhatsApp or mail.
11.11 Calendar view: follow-ups, renewals and tickets due on one month calendar.
11.12 Activity timeline per contact: every call, WhatsApp, ticket, note and stage change.
11.13 Customer health warning: won customers with open tickets or long silence.
11.14 Voice note to text for notes on phone (uses the phone's dictation).
11.15 Print / PDF for every report and list.
11.16 Teammate access: roles (admin, viewer) and "changed by" in the activity log.
11.17 App lock (PIN, and Face ID where the phone allows).
11.18 App polish: real icon and splash screen, "Update available" message when a new version is deployed.
11.19 Offline: a real offline test, a clear "Offline — will sync" bar, and queue count.
11.20 Follow-up notifications that repeat and can be snoozed (still only while the app is open; true background push needs a server, listed as a later phase).

## 12. Test plan (must pass before delivery)
- Parity: `tests/test_parity.py` reads `tests/parity_matrix.json` and checks every ● cell in the running app; the original golden parity (`check_parity.py`) stays green.
- Board: counts per stage equal across Deals, Contacts and Dashboard; move a card, all three update.
- Filters: every old filter present; filter bar height; chips add/remove; saved filters sync.
- Renewals: activation → next due → mark renewed → everywhere consistent; cloud two-device merge.
- Layout: widths 320, 390, 768, 1024, 1280, 1600, dark and light: no horizontal page scroll, no element overlapping another (banner, Quick Add, scroll button), content starts within 220px of the top.
- Screenshots of every section at 390 and 1280, dark and light, with data in every stage, reviewed one by one before delivery.
- Existing suites: features, lost, tickets, deals, header, v3, cloud.

## 13. Order of work
1. Shared kit (tokens, popup/sheet, board, filter bar, record sheet, Quick Add, row actions) with tests.
2. Header: Customize + reorder (9), notices bar (2.6), floating elements (2.7).
3. Filters everywhere (3).
4. Deals board rebuild (5) and Contacts moved onto the shared board.
5. `billing_v1` store and renewals (8), Won Deals revenue/due/activation (7).
6. Plan×billing grid and pressable tiles in all sections (4, 6, 7.1–7.2).
7. Parity matrix pass: every ○ in section 4.
8. Design pass on every section at both sizes (2), screenshots reviewed.
9. Earlier unbuilt features (11) in the order 11.2, 11.1, 11.4, 11.6, 11.3, 11.5, 11.7, 11.9, 11.11, 11.12, then the rest.
10. Full regression, docs, build, zip, deliver with a short "what changed" list.

## 14. Definition of done
Abi can: press any number on the Dashboard and see the details; press a plan or billing cell in Won Deals as in Day End; see monthly revenue and due dates in Won Deals; set an activation date anywhere and see it everywhere; reorder sections by holding and dragging; use any section's filters without them filling the screen; and see the Deals board look and behave like the Contacts pipeline. Everything looks smooth on iPhone and PC, in dark and light.
