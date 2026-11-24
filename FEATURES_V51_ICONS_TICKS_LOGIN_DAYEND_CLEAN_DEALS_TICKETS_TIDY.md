# Round 51 – One WhatsApp/Email icon set with a tick under each, login without keys, clean Day End, tidy Deals & Tickets

(Everything in the message of 23 Nov, 20:22. Nothing is skipped; where I had to interpret, it says so.)

## Part 1 – WhatsApp and Email buttons: the old ones, everywhere
- The Deals page always used the original icon set (speech-bubble-with-handset WhatsApp, envelope Email). Day End, Quick Add, the filter and the Contact row had drifted to a different, plain outline set. **One shared icon set (the original one) now draws WhatsApp and Email in every place**: Day End entries, Day End filter, Quick Add, Deals (cards, rows, record page), Tickets, Tasks.
- **A Tick button sits under each of the two icons**: Tick under WhatsApp, Tick under Email – kept separate. Same size and same design as the icon buttons (a round-cornered icon button; a check icon, green when confirmed; a cross icon, red, when not possible; faint when not marked). It replaces the tiny ✓/✗ text character.
- Arranged like a 2 × 2 window: WhatsApp · Email on the top line, their ticks right under them. Same arrangement in Day End entries, deal cards, record page and the filter row.
- The icon itself keeps its own green/red state; the tick keeps its own ✓ / ✗ state. They never merge.

## Part 2 – Day End filter row
- The filter is the same 2 × 2 block: WhatsApp, Email, tick-under-WhatsApp, tick-under-Email. Each is off → green → red and they all mix and match (WhatsApp green + its tick green = WhatsApp entries that were ticked, and so on). Clear stays.
- **"WhatsApp Today" and "Email Today" are removed from the Day End report** (the folders still exist in Tasks).

## Part 3 – The same block next to the Today folders in Tasks, to filter tasks
- Interpretation: the "Contacts today" folders are the WhatsApp Today / Email Today task folders. A small 2 × 2 block (WhatsApp, Email, tick, tick) sits next to the folder selector in Tasks.
  - WhatsApp / Email green = tasks of the WhatsApp Today / Email Today folder; red = tasks of the "no WhatsApp" / "no email" folder.
  - Tick under it green = those that are done, red = those still open (when a tick is active the Open/Done/All choice is ignored so it cannot clash).
  - Mixes with the existing search, folder, day and filters.

## Part 4 – Login on a new device without keys
- The project address and public (anon / publishable) key you sent are built in as the default, so a new device shows only **email + password**. The key box only appears if you clear the built-in one in Settings. (This key is meant to be public; the data stays protected by the database login rules.)

## Part 5 – Day End normal entries cleaned
- **All shortcuts are removed from normal entries** (call outcome, contact buttons, quick-note chips, template row, "no answer" etc.) in every Day End section. **They stay only in Quick Add.**
- Fixed the squeezed form: with Quick Add open the Task entry boxes collapsed into tiny letter-sized boxes. Entry rows now wrap and the text boxes keep a readable width (PC and phone).
- Day End and Won Deals: kept as they were (no numbers, no contacts); the full rebuild is for tomorrow.

## Part 6 – No shortcuts in Deals and Tickets
- No call-outcome ("No answer", "Busy" …) or quick-note shortcuts in Won Deals forms, Deals, Tickets (new-ticket form and elsewhere). Quick Add only.

## Part 7 – Deals and Tickets organised
- **One button, "Filters & more", opens a pop-up** (not a drop-down) that holds the filters (priority, category, overdue, advanced filters, saved views, owner) and the actions (select, edit pipeline, types & automations, categories & priorities, export, download report, copy, import, paste). The page keeps just: title, search, **+ New**, type chips, Board/List.
- **Task folders** become a compact drop-down with a short scrollable list (not a tall native list).
- **Deals "Move to…"** is smaller and no longer covers the deal-name copy button. The **deal-name copy button stays; the "copy notes" button is removed** there.

## Part 8 – Quick-note shortcuts only in Quick Add
- The quick-note chips are hidden everywhere except Quick Add (Day End entries, deal forms, ticket forms, record pages).

## Status
**Built and tested. NOT deployed.**
- Done: Parts 1–8 (one old icon set with a tick under each, 2×2 in Day End entries/filter/Deals; the block next to the Tasks folders filters tasks; WhatsApp/Email Today removed from Day End; built-in login keys; Day End entries cleaned and un-squeezed; shortcuts only in Quick Add; "Filters & more" pop-up in Deals/Tickets; compact Tasks folder drop-down; smaller "Move to…"; "Copy notes" removed from Deals forms, name copy kept).
- Tested: full regression. Remaining failures are known/expected: v31 emoji tools menu and v7 renewal (old), the cloud "without keys" test (expected, keys are now built in). Two suspect failures (v31 time chips, v27 phone moon) pass when re-run alone.
- Not done / not verified: the automated parity check could not run here (its capture step errors); a deal card with "Move to…" was not screenshotted because the test data had no deals; not tested on a real iPhone. The full Day End / Won Deals rebuild is left for tomorrow as you said.
