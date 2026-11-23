# Round 37 – typing on phones, notes/extra numbers, refresh/scroll jump, regression sweep

Request (22 Nov 2026): can't see what I'm typing on mobile; app refreshes / jumps to the top while entering; "Use last details" message covers the text boxes; extra number + notes format not working; can't copy or save the note; check everything that stopped working after the new features.

Nothing here is deployed – upload the unzipped `abi-deploy.zip` to GitHub yourself.

## Root cause found (the main regression)
Round 34 added a "Templates" chip row under the note chips in every Day End form. The code looked for every `.qn-row` – and the Templates row, the Recent row and (Round 35) the Call-outcome row are themselves `.qn-row`s. Every redraw therefore added a **new** Templates row after the previous one, forever (3–4 copies after a few seconds, thousands of page elements after a while). That pushed the number / extra-number / notes boxes around, made the page jump, and slowed typing, copying and saving.

| # | Item | Plan | Status |
|---|------|------|--------|
| 1 | Runaway duplicate rows | Only the original chip row is used, one Templates row per form, existing copies never multiply (page element count is now constant when idle; test checks it) | DONE |
| 2 | Extra number + notes format, copy notes, save | Re-tested on a 390 px touch screen: extra number row, "Number – Note" format, Copy notes, save to the day, Won Deals form and Quick Add. All work; they were being disturbed by item 1 | DONE (tested) |
| 3 | Can't see what I'm typing (phone) | A preview bar sits right above the keyboard with the box name and the text as you type (swipe it to scroll long text, "Show box" scrolls to the field, ✕ hides it). The box you type in is scrolled clear of the bar. Works in the hub, Day End, Won Deals and Quick Add. Only on touch screens / when the keyboard is open | DONE |
| 4 | Refresh / jump to top while typing | (a) cause 1 fixed; (b) a scroll guard in every page: if the page suddenly jumps to the top while you are typing (and you did not scroll), it goes back; (c) Day End redraw (hour change, save) keeps your scroll position; (d) cloud sync never reloads the page while a box is focused | DONE |
| 5 | "Use last details" message over the boxes | Now a popup that floats over an empty part of the screen (it picks the side away from the boxes, checked against all boxes of the form), with a ✕ and auto-hides after 15 s. "Use last details" still fills deal, stage, email | DONE |
| 7 | Edit / remove the default quick notes and templates | A small ✎ chip (same size as the + chip) at the end of the quick-notes row and of the Templates row opens a compact editor: rename, remove, add, Reset to defaults, Save / Cancel. You can remove all of them. Stored in `hub_chips_v1` / `hub_etpl_v1` (already cloud-synced). No big buttons; the editor fits a 390 px screen with no sideways overflow | DONE |
| 6 | Regression sweep | Full test suites re-run (v21–v37 + older), palette scan, parity, light theme, 390 px | see end of file |

## Not changed / honest notes
- I cannot open a real phone keyboard here. I simulated it by shrinking the window while a box is focused (that is how Android Chrome behaves) and by using the visual-viewport values (iPhone). Please try it on your iPhone and tell me if the bar sits wrong.
- The earlier test change in v29 (hold-to-clear copy button) was a test workaround; the copy button itself works with a real mouse and with touch.

## Regression sweep result
- New `tests/test_v37.py`: ALL OK (stable page, one Templates row, extra number + notes + copy + save, typing bar incl. simulated keyboard, scroll guard, popup placement, editor).
- Full older suites re-run: no new failures. `v27` PC-moon check is flaky (passes on re-run). Two OLD tests (`deals`, `v3` "call + whatsapp links") fail identically on last round's build: they look for the old Deals side drawer, which has since been replaced by the full record page. I checked the record page directly: add note, Save note, note shows in the activity list – works.
