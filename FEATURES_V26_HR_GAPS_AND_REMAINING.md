# Round 26 — HR gaps, adjustable times, moon-card clock, and the remaining CRM features

Rules: nothing existing is changed or removed; only additions and fixes. Phone + PC. Palette-aware. Every part below is implemented unless the "Status" section at the end says otherwise.

## A. Adjustable times (Day End) and clock on the moon card
1. **Edit the exact time of any Day End entry.** Each entry's time chip is tappable: opens a time picker (with seconds) and saves. Entries made before Round 25 show a "+ time" chip so a time can be added. Reports/exports use the adjusted time.
2. **Clock on the moon card.** The shift card (moon ring + countdown) gets a clock strip: Clock in / Break / End break / Clock out buttons, and the four exact times (in, break start, break end, out). Tapping the moon ring opens the full clock sheet. While clocked in, the ring caption shows worked time / "on break".
3. **Adjust punch times from Day End.** Every time in the strip is tappable → pick a new time → saved with an automatic audit entry "Adjusted in Day End" (optional reason).

## B. HR gaps (from my own gap list)
| # | Gap | What gets built |
|---|-----|-----------------|
| B1 | Leave balances counted all years | Leave year selector; balances per year; carry-over (cap per type); optional monthly accrual |
| B2 | Audit log partial | Every add/edit/delete/toggle in every HR section, settings, timesheet, tracker, adjustments |
| B3 | Rounding only on pay | Punch rounding for hours (nearest N min); auto-deduct meal break; auto clock-out after N hours |
| B4 | Reminders only in-app | Daily reminder toast + optional browser notifications (documents expiring, birthdays, goals due, missing clock-out) |
| B5 | Documents are details only | Attach a file (stored on this device in IndexedDB), open/download/remove |
| B6 | Project/task time tracking | Projects, timer with start/stop, manual entries, billable flag and rate, totals per project/day, CSV |
| B7 | Shifts: swaps, rotas, open shifts, comp-off | Weekly rota template, shift swaps, open shifts, comp-off earned/used balance |
| B8 | Overtime approval | Overtime requests with approve/reject, counted in pay only when approved (setting) |
| B9 | Reviews | Review templates, review cycles, 360 feedback, competency ratings, goals cascade (parent goal) |
| B10 | Onboarding | One-tap onboarding / offboarding templates; policy e-sign (typed name + exact time) |
| B11 | Surveys | Custom surveys (questions, optional anonymous), respond, per-question averages |
| B12 | Benefits, insurance, assets | Benefits list with renewals; equipment/asset register with issue/return |
| B13 | Analytics | Headcount, tenure, hiring funnel, learning hours, expenses by category, goal completion, tracker hours |
| B14 | Payroll | Pension % and flat income-tax % (your own numbers), payslip as HTML file (print to PDF), bank-transfer CSV |
| B15 | Location stamp, calendar | Optional browser location on punches (asks permission, off by default); export leave/holidays/rota as .ics calendar |
Out of scope (need a backend / several users / hardware): manager approvals and roles, IP stamps, face/photo check-in, kiosk, Slack/Google integrations.

## C. Remaining CRM features
| # | Feature | Plan |
|---|---------|------|
| C1 | Column picker + sort | Click a column heading to sort (text/number/date aware); "Columns" button to hide/show columns; remembered per table. Works on every list table (Deals, Contacts, Tickets, Lost, Won) |
| C2 | Saved views | Save/load/delete the current search + filters for Contacts, Tickets, Tasks, Lost |
| C3 | Owners | Owners list (you + People directory); assign owner in bulk and from records; owner chip; filter by owner |
| C4 | Duplicate warning at entry | Done in Round 26 stage 0 (Day End) |
| C5 | Edit cells in place | Double-click a name/phone/subject cell in Contacts and Tickets to edit |
| C6 | Call log with outcome | Outcome chips on Day End calls (done) + Call log view (counts by outcome, by day, list, CSV) |
| C7 | Renewals board | Columns Overdue / next 7 / 8–30 / 31–60 / later from Won Deals renewal dates, with Mark renewed |
| C8 | Speed reports | Ticket time-to-first-note and time-to-resolution; deal time-to-win; averages and slowest list |
| C9 | Grouped search | Done (group chips + HR results) |
| C10 | Swipe to complete | Done |

## D. Delivery
Stage 1: A + B1–B4, B14–B15. Stage 2: B5–B13. Stage 3: C. Tests PC + phone (tests/test_v26.py), all older suites, parity, palette scan; status written honestly below.

## Status (delivered)
**Delivered and tested (PC + phone; older suites re-run):**
- **A. Times:** every Day End entry's exact time is tappable (adds a time to older entries too); clock strip on the moon/shift card (Clock in, Break, End break, Clock out + four exact times; tap a time to adjust, audit-logged; tapping the moon ring opens the full clock).
- **B1** leave year selector, per-year balances, carry-over cap, optional monthly accrual. **B2** audit now covers adds/edits/ticks/adjustments/timer/signing in all sections. **B3** punch rounding, auto meal-break deduction, auto clock-out. **B4** daily reminder toast + optional browser notifications (works while the app is open). **B5** attach a file to a document (kept on this device; not part of backup files). **B6** project/task time tracker with timer, manual entries, editing, billable totals, CSV. **B7** weekly rota, shift swaps, open shifts, comp-off. **B8** overtime requests with approval (optionally required for pay). **B9** review templates, cycles, 360 feedback, competencies, goals with parent goal. **B10** onboarding/offboarding templates, policy e-sign. **B11** custom surveys with averages (named or anonymous). **B12** benefits and asset register. **B13** extra analytics. **B14** pension %, flat tax %, payslip HTML (print to PDF), bank CSV. **B15** optional location stamp, calendar (.ics) export.
- **C1** click any column heading to sort (Contacts table, Tickets grid, other grid tables), column picker on real tables (Contacts). **C2** Saved views on Contacts, Tickets, Tasks, Lost and Deals. **C3** owners: bulk "Set owner" for Deals/Contacts/Tickets, owner shown on records. **C4** duplicate warning. **C5** double-click to edit Contacts name/phone and Tickets subject. **C6** call outcome chips + Call log (Tools). **C7** Renewals board with Mark renewed (Tools). **C8** Speed report (Tools). **C9** grouped search with HR results. **C10** swipe right to complete a task.

**Honest limits:**
- Column picker works only on real tables (Contacts); the Deals/Tickets/Lost lists are grids, which can be sorted but not column-hidden.
- Owner is a name, not a login: there is no per-owner filter yet, and no separate owner views.
- Browser reminders fire only while the app is open (no server to push from). Location stamps need browser permission and only record where the device is, not IP.
- Attached files live in this browser's storage, not in cloud sync or backup downloads.
- Still not possible in a single-user, no-backend app: manager approvals/roles, IP stamps, face/photo check-in, kiosk, Slack/Google integrations.
- Goals "cascade" shows the parent goal link; progress does not roll up automatically.
