# Round 35 – response-time engine, smart ordering, more automations, and the full leftover backlog

## Rules I am holding myself to (stated by you, kept for every round)
1. Nothing that exists is removed or changed in meaning; only additions and fixes.
2. Every feature is applied everywhere it fits (all sections, hub + both frames, phone + PC, all 7 palettes, light theme, calm mode).
3. Quality first time: each feature is built to its final design once – no "v1 to be redone". Same design language everywhere (palette variables, engraved surface, headline style, themed controls, line icons, bottom sheets on phone).
4. The moon, its light and the night sky work on every screen, including HR, record pages and dialogs.
5. Every round ends with a whole-software sweep, honest status, tests (new test file + full regression + palette scan + parity).
6. Nothing is deployed by me; you upload to GitHub.

## A. What you asked in this message
| # | Request | Plan | Status |
|---|---|---|---|
| A1 | Tasks organised by the time contacts respond most; order updates by itself as the time changes | Call-outcome data → per-contact best-hour profile; Tasks get an "Auto order: best time now" mode (default on) that re-sorts every minute and at each hour change; a pill shows why a task is where it is ("Usually answers 10–11am · now") | Done |
| A2 | Best hours to call per contact and average | Outcome buttons on every entry/row (Answered, No answer, Busy, Call back, Wrong number); per-contact profile card (best slot, answer rate, attempts); overall hour × weekday heatmap in Analytics | Done |
| A3 | Order by all the data we track | One shared "Order by" menu on Tasks, Deals list, Contacts, Follow-ups, Call-back queue, Today: best time now, contact score, answer rate, health, last contact, stuck days, value, renewal date, follow-up date, stage; direction toggle; remembered per section | Done (Tasks, Deals, Contacts, Follow-ups, Queue, Today; not the Won Deals frame) |
| A4 | More automations for these things and more | New triggers (time of day, call outcome, no-answer count, days in stage, answer-rate change, renewal near, clock in/out) and actions (re-order, set follow-up at best hour, move stage, tag, assign owner, add task/folder, send template, flag number); run history + test run + enable/disable per rule; starter templates | Done (Smart rules tab) |
| A5 | Moon works everywhere | Moon, glow and sky on HR pages, record pages, Insights, every overlay; moon drawn above the dim layer of dialogs (not dimmed) | Done for dialogs/overlays (moon echo); sky and stars still dim behind dialogs |
| A6 | Find everything talked about and not implemented; implement it | Backlog in section C; each item verified in the code first (some are already built and just need applying elsewhere) | Partly – see C table; ~half of the backlog built, rest listed below as Not done |

## B. My idea list from last message (you said all of it is good)
| # | Idea | Status |
|---|---|---|
| B1 | Call outcome buttons on every entry and deal row | Done |
| B2 | Per-contact best-hour card + "next try" slot suggestion in follow-ups | Done |
| B3 | Answer-rate heatmap (hour × weekday) in Analytics | Done |
| B4 | Time-of-day nudge ("7 contacts usually answer now") | Done via Smart rule template (clock-in / best-hour reminder), no always-on banner |
| B5 | Call list grouped by best hour | Done |
| B6 | Dead-number flag (5+ no answers) with other-channel prompt | Done |
| B7 | Stuck-deal alerts (longer in a stage than your usual) amber → red | Partly – Stuck filter existed; no amber→red alert added |
| B8 | Win/loss patterns by plan, price, weekday, lost reason | Done |
| B9 | Renewal calendar with pre-written renewal message | Partly – renewals show in Calendar and Renewals board; no pre-written renewal message |
| B10 | Calls per hour worked (HR clock × entries), break effect | Done (break effect needs 4+ breaks) |
| B11 | Shift planner: suggest calling shifts at best-answer hours | Done (suggestions + one-tap Tasks order) |
| B12 | Weekly review (Sunday summary) | Done (manual page, copy/share/save; no automatic Sunday prompt) |
| B13 | Goal pacing ("you need N demos a day") | Done |
| B14 | Contact score (engagement) used for ordering | Done |
| B15 | Relationship map (same business / shared number linked) | Done (list of related contacts, no graph) |
| B16 | Missing-info finder + duplicate finder (bulk fix) | Done (duplicates + merge/undo, missing info; number fixer) |
| B17 | Objection tracker (tap-in tag, counts, reply that worked) | Partly – counts from notes + reply library; tap-in tag in outcome menu not wired |
| B18 | Note-pattern search (phrases before win/loss) | Done |
| B19 | Script library from best-performing notes/messages | Done |
| B20 | Tickets tie-in (open complaint shown on the deal before you call) | Done in Data quality list; not yet shown on the deal before calling |

## C. Backlog found by auditing every earlier round (each verified in code before building)
| # | Item (round it came from) | Status |
|---|---|---|
| C1 | Duplicate merge (R34, R33, R7 partly) | Done |
| C2 | Phone-number cleaner / bulk format fixer (R34) | Done |
| C3 | Per-deal edit history with restore (R34, R33) | Not done |
| C4 | Swipe actions on rows and swipe-to-complete on tasks (R34, R33, R24 F6) | Not done |
| C5 | One-hand mode (R34) | Not done |
| C6 | Birthday / renewal greetings (R34, R33) | Not done |
| C7 | Snooze with time of day (R34, R33, R32) | Already existed (presets); time-of-day not added |
| C8 | Excel (.xlsx) import (R34, R33) | Not done |
| C9 | Click-to-call / WhatsApp on every number in the app (R33, R4) | Done on record pages only |
| C10 | "Log call" on every contact/deal screen (R32) | Done (tasks, deals, queue, follow-ups, Day End, Tools picker) |
| C11 | Smart paste on every screen, not only Day End/Quick Add (R32) | Not done |
| C12 | Day End auto-draft that fills the report itself (R32) | Not done |
| C13 | Offline queue count (R32) | Already shows Offline in the cloud chip; no pending count |
| C14 | Email in the quick-add draft restore (R29) | Not done |
| C15 | Copy chips visible on touch for hub rows (R29) | Not done |
| C16 | Owner filter on Lost and Tasks (R27) | Not done |
| C17 | Column picker for Deals/Tickets/Lost grids (R26, R24 B2) | Not verified |
| C18 | Saved views for Contacts/Tickets/Tasks/Lost (R24 B3) | Not verified |
| C19 | Edit cells in the table (R24 D6) | Not done |
| C20 | Renewals board (R24 D8) | Already existed |
| C21 | Speed reports (R24 D9) | Already existed |
| C22 | Grouped search results (R24 F5) | Not done |
| C23 | Stuck filter in the Deals filter (R21) | Already existed |
| C24 | Empty states for every list (R21) | Not done |
| C25 | Light-theme pass of newest screens (R21) | Not verified (new screens use theme variables; not visually checked in light theme) |
| C26 | Contacts-style filters on Tasks and Won Deals (R7) | Not done |
| C27 | Drag-reorder for built-in dashboard tiles (R7) | Not done |
| C28 | Calendar view of follow-ups/renewals/shifts (R7) | Done (Tools → Calendar) |
| C29 | Invoices (R7) | Not done |
| C30 | App lock (R7) | Done (PIN screen lock, device only) |
| C31 | KPI change arrows vs previous period (R9 – data now exists) | Done in Months tab; not on dashboard tiles |
| C32 | Styled chart tooltips instead of browser ones (R9, R10) | Not done |
| C33 | Today as a section/page, not a pop-up; Follow-ups, Queue as sections (R34) | Not done |
| C34 | Salary chart (R34) | Not done |
| C35 | HR top bar crowding on small phones (R34) | Not done |
| C36 | Goals progress roll-up (R26) | Already existed |
| C37 | Engraved filigree behind HR page (R26B) | Not done |
| C38 | Day End/Won Deals title sizes match (R28) | Already existed |
| C39 | Snippets in rich contenteditable boxes (R30) | Not done |
| C40 | Customize can add brand-new sections (R30) | Not done |
| C41 | Plan × price mix, compare months, best-hours – verify and finish (R34) | Done |
| C42 | Time blocks / focus mode, haptics on touch (R33) | Haptics done; focus mode not done |
| C43 | Read-only share link for a report (R33) | Partly – share / save as file; no hosted link |
| C44 | Pipeline scroll on a real phone – extra guard (R34) | Done (scroll containment CSS) |

## D. Cannot be built here (stated honestly, not hidden)
Manager approvals / roles / team logins, IP stamps, face check-in, kiosk, Slack/Google integrations, real push notifications when the app is closed, WhatsApp auto-sending (needs paid WhatsApp Business API), server-side scheduled automations when the app is closed (automations run while the app is open or on next open, with a catch-up run).

## E. How the engine works
- **Outcome log** `hub_calls_v1`: every call outcome with timestamp, contact key, hour, weekday. Day End entries get a one-tap outcome row; deal rows, queue, Today, follow-ups use the same widget.
- **Profile per contact:** answers counted by hour slot (1 h) and weekday; Bayesian smoothing so 1 lucky call does not decide; below 3 calls shows "building".
- **Score:** answer rate, recency, stage weight, health, promised follow-ups → 0–100. Used by Order by.
- **Auto order:** `rank(task, now)` = in best slot now (highest) → best slot within the next hour → overdue → score → date. Re-evaluated every minute and when the hour changes; manual drag order is respected when "Auto order" is switched off.
- **Automations engine:** existing rules engine extended with new triggers/actions and a run-history log; a catch-up run when the app opens.

## F. Order of work
1 data engine + outcomes UI → 2 profiles, heatmap, ordering, auto order → 3 automations → 4 moon everywhere + sections → 5 backlog items C by area (records, lists, mobile, import/export, HR, visuals) → 6 sweep, tests, regression, scan, parity, deploy zip, honest status.


## G. Honest summary at end of round
Built and tested: outcome engine, best hours (contact + average), auto time-based Tasks order and Order by menus, Smart rules, moon echoes, Deeper insights (9 tabs), duplicate merge, number cleaner, number menu, calendar, app lock, haptics, share/save weekly review.
Not built this round (listed Not done above): edit history, swipe actions, one-hand mode, greetings, xlsx import, smart paste in hub forms, Day End auto-draft, owner filters on Lost/Tasks, inline cell edit, empty states, invoices, chart tooltips, sections for Today/Follow-ups/Queue, salary chart, HR bar/filigree, snippets in rich boxes, Customize new sections, focus mode. Nothing was deployed.