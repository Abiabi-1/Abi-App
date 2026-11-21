# Round 2 plan: everything synced, Deals-first, same features everywhere, smooth on phone

Ground rules (unchanged): do not change or remove anything that already exists; only add features and fix issues. Every step is checked by the automated tests (existing reports and lists must stay identical, apart from the changes listed here).

## A. Everything syncs, always, from current data
1. **Smart text syncs** across devices (phrases, settings). Fix first: Smart text rewrites its saved copy when the page closes, which would undo a sync. It will skip that write while a sync reload is happening.
2. **Smart text learns from what already exists.** On first run (and on request, "Learn from existing data"), it reads your saved Day End notes, deal notes, tasks and tickets and learns the phrases, without learning phone numbers or emails (same rules as typing).
3. Synced list: Day End, Won Deals, Contacts, Tasks, Lost Deals, Tickets, **Deals**, Smart text. Per-device only: theme, panel open/closed.
4. Sync happens within seconds of a change and when you return to the app. The Cloud pill shows the state.

## B. Tickets tied to your real data
1. **Day End "Tickets Attended" entries become tickets automatically** (in the Closed all stage, closed on that day). Editing or deleting the Day End entry updates or removes the auto ticket, unless you have already worked on that ticket (then it is kept).
2. **Contact picker:** typing a number or name suggests existing contacts and deals; picking one fills the ticket and links it.
3. Tickets show on their **deal record** and **contact page**, with open-ticket counts.
4. Same tools as other sections: Excel export, Download Report (HTML), Copy report, Import file (Excel or CSV), Paste report. Quick Add panel.

## C. Deals first, contacts attached
1. New **Deals** tab (placed first after Day End): one record per deal name/number, built live from Day End tasks and Won/Lost data, so it is always current.
2. **Board and list views**, stage columns = the Day End stages (Lead, No response, Interested, Demo Completed, Going Live, Waiting on Contact, Closed Won All, Closed Lost All, Churn, Overdue). Extra **pipelines** can be added/removed with their own editable stages; a deal can be placed in them by dragging.
3. **Deal record page:** properties (plan, billing, price, registers, numbers, email), timeline of every Day End note, **associated contacts**, **associated tickets**, **tasks**, add note/task/ticket from the record.
4. The Contacts tab stays (everything in it unchanged) and each contact shows its deals; deals and contacts link to each other. Contacts is also reachable from a button inside Deals.
5. Same tools: Excel export, Download Report, Copy, Import file, Paste report, filters, search, Quick Add.

## D. Lost Deals brought up to the same level as Won Deals
1. Entry form with **selectable Plan (Free/Starter/Professional) and Billing (Monthly/Biannual/Annual)**, **automatic price** in USD and MVR from the same price table, and **extra registers** for Professional (price updates).
2. **Quick Add** side panel like the other sections.
3. **Excel export, Download Report (HTML), Copy report, Import file (Excel/HTML/text) and Paste report**, in the same style as Won Deals.
4. Plan/billing/price shown on each entry and totals; breakdown by plan and billing.

## E. Phone
1. **Hover-only buttons are always visible on touch screens** (no hover on phones).
2. Smoother feel: bigger tap targets, no accidental zoom in fields, momentum scrolling, safe-area padding (notch/home bar), faster taps, tab bar that scrolls and snaps, bottom sheets instead of cramped pop-ups.
3. **Top-bar buttons (Smart text / Synced / Backup / Restore)** become clear labelled buttons in a compact menu instead of unlabelled dots.
4. New sections designed for narrow screens first (cards instead of wide tables, columns scroll sideways).

## F. Look and feel (desktop and phone)
Consistent cards, spacing, headers and empty states across Lost Deals, Tickets, Deals, Contacts and Tasks, matching the Day End Report style (same colors, fonts, light/dark).

## G. Rule for every new section from now on
Every new section ships with: search, filters, Quick Add, Excel export, Download Report, Copy, Import file, Paste report, backup/restore coverage, cloud sync, and mobile layout. Nothing is considered done until its tests pass.

## Order of work
A (sync, Smart text) → D (Lost Deals parity) → B (Tickets data link) → C (Deals) → E/F (phone and look) → regression tests, update zip, SETUP/BUGFIXES notes.
