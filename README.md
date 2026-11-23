# Day End Report + Deals Tracker, source project

The app is still one self-contained HTML file for users. This project is the same app cut into small source files so each feature can be built and checked on its own.

## Rules for every change
- Do not change anything that already exists. Do not remove anything that already exists. Only add features and fix issues.
- Changes you did not ask for must fail the parity check.

## Layout
| Path | What |
|---|---|
| `original/` | Your file exactly as received, with `SHA256.txt`. Never edited. |
| `src/index.template.html` | Page shell: top bar, the two embedded pages, hub scripts |
| `src/hub/` | Hub sync, Smart text, Customers, Tasks, polish styles and scripts |
| `src/fDay/` | Day End Report page (HTML skeleton + css/js blocks) |
| `src/fDeals/` | Deals Tracker page (HTML skeleton + css/js blocks) |
| `src/manifest.json` | Order of the pieces and quote escaping, used by the build |
| `dist/index.html` | Built single-file app (open this) |
| `tools/build.py` | `python3 tools/build.py` rebuilds `dist/index.html` from `src/` |
| `tools/check_parity.py` | Byte check + browser check against `tests/golden/` |
| `tools/capture.py` | Captures what every section shows, using `tests/test_data_days.json` |
| `tests/golden_original/` | What the original file showed (never edited) |
| `tests/golden/` | Approved baseline: same as the original except the changes you asked for |
| `tests/test_features.py` | Tests for the added features (Backup/Restore, rename, task notes on contacts) |
| `tests/` | Also: fixed test data, `allowed_changes.txt` |

## Workflow
1. Edit files in `src/`.
2. `python3 tools/build.py`
3. `python3 tools/check_parity.py --skip-bytes`  (needs Python Playwright + Chromium)
4. `python3 tests/test_features.py`
5. A difference from the approved baseline is only acceptable if you asked for it. Review the diff, then update that file in `tests/golden/` (the original stays in `tests/golden_original/`).

## Current state
- Phase A and B: the split rebuilt byte-identical to `original/` (verified before the first change).
- Phase C-0: Backup / Restore buttons.
- Phase C-1: Deals Tracker renamed Won Deals (labels only); Day End task notes shown on Contacts.
- `dist/index.html` now differs from `original/` only by those changes. Parity and feature tests pass.
See `FEATURE_LIST.md` for the plan.


## Cloud
`python3 tools/build.py --deploy deploy` builds the upload folder (app + PWA files + schema.sql; no config.js unless `--with-config` is given and none exists, so your keys are never overwritten). Setup: SETUP_CLOUD.md. Test: `python3 tests/test_cloud.py`.

## Round 5
Automations (rules + folders + No response time), Dashboard builder, Tickets "Move to…", stage colour tones. See FEATURES_V5.md and FEATURE_LIST.md. New storage keys: `rules_v1`, `dash_v1`, `billing_v1` (all synced and backed up).

## Round 7 additions
New files: `src/hub/script-21-links.js` (associations), `script-22-charts.js` (chart toolkit), `script-23-analytics.js` (Analytics), `script-24-nav.js` (navigation drawer), `script-25-filters.js` (shared filters). New storage key `links_v1` (synced and included in backups). Reports you save in Analytics live inside `dash_v1`.
