# FEATURES_V7 — plan (written before implementing)

Standing rules (Abi): never change or remove what exists, only add and fix. Every feature applies to every section where similar things exist. Everything customisable. Nothing may overflow or leak (checked at 320 / 390 / 768 / 1280 px, dark and light). Colours: Day End headline look only (theme accent). A fix must come with a test. Double-check everything at the end.

## 1. One "Deals" hub (HubSpot style) — deals are the main thing
- ONE navigation entry **Deals** with sub-sections: **Deals · Contacts · Tickets** (old tabs stay reachable and keep working; they become the sub-sections).
- **Records link to each other**: a Deal ↔ Contacts ↔ Tickets. A deal can have many contacts, a contact many deals, a ticket one deal + one contact (can be changed).
- **Auto-association** (no manual work): same phone number (last 7+ digits, ignoring +960 / spaces), same email, same business name. Runs on open, on every change, and from Day End entries. Shows "auto" next to automatic links; you can remove or override any link. Links you removed are not re-added.
- **Manual association** from any record: **Manage** button → search existing deals / contacts / tickets, tick to link, or **Add new** (small form with relevant fields) and link it immediately. Remove a link with ✕.
- **Record view for deals, contacts and tickets is the same layout (the Contacts format)**: header with name + stage, left column details (number, email, plan, billing, price, dates), tabs Overview · Activities · Notes · Tasks, right column **Associated** cards (Deals, Contacts, Tickets) that you can click to jump, with Manage. Back button returns to where you came from (breadcrumb trail).
- Tickets open in this view and show the associated contact + deal, notes, tasks and activity, like a contact.
- Deals list/board uses the Contacts format (same table + same pipeline card). Tickets board = Contacts pipeline look (same markup/classes as the Contacts pipeline), with Move to… and drag.
- Ticket names show exactly as typed in Day End (no code in front). The internal number stays in the record but is never shown unless you turn it on in Tickets → More.

## 2. Duplicates / merge (fix)
- Review duplicates: every group has a working **Merge** (you choose which records to merge and which one to keep), for contacts, deals and tickets. Merged data is combined: numbers, emails, notes, activities, tasks, tags, links; links are repointed so nothing is orphaned.
- Merged groups never come back (merge is remembered by id and number). Two deals can sit under one contact and one deal can have several contacts — those are NOT duplicates; duplicates are found by deal name, number, email, with a "Not a duplicate" button that is remembered.

## 3. Dashboard fixes + more data analysis
- Fix: pressing a tile, bar, reason, follow-up or renewal always opens the detail list; no row shows "(no name)" — name falls back to deal → business → number → note.
- More analysis tiles/bars: win rate trend, revenue by plan, revenue by billing, MRR/ARR, average deal value, new vs lost per week, calls per day, activity by hour, ticket aging, renewals by month, top reasons, conversion funnel by stage.
- Customize: **hold and drag** widgets to move them (touch and mouse), resize (S / M / L / full), edit, remove, duplicate, hide built-in tiles, reset.
- Widget editor (fixed, no leaking): Data · filters (stage, plan, billing, tag, text, period, custom date range, associated contact) · measure (count, sum, average, max, min, MRR, distinct) · **display type: big number, bar, horizontal bar, line, area, donut, table, list, progress ring, comparison** · group by (stage, plan, billing, reason, day, week, month, hour, weekday, contact, tag) · size · sort · limit · show values/labels.

## 4. Analytics section (Ewity-style)
- New navigation entry **Analytics**: report builder with a filter bar (period presets + custom range, plan, billing, stage, source, contact, tag, text), KPI row, charts grid, and table.
- Built-in reports: Sales & revenue, Pipeline & conversion, Calls & activity, Tickets, Renewals, Lost & churn. Each is customisable (add/remove/reorder charts, pick type, group by) and can be saved as your own report.
- Every number/bar is pressable → detail list. Export Excel / copy / print.

## 5. Navigation drawer
- Menu button at the top-left opens a **left slide-out menu** (blended in: accent gradient active item, counts, Search, Tools). On phones it replaces the tab strip; on wide screens the tabs stay and the menu is an extra. Order is customisable (hold and drag in Customize).

## 6. Quick Add (Day End) — everything visible without scrolling
- Day and hour pickers made smaller (compact chips), "What is it" made compact (single row), so the **Details** part (number, deal, notes, extra numbers) is fully visible without scrolling even after adding more numbers/notes. Same quality and look.

## 7. Filters everywhere
- The Contacts filter set (stage, plan, billing, tag, owner/source, date range, has-email/number, archived) becomes available in Deals, Contacts, Tickets, Lost, Won, Tasks, Analytics using the shared compact filter popup + saved filters.

## 8. Automations (improved)
- The built-in **No response** automation is now listed as a rule you can open, adjust (time, phrases, stages, folder, due, priority, reminder), disable or remove. You can add as many as you like.
- More ways: triggers — new entry, stage changed, no update for N, ticket opened / not closed after N, renewal due in N days, deal won, deal lost, schedule (daily/weekly time); more conditions (contact has/has not a ticket, deal has no contact, price, tags, source); more actions — add task, add tag, set stage, associate record, create ticket, notify; templates for each.
- Rule log (what it did and when) and Undo last run.

## 9. Customise popups / leaking
- Customize sections, widget editor, automation editor, folders: contained in the viewport (max-height, inner scroll, no horizontal overflow) at 320–1280 px; tested.

## 10. Customisation for everything
- Hold-and-drag for navigation order, dashboard widgets, analytics charts, task folders, board columns visibility; every list column set can be shown/hidden; all saved and synced.

## 11. Double check
Full regression, overflow sweep (all sections + all popups), colour test, cloud test, zip.

## Order of work
1 md → 2 data/association layer (hubLinks) + tickets display name → 3 Deals hub shell + record view + Manage → 4 Tickets board = pipeline + Deals in Contacts format → 5 Duplicates/merge → 6 Dashboard fixes + widget types/drag + Analytics → 7 Nav drawer → 8 Quick Add compact → 9 Filters everywhere → 10 Automations → 11 popups + tests + docs + zip. Anything unfinished is reported honestly.

---
# IMPLEMENTATION STATUS (end of Round 7)

## Done and tested
| # | Request | What was built |
|---|---------|----------------|
| 1 | Tickets without code | Cards, list and modal show the subject exactly as typed in Day End (no `D…` code). Search by `#number` still works. |
| 2 | Dashboard "no name" / no details | Day End entries (calls, WhatsApp, tickets, other) are read properly; every tile/bar opens a list with real names, numbers and notes. |
| 3 | Customize pop-up leaking | Editor styling now loads at start-up; editor is a clean wide pop-up with live preview; nothing overflows (sweep: 0 issues on 320/390/768/1280, dark + light). |
| 4 | Widgets: display types, sizes, drag | 10 display types (big number, horizontal bars, columns, line, area, donut, progress ring, table, list, compare periods), sizes S/M/L/Full, group by (stage, plan, billing, reason, day, day of week, week, month, year, folder, priority), sort, limit, price range, custom date range, duplicate, hold-and-drag (touch: press and hold; mouse: press and move) to reorder. |
| 5 | Analytics section | New **Analytics** tab: 7 ready reports (Sales & revenue, Pipeline & conversion, Calls & activity, Tickets, Lost & churn, Tasks, Contacts) + "Build your own"; filter by data, period (incl. custom dates), stage, plan, billing, reason, text, open/closed, price range; group/measure/sort/limit; 10 chart types; KPI row with change vs previous period; press any bar/slice/row to see the records; save your own reports; Excel + Copy. |
| 6 | Navigation menu on the left | Menu button top-left opens a slide-in drawer (grouped: Workspace / Sales / Records, badges, active marker), swipe from the left edge to open, swipe left to close; follows your section order; Search and Customize sections in its footer. The old tab strip stays. |
| 7 | Quick Add Details without scrolling | Compact top block (verified by screenshots), Details area stays fully visible even with extra numbers/notes. |
| 8 | Deals · Contacts · Tickets as sub-sections | Sub-section bar (Deals / Contacts / Tickets / Won deals) at the top of each of the three sections. |
| 9 | Associations like HubSpot | Deals, contacts and tickets are linked **automatically** (same phone number last 9 digits, same email, same name). **Associations** block on every deal, ticket and contact: click to open the other record (with "Back to…"), ✕ to remove, **Manage** to search existing records or create a new contact / deal / ticket and link it at once. Manual links and removals are saved (and synced) in `links_v1`. |
| 10 | Tickets board like Contacts pipeline | Same board classes, columns, cards (name, contact, phone, priority, updated, note), Move to… and drag. |
| 11 | Filters everywhere | Contacts-style filters (activity, email, billing, follow-up) added to Deals, Tickets and Lost Deals (next to their existing filters, inside the same Filters button with chips). |
| 12 | Review duplicates | Fixed the cause of duplicates reappearing after merge (merged names are remembered so sync never re-creates them). Merge works from Review duplicates, you choose which record to keep, data/links move to it, "Not the same person" is remembered; new "same name" suggestions. Same phone with different deal names is still allowed (two deals under one contact). |
| 13 | Automations | "No response" is now shown at the top of Rules as a built-in rule (Turn off/on, Edit time & phrases). New source **Renewals**, new conditions (renewal due within N days, only open tickets), new actions (tag the deal, also create a ticket), **Undo last run**, "Start from a trigger" buttons, 5 new templates (Renewal due in 7 days, Ticket stuck open, Deal gone quiet, New lost deal win-back, Won deal onboarding). |

## Not done / honest limits
- Deals, tickets and contacts open as pop-up records (with Associations, notes, timeline) – not as full separate pages.
- The Contacts-style filter set is not added to the **Won Deals** tab (it lives in its own frame) or **Tasks**.
- Built-in dashboard tiles can be hidden/shown but not dragged; only your own widgets can be dragged.
- Still for later: activation/due dates in Day End/Lost/Tickets/Contacts, goals, invoices, calendar view, app lock.

## Tests
`tests/test_v7.py` (merge persistence, associations, manage/create, ticket links, analytics, drawer, all 10 widget types, renewal rule + undo) plus all earlier suites, parity check, overflow sweep (9 sections × 4 widths × dark/light + pop-ups) and the cloud test.
