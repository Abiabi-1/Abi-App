# Round 50 – The phone's bottom bar IS the original top bar, moved

## Why
Round 49 replaced the top bar with a new bottom bar that only showed six chosen slots. That hid most sections behind Menu – it was a rebuild, not a move. This round puts the original top navigation at the bottom, as it was.

## What changes (phone only, width ≤ 820 px; desktop untouched)
1. **Every section tab of the original top bar is in the bottom bar**, same order, same names, same badges, same active highlight. It scrolls sideways with a swipe; the active section is scrolled into view automatically.
2. **Your Top-bar section choices still rule it.** Sections you hid / reordered in Customize sections (top bar) are hidden / reordered in the bottom bar too (it reads the real tabs, so nothing can drift).
3. **Quick Add, Menu and Search stay pinned at the right end** and never scroll away (Quick Add is the round raised button; Search is the last one, as asked). Menu opens the side menu (HR, Tools, Colours, Settings, Sync…).
4. **Same seamless, blended look** as before (fades into the page, accent glow on the active tab, safe-area aware, themed in every palette and the light theme). Bigger tap targets than the old bar.
5. **Still customizable** (long-press the bar, or Settings → Menus): the choice "All sections" is one entry you can keep, remove, or replace with individual sections; any section, action or tool can be added; reorder with ↑ ↓. The pinned end buttons are whatever you put that is not a section.
6. **Defaults**: All sections · Quick Add · Menu · Search (Search last). Nothing saved by Round 49's six-slot default is lost – a bar that equals that old default is switched to the new default; anything you customized is kept as it is.
7. Nothing else is removed: Quick Add sheet, phone layouts, per-device settings, stars rule, notice above the bar – all as in Round 49.

## Not changing
- Desktop top bar and its extras.
- Storage keys (`hub_dock_phone_v1` stays; items list gains the entry `secs`).

## Tests
- All tabs present in the bottom bar in the top bar's order; hiding a section in Customize removes it; reorder follows.
- Swiping scrolls; active tab visible after switching; pinned end buttons stay visible at every scroll position; no horizontal page overflow.
- Quick Add / Search / Menu work from the pinned end; customization pop-up works; default migration; light theme + a palette.
- Round 49 test and the earlier header / v41 / v34 tests re-run.

## Status
**Built and tested. NOT deployed.**
- Done: all section tabs in the bottom bar in the top bar's order (scrolling, active one centred, badges kept); Quick Add, Menu and Search pinned at the right end with Search last; hidden/reordered top-bar sections are followed; the old six-slot default is migrated; customization pop-up has an "All sections" entry.
- Tested: new assertions in tests/test_v49.py (same sections and order, pinned end stays visible while scrolling, active tab scrolled into view, no page overflow) all pass, plus v28, v34, v41_mob, v48 and the header test; hiding a tab removes it from the bar; light theme looked at.
- Not tested on a real iPhone.
