# FEATURES_V3 — plan (written before implementing)

Standing rules (from Abi, apply to everything below)
1. Do not change or remove anything that already exists. Only add and fix.
2. Every new section copies the design and the main features of every other section: board/list, search, filters, Quick Add, Excel export, Download Report, Copy, Import file, Paste report, cloud sync, mobile + desktop look.
3. A problem fixed once must not come back: every fix gets a test, and a "section parity" test checks that all sections have the same toolbar.
4. Build from this file, in order, and keep going until done.

## A. Fixes
| # | Problem | Fix |
|---|---|---|
| A1 | App switcher (top bar) looks off, buttons spill out when the window gets small | New header (section B). Tabs scroll inside their own box with soft fade edges, tools move into one "Tools" menu on small screens, nothing can overflow the page |
| A2 | Deals pipeline is not the same as the Contacts pipeline | One shared stage list (the Day End stages, same order as Contacts: Overdue, Churn, Lead, No response, Interested, Demo Completed, Going Live, Waiting on Contact, Closed Won All, Closed Lost All, plus "No stage"). Deals board uses the same card look as the Contacts pipeline. A test compares both stage lists |
| A3 | Sections drift apart in look | One shared style layer (tokens for radius, spacing, shadow, type) used by every section |

## B. Design for the whole app ("Calm Glass")
- Keep the existing colours (dark red/black and light blue) and fonts. Only spacing, shape and motion are unified.
- Header: one rounded bar, 56px. Left: tabs in a horizontally scrollable pill group with fade edges and a sliding highlight. Right: Search button, then a single Tools button. On wide screens (>=1100px) the Tools button expands into labelled buttons (Smart text, Cloud, Backup, Restore).
- Tools menu (small screens): Smart text, Cloud sync, Backup, Restore, Duplicates, Trash and activity, Templates, Auto backup, Theme-independent.
- Cards: 14px radius, 1px border, soft shadow, 150ms hover lift (hover only on devices that hover).
- Page header on every section: title, one-line subtitle, action row. Empty states: dashed card with a hint.
- Mobile: sheets slide up from the bottom, 44px tap targets, 16px inputs, safe-area padding, boards snap sideways.
- Reduced motion respected.

## C. Features (all of them, for every section where it makes sense)
1. **Global search** (button + Ctrl/Cmd+K): deals, contacts, tickets, tasks, notes. Click a result to open its section.
2. **Reminders on deals**: follow-up date and note on a deal record; due ones appear in Tasks and on the Dashboard; phone notification when the app is open and the browser allows it.
3. **Dashboard** (new first tab after Day End): today's calls, deals per stage, win rate, won and lost this week/month, open tickets, follow-ups due, MRR.
4. **Lost reasons report**: counts by reason, churn separate, on the Dashboard and in Lost Deals.
5. **Duplicate finder**: same number or same name across deals and contacts, with a merge-by-keeping-one option for manual deals/contacts.
6. **Bulk actions** on Deals list: select many, then move stage (custom pipelines), tag, or delete (manual deals).
7. **Tags and saved filters** on Deals: add tags to a deal, filter by tag, save the current search/filters under a name.
8. **Activity log + Trash**: every delete of a manual deal, ticket, lost entry or contact goes to Trash for 30 days with Restore; a log shows what changed and when.
9. **Templates**: reusable WhatsApp/email messages with {name} {deal} {price} placeholders; Copy, Open in WhatsApp, Open in Mail.
10. **Click-to-call and click-to-WhatsApp** on every number in Deals records, list and cards.
11. **MRR and renewals**: renewal date on a deal (auto from billing cycle when a start date is set); Dashboard shows MRR and renewals due in 30 days.
12. **Daily and weekly report** built from Day End, Copy / Download / Excel, in the Dashboard.
13. **Auto backup**: weekly backup file prompt (download) and "last backup" shown in the Tools menu.
14. **Custom fields** on Deals: add your own text/number/date fields; they appear in the record, list export and Excel.
15. **Offline mode**: already local-first; the app shell is cached by the service worker so it opens offline; status shown in the Cloud pill.

## D. Rule check for the new things
Every new list (Dashboard tables, Trash, Templates, Reminders) must have: search, Copy, Excel, Download Report, and cloud sync where it holds user data (new keys: `tools_v1` for trash, log, templates, saved filters; `deals_v1` extended with tags, reminders, custom fields, renewals).

## E. Order of work
1. This md. 2. A2 shared pipeline + shared style layer. 3. New header (A1/B). 4. Deals additions (C2, C6, C7, C10, C11, C14). 5. Tools module (C1, C5, C8, C9, C13). 6. Dashboard (C3, C4, C12). 7. Tests (parity, overflow at 320/390/768/1280 widths, features). 8. Docs, build, zip.
