# Round 54 – Quick notes activate Smart text and show the options available

Request (25 Nov): "The quick notes should activate the smart text and show the options available."

## How it works today (why it doesn't happen)
- **Quick notes** are the chips under a notes box (No answer, Left message, Call back later, Interested, …; editable, stored in `hub_chips_v1`). Tapping one writes the text into the notes box and focuses the box.
- **Smart text** (`src/hub/script-04-smart-text.js`) learns the sentences you type in note-like boxes and shows a small list of suggestions under the box as you type. It only shows that list for *typing* in the focused box.
- A chip writes the text by script and the box isn't focused at that moment, so Smart text stays silent. No list appears, and the chip text is not offered anything to continue with.
- Smart text is only attached to the Day End and Won Deals pages. The hub's own note boxes (record page note box, hub Quick Add) have chips but no Smart text.

## What changes
1. **Tapping a quick note now activates Smart text** for that notes box: the box is focused, the caret goes to the end and the Smart text list opens straight away – with the same look, keys (↑ ↓ Enter / Tab, Esc) and tap-to-insert as when typing.
2. **It shows the options available**:
   - first, learned phrases that continue or match what is now in the box (what typing would show);
   - if there are none, the **most relevant learned phrases for this box** (pinned and most used for this kind of field, best first, up to 5), headed "Smart text options". Phrases already in the box are left out.
   - Picking an option **adds** it after the existing text, separated like the chips do (". "), never replacing what is there.
3. **Same for entry templates** (the "Templates" row inserts notes the same way), so every one-tap insert into a notes box behaves the same.
4. **Everywhere quick notes exist**: Day End entries and Quick Add, Won Deals form and Quick Add, and the hub (record page note box, hub Quick Add). For the hub, Smart text is attached **only to the note boxes that carry quick-note chips** – nowhere else in the hub – so nothing new is learned from other hub boxes.
5. Respects the existing Smart text switches: if suggestions are off (Smart text panel) nothing opens; learning rules, privacy rules (no numbers / e-mails / link boxes are ever treated as notes) and the "never inside a word" rule are unchanged. The chip text itself is not counted as something you typed (it does not inflate learning).

## Not changing
Smart text's matching/learning engine, the Smart text panel, chips' content and editing, Day End layout, phone and PC look (the list uses the existing Smart text pop-up), keyboard behaviour while typing.

## Tests
- Tap a chip in a Day End entry, Day End Quick Add, Won Deals form/Quick Add and a hub note box: the list opens, box focused, caret at end.
- With learned phrases: continuations shown; with none matching: options shown under the "Smart text options" header; picking one appends ". text" and keeps the old text.
- Smart text off: nothing opens. Typing behaviour unchanged. Number/link boxes unaffected. PC and phone screenshots.

## Status
**Built and tested. NOT deployed.**
- Done: tapping a quick note (or an entry template) focuses the notes box, puts the caret at the end and opens the Smart text list – learned continuations first, otherwise the best options for that box under a "Smart text options" header; picking one appends it after the existing text (". " separator). Works in Day End Quick Add (and the Day End forms), Won Deals Quick Add, and the hub note boxes that carry chips. Respects the Smart text on/off switch; link/number boxes untouched; chip text is not counted as typed.
- Hub note: Smart text is now attached to the hub page too, but only for note boxes that carry quick-note chips (today that is the deal record note box), so typing there also gets suggestions like in Day End. Nothing else in the hub is touched.
- Tested: new `tests/test_v54.py` (PC + phone, 0 failures: chip opens list, options header, append, second chip, suggestions off, link box unaffected, Won Deals Quick Add), plus v41_entry, v41_mob, v39, header, palette scan; phone screenshot looked at.
- Not verified / limits: the list shows the phrases Smart text has learned, so on a fresh install it can be empty until you have typed notes a few times. Old tests `v37`, `v38`, `v34` fail on clicks of buttons that Round 51 hid in normal entries (not caused by this round); `v31` emoji check is the old known failure. Not tested on a real iPhone.
