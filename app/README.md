# Abi App – version 2 (one app)

Source of the rebuilt app. The built, ready-to-host files are in `../next/` (committed, so GitHub Pages / Vercel serve them at `/next/` with no build step). The old app in the repository root is untouched.

## Run / build
```
cd app
npm install
npm run dev        # local preview at http://localhost:5173
npm run build      # type-check + build into ../next
```

## Tests (Playwright, no network: the app is served through request routing; the cloud is a fake in memory)
```
node tests/ui.test.cjs        # every section, PC 1200 + phone 390, bases, forms, filters, privacy
node tests/sync.test.cjs      # two devices: merge, deletes, offline outbox, migration without duplicates
LEGACY_DIST=<old-app dist folder> node tests/parity.test.cjs   # Day End report text == old app
```
The parity test needs the old app built from its source (`python3 tools/build.py` in the old source, which writes `dist/index.html`).

## Layout
| Path | What |
|---|---|
| `src/data/store.ts` | Record store: one record per item, field timestamps (HLC), tombstones, IndexedDB |
| `src/data/sync.ts` | Supabase sync on the existing `kv` table, keys `v2:<collection>:<id>` |
| `src/data/migrate.ts` | Import of the old app's saved data (device or cloud copy), deterministic ids |
| `src/domain/*` | Day End (reports, pricing, stats), HR clock, deals / won / lost / tickets / tasks |
| `src/ui/base.css`, `kit.tsx` | The design bases: bar, glow buttons, add button, data box, sheet, inputs |
| `src/sections/*` | One file per section |

Privacy: every write goes through `cleanValue` (`src/lib/privacy.ts`) – no phone numbers or e-mails are stored.
