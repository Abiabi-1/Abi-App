# Round 36 – everything left from Round 35

**Request (Sun 22 Nov 2026, 09:39 Maldives):** "Write a md for the not done ones and implement them. Make sure to follow the rules."

## Rules I follow (from you, unchanged)
1. Do not change or remove anything already there; only add features and fix issues.
2. Write the md first, then implement.
3. Highest quality the first time – no "low quality then redo".
4. Apply every feature everywhere it is applicable (hub, Day End, Won Deals, phone, PC).
5. Design aligned: red/black filigree, palettes follow, light theme works, moon works everywhere.
6. No overflow or leaks; works on phone (390 px) and PC.
7. Be honest about anything not done. Nothing is deployed by me.

## Audit first
Before building I checked the code. C17 (column picker), C18 (saved views), C19 (double-click cell edit) and the owner filter bar already exist in `script-41-views-tables.js` for Contacts, Tickets, Tasks, Lost and Deals – these are verified by a test this round instead of rebuilt.

## Items
| # | Item | Plan | Status |
|---|---|---|---|
| N1 | Per-deal edit history + restore (C3) | Snapshot of each deal's editable fields kept on every change (last 30); "History" on the record page with diff and Restore | Done – record page "Edit history" (last 30 changes of stage, follow-up, tags, owner, email, name, plan, price); Restore for stage, follow-up, tags, owner. Plan/price come from Day End entries so they are shown but not restorable |
| N2 | Swipe actions (C4) | Swipe right = done / mark, left = snooze on task cards; swipe on deal and contact rows = call / log outcome; never fires while scrolling vertically; also reachable by keyboard | Done – touch swipe: tasks (right = done, left = snooze menu), deal list rows (right = log outcome, left = open). Not on kanban cards (they scroll sideways) |
| N3 | One-hand mode (C5) | Tools toggle; moves the main actions to a bottom dock in thumb reach on phones | Done – Tools toggle; bottom dock on phones (Day End, Tasks, Focus, Deals, Call) |
| N4 | Greetings (C6) | Birthday field on contacts; Today shows birthdays and renewals; one-tap greeting from a template with copy / WhatsApp | Done – birthday on the deal page, Tools → Greetings and renewals, message template + copy/WhatsApp, once-a-day nudge. Birthday is on deals (not on Contacts pages yet) |
| N5 | Renewal message (B9) | Renewal rows get "Message" that fills a template with name, plan, price, date | Done – Message button on every Renewals board card, plus the greetings panel |
| N6 | Snooze with time of day (C7) | Snooze menu gets "Later today at…", "Tomorrow at best hour", custom time; tasks and follow-ups reappear at that time | Done – snooze menu (later today, 5 pm, tomorrow 9 am, tomorrow at best hour, next Saturday, custom date/time) sets due, time and reminder. Used by swipe and focus mode; the existing 10-minute snooze on reminders is unchanged |
| N7 | Excel import (C8) | Real .xlsx reader (zip + XML, no library) in the import dialog, with column mapping | Done – .xlsx accepted in the import wizard (own reader, first sheet, dates converted). Contacts import already read .xlsx before |
| N8 | Smart paste everywhere (C11) | Paste a block of text into any hub form field → number, email, name, plan, price picked out | Done – paste a block into a hub form: bar offers to fill name, number, email, plan, price, notes |
| N9 | Day End auto-draft (C12) | Button "Draft from my day": fills the report from the call outcomes and deal activity of the day | Done – Tools → Draft my Day End and a button on the Dashboard: lines from today's call outcomes, deal updates, tasks done; adds them to Other Items of the current hour. It does not create task entries |
| N10 | Pending changes count (C13) | Cloud chip shows how many local changes are still waiting to sync | Done – cloud chip shows "· N" while offline/syncing and its hover text says how many changes wait. Only visible when cloud sync is on |
| N11 | Email in quick-add draft restore (C14) | Restore the email field with the rest of the draft | Done – email is restored with the rest of the draft when switching entry types |
| N12 | Touch copy chips (C15) | Copy chips on hub rows are visible on touch (no hover needed) | Done – long-press (0.45 s) a deal/contact/ticket/task row on touch to show the copy chips |
| N13 | Grouped search results (C22) | Global search groups results: Deals, Contacts, Tickets, Tasks, Lost, Templates | Already existed (grouped search with section chips) – verified, not rebuilt |
| N14 | Empty states (C24) | Friendly empty message + next action in every list | Already existed – every list already shows its own empty message (verified Contacts, Tickets, Lost, Deals, Tasks). My extra safety net only appears if one is missing |
| N15 | Light-theme pass (C25) | Screenshot check of every new screen in light theme; fixes | Done for new screens – checked in light and dark, desktop and 390 px; inputs now use the theme border colour |
| N16 | Filters on Won Deals + Tasks (C26) | Order-by and best-time filter in the Won Deals frame; best-time and owner filters on Tasks | Done – Tasks: best-time filter; Won Deals: order-by and best-time filter; owner filter now on Tasks and Lost (owner of the linked deal). Contacts-style column picker/saved views were already on every list |
| N17 | Dashboard tile drag (C27) | Drag handles to re-order built-in tiles | Done – Dashboard "Arrange tiles": move buttons (and mouse drag), order saved and synced |
| N18 | Invoices (C29) | Simple invoice from a won deal: number, items, total, print/save as PDF page, history | Done – Tools → Invoices: from a won deal or blank, items, tax, discount, paid flag, print/PDF, copy text, my business details |
| N19 | Styled chart tooltips (C32) | Replace browser title tooltips on charts with styled, touch-friendly tips | Done – styled tooltips for chart/title elements on Analytics, Dashboard and HR (touch shows for 2.5 s) |
| N20 | Today / Follow-ups / Queue as sections (C33) | Each gets a full page section in the nav (the pop-ups stay) | Done in a different form – Dashboard gets a "Your day" section (call next, follow-ups due, birthdays/renewals, stuck deals, focus, queue, draft). Today, Follow-ups and Queue are not separate nav pages |
| N21 | Salary chart (C34) | Monthly net pay chart in HR slips | Already existed (HR → Salary slips has a net pay by month chart) – verified |
| N22 | HR top bar on small phones (C35) | Wrap / condense so nothing is crowded | Done – HR top bar fits on phones (icon buttons, labels for screen readers) |
| N23 | Filigree behind HR page (C37) | Engraved filigree layer on HR | Already existed – filigree is behind HR (checked on phone) |
| N24 | Snippets in rich boxes (C39) | Text expander also works in contenteditable boxes | Already existed – snippets already expand inside contenteditable boxes in hub and both frames (verified) |
| N25 | Customize adds new sections (C40) | "Add shortcut" for custom links/sections in Customize | Done in a smaller form – Tools → My shortcuts: your own links appear in the Tools menu. They are not new side-nav pages |
| N26 | Focus mode (C42) | One task at a time, big buttons, timer, skip; haptics on done | Done – Focus mode (Tools, dock, Dashboard): one task at a time, call/WhatsApp/outcome/snooze/skip/done, timer, haptics |
| N27 | Dashboard KPI arrows (C31) | ▲▼ vs the previous period on the dashboard KPI tiles | Done – ▲▼ on the dashboard KPI tiles (calls/tasks/WhatsApp/tickets vs yesterday, won/lost vs previous period) |
| N28 | Stuck-deal alerts (B7) | Amber at 1× usual time in stage, red at 2×; chip on rows + Today list | Done – amber/red "Stuck" chip next to the best-time pill everywhere it shows, plus Tools → Stuck deals |
| N29 | Objection tag in outcome menu (B17) | "Objection" row in the outcome menu stores the tag | Done – objection buttons in the outcome menu feed the Objections tab |
| N30 | Open ticket on deal before calling (B20) | Warning chip on the deal row and record page, and in the outcome menu | Done – "N open tickets" chip beside the pill and a warning in the outcome menu (matched by number or name) |
| N31 | Numbers tappable beyond record pages (C9) | Number menu on Deals, Contacts, Tickets, Lost, Tasks | Done – tap any number on Deals, Contacts, Tickets, Lost, Tasks and record pages for Call / WhatsApp / Copy / Log outcome |
| N32 | Share link for a report (C43) | Cannot host a link from a local app. Honest: share text / save file already done; a hosted link needs a server | Not possible here – a hosted share link needs a server. Share text and save-as-file exist |
| D | Cannot be built here | Team logins/approvals, IP stamps, face check-in, kiosk, Slack/Google, push when app closed, WhatsApp auto-send, server scheduling | Not possible |

## Order of work
1 history, swipe, one-hand, focus, empty states → 2 greetings, renewal message, snooze, stuck alerts, ticket chip, objection tag, KPI arrows → 3 import xlsx, smart paste, auto-draft, pending count, grouped search, invoices, charts → 4 layout fixes (HR, filigree, copy chips, sections, snippets, customize) → 5 tests, light + phone check, regression, zip.


## Found and fixed on the way
- Extra Analytics sections (Best hours, Deeper insights) disappeared after leaving and re-opening Analytics because a delayed re-mount kept being postponed; now fixed for every section added this and last round.
- Dialog layers: new pop-ups, menus and tooltips sit above the older full-screen dialogs.
- Tools menu icons: plain symbols only (an automated check enforces it).

## Still not done / limits
- Real push notifications when the app is closed, team logins, IP stamps, face check-in, kiosk, Slack/Google, WhatsApp auto-send, server scheduling (need a server).
- Birthday field exists on deals only; hosted share link; Today/Follow-ups/Queue as separate nav pages; shortcuts are Tools-menu entries.
- Nothing is deployed by me.