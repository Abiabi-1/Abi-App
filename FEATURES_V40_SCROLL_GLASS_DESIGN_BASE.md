# Round 40 – activity tiles scroller, glass scrollbars, design base audit

## Request
1. In Day End "Deal Stage Breakdown", the Support Calls / Whatsapp Inquiries / Tickets Attended / Other boxes should be the same size and scroll sideways like the Pipeline.
2. All scrollbars: clear like glass, transparent, no lines, smooth.
3. Learn the base of my design (written in `DESIGN_BASE.md`), check every recently added feature against it, fix inconsistencies, and be ready to apply it to anything new.

## Plan
| # | Change | How |
|---|---|---|
| 1 | Equal-size, sideways-scrolling activity tiles | `#actGrid` becomes a flex row, tiles fixed width, equal height, snap scrolling; keeps tap-to-open breakdown |
| 2 | Glass scrollbars | One final style block in hub, Day End and Won Deals (and every popup inherits): transparent track/corner/buttons, thin translucent thumb; light theme variant; Firefox equivalent. Intentionally hidden bars untouched |
| 3 | Design base | `DESIGN_BASE.md` (tokens, shapes, type, layout, recipes, checklist) |
| 4 | Audit | `tests/test_v40_design.py` opens every screen/feature, reads computed styles and reports anything off-base (hard-coded greys, wrong radius/font, overflow, missing glass scrollbar, unequal tiles) |
| 5 | Fixes | Anything the audit finds on new features is aligned to the base (not redesigned) |

## Rules kept
Nothing existing removed; only added or aligned. Nothing deployed by me.

## Status (filled at the end)
| # | Item | Status |
|---|---|---|
| 1 | Activity tiles equal size + sideways scroll | Done, tested PC + phone (4 equal tiles, scroll, no page overflow). Also made the stage tiles 2-per-row on phones |
| 2 | Glass scrollbars everywhere | Done in hub, Day End, Won Deals (rules verified present in all three; light-theme variant). I could not see the bars themselves because headless Chrome hides scrollbars – please look on your device |
| 3 | `DESIGN_BASE.md` | Written (tokens, type, shapes, layout, recipes, checklist) |
| 4 | Audit `tests/test_v40_design.py` | Done – 93 findings first run, 0 after fixes |
| 5 | Fixes found by audit | (a) buttons/inputs/selects fell back to Arial → now inherit Sora; (b) quick-note chips, templates, contact chips used a hard-coded grey border (`--line` was never defined) → `--line` now = `--border`; (c) unstyled inputs/selects/date pickers (Dashboard day picker, order/filter selects) now follow the input recipe; (d) typing bar font → Sora |
| 6 | Regression | Palette scan clean, parity OK, v40 passes. Known stale tests unchanged. Tests v37/v38/v39 (and v30/v31 hover) depend on the time of day: after 9 pm there is no "current hour" block, so they time out at night. They passed this afternoon before this round (v37 also passes with the clock set to daytime); this round only changed CSS. v38/v39 were not fully re-confirmed with a faked clock |
