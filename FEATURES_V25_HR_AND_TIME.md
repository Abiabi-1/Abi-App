# Round 25 — HR suite, Time Clock, and Exact Time Everywhere

Rules followed: nothing existing is changed or removed; only additions and fixes. Works on phone and PC. Palette-aware (uses `--accent-rgb`, `--t0..t4`). Pure black base, light theme supported. Single-user app, so "HR" means *your own* work-life HR: attendance, leave, pay, goals, learning, documents, etc.

## 1. Research summary (what the top HR suites offer)

Suites reviewed: Zoho People, BambooHR, Rippling, Gusto, HiBob, Personio, Factorial, Workday, Deel, Justworks, Paycor, Paylocity, Breathe HR, Keka; time trackers Clockify, Toggl, Deputy, When I Work, Buddy Punch, Time Doctor. Local rules: Maldives Employment Act (working hours, overtime, breaks).

Sources: Zoho People features page; rework.com "best HR software"; peoplemanagingpeople.com HR software comparison; Clockify "best time & attendance apps"; Rivermate Maldives working-hours page; Capterra Keka features.

Common feature families across all suites:
1. Time & attendance: clock in/out, breaks, geo/IP stamps, timesheets, approvals, overtime, rounding, grace periods, missed-punch correction with audit trail, shift scheduling.
2. Leave & holidays: policies, balances/accruals, requests, half-day, calendar, public holidays, carry-over, comp-off.
3. Payroll-lite: pay rate, overtime multipliers, allowances, deductions, payslips, expense claims.
4. Performance: goals/OKRs, reviews, 1:1 notes, feedback, recognition, competencies.
5. Learning & development: courses, certifications, skills, training plans.
6. Documents & compliance: document vault, expiry reminders, policy acknowledgment, audit log.
7. People directory: profile, org chart, birthdays, anniversaries.
8. Lifecycle: onboarding/offboarding checklists, hiring pipeline.
9. Engagement: announcements, pulse surveys, mood check-ins, eNPS, helpdesk requests.
10. Analytics: hours, overtime, leave, punctuality, trends.

## 2. Maldives defaults (all editable in HR → Settings; flagged "please verify")
- Work week Sun–Thu, 8 h/day, 48 h/week. Overtime 1.25× normal, 1.5× on rest day/holiday (editable).
- Meal break 30 min after 5 h; prayer breaks 15 min (editable).
- Night work window 19:00–06:00 (info only).
- Leave entitlements (annual 30, sick 30, etc.) are **unverified editable defaults** — please check.

## 3. Exact-time design
- Every entered item gets `at` (epoch ms). Display `h:mm:ss AM/PM` (seconds toggleable in HR → Settings → "Show seconds").
- Items: Day End tasks / calls / WhatsApp / tickets / other; deal notes; contact notes & tasks; ticket notes; follow-up tasks created/done; bulk-created tasks; templates sent; stage changes.
- Shown in: Day End entry lists, report text/Excel, deal/contact/ticket timelines, task rows.
- Old items without `at` fall back to their hour slot (shown as before) — nothing removed.

## 4. Time clock
- Clock in / Start break / End break / Clock out, each with exact timestamp, break types (meal, prayer, other).
- Live timer chip in the hub header and in the Day End header.
- Overtime (daily 8 h / weekly 48 h), meal-break reminder, missed clock-out detection.
- Late/early vs shift with grace; edit/regularize with reason and audit log.
- Day End report gets a "Time Clock" block: in, out, each break (start–end, length), worked, break total, overtime. Included in copy, text, Excel, and period reports.

## 5. HR module (overlay, tabs)
Dashboard · Attendance calendar · Timesheets (weekly, submit/lock, export) · Leave (policies, balances, requests, half-day) · Holidays (Maldives + custom) · Shifts/Settings · Overtime & Payroll-lite (rates, allowances, deductions, payslip export) · Expenses · Goals/OKRs/Reviews/1:1 · Learning · Documents (expiry reminders) · Directory/Org/Birthdays · Onboarding/Offboarding · Announcements/Recognition · Requests/Helpdesk · Pulse/Mood/eNPS · Policies & acknowledgments · Hiring pipeline · Analytics · Audit log.
List-type sections use one schema-driven generic collection renderer (add/edit/delete/search/CSV export) to keep code compact.

## 6. Delivery stages
1. Clock core + Day End integration + exact timestamps.
2. Special HR sections (timesheets, leave, payroll-lite, analytics).
3. Generic collections.
4. Regression tests (PC + phone), parity, palette scan.

## Status (delivered)
**Delivered (tested on PC and phone; all older suites still pass):**
- Time clock: Clock in, meal/prayer/other break start and end, Clock out, with exact times to the second. Live timer in the hub header (wide screens), in the Day End header, and in a clock sheet (Tools → Time clock on phones). Meal-break and overtime reminders. Missing clock-out detection with a fix dialog. Late/early vs shift with grace.
- Day End: report shows a "Time Clock" block (in, each break, out, worked, breaks, overtime, late). It is in the on-screen report, copy, period reports and the Excel export (new columns: Logged At, Clock In, Clock Out, Breaks, Break Total, Worked).
- Exact time (h:mm:ss, can be switched to h:mm in Settings): Day End entries (all five sections), deal timeline and notes, contact notes and last-contacted, ticket updates and notes, task "Added" time and done time, record pages. Older entries without a stored time show as before.
- HR overlay (HR & Time): Dashboard, Attendance calendar with day sheets and punch add/delete (reason required, audit-logged), Timesheets (weekly, submit/approve-lock, CSV/copy), Leave (types, balances, requests, half-day), Holidays (fixed Maldives dates + your own), Shifts (default + per-day override), Pay & overtime (rate, rounding, allowances/deductions, payslip copy/download), Expenses, Goals/OKRs, Reviews & 1:1s, Learning, Documents with expiry flags, People directory with org chart, birthdays and anniversaries, On/offboarding checklists, Announcements & recognition, HR requests, Mood/pulse/eNPS, Policies & acknowledgments, Hiring pipeline, Analytics, Audit log, Settings. All covered by Backup/Restore (hub_ key).

**Not done / limits (honest list):**
- No location/IP stamping on punches, no biometrics, no photo capture.
- Payroll is an estimate only: no tax, pension or legal payslip rules. Islamic holiday dates are not pre-filled (they move yearly; add them in Holidays). Leave entitlements are editable defaults I could not verify.
- Single user: "approve" on timesheets and leave is self-approval; there is no second person's login, no manager workflow, no emailed notifications.
- Exact times for Day End entries start from this version; older entries have no stored time. A few places that show only a date (e.g. dashboards/charts) were left unchanged.
- Not built from earlier rounds: column picker/sort, saved views for Contacts/Tickets/Tasks/Lost, owners, duplicate warning at entry, table cell editing, call log with outcome, renewals board, speed reports, grouped search, swipe-to-complete.
