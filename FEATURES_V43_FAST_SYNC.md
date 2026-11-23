# Round 43 – Fast sync (how other apps do it, and how this app now does it)

## Your questions
- **Does the reload guard make sync slower?** No. It only acts if the page has already reloaded twice in 30 s because of a cloud update. Normal sync is untouched.
- **Why did it stop when you closed the mobile app?** Almost certainly two devices answering each other: one saves, the other reloads to apply it, and the reload makes the first one see "new" data again. With the phone closed, only one device was left, so the loop ended. The guard now breaks that loop, and the faster design below avoids most reloads' triggers.

## How other apps sync (the pattern)
1. **Local-first:** every change is saved on the device instantly; the screen never waits for the network (Notion, Linear, Apple Notes).
2. **Push, don't poll:** servers tell the other devices "something changed" over a live connection (WebSocket). Google Docs, Figma, Linear and WhatsApp work this way, so changes arrive in about a second instead of on a timer.
3. **Small, quick sends:** changes are sent a moment after you stop typing (about 1 s), not after a long delay.
4. **Sync at the right moments:** when you come back to the app, when the network returns, and right as you leave or close the app (so nothing is stranded on one device).
5. **Version numbers + merge:** each saved item has a version; if two devices changed the same thing, they are merged, never overwritten. (This app already does this with a 3-way merge.)
6. **Safety nets:** a slow poll still runs in case the live connection drops.

## What this app does now
| # | Feature | Detail |
|---|---------|--------|
| 1 | Faster saving | Changes go to the cloud ~1 s after you stop (was 4 s); checked every 1 s (was 3 s) |
| 2 | Faster fallback check | Checks the cloud every 6 s (was 20 s) – only version numbers, very light |
| 3 | Live push (Supabase Realtime) | A WebSocket listens to your own workspace; when another device saves, this one pulls within ~1 s. Needs one SQL line (below). If it isn't enabled or drops, the 6 s check still works, and it reconnects by itself |
| 4 | Instant save on change | A change to any synced item triggers a sync straight away instead of waiting for the next tick |
| 5 | Flush when leaving | Hiding the app / closing the tab / going offline→online triggers an immediate push or pull, so closing the phone app no longer strands changes |
| 6 | Pull when you return | Opening/focusing the app pulls at once |
| 7 | Reload-loop guard | Max 2 cloud reloads per 30 s, then sync pauses with a message (kept from the previous fix) |
| 8 | Pill shows live state | Cloud pill tooltip shows "Live" when the push connection is up, and "All changes synced"/"N waiting" |
| 9 | Config | `tickMs`, `debounceMs`, `pullMs` still override in config.js; `realtime:false` turns live push off |

## One-time setup for live push (optional, 10 seconds)
In Supabase → SQL editor run: `alter publication supabase_realtime add table public.kv;` (also added to `cloud/schema.sql` and SETUP_CLOUD.md). Without it everything still works, with the 6 s check.

## Honest limits
- I cannot test against your real Supabase. Tested here with a simulated server and a simulated live connection.
- A remote update still refreshes the page once to apply it (the app keeps its data in memory in many places). It waits while you are typing a draft.

## Status
(filled at the end)
| 1-2 | Faster save (1 s) and check (6 s) | Done |
| 3 | Live push over WebSocket | Done; tested with a simulated live connection only |
| 4 | Sync right after a change | Done |
| 5-6 | Push when leaving, pull when returning | Done |
| 7 | Reload-loop guard | Done |
| 8 | Live state flag on the cloud pill | Done (internal flag, no new buttons) |
| 9 | Config switches | Done |
Tests: new `test_v43_sync.py` passes; cloud, v42, v41_mob, features, v34 pass; parity OK. Not tested on real Supabase. Not deployed.
