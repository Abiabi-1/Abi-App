# Round 27 — Finish everything not done, and make consistency a rule

Approvals / sign-in / IP / face check-in stay out of scope (need a backend or hardware). Everything else from the "not done" list is built here.

## 1. Design contract (applies to every new thing, now and later)
Every new screen, dialog, chip or panel must:
1. Use palette variables only (`--accent`, `--accent-rgb`, `--accent2`, `--btn1/2`, `--on-t`) — no fixed red; status colours are amber/green/grey, never red.
2. Use the same engraved filigree surface as other sections (`--texbg`, `--texbg2`, `--texin`) in dark theme, plain surfaces in light theme.
3. Use the shared headline style, palette-coloured check boxes, plain search boxes (no magnifier).
4. Work in light theme (contrast ≥ 2.6:1), in calm mode, and on a phone (no sideways scroll, bottom-sheet dialogs).
5. Keep the moon, its light and the night sky visible on full-page screens (modal dialogs sit above the moon, like everywhere else).
6. Be reachable from search / Tools / shortcuts where it makes sense, and stored under a `hub_` key so Backup, restore points and cloud sync include it.
**Enforced by tests:** `tests/test_v27.py` has a static lint (no fixed reds in new CSS, every new surface listed in the filigree rule), a palette scan of every new state in all 7 palettes, a light-theme contrast scan, a moon-visibility check, and a random-click "monkey" run that fails on any page error.

## 2. Items
| # | Item | Plan |
|---|------|------|
| 1 | Engraved texture behind HR | HR page, cards, items, calendar, boards, reports panels, dialogs and clock strip get the same filigree surfaces as Day End / Won Deals |
| 2 | Attached document files not in sync/backup | Store files (≤ 600 KB each, 3 MB total) inside the app data under `hub_hr_files`, so Backup, restore and cloud sync carry them. Files already attached in the old way are moved over on first open. Clear message if a file is too big |
| 3 | Column picker only on Contacts | Works on every table and grid list (Deals, Tickets, Contacts): hide/show columns, remembered per table |
| 4 | Owners: no filter, names only | "Owner" filter in Deals, Contacts, Tickets (any / me / each name / unassigned); owner chip on every row (owners are also picked up from records, not only the People directory) |
| 5 | Goal progress doesn't roll up | Parent goals show progress averaged from sub-goals ("rolled up from N") and the HR dashboard uses it |
| 6 | Moon on the new screens | Moon + moon light + night sky above the HR page; dialogs above the moon |
| 7 | Bugs | Full monkey test, review of every new feature, fixes listed in Status |
| 8 | New places missing the theme | Static lint + scan of every new state in every palette, light and calm |

## Status (delivered)
**Done and tested (PC + phone):**
- HR page, its cards, tabs, inputs, dialogs, toasts and the Day End clock strip now use the same engraved red/black filigree surface as the rest of the app, in every palette (dark theme).
- Moon stays visible and above the HR page; dialogs and the colour popup sit above the moon.
- Attached documents are stored in app data (`hub_hr_files`), so they are included in Backup and cloud sync. Limits: 600 KB per file, 3 MB total. Older files from the previous storage are moved over when small enough.
- Column picker now works on the grid lists (Deals, Tickets, etc.) as well as Contacts; hidden columns are restorable.
- Owners: filter (anyone / unassigned / each name) on Deals, Contacts and Tickets, plus an owner chip on rows. Names come from Settings, the People directory and owners already on records.
- Goal progress rolls up: a parent goal shows the average of its sub-goals ("60% (rolled up from 2)").
- Bug found and fixed in testing: owners assigned on records but missing from the People directory did not appear in the filter.
- Tests: new `test_v27.py` (static colour lint, filigree check, files, roll-up, owners, column hide, every dialog x 6 palettes, light-theme contrast, random-click run on PC and phone) passes; all older suites pass; parity OK.

**Honest limits:**
- Approvals, sign-in/roles, IP stamps, face check-in, kiosk and Slack/Google integrations are not built (deferred by you / need a backend or hardware).
- Owner filter is not on Lost or Tasks views.
- Status colours (amber/green/grey) are fixed meanings, not palette colours.
- Grid column hiding uses proportional widths.
- The cloud-sync test is timing-sensitive in my sandbox and fails intermittently on the previous round's build too; it is not caused by this round, but please check that phone and PC sync after you deploy.
- Nothing was deployed to your Netlify; unzip and deploy yourself.

