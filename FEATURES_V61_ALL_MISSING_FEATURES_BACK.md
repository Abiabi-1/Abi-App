# Round 61 – Bringing back all the missing features

Request (28 Nov 2026): *"Write a md and bring back all the features that are missing."*

"Missing" means the honest list in Round 59 §3 (Smart text and Snippets came back in Round 60). Each feature below is rebuilt on the new app's bases (borderless buttons, data boxes, sheets). Each one works on phone (≤ 820 px) and PC, and its saved data syncs record by record. Day End and Won Deals keep their old look and are not changed.

**Privacy (hard rule):** none of these features stores phone numbers, e-mails or contact details. Old data that had them (the People directory, the Hiring pipeline, the Greetings birthdays for contacts) is converted **without** the phone and e-mail fields. Text fields go through the same cleaner as the rest of the app.

## 0. Bug found while checking: old HR lists were not carried over
Round 57 converted only the HR clock punches and settings. The rest of the old HR data was dropped:
- the lists: leave, holidays, expenses, goals, reviews, documents, people, hiring and the other lists;
- salary slips, timesheet notes and the audit log;
- the pay settings: rate, overtime multipliers, pension, tax and leave types.

**Fix:** the conversion now reads all of it. Your old app's copy (the cloud copy or this device) is still there, and it is only read, so nothing was lost. The app re-reads it once on the first start of this version. Each item becomes its own synced record with a deterministic id, so two devices doing this don't create duplicates.

## 1. HR & Time – every old tab is back
The HR page gets the old tab row, which scrolls sideways on phone:

| Tab | What it does |
|---|---|
| Dashboard | The clock, today's state, the week and leave balances |
| Attendance | Days with in / out / breaks / worked / late / overtime, with CSV export |
| Timesheets | A week table with a note for each day, plus Copy and CSV |
| Time tracker | Start / stop timer, manual entries, projects, a week total |
| Leave | Requests and balances for each leave type (days per year, carry-over, accrual) |
| Holidays | The holiday list, used in the leave and overtime maths |
| Shifts | Shift for each date |
| Weekly schedule | Work days and the shift for each weekday |
| Rota & swaps | Rota, shift swaps and open shifts |
| Pay & payslip | Monthly estimate, as in the old app: regular and overtime hours, OT × normal / rest-day, allowances and deductions, pension, tax, net. Also Copy payslip, Download and Print / PDF |
| Salary slips | Each month's real slip (gross / deductions / net / note) with a trend chart and CSV. The slip photo stays on this device only, as before |
| Overtime & comp-off | Overtime requests and time off in lieu |
| Expenses | Expenses with a total |
| Goals | Goals and OKRs with progress |
| Reviews & 1:1 | Reviews, 1:1s and feedback |
| Review cycles | Templates, cycles, 360 feedback and competencies |
| Learning | Courses and certifications |
| Documents | Documents with expiry warnings |
| Benefits & assets | Benefits and equipment |
| People | The people directory, **without phone / e-mail** |
| On/offboarding | Checklists |
| Announcements | Announcements |
| Requests | HR requests |
| Mood & pulse | Mood, energy and eNPS |
| Surveys | Surveys, answered 1–5 |
| Policies | Policies, each with an acknowledged tick |
| Hiring | The hiring pipeline, **without phone / e-mail** |
| Analytics | Last 30 days: worked, late, overtime, breaks, average start |
| Audit log | What was changed and when |
| Settings | Shift, grace, rounding, auto break and auto clock-out, as before. Also pay rate (hour / month), currency, OT multipliers, pension, tax, OT approval, accrual and leave types |

The lists use one shared list and editor that reads the same field definitions as the old app. Every list has search, add, edit, delete (with undo through Trash), a total where the old one had one, a progress bar or tick where it had one, and an expiry badge.

## 2. Tools page (new section "Tools", also in the Menu)
| Tool | What it does |
|---|---|
| Message templates | WhatsApp / email templates with `{deal}` `{plan}` `{price}` `{stage}` `{date}`. Copy, or open in WhatsApp / mail with the text ready (no number is stored). The old `hub_templates` are converted |
| Quick Add templates & chips | The Quick Add "Templates" row and your own outcome chips come back (old `hub_etpl_v1`, `hub_chips_v1`) |
| Lists | Named lists of deals and tickets (`hub_lists`) |
| Invoices | Company details, numbered invoices, line items, tax and discount. Copy text, Print / PDF and CSV (`hub_invoices_v1`) |
| Call log & best hours | Log a call outcome for a deal in one tap. There is also an answer-rate heatmap by weekday × hour, each deal's best hour, and a Call-back queue ordered by best time now (`hub_calls_v1`) |
| Speed report | Days from a deal's first entry to Closed Won, as average / median / fastest / slowest, plus the list |
| Week in review | Weekly summary: entries, won / lost, tasks done, hours worked, the best day, and the change from last week. Copy text |
| Deeper insights | Tabs: months, win / loss, plans & prices, productivity by hour and weekday, objections, phrases, scripts, data quality |
| Duplicate finder | Deals with the same HubSpot link or almost the same name, with Merge (as Won Deals does) |
| Trash & activity | Everything deleted (restore / delete forever) and a log of recent changes on this device |
| Restore points | An automatic daily snapshot of all data on this device (the last 7 are kept) plus Take one now. Restore asks first |
| Import CSV / Paste a list | Paste deal names (one per line, or `name, link, stage`) or pick a CSV, and the deals are added to the Deals board. Duplicates are skipped |
| Missing information | Closed Won entries without a plan, billing, price or HubSpot link, and deals without a link. Includes "Make a task" for each |
| Calendar | A month grid with tasks due, deal follow-ups, renewals, leave and holidays. Tap a day to see its list |
| Recurring tasks | Daily / weekdays / weekly / monthly tasks. The ids are deterministic, so two devices never add the same task twice (`hub_recur_v1`) |
| Renewals board | Overdue / this month / next month / later, with Mark renewed |
| Stuck deals | Open deals with no change for N days, grouped by stage |
| Greetings & renewal messages | Renewals due in the next 14 days with your renewal message ready to copy. Contact birthdays are **not** brought back (privacy: they were contact data) |
| Draft my Day End | A short written summary of today's entries, to copy |
| Follow-ups & goals | Daily and weekly entry targets with progress (`hub_goals_v1`) |
| My shortcuts | Your own links (website, sheet, WhatsApp chat), shown in Tools and in Jump to (`hub_shortcuts_v1`) |

## 3. App-wide features
- **Jump to… (Alt+J, or Ctrl/Cmd+Shift+K):** a command list of every section, HR tab, tool and action, plus your shortcuts. Type to filter, then press Enter.
- **Focus mode:** hides the notices, the moon and the extra buttons; Esc leaves.
- **One-hand mode (phone):** the main buttons move to the bottom and the buttons get bigger.
- **App lock:** a 4–8 digit PIN, asked when the app opens and after N minutes in the background. Only a hash is kept, on this device.
- **Comfort & speed:** larger text, less motion, compact lists.
- **Voice note:** a 🎤 button in Quick Add types what you say, if the browser supports it.
- **Follow-up notifications:** besides the reminders of tasks you set, there is an optional daily notification at a time you choose. It lists the tasks due, the follow-ups and the renewals (only while the app is open or in the background).
- **Owner filter and Saved views on Deals:** set an owner on a deal and filter by owner. Saved views store search, owner, pipeline and order under a name. The old `hub_owners` for deals are converted. The old saved views pointed at screen parts of the old app, so they can't be converted; save them again.
- **Select (bulk) on Lost Deals and Tickets:** tick several, then change the reason, stage or priority, or delete them all.
- **Tasks for deals without a HubSpot link:** Tasks gets a "No HubSpot link" filter, and Missing information can make these tasks.

## 4. Automation Studio (flows) and "Ask before Closed Won without details"
- **Flows:** each flow is when → (only if) → do, with a run log. Triggers:
  - a Day End entry matches words or stages;
  - a deal reaches a stage;
  - a deal stays in a stage for N days;
  - no contact for N days;
  - a task is overdue, or too many tasks are open;
  - a task is completed;
  - a renewal is coming up;
  - no entry for N minutes during the shift;
  - fewer than N entries by a time;
  - at a time of day, once a month, or on one date;
  - I clock in / out.

  Actions: add a task, set the follow-up, move the deal, add a tag, assign an owner, add a note, create a ticket, show a reminder, take a snapshot, and clear old done tasks. Each flow fires once per item. The old app's ready-made templates are included.
- Your old `hub_flows_v1` flows are converted. Triggers and actions the new app doesn't have stay listed but switched off, marked "not supported yet". Webhooks, the contact score and "best hour starts" fall in this group.
- **Ask before Closed Won without details:** saving a Closed Won entry without a plan or price asks first ("Save anyway / Go back"). There is a switch in Settings.

## 5. Dashboard: Customize, Arrange tiles, Build your own; saved Analytics reports
- **Customize:** hide or show each built-in tile and group, and change their order with ↑ ↓ (Arrange tiles).
- **Build your own:** add a widget with a source (Day End entries / Won / Lost / Deals / Tickets / Tasks), a measure (count / sum of price), a group (stage / plan / billing / day / month / weekday / hour) and a look (number / bars / columns), with its own period. The old `dash_v1` widgets and hidden tiles are converted.
- **Saved Analytics reports:** save the current Analytics period and view under a name, and open it later.

## 6. Not possible / not done (honest)
- Contact birthdays and contact-level greetings: not brought back (privacy).
- Old saved views: can't be converted, see §3.
- Webhook flows: not brought back. Sending data to outside services would need its own privacy decision. Tell me if you want it.

## Status
(filled in after implementation)
