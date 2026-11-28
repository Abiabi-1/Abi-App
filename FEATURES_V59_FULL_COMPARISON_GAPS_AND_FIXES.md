# Round 59 – Old app vs new app: missing features and design flaws, and the fixes

Request (28 Nov 2026): *"Check both files and look for any missing features or design flaws. Write a md and implement any fixes that need to happen."*

"Both files" = your old build (`abi-deploy.zip`) and the new build (`abi-next.zip`). I opened both with the same sample data, listed every button, field and menu entry of each section of the old app, and checked each one in the new app on PC (1200–1280 px) and phone (390 px).

## 1. Design flaws found

| # | Where | Flaw | Fix (this round) |
|---|---|---|---|
| D1 | Won Deals | It was redesigned in the new style. Your decision of 24 Nov was: **Day End Report and Won Deals keep their own pages and their own look.** | Won Deals now uses **the old Won Deals page's own stylesheet and layout**, kept separate from the rest of the app (the same method as the Day End in Round 58). |
| D2 | Won Deals | The form had no field labels, and the list was missing the old "Revenue" line and the renewal controls under each deal. | Back as before: labelled form (HubSpot deal link ↗, Deal name, Plan, Billing, Notes, Pricing, Price USD/MVR, Extra registers ▼ ▲). Each deal shows Plan / Notes / Price / Registers / **Revenue … / month · due …** with the due chip, plus **Activation date**, **Mark renewed** and **Due** right on the deal. |
| D3 | Whole app | There was no reminder that tasks are due: the old app showed "n due today or overdue …  [Open Today]". | The notice is back, along with a **Today** pop-up (tasks due or overdue, deal follow-ups, renewals in the next 7 days). The bar's "Today" button opens it. |
| D4 | Whole app | There was no weekly backup reminder: the old app said "Weekly backup is due · [Download backup] [Later]". | Back, shown once a week until you download a backup or press Later. |
| D5 | Whole app | The scroll to top / bottom button was gone. | Back (bottom right on PC, above the bottom bar on phone, hidden on short pages). |
| D6 | Phone, Tickets / Deals | "+ New" fell onto its own line under the search box. | The controls row stays on one line on phone; the search box shrinks instead. |

## 2. Missing features found, and what this round brings back

| Section | Missing in the new app | This round |
|---|---|---|
| Won Deals | Reset day · Import file · Paste report · Export day / all days (Excel) · Download Report (HTML) · Monthly/Yearly Export Excel, Download report, Download HTML, Import, Paste | **Back.** Import reads the Won Deals Excel export, the Deals Report text and its .html. Imported deals become Day End "Closed Won All" entries, as before, and duplicates are skipped. |
| Won Deals | Order by (Time added / Newest first / Name A–Z / Price) · Show (All / Answers now / Now or next hour) | **Back.** "Answers now" uses the hours each deal usually answers, from your Day End entries. |
| Won Deals | Merge two deals · note history · "Keep as a separate deal" | **Back** (Merge opens a search; history shows under the deal). |
| Won Deals | Revenue & Renewals card with a 12-month bar chart; each box opens its deals | **Back as before.** |
| Won Deals | WhatsApp / Email filter row | **Back.** |
| Dashboard | Period picker (All time / Today / Last 7 days / This month) · Daily and weekly report with Copy / Download / Excel | **Back.** |
| Lost Deals | "Open in Day End" on each lost deal · HubSpot link and date in the form | **Back.** |
| Tasks | Order (Best time now / Due date / Newest) · "Messages by day" (one tap: message tasks, day by day) · Move to… on each task | **Back** (Move to was in the ⋯ menu; it is now also a small drop-down on the task). |
| Deals | Order (Default / Best time now / Name / Newest) | **Back.** |

## 3. Still missing (honest list, not in this round)
These were in the old app's Tools menu or are larger features. Their saved data is kept and synced (Round 57 §5), and they can be rebuilt in a later round. Tell me which matter most:
- **Smart text** (phrase suggestions while typing) and **Snippets** (text shortcuts).
- Message templates page, Templates, Lists, Invoices, Call log / Log a call outcome, Call-back queue, Best hours page, Speed report, Weekly summary / Week in review, Insights (Deeper insights: weekly review, months, win/loss, plans and prices, productivity, objections, phrases, scripts, data quality), Dashboard "Customize / Arrange tiles / Build your own".
- Duplicate finder, Trash and activity log page (a simple Trash exists in Settings → Data), Restore points / automatic backups, Import CSV / Paste a list of deals, Missing information, Calendar, Recurring tasks, Renewals board, Stuck deals, Greetings and renewals, Draft my Day End, Voice note, Focus mode, One-hand mode, App lock, Comfort and speed, My shortcuts, the "Jump to…" command list (Alt+J), Saved views / Owner filter, Select (bulk) on Lost Deals and Tickets.
- HR & Time beyond the clock (leave, holidays, shifts, timesheet approval, payroll, reviews …), Automation Studio flows, "Ask before Closed Won without details".
- Contacts was removed on purpose in Round 47 (privacy), so it is not missing.

## 4. Kept as decided (not flaws)
- The phone bottom bar = the exact copy of the PC top bar (24 Nov decision). The old zip still has the earlier icon dock. Say if you want the dock back.
- Day End and Won Deals use the old look; all other sections use the compact borderless design bases.
- "Save App HTML" is not back: the new app is not a single file. Backup / Restore covers your data.

## 5. Tests
- `tests/won_look.test.cjs` (new): Won Deals uses the old structure and styles. Checked: the deal list with the Revenue line and renewal controls, the Revenue & Renewals boxes and bars, Plan Breakdown, the report cards, Order by / Show, Merge. The Deals Report text matches the old app on the same data, paste import brings the deals back with duplicates skipped, and Reset day can be undone.
- `tests/ui.test.cjs`: plus the Today notice and pop-up, the backup reminder, the scroll button, the Dashboard daily/weekly report, the Tasks order and "Messages by day", no line-wrap on phone.
- All earlier tests (parity, Day End look, import, sync, ui) re-run.

## Status
**Built and tested in Chromium (PC 1200–1280 px and phone 390 px). NOT deployed, NOT pushed (GitHub access is still refused), NOT tested on a real iPhone.**

Everything in §1 and §2 is done. Extra problems found while doing it, also fixed:
- **Renewal dates from the old app were ignored (bug from Round 57).** The old app saved them as `act` / `ren`, and the new app read other names. Activation and renewal dates you set in the old app now show again, and Mark renewed works like before. Test added.
- **The Deals Report was missing its "Renewals" block** (the old report ends with "Renewals / Deal: activated …, due …"). It is back, and the report now matches the old app exactly (test).
- **The due-today notice was squeezed on phone.** It now uses the full width.

Tests: `won_look` 27 checks (including Deals Report and All days report equal to the old app, the Revenue line, the MRR box, the renewal-date migration), `ui` 52, `parity` 5, `dayend_look` 33, `import` 4, `sync` 16. All pass.
