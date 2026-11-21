# FEATURES_V5 — plan (written before implementing)

Standing rules (Abi): never change or remove what exists, only add and fix. Every feature is built once and applied to every section that has similar things. A problem fixed once must not return (each fix gets a test). Everything must be on-theme, with nothing overflowing or out of place (checked at 320 / 390 / 768 / 1280 px). Md first, then implement from it.

## 1. Automations (rules that add tasks by themselves)  — NEW "Automations" manager
Opened from Tasks ("⚙ Automations"), Tools menu, and Ctrl/Cmd+K.
**Where rules look (sources, any combination):** Day End entries (tasks, calls, WhatsApp, other, tickets) · Won Deals notes · Contacts notes and activities · Tickets (subject, description, notes) · Lost Deals notes · Deals board.
**What a rule can match:**
- Phrases (as many as you like), each with a mode: *contains*, *all these words in any order*, *exact phrase*, *starts with*, *similar meaning* (typo-tolerant, word-ending tolerant, synonym groups you can edit), *regex* (advanced). Each phrase can be flipped to "must NOT appear".
- Combine phrases with ANY / ALL / NONE. Ignore negated hits ("not paid") switch.
- Where to look: any text, notes only, name only, number only, stage only.
- Stage is / is not / has no stage; plan; billing cycle; price from–to; contact has / has no email or number.
- Age: entry is newer than N hours/days, older than N hours/days, or "no update for N hours/days" (customisable unit).
- When the rule runs: always, only between two times of the day, only on chosen weekdays, and how often it checks (on open, every 5/15/60 min).
**What a rule does:**
- Creates a task in a chosen folder (or no folder) with title / notes templates ({name} {number} {stage} {note} {source} {day} {phrase}), due (today / +N days / +N hours / at a time), reminder, priority, tags.
- One task per entry per rule (never duplicates); optional "re-create if the text changes".
- Optional: show a notification, mark matched entries with a tag.
**Manage:** add, edit, duplicate, delete, enable/disable, reorder, "Test rule" (shows what would match before saving, with the matching phrase highlighted), "Run now", per-rule history (last run, tasks made), import/export rules, one-click starter templates (No response, Paid, Making bills, No issues, Demo follow-up, Callback, Price question, Complaint, Renewal).

## 2. Task folders (sub-sections)
- Folders bar in Tasks: All tasks · No response · your folders. Add, rename, recolour, choose icon, reorder, delete (tasks inside are moved to All or deleted — you choose).
- Each folder shows its count, overdue count, search, done/open filter, move task between folders (select on every task), and which rules feed it.
- **No response folder time is customisable:** "no update for ___ hours/days" (default 5 days), require a no-response phrase on/off, your own extra phrases, auto-add on/off, run time.

## 3. Dashboard builder
- "Customize" mode: add, edit, remove, reorder (drag) and resize tiles/bars/lists; hide built-in tiles; reset to default.
- Widget editor: title · source (deals, won, lost, tickets, tasks, day end, contacts, renewals) · filters (stage, plan, billing, tag, text contains, folder, period) · measure (count, sum of price, average price, sum of MRR, distinct customers) · shape (number, bar list, list) · group by (stage, plan, billing, reason, category, day, month, none) · colour.
- Every custom widget is pressable and opens the same detail list popup (search, Copy, Excel, Download).
- Period switch on the whole dashboard: Today / 7 days / Month / Year / All. Synced to cloud, backed up.

## 4. Tickets board + shared board rule
- Tickets board gets the same card/column look as Contacts and Deals: stage colours, "Move to…" select on every card, mobile snap columns, counts. A parity test compares the three boards.
- One shared "stage tone" colour set (taken from Day End: green = won, red/rose = lost/churn/overdue, blue = active stages) used on column headers, chips and cards in every section.

## 5. Design layer ("subtle colour")
- Day End's colour language everywhere: tone stripe on cards and column headers, soft tinted chips, tinted tile icons on the Dashboard, subtle gradients on panel headers, gentle focus rings and hover lift (only on hover devices), reduced-motion respected.
- Folder and rule colours chosen from the same palette, tuned for light and dark.

## 6. Leftovers from earlier lists (added now)
Activation/due dates in Day End, Deals, Lost, Contacts, Tickets · plan×billing grid in Won/Deals/Lost · Tickets "Move to…" · stage history · bulk message · import wizard · print/PDF · app lock. Anything not finished is listed honestly in the delivery note.

## 7. Storage / sync
New key `rules_v1` ({folders, rules, settings, history}) and `dash_v1` ({widgets, hidden, order, period}); both in cloud sync + backup prefixes (`rules_`, `dash_`).

## 8. Tests
rules engine (every phrase mode, negation, stage/plan/age filters, no duplicates, time window), folders CRUD, No-response customisation, dashboard builder CRUD + pop-ups, tickets board parity + Move to, overflow at 320–1280, cloud + full regression.

## Order of work
1 md → 2 rules engine + folders → 3 Tasks integration + No response settings → 4 Automations UI → 5 Dashboard builder → 6 Tickets board + stage tones + design layer → 7 tests/regression → 8 docs, build, zip.
