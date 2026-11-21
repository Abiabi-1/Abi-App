# Round 28 — Cloud reliability, stars + moon on every screen, one heading design

Rules followed: nothing is removed; only fixes and additions. Phone + PC. Pure black base, palette-aware (everything follows `--t0..t4` / `--accent`), light theme supported.

## 1. Cloud: what was actually wrong
Method: re-ran the cloud test under CPU load, added a debug probe (`hubCloud.debug()`), recorded status history, compared with the previous round's build and with an `http://` run.

| Finding | Cause | Fix |
|---|---|---|
| Test failed ~50% of runs, passed alone | The test opened the app from `file://`. Under load Chromium lost the stored cloud login across a reload, so device A "signed out" and everything after it failed. Over `http://` the same test passed 5 of 5 under the same load. Your Netlify site is `https://`, so this was the test setup, not your sync | Cloud test now serves the app over `http://` like the real site |
| A request that never answers froze sync forever | `fetch` had no timeout, so one stalled request kept the sync loop "busy" and nothing synced again until reload (real risk on phones that sleep / change network) | 20 s request timeout (counts as offline, retries automatically), plus a watchdog that frees a stuck cycle after 60 s |
| Local base store could stall | IndexedDB open had no fallback if it never answered | 4 s fallback to in-memory base; transactions guarded against errors |
| Restore points copied the cloud login | `hub_snaps` snapshot included `cloud_session_v1` / `cloud_ws_v1`, so restoring an old point could bring back an old session | `cloud_*` keys excluded from restore points |
| Hard to diagnose | no visibility | `hubCloud.debug()` shows busy, pending merges, last 25 status changes |
New tests: stalled network shows offline (not stuck syncing); sync resumes after the stall; the other device receives the post-stall change. Verified the stall test FAILS with the timeout disabled.

## 2. Stars + moon on every stage
Audit (PC + phone, fresh page per stage, 8 s still, pixel-diff of the sky with/without stars):
- OK: Day End (star card + moon), Tasks, Lost, Tickets, Deal board, Deals, Contacts, Dashboard, Analytics, record pages, HR page and tabs.
- Gap 1: **Today panel** hid the night sky and moon glow (its opaque layer sat above them). Fixed: sky and glow now sit above it.
- Gap 2: **HR page / Today panel opened from the Day End screen showed no moon** (the hub moon is off on Day End because Day End has its own). Fixed: the moon and sky now show whenever a full screen is open over Day End.
- By design: small modal dialogs (search, help, clock sheet) dim the page behind them, so the moon and sky are dimmed there, not drawn on top of the dialog.

## 3. Heading design contract (all sections, all palettes, dark + light)
Three levels, all using the same engraved filigree text (palette colour, glow) and Sora:
| Level | Used for | Size / weight |
|---|---|---|
| H1 screen title | Tasks, Lost, Tickets, Deals, Contacts, Dashboard, Analytics, **Today**, Day End Report / Won Deals | 1.5rem / 800 |
| H2 panel / dialog title | every dialog (`.tp-h b`), HR & Time bar, Search, reports, help | 1.05rem / 800 |
| H3 card / section title | dashboard cards, Today cards, HR cards and month headings, Day End section titles | 0.95rem / 700 |
Outliers found by the audit: Today title (solid dark red in dark, violet in light), HR & Time title and HR month headings (small uppercase dark red, low contrast on black), Call log / Renewals / Speed dialog titles, dashboard + Today card titles (plain white), Day End / Won Deals title (1.9rem), record title weight.

## 4. Tests
`tests/test_v28.py` — heading contract on every stage × 7 palettes (PC) and light theme, solid-colour headings must be readable on black, stars + moon present on every full screen (PC + phone), cloud stall behaviour covered by `test_cloud.py`. Full regression + palette scan re-run.

## Status (delivered)
**Done and tested (PC + phone):**
- Cloud: request timeout + stuck-cycle watchdog, IndexedDB fallback, restore points no longer copy the cloud login, `hubCloud.debug()` added, cloud test now runs over `http://` and includes a stalled-network test (proven to fail without the fix). Cloud passes 3 of 3 alone; the mock server no longer prints broken-pipe noise.
- Stars + moon: audited every view, record page, HR page and Day End. Fixed the Today panel (sky and glow were hidden) and HR/Today opened from Day End (no moon). Test checks moon on top + stars drawn on 9 full screens, PC and phone.
- Headings: three-level contract applied to Today, HR & Time bar/sections/month headings, every dialog title, dashboard + Today card titles, Day End/Won Deals title and section titles. Test checks every stage x 7 palettes (+ light, + phone). Light theme: readable active HR tab and visible HR input borders fixed.
- Palette scan clean; parity OK; all older suites pass.

**Honest limits:**
- Small modal dialogs (search, help, clock sheet) dim the page, so the moon and sky are dimmed behind them rather than drawn over the dialog.
- Day End Report / Won Deals titles are now 1.5rem (were 1.9rem) to match the other screens. Record page title keeps its own size (it is a person/company name) but now uses the same weight and engraved look.
- I could not reproduce the cloud failures on your real https site; the failing runs were a `file://` storage problem in my test setup. The timeout/watchdog fixes are real hardening, but please still check phone + PC sync after you deploy.
- Under heavy machine load, the cloud suite can still miss a timing wait inside the full regression; it passes alone.
- Nothing was deployed to your Netlify.
