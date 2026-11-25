# Round 53 – Bug fix: the "Seen N× · last … ago" line squeezes the HubSpot link box

## Bug (Abi, 24 Nov)
"The HubSpot link text box gets covered with the last contacted thing."

## Cause (reproduced on PC and phone)
When a HubSpot link that was used before is typed or pasted, Day End shows a small line next to it: **"Seen 1× · last just now · <stage> · <deal name>"** (`.e41-hint`, `src/fDay/script-23-entry41.js`). The script inserts that line right after the link input **inside the same flex row**, so it sits beside the box and takes its width. The link box shrinks from its normal width to a sliver:
- Day End entry (PC): 296 px → 232 px
- Quick Add (PC): 275 px → 84 px
- Quick Add (phone): 316 px → 125 px, so only the end of the link ("…l/7777777") is visible.

## Fix
- The "Seen … last …" line moves **under the link box on its own full-width line** (never beside it), in the normal entry and in Quick Add, PC and phone.
- The link box keeps its full width whether or not the line is shown; the open-link arrow and copy button stay where they are.
- The line is height-limited (about 3 lines) so a long deal name can't push the layout.
- Nothing else changes (the line's content, the "Already in Deals … Use last details" hint, the duplicate guard and the follow-up prompt are untouched).

## Where
`tools/theme47.tpl.css` (shared CSS, rebuilt into Day End), test `tests/test_v53.py`.

## Tests
Link box width is the same with and without the hint (±2 px) in the Day End entry and in Quick Add, PC 1200 and phone 390; the hint sits below the box; no horizontal overflow; screenshot.

## Status
**Fixed and tested. NOT deployed.**
- The "Seen N× · last … ago" line is now on its own line under the link box (Day End entry and Quick Add, PC and phone); the box keeps its full width.
- Tested: new `tests/test_v53.py` (0 failures, PC + phone) plus v41_entry, v41_mob, v39, v28, header, palette scan; screenshots looked at.
- Limits: I reproduced it with a link used before in Day End. If you saw the overlap somewhere else (another screen, or a different "last contacted" text), tell me where and I will check that spot too. The "Already in Deals … Use last details" hint and the follow-up sheet were not changed. Not tested on a real iPhone.
