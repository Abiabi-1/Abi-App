# Round 45 – WhatsApp / Email message tasks per day + Automation Studio

Two parts. Part A is exactly what you described for WhatsApp and email. Part B is a general automation builder so that features like Part A can be created by you, in the app, without a new round of development.

---

## PART A – WhatsApp and Email message tasks

### What you asked for (and how I read it)
1. See WhatsApp (and email) message tasks **per day** in Tasks, switching days like in Day End Report.
2. Days: you can go back as far as **22 Nov 2026 (yesterday)** and no further.
3. Tasks are **made automatically, starting today (23 Nov 2026)**. Nothing is created for 22 Nov.
4. Four folders in Tasks: **WhatsApp**, **Email**, and their "unable" versions: **WhatsApp – unable**, **Email – unable**.
5. While you are in Day End Report: a hidden hover button that shows a **✗ (cross) by default** and turns into a **✓ (tick)** when you tick it – one for WhatsApp and one for Email. Ticking it marks that task **done**.
6. You answered: a task is made for every entry where **you mention you're sending a WhatsApp / an email**; "unable" means **the contact has no WhatsApp number / no email**. The existing WhatsApp / Email buttons (the Contact row under notes) keep working and light up **green** when the notes mention it.

### How it works, step by step
| Step | What happens |
|---|---|
| 1 | You write an entry in Day End, e.g. *"will whatsapp him the price"*, *"to email the quote"*, *"no whatsapp"*, *"no email"* – or you tap the Contact-row buttons (WhatsApp today / Email today / No WhatsApp / No email). The existing detector (Round 38) reads the wording. The matching button now **lights green by itself** while the notes say it. |
| 2 | Within seconds the app creates the task (also for entries added from Quick Add, the moon, or another device): *will WhatsApp / will email* → **WhatsApp** / **Email** folder. *No WhatsApp / no email* → **WhatsApp – unable** / **Email – unable** folder ("Get a WhatsApp number for …"). The task is dated the **day of the entry**, holds the number, the note, and a **Go to entry** link. |
| 3 | In Day End, hover an entry (on a phone: a faint, always-there small control): you see `💬 ✗` and/or `✉ ✗` only for the channels that entry mentions. Tap ✗ → it becomes **✓ green**, and the task is completed. Tap ✓ → it goes back to ✗ and the task is reopened. |
| 4 | In Tasks, the new **Messages by day** bar: `‹  Mon 23 Nov  ›  Today`, and chips **All · WhatsApp · Email · Unable · To do · Done** with counts. It lists every message item of that day with the same tick. Going back stops at **22 Nov**; going forward stops at today. |
| 5 | If an entry later says *"whatsapped"* / *"emailed"* (sent), the existing Round 38 behaviour still completes the open task by itself. |

### Rules I keep (so nothing surprises you)
- **22 Nov**: shown in the day view (from the entries you wrote), with the tick, but **no tasks are created** for it.
- **Never makes the same task twice**: one task per contact, per channel, per day. If you delete a task by hand, the app **does not bring it back**.
- Contact with the same number/name already has an open task in that folder → no second one.
- Nothing is removed or renamed in your data. Your existing "WhatsApp Today" and "Email Today" folders become **WhatsApp** and **Email** (same tasks inside, only the name changes – you can rename them again any time).
- Works the same on phone and PC. Light theme, palettes and the moon all apply.
- The whole thing has an on/off switch (Automations → Studio → Messages).

### Honest limits
- The app cannot send WhatsApp messages or emails by itself (browsers and phones don't allow it). It makes the task, keeps the number/note ready, and lets you tick it.
- The detector reads wording. If a sentence isn't recognised, tap the Contact-row button once and it counts.

---

## PART B – Automation Studio (automations for everything)

### What I researched
How HubSpot Workflows, Asana Rules, Notion database automations, Airtable and Zapier are built. They all share the same parts, and so does the Studio:
1. **Trigger** – what starts it: a record changes/appears, a time/schedule, an event (call outcome, clock in), or a state (too many open tasks).
2. **Conditions** – "only if…" (text, stage, age, source, message intent, open/closed), with AND/OR.
3. **Actions** – several in order: create a task, complete/move tasks, change a stage, add a tag/note/owner, set a follow-up, create a ticket, notify, call a web address.
4. **Delays / waits** – "do the next step 1 hour / tomorrow / 2 days later", cancelled if you already followed up.
5. **Enrollment** – once per record, once a day, or every time.
6. **Safety** – test run (changes nothing), run history, undo last run, loop and flood limits, on/off per automation.
7. **Templates** – ready-made automations to start from.

### Where it is
**Automations → Studio** (new tab; the existing Rules and Smart rules tabs stay exactly as they are). Also in the Tools menu. Studio is organised in **sections**; each section has its own description, templates and list:

| Section | For what |
|---|---|
| 💬 Messages | WhatsApp / email intent, unable, chasing unsent messages |
| 📋 Day End entries | react to wording in entries, quiet hours, end-of-day checks |
| 🤝 Deals & pipeline | stage changes, stuck deals, quiet deals, hot contacts |
| 📞 Calls & timing | no-answer runs, outcomes, best hour to call |
| ✅ Tasks | overdue tasks, pile-ups, chains after a task is done |
| 🎫 Tickets | tickets open too long, new tickets |
| 🏆 Won, Lost & renewals | onboarding, win-back, renewals, payments |
| 👤 Contacts | new contacts, contacts gone quiet |
| ⏰ Schedules & reminders | daily/weekly/monthly/every-N-minutes/one-off time |
| 🕒 Clock & shift | clock in / out / break |
| 🧹 Tidy-up & backups | clear old done tasks, automatic safety snapshots |

### Triggers (when)
Record matches (any of 7 sources: Day End, Won Deals, Contacts, Tickets, Lost, Deals board, Renewals) · Message intent in Day End · Stage reached / stage too long / quiet deal / hot score / best hour / unanswered calls / call outcome (the Smart-rule triggers, reused) · Renewal coming · Task overdue · Task completed · Too many open tasks · No Day End entry for a while · Fewer than N entries by a time · At a time of day · Weekly · Monthly · Every N minutes · On a date · Clock in/out/break.

### Conditions (only if)
Text contains (similar wording, typos and synonyms count) · text does NOT contain · stage is / is not · older / newer than N days · open only · message intent · and AND/OR choice for the text conditions. Scope: *today onwards* (default), *new from now on*, or *all existing*.

### Actions (then)
Add a task (folder, due, priority, notes with the filled message) · Complete matching tasks · Move tasks to a folder · Make matching tasks high priority · Clear done tasks older than N days · Set follow-up date · Move deal to a stage · Add tag · Add note · Assign owner · Mark message sent · Create a ticket · Change the Tasks order · Show a reminder (+ phone notification when allowed) · Take a safety snapshot · **Call a web address (webhook)** so the app can talk to Zapier / Make / IFTTT / Google Sheets etc. Every action can **wait** first (now, 15 min, 1 h, 4 h, tomorrow 9am, 2 days, 1 week) and can be **cancelled if you've already contacted them**.

### Variables for text
`{name} {number} {stage} {note} {day} {source} {phrase} {score} {slot} {count} {today} {time}`

### Safety
Test run changes nothing and shows what would happen · every run in the history · "Undo last run" for tasks it made · each automation can't make more than 100 actions per run and 300 per day · saved in the cloud sync like everything else · exported/imported as a file.

### Honest limits
- Automations run **while the app is open** and catch up when it opens (same as Smart rules).
- It can't send WhatsApp/email itself; it makes tasks with the message text ready.
- A web-address action can send but can't read the answer (browser rule).

---

## Status (filled after testing)
| # | Item | Status |
|---|------|--------|
| A1 | Tasks per day in Tasks → "Messages by day" (‹ day ›, Today, chips All / WhatsApp / Email / Unable / To do / Done, counts) | Done, tested PC + phone |
| A2 | Days limited to 22 Nov 2026 … today | Done, tested |
| A3 | Tasks made automatically from 23 Nov 2026; none for 22 Nov (22 Nov still listed, tickable) | Done, tested |
| A4 | Folders WhatsApp, Email, WhatsApp – unable, Email – unable (fixed ids so phone + PC never make two; old "… Today" folders renamed, tasks kept) | Done, tested |
| A5 | Hidden hover ✗/✓ button next to the WhatsApp and Email buttons of an entry (faintly visible on phone); ✓ completes the task, ✗ again reopens it | Done, tested |
| A6 | Existing green/red WhatsApp & Email buttons and the Contact row keep working and feed the automation | Done, tested |
| A7 | No duplicates; a task you delete stays deleted; same contact already having an open task is not doubled | Done, tested |
| A8 | On/off switch (Studio → Messages) | Done |
| B1 | Automation Studio tab (first tab of Automations) + Tools menu entry; 11 sections, 36 templates | Done, tested |
| B2 | Triggers: record matches (7 sources), message intent, messages not ticked, quiet shift, few entries, overdue task, task completed, too many open tasks, every N minutes, monthly, one date + the Smart-rule triggers (best hour, unanswered calls, outcome, stage reached / too long, quiet deal, hot score, renewal, time of day, clock) | Done, tested |
| B3 | Conditions: text any/all/not (similar wording), no stage, stages, older/newer, open only, score, scope (today / new / all) | Done, tested |
| B4 | Actions: add task, message task from template, complete / move / re-prioritise this contact's tasks, follow-up, stage, tag, note, owner, mark messaged, ticket, reorder, reminder, snapshot, clear old done tasks, web address (webhook) | Done, tested |
| B5 | Waits (15 min … 1 week) with "skip if I already followed up / ticked" | Done, tested |
| B6 | Safety: test run, run history, undo last run, pause all, 100 per run / 300 per day limits, import / export | Done, tested |
| B7 | Existing Rules and Smart rules untouched | Done, tested |

Notes from testing: when the WhatsApp/email message tasks are completed by ticking, the older automatic completion by wording (Round 38) no longer closes tasks made by this automation (otherwise editing an entry could close a task you had not ticked). Tasks the older rule made itself are unchanged.
Limits to remember: runs only while the app is open (and catches up when opened); with the app open on phone and PC at the same time, both devices can run an automation, so a reminder may show on both (tasks and message tasks never duplicate because their ids are fixed).
