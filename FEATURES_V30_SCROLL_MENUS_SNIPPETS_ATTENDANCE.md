# Round 30 — scroll buttons on every nav bar, customizable menus, text expander, attendance fill, rules

**New standing rules (added to the existing ones)**
1. **Always apply every feature everywhere it is applicable.**
2. **Every round ends with a sweep of the whole software:** if a section lacks a feature that another section has, use the newest/best version of that feature there too. (This round's sweep results are at the bottom.)
Existing rules still hold: nothing removed/changed, only additions and fixes; phone + PC; pure black; red/black filigree; honest status.

| # | You asked | Root cause / research | Plan |
|---|---|---|---|
| 1 | Top navigation can't be scrolled horizontally; hidden hover button that moves one section per press, hold = jump to the end; on **every** horizontal nav bar | Tab rows hide their scrollbar and have no mouse way to scroll | One shared script in the hub **and** both frames: finds every horizontally-overflowing bar (hub tabs, HR tabs, Tasks folders, Deals sub-tabs, day chips, Automations tabs, dialogs…). Invisible ‹ › buttons appear on hover (faint on touch). Press = next/previous section; hold = scroll to the end / start. |
| 2 | All navigation menus customizable (add / remove / move), from the side menu, in the existing Customize pop-up; show buttons not in theme | One shared order for the top bar only; hide/show used plain checkboxes | Customize pop-up gets tabs: **Side menu · Top bar · Tools menu**. Each list: move ↑↓, drag, themed show/hide switch (hidden = removed from that menu, "Add" = switch on). HR & Time is a movable item in the side menu. Side menu button opens the same pop-up. |
| 3 | Text-Blaze-style shortcuts (.1 → text) with as many features as possible, everywhere | Researched Text Blaze / TextExpander / aText: triggers with a prefix, expand on delimiter or instantly, dynamic fields (date/time/clipboard/cursor), forms/prompts, choices, folders, search, import/export, per-snippet case/undo, shared snippets | **Snippets** manager (Tools menu, side menu, `G then S`, and the Smart-text area): add/edit/delete/duplicate, folders, search, enable/disable, import/export JSON, **~70 ready-made shortcuts** (dates, times, call outcomes, follow-ups, greetings, sign-offs, WhatsApp/email replies, stages) all editable. Expansion works in every text box in the hub, Day End and Deals Tracker (not in phone/password boxes). Commands: `{date}` `{date:DD/MM/YYYY}` `{time}` `{weekday}` `{tomorrow}` `{yesterday}` `{nextweek}` `{clipboard}` `{cursor}` `{ask:Label}` `{choose:a|b|c}` `{number}` `{deal}` `{name}` (from the form you're in) `{upper:…}`. Backspace straight after an expansion undoes it. Synced to the cloud with everything else. |
| 4 | Count on the tabs leaks at 10+ | Badge pill has fixed padding, no min-width, no shrink | Badges grow properly, never overflow the tab; same fix for every count pill (Tasks folders, chips). |
| 5 | Moon says "worked" instead of "clocked in" | wording | Label is now "clocked in" (Day End moon + hub moon). |
| 6 | Fill up attendance from the hours worked on previous Day Ends | Attendance only has real punches | **Attendance → "Fill from Day End"**: lists past days that have Day End entries but no punches, with proposed in/out from that day's shift (or first→last entry time, your choice), tick the days, one click fills them. Marked "from Day End", audit-logged, one-click undo, locked weeks/holidays skipped. |
| 7 | HR sub-sections open down and scroll, like the other menu groups | HR was a single link | Side menu: **HR & Time ▸** expands to every HR section (scrollable list); the HR ☰ All menu is scrollable too. Both follow Customize. |
| 8 | Go through the whole software for features not applied everywhere | — | Sweep + fixes (see result below). Copy chips on Contacts / Tickets / Tasks / Lost / Call-log rows (left over from Round 29), hold-to-clear, phone format, smart text, snippets and scroll buttons checked on every section by a new test. |

## Tests
`tests/test_v30.py`, full regression, cloud test, palette scan.

## Status (delivered)
Done and tested (`tests/test_v30.py`, `tests/audit_features.py`, full regression, palette scan):
1. Hover ‹ › scroll buttons on every horizontally-scrolling bar in the hub, Day End and Deals Tracker (press = next section, hold = jump to the end/start). They are hover-only on PC; on touch screens you swipe as before, so they are not shown there.
2. Customize pop-up now has **Side menu / Top bar / Tools menu** tabs with ↑↓ and themed Shown/Hidden switches; the side menu's Customize button opens it on the Side tab. HR & Time is a movable item in the side menu. Tools-menu items can be hidden (Customize itself always stays).
3. **Snippets**: engine in all three screens + manager (Tools menu, `G then S`): 76 starter shortcuts, add/edit/duplicate/delete, folders, search, on/off, import/export, instant mode, commands (date/time/offsets, ask, choose, clipboard, number/deal/email, cursor, upper/lower/cap), backspace undo. Not applied to phone/number/email/price/date/password boxes on purpose. Synced to the cloud.
4. Tab count pills: the highlight pill now follows the tab when the count grows (9 → 10 → 128).
5. Moon says “clocked in”.
6. Attendance **⤓ Fill from Day End** (+ undo).
7. Side menu: **HR & Time ▸** opens down to every HR section in a scrollable list; the HR ☰ All menu scrolls too.
8. Sweep: hover copy chips now also on Contacts, Tickets, Tasks, Lost and Call-log rows; a feature matrix test confirms copy button, hold-to-clear, scroll buttons, snippets and phone format are present in the hub and both frames.

Changed old tests to match the new UI (Customize pop-up switches; drawer sub-list class). Nothing was removed.

Honest limits:
- Snippet expansion inside rich contenteditable boxes is basic; text inputs and text areas are fully supported. Numbered shortcuts like `.1` also trigger inside a sentence (any word equal to the shortcut).
- Row copy chips for Contacts/Tickets/Tasks/Lost copy what the row shows (number, name, email, longest note line, everything) rather than raw record fields; they are hover-only (PC).
- Customize does not add brand-new sections; “add” means switching a hidden one back on.
- Top bar cannot hold HR & Time (it is an overlay, not a section); it is in the side menu and Tools menu.
- Nothing is deployed to Netlify.
