# Round 57 – One whole app, rebuilt from scratch (new sync, the design bases, every section)

Request (27 Nov 2026): *"Make it a full fledged app. Write a md and remake it completely the way it is. Use the bases and fix all the issues. There are issues with syncing as well."*

This md was written first and then implemented. The status is at the end. It follows the hand-over (CLAUDE.md, Part 1 and Part 2) and Abi's answers of 24 Nov, which are already decided and not asked again.

---

## 1. What you get

- **A new app** next to the old one. It is one codebase: no iframes, no 3 MB single file, no copied scripts. It is built with Vite + TypeScript + Preact and is an installable PWA. Day End Report and Won Deals are still **two separate sections with their own pages**, but they now share one data layer, one theme, one navigation and one set of components (Abi's decision 3).
- **A new sync engine** that fixes the sync problems at their root (§3).
- **The design bases** from CLAUDE.md Part 2 §1, built once as shared components and used by every section (§4).
- **Your data comes with you.** On first start the new app reads everything the old app saved: this device's storage and, once you sign in, the cloud copy. Nothing in the old cloud rows is changed or deleted (§5).
- **The old app is not touched.** It stays where it is as a fallback until you decide to switch (§7).

Where it lives in the repository (branch `claude/app-rebuild-sync-fixes-ozrbm2`, not merged and not deployed):

| Folder | What |
|---|---|
| `app/` | Source code (TypeScript), tests, build config |
| `next/` | The built app (static files). Once merged it opens at `…/Abi-App/next/` on GitHub Pages and `abi-app-nine.vercel.app/next/` on Vercel |
| root files | The old app, unchanged |

---

## 2. Rules kept

- Only add and fix. Every existing feature is either rebuilt (§6) or its data is kept safe and listed honestly as not rebuilt yet (§8). Nothing is deleted.
- **Privacy (hard rule):** no phone numbers, e-mails or contact data are stored. One cleaner runs on **every write**: typing, imports, migration and data from the other device. Only deal names, ticket names and the HubSpot deal link (with `?taskId…` removed) are kept. A test fails if a phone or e-mail pattern reaches storage.
- The reference mobile app is not mentioned anywhere.
- No automatic light/dark switching by time of day.
- Nothing is deployed by me. Merging the branch is your step (§7).

---

## 3. Sync – what was wrong and how it is fixed

### Root causes found in the old engine (`script-10-cloud-sync.js`)
1. **The whole storage key was sent each time.** For example, all Day End days were one JSON blob. Many screens kept their own copy in memory and wrote that copy back later. When an update from the other device arrived in between, the stale copy overwrote it. **Effect: changes from the other device disappeared again.**
2. **Deleted items came back.** The merge needed a "base" copy kept in IndexedDB. Safari clears IndexedDB for web pages that have not been used for 7 days, and private mode never keeps it. Without the base, a deletion cannot be told apart from an addition, so the deleted entry was added back.
3. **Entry times got jumbled.** The exact time of each Day End entry was stored in a separate list beside the entries (`slot.at`). The merge treated that list as a set of loose numbers: equal times were collapsed and the order was lost. **Effect: times moved to the wrong entries.**
4. **Updates waited or reloaded the page.** Screens could not take changes in place, so an update had to wait for a full page reload. Reloads were held back while you typed or had a pop-up open, and limited to 3 a minute. **Effect: the "Update ready" bar and changes that showed up late.**
5. **Live push stopped after an hour.** The realtime connection was opened with the login token and never given the refreshed token. After about an hour it dropped silently and only slow polling was left.
6. **"Your cloud already has data" appeared again** when the browser had cleared IndexedDB (cause 2).
7. **Changes made just before closing the app could stay unsent.** On iPhone the send on leaving often did not finish, and nothing remembered that it was still owed.

### New engine (`app/src/data/sync.ts`)
- **One record per item.** Each Day End entry, deal, ticket, task, lost deal, clock punch and setting is its own record with a stable id.
- **Every field carries its own timestamp** (hybrid logical clock). Two devices editing different fields of the same item both keep their change. If both edit the same field, the later edit wins. The value that lost is written to the conflict log, which you can download.
- **Deletes are kept as "tombstones"**, so a deleted item can never come back, with or without IndexedDB.
- **Nothing is ever reloaded.** Updates from the other device show up in place straight away. What you are typing is never touched, because forms keep their own draft.
- **Outbox:** every change waits in a saved outbox until the cloud confirms it. It survives closing the app, and it is sent on leaving (keep-alive request), on returning, when back online, and every few seconds.
- **Realtime with token refresh**, automatic re-join, and a fallback pull every 15 s. A full check of all versions runs every 10 minutes, so nothing can be missed.
- **Same Supabase project, same `kv` table, no SQL to run.** New records are stored as `kv` rows with keys `v2:<collection>:<id>`. Saves check the row's `version`, so two devices can never overwrite each other blindly: on a clash the app fetches the cloud copy, merges field by field and tries again. The old rows (`dayEndReport_v6`, …) are only **read**, never written, so the old app keeps working with its own data.
- The sign-in from the old app is **reused** on the same device (same website), so you do not have to sign in again. The same built-in project address and publishable key are used.
- **Devices list** (Settings → Sync): the same `devices` table as Round 46.
- A sync status pill sits in the bar: Synced · Syncing n · Offline n waiting · Problem (tap it for details, Sync now, Sign out, conflict log).

---

## 4. Design bases (CLAUDE.md Part 2 §1), built once in `app/src/ui/base.css` + `app/src/ui/kit.tsx`

| Base | Done as |
|---|---|
| Navigation bar | PC: a 52 px top bar with no background or border; tabs are text only with transparent borders; idle tabs are muted and the active one is white with the red text glow; small dark badges. The right side holds borderless line-icon items: Search, Backup, Restore, Clock in, Today, Colours, Settings, Menu. |
| Phone bar | **An exact copy of the top bar, moved to the bottom** (≤ 820 px): the same tabs in the same order with the same look and badges, scrolling sideways with the active tab centred, then the same right-side items. Quick Add is pinned at the end as the one filled red button. It respects the iPhone safe area. Hiding and reordering sections (Settings → Menus) applies to both bars. |
| Glow rule | Every button, chip and icon is borderless with no fill. On hover, or on press on touch screens, it gets a glow that follows the text or the icon shape. Toggled on = a steady glow: WhatsApp/Email/tick on is a **green** glow, "unable" is a **red** glow, off is faint. Respects reduced motion. Classes: `.b` (text button), `.bi` (icon button), `.is-on`, `.is-bad`. |
| Add buttons | The only filled buttons (`.b-add`): red gradient, white text, pill shape (default from §11 Q2), compact. |
| Destructive | Borderless rose text, confirmed in a small pop-up. |
| Data box | A single `<Stat>` component: small uppercase label, big JetBrains-Mono number, one caption line, card fill, 1 px border, radius 12. Equal-size tiles that scroll sideways (`.tiles`). Used by every section. |
| Inputs | 36 px high (38 on phone), radius 10, a quiet border that turns accent on focus, 16 px font on phone (no iOS zoom). |
| Page header | Icon · gradient title · one-line subtitle, then **one** controls row: view switch · search · "Filters & more" · add button. |
| Pop-ups | One `<Sheet>`: centred pop-up on PC, bottom sheet on phone, inner scroll, closes on Esc or outside tap, always above the moon. |
| Cards | One anatomy for deal, ticket, task and lost-deal cards: title, one sub-line, up to 3 pills, a 2-line note, and one "⋯" menu. |
| Look | Pitch black `#000` with red filigree and the blood-moon artwork. 7 palettes (Crimson, Deep grey, Blue, Purple, Green, Yellow, Pink) swap only the accent colours. Light theme. Glass scrollbars. Sora + JetBrains Mono. |
| Moon | A floating moon on every page except Day End (Day End has its own moon inside the shift box). Holding it 0.4 s opens Day End Quick Add. Stars appear only after a 5 s rest, and on Day End only inside the shift box. Drag to move it, double-click to hide, Alt+M or the "☾ Moon" tab to bring it back. The position is kept inside the window. |

---

## 5. Your existing data (migration)

On first start (and again on request in Settings → Data → "Re-import from the old app") the app converts:

| Old key | Becomes |
|---|---|
| `dayEndReport_v6` (+ old `v5`) | `days` (shift start/end) + `entries` (one per Day End entry: hour, section, every field, exact time, WhatsApp/Email marks, ticks) |
| `dealsTracker_v1` | Won deals that have no Day End entry yet become Day End "Closed Won All" entries, as the old app did, so nothing is counted twice |
| `deals_v1` | `deals` (hand-added deals), deal stage/pipeline placements, notes, tags, merges, pipelines |
| `lostDeals_v1` | `lost` (hand-added) + reasons + per-entry details |
| `tickets_v1` | `tickets` + pipelines, types/sub-types, categories, priorities |
| `followTasks_v1` | `tasks` (all fields, folders, done state) |
| `hub_hr_v1` | `punches` (clock in/out/breaks) + HR settings |
| `billing_v1` | renewal data (activation/due/renewed) |
| `hub_msgauto_v1`, `rules_v1` | automation settings |
| every other synced key (HR extras, flows, dashboards, snippets, templates, goals, invoices …) | kept unchanged as `legacy` records: **synced and backed up, nothing lost**, ready for the sections listed in §8 |

- Ids are **deterministic**: the same old data on phone and PC becomes the same records, so migrating on both devices never makes duplicates.
- Migrated values get the oldest possible timestamp, so any real edit made in the new app always wins over a later re-import.
- If you are signed in, the **cloud copy** of the old data is used (it is the merged one). Otherwise this device's copy is used.
- Phone numbers and e-mails still left in old data are cleaned out during migration.
- A before/after count is shown (Settings → Data → Migration report).

---

## 6. Sections rebuilt

### Day End Report (kept as she likes it, a little tighter)
- Day navigation (‹ › date picker, Today, day chips with counts), and shift start/end per day.
- The shift box: countdown ring with the blood moon (left / to start / overtime, Standby on other days), On Shift / Upcoming / Finished, hours count, stars inside the box only, and the clock strip (In · Break · Back · Out) with Clock in / Break / Back / Clock out.
- Hour blocks from the shift (collapsible, "Now" opens by itself) with five sections: **Tasks Completed** (HubSpot link with ↗, deal name, notes, deal stage → plan → billing → standard/custom price → USD/MVR → extra registers with the same price table and MVR rate), **Support Calls**, **Whatsapp Inquiries**, **Tickets Attended** (type + description, `[TYPE] desc`), **Other**.
- Entries show the exact time (tap to change it), stage/plan/price chips, the ↗ HubSpot link, WhatsApp + Email icons with a **Tick under each (2 × 2)** (off → green → red; the auto-detection from note text is kept), Follow-up, Edit, Delete (two-tap).
- The filter row: WhatsApp / Email / Tick tri-state toggles that combine.
- Data tiles: stage tiles, plan tiles (Monthly/Biannual/Annual) and activity tiles (unique/repeat callers and senders, ticket types) for Day / Month / Year / All.
- **Final Report text with the same format as before, line for line** (same headings, bullets, exact-time suffixes, time-clock lines, totals, Deal Stages, Activity Breakdown), plus Copy, Download .txt and Excel export (same columns). Monthly / Yearly / All-days report with the same format.
- Quick Add (Day End) from anywhere: the moon hold, the bar button and **Q**. It has a section picker, the same fields, "Use last details" (fills the link and stage for a known deal), and call-outcome and quick-note shortcuts (only inside Quick Add, as R51 decided).

### Won Deals (own page, same rules as before)
- One deal per customer: the first Closed Won All is the deal and later entries go into its note history (matched by HubSpot id or deal name), as the old app did.
- Per day list, add / edit / delete (an added deal is stored as a Day End Closed Won entry, exactly as before), plan breakdown for day / month / year / all, Deals Report text in the same format, Copy / Download / Excel.
- Revenue & renewals: MRR, ARR, due in 30 days, overdue, Mark renewed, activation and due dates.

### Deals (redone completely, §6 of Part 2)
- Header: pipeline picker · Board/List · search · one "Filters & more" pop-up · **+ New**.
- Deals are built live from Day End entries (grouped by HubSpot id or name), plus hand-added deals.
- Stage order: Lead, Interested, Demo Completed, Going Live, Closed Won All, No response, Waiting on Contact, Overdue, Churn, Closed Lost All. The stage follows the latest entry unless you move the deal by hand.
- Board: PC = columns with drag & drop; phone = one stage per screen with a borderless stage tab strip. Cards: name + copy-name button, stage pill, plan/price, ↗ HubSpot, open-ticket count, WhatsApp/Email + ticks, a small "Move to…". No "Copy notes", no shortcuts.
- List view, bulk select (move stage / tag / delete hand-added), extra pipelines with editable stages, tags, follow-up date, CSV export.
- Record page: key fields, timeline (Day End entries + notes + stage changes), linked tickets, one actions menu, notes.

### Lost Deals
- Lost / Churn tabs, fed live by Closed Lost All / Churn entries plus hand-added ones. Reason (editable list), value lost, plan; tiles for lost, value, won in the period and win rate; reasons breakdown; Copy report / CSV; day / month / year / all.

### Tickets (redone completely)
- **One tab per type** (Demo, Support, Product List, Setup, Hardware Delivery, Printer Setup, Training + your own), each with Online / Physical / AnyDesk sub-tabs. Plain "Demo" = Physical Demo, multi-type tickets appear under each type, and types are editable.
- Stage tabs/board under the type tabs, with automatic Today and Closed this month columns. Pipelines and stages are editable.
- Tickets are created from Day End "Tickets Attended" entries (type detected by phrase) or by hand. They link to deals by name. Closing needs a resolution. Each ticket has a notes timeline and stage history. Priorities and categories are kept.

### Tasks
- Folders (drop-down), day navigation like Day End, Open/Done/All, search, add/edit, due date and time, priority, reminders (browser notification while the app is open), Move to folder, bulk done.
- **Message tasks**: Day End task entries make tasks in **WhatsApp Today / Email Today** (or the "unable" folders). Ticking the entry closes the task. The **2 × 2 WhatsApp/Email + tick filter** sits next to the folder picker.
- Best-time ordering (the hours each deal is usually reached).

### Dashboard and Analytics
- Dashboard: Today (entries, tasks due, tickets open, clocked time), deals per stage, win rate, MRR, renewals in 30 days, follow-ups due. Every tile uses the data box and opens its records.
- Analytics: date presets (7/30/90 days, month, year, all), funnel, activity per day, plans, lost reasons, best hours. The charts follow the dataviz rules (one accent colour family, direct labels, accessible in light and dark). CSV export.

### HR & time (core)
- Clock in/out and breaks with exact times (the same punches as before), today's worked/break time, attendance list per day, a weekly timesheet and HR settings (shift times, grace, seconds on/off). The time-clock lines in the Day End report match the old format.

### Automations
- Phrase rules (contains / all words / exact / starts with / regex, with NOT): **when a Day End entry says X → make a task** (folder, title template, due in N days, priority) or **file a ticket** of a type. Message-task automation on/off and the start date. Stage auto-update from the latest entry. Test a rule on today's entries.

### Settings and tools
- Appearance (theme, palette, calm mode = no stars), Menus (hide/reorder sections for both bars), Quick Add rows, Privacy (link in report on/off), Sync & devices, Data: Backup (JSON of everything), Restore (also accepts **old-app backup files**), Re-import from the old app, Migration report, conflict log, Trash (deleted records, restore within 30 days).
- Global search (Ctrl/Cmd+K) across entries, deals, tickets and tasks.

---

## 7. How to switch (your decision)

1. Merge the branch, or just let Vercel build its preview from the branch.
2. Open `…/next/` on the PC. It picks up your old sign-in and data, migrates, and syncs.
3. Open `…/next/` on the iPhone (Share → Add to Home Screen to install).
4. When you are happy, the old app can be moved to `/legacy/` and the new one put at the root. That is a separate, explicit step. Until then both work, but **use one of them for new entries**: the new app does not write to the old app's data.

---

## 8. Not rebuilt in this round (data kept safe, synced and backed up)

To be honest about the size: the old app has ~56 rounds of features. These are **not** rebuilt yet in the new app. Their saved data is carried along unchanged (as `legacy` records) so a later round can rebuild them without loss:
- HR extras beyond the clock: leave, holidays, payroll/salary slips, reviews, learning, documents, org chart, hiring, surveys, rota/swaps, expenses …
- Automation Studio flows (multi-step workflows, waits, webhooks). The simple rules in §6 are rebuilt; the Studio editor is not.
- Dashboard builder (your own widgets), saved Analytics reports, goals editor.
- Smart text (phrase suggestions while typing), Snippets text expander, Message Templates page, Invoices, Call log page, Insights 2 extras, command palette (Alt+J), focus/one-hand modes, voice quick add, Excel (.xlsx) **import** and "Paste report" import (export works; restore from backup works).

---

## 9. Tests

- `app/tests/sync.spec` – two devices against a fake Supabase: edits on both sides converge, different fields both survive, deletes never come back, offline outbox is delivered, version clash is merged, realtime token refresh.
- `app/tests/migrate.spec` – the old data becomes the same records on two devices, no duplicates, counts match, phone/e-mail patterns are removed.
- `app/tests/report.spec` – **the Day End Final Report and period report text from the new app equals the old app's text** for the same data (the old app is built from source and run side by side).
- `app/tests/ui.spec` – every section opens on PC 1200 and phone 390 with no horizontal overflow and no page errors; the bottom bar copies the top bar; the glow and toggle states; the privacy guard.
- Screenshots: dark, light and one palette, on PC and phone.

---

## Status

**Built and tested in Chromium (PC 1200 px and phone 390 px, dark, light and a palette). NOT deployed, NOT merged, NOT tested on a real iPhone.**

| Part | State |
|---|---|
| New app (Vite + TypeScript + Preact, PWA), 217 KB JS (72 KB gzipped) instead of 3 MB | Done |
| Design bases (bar, phone bar = same bar at the bottom, glow rule, add buttons only filled, data box, sheet, inputs, cards) | Done – test checks that only add buttons are filled, tabs are text-only/borderless/glowing, bars match |
| New sync engine (per record, field timestamps, tombstones, outbox, version-checked saves, realtime with token refresh, 15 s pull, 10 min full check, no reloads) | Done – two-device test passes. **Realtime itself was not tested** (the fake cloud has no websocket); polling every 5–15 s covers it if realtime does not connect. |
| Migration of old data (device or cloud copy, deterministic ids, re-import, old backup files) | Done – tested with sample data on two devices (no duplicates, counts match) |
| Day End report / period report text identical to the old app | Done – `parity.test` compares both apps on the same data: identical (including time-clock lines) |
| Day End, Won Deals, Deals, Lost Deals, Tickets, Tasks, Dashboard, Analytics, HR clock, Automations, Settings | Done (scope as in §6) |
| Items in §8 | Not rebuilt; their data is carried along unchanged |

**Interpretations I made (tell me if any is wrong):**
- The new app lives at `/next/` next to the old one; switching is your decision (§7). The new app does not write the old app's data, so use one app for new entries.
- Tick under WhatsApp/Email on deal cards = "reached" confirmation for the deal (as R48–R51); the icons themselves follow the latest Day End entry.
- Excel export is kept; Excel / "Paste report" **import** is not rebuilt yet.
- Bar action items show icons only below 1500 px wide (labels as tooltips), so more section tabs fit; above 1500 px the labels show as before.
- Rules in Automations run on entries made from the day the rule list was first used onward (they do not fill your history with tasks).

**What to check on your iPhone after merging:** sign-in is reused from the old app on the same site; Add to Home Screen; Quick Add (+ at the bottom right or hold the moon); a change on the PC appears on the phone within ~15 s (instantly if realtime connects).
