# Round 60 – Smart text and Snippets are back

Request (28 Nov 2026): *"Bring back Smart text and Snippets next."*

Both are rebuilt to work the way they did in the old app (same rules, same starter pack, same commands). Your saved phrases and shortcuts are carried over.

## 1. Smart text (learns what you type and suggests it again)
**How it works (as before):**
- **Learning:** when you leave a text box, or press Enter in it, the sentences you typed are learned. Long sentences are also split into their main phrases, and multi-sentence notes are learned as a paragraph too. A phrase you type again with small differences (typos, a different word) counts as the same phrase.
- **Suggestions while typing:** up to 5 suggestions appear under the box. They match on how the sentence starts, on keywords anywhere in it, and on similar wording (typos). They are ranked by how often you use them, how recently, how often you picked them, and which box you are in (deal name, notes, call reason, WhatsApp, ticket …). The deal name and the deal stage of the entry give extra weight. The part you already typed is shown dimmed.
- **Keys:** ↑ ↓ then Enter or Tab inserts, Esc closes, click inserts. In a box that already has several lines, use Alt + ↑ ↓.
- **Quick notes / templates in Quick Add** activate Smart text right after they write into the box (Round 54): the caret goes to the end and the best continuations show, or the best options for that box under "Smart text options".
- **Fading:** one-off phrases fade after 75 days, rarely used ones after 180 days. Pinned and hand-added phrases are kept. At most 700 phrases.
- **Privacy:** anything that looks like a phone number, an e-mail or a link is never learned. The store's own cleaner also runs on every save.
- **Where:** every text box in the app (Day End, Won Deals, Quick Add, tasks, tickets, deals, lost deals, notes …). The HubSpot link, price, search, date and password boxes are excluded.

**Smart text manager** (the "✦ Smart text" button in the bar, the Menu, and Settings): Learn from my typing / Show suggestions switches; search; add a phrase by hand; each phrase shows how often it was used and picked and in which boxes, with Pin / Edit / Delete; "Learn from existing data" (reads your Day End notes, deals, tasks and tickets); "Clear learned data" (asks twice). Editing a phrase into one that already exists merges them, so no duplicates.

**Sync:** each phrase is its own synced record, so phrases learned on the phone and on the PC merge instead of overwriting each other (in the old app the whole list was one blob).

## 2. Snippets (text shortcuts: type `.np` and it becomes the full text)
**How it works (as before):**
- Type a shortcut followed by a space or punctuation and it expands. "Expand instantly" shortcuts need no space. Upper / lower case don't matter unless you switch that off. **Backspace** right after an expansion undoes it.
- **Commands:** `{date}` `{date+3}` `{date-1}` `{date:DD MMMM YYYY}` `{time}` `{time:HH:mm}` `{datetime}` `{weekday}` `{month}` `{year}` `{tomorrow}` `{yesterday}` `{nextweek}` `{ask:Label}` `{ask:Label=default}` (asks you in a small pop-up) `{choose:A|B|C}` `{clipboard}` `{deal}` (the deal name in the same form) `{cursor}` (where the caret ends) `{upper:…}` `{lower:…}` `{cap:…}`.
- **The same starter pack (75 shortcuts)** in the same folders: Dates & time, Call outcomes, Deal progress, Reach & channels, Replies & sign-offs, Symbols & misc, My shortcuts.
- Not in the HubSpot link, price, date, search or password boxes.

**Snippets manager** (Menu → Snippets, Settings, or press `g` then `s`): search, folder filter, all-on/off switch, one row per shortcut (shortcut, preview, folder, instant, on/off, Edit, Duplicate, Delete). The editor has the shortcut, folder, text, command buttons, "Expand instantly" and a live preview. Also New shortcut, Import, Export (.json, the same format as before), and Restore starter pack (brings back deleted starter shortcuts).

## 3. Your data
- On first start of this version, the old `smartText_v1` (phrases, counts, pins, the Learn / Suggest switches) and `hub_snippets_v1` (your shortcuts, the on/off switch) are converted: from the data already carried over in Round 57, or from this device's old app. The ids are deterministic, so two devices converting the same data never make duplicates.
- With no old shortcuts, the starter pack is added once.

## 4. Tests
`tests/smart.test.cjs`:
- **Smart text:** a sentence typed in a Day End note is learned on leaving the box, then suggested in another note; Enter inserts it; Esc closes; phone numbers, e-mails and links are not learned. Pin / Edit / Delete and the merge-on-edit work in the manager. A phrase learned on one device shows on the other (fake cloud). Converting the old `smartText_v1` keeps counts and pins.
- **Snippets:** `.np` + space expands; `.d` gives today's date; `{ask:Name}` asks and inserts; `{cursor}` places the caret; Backspace undoes; instant shortcuts work; nothing expands in the HubSpot link box. New / Edit / Delete / Restore starter pack and Export / Import work. Converting the old `hub_snippets_v1` keeps your own shortcuts.
- All earlier test suites re-run.

## Status
**Built and tested in Chromium (PC 1280 px and phone 390 px). NOT deployed, NOT pushed (GitHub access is still refused), NOT tested on a real iPhone keyboard.**

| Part | State |
|---|---|
| Smart text: learning, suggestions, keys, Quick Add activation, privacy, fading, manager, Learn from existing data | Done. `smart` test passes (29 checks). |
| Snippets: expansion, all commands, ask pop-up, Backspace undo, instant, starter pack, manager, Import / Export / Restore | Done. Tested inside the Day End page and in a task. |
| Old data converted (`smartText_v1`, `hub_snippets_v1`) | Done. Your own shortcut list is kept exactly as it was (starter shortcuts you had deleted are not re-added; Restore starter pack brings them back). |
| Sync of phrases between devices | Done. Tested with the fake cloud. |

**Found and fixed while testing:**
- Leaving the Day End while a box still had focus made Smart text save in the middle of the page change, which broke the app's screen updates until a reload. Learning now happens a moment later. A test covers this exact sequence.
- Focus moving between boxes inside the Day End and Won Deals pages was not seen by Smart text (those pages are isolated). Those pages now report focus changes too.
- On phone, the Snippets and Smart text rows were squeezed. Their buttons now sit on their own line.

**Different from the old app (by design):**
- The starter pack has 75 shortcuts (the old code has 75; an earlier note said 76).
- `{number}` now inserts the HubSpot deal link of the same form (phone numbers are no longer stored), and `{email}` stays empty.

All other test suites still pass: `ui`, `won_look`, `parity`, `dayend_look`, `import`, `sync`.
