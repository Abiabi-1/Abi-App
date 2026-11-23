# Round 48 – Web login / Sync button, calls & WhatsApp linked to deals, contact names → deal names, WhatsApp/Email icons with ✓ / ✗ buttons, Quick Add customising

Nothing in this round has been deployed – you upload the zip yourself.

## PART A – "Can't log in from the web / can't see the Sync button"
**Cause found.** The zip used to contain a blank `config.js`. Uploading it to GitHub replaced your real Supabase keys with blanks, so the app thought sync was not set up and hid the Sync pill and the login screen.

**Fix**
1. The app now **remembers the keys on each browser** the first time it sees them (`hub_cloud_cfg_v1`). A blank `config.js` can no longer switch sync off on a browser that already knew the keys.
2. If a browser has no keys at all, a **Sync** pill is still shown in the top bar. Tap it → "Set up sync" → paste the Project URL and the anon key once → the page reloads and the normal login appears. The keys are only kept in that browser.
3. The zip **no longer contains `config.js`** (so it can never overwrite yours again). If your GitHub copy of `config.js` was already overwritten, either re-add your keys there or just use the Sync button once per browser.
4. Service worker version bumped (`dayend-v3`) so phones drop the old cached copy; `config.js` is no longer pre-cached.

## PART B – Calls & WhatsApp that belong to a known number go to the deal
- Before any number is cut out, the app matches **number → deal** (from Day End tasks, Won Deals, manual deals, lost deals, tickets and old contacts) – **in memory only, never stored**.
- Day End **Call** and **WhatsApp** entries that started with a known number (or a known contact name) are rewritten as **"Deal name: what was said"**. **Nothing is removed**; the number is gone, the entry stays, and it now belongs to the deal.
- Entries whose number matches no deal keep their text; only the number is cut (as in Round 47).
- On the deal's record page, the timeline shows those entries as **Call** / **WhatsApp** (they do not change the deal stage or the analytics counts). They are also found by the deal search.
- Runs on the first start after this update (all keys, all devices) **and** whenever data arrives from the cloud or a restored backup that still has numbers.

## PART C – Contact names become the deal name
- Tickets: the ticket's deal is set from its existing deal, else the deal of its number, else the deal of its contact name; the contact name/number/email are then dropped (numbers stay removed).
- Calls / WhatsApp entries: a leading contact name that belongs to a known deal is replaced with the deal name.

## PART D – WhatsApp & Email icons back, with ✓ / ✗ buttons beneath
- **Deal cards, board rows, table and record page**: the WhatsApp and Email **icons** are back (same size as before; green when sent, red when marked unable). They no longer link anywhere (there is no number / address any more).
- **Beneath each icon, one small confirmation button**: not toggled (default) → ✓ → ✗ → not toggled. It is only a confirmation (it does not call or open anything).
- **Day End entries**: the WhatsApp / Email icons of an entry get the same ✓ / ✗ button beneath. The older hidden ✗-by-default hover button is replaced by this (default is now *not toggled*). ✓ still completes the matching WhatsApp / Email to-do, un-toggling or ✗ reopens it.
- **Quick Add / Day End form / Won Deals form / record note box – "Contact" row**: the written shortcuts are replaced by the two icons with ✓ / ✗ beneath. ✓ writes the same wording as "WhatsApped / Emailed", ✗ the same as "No WhatsApp / No email". The "… today" to-do shortcuts and the written chips stay available: Settings → Quick Add → **Contact buttons: Icons (default) / Written / Both**.

## PART E – Quick Add customising
- **Call outcome shortcuts can be switched off completely**: Settings → Quick Add → *Call outcome* hides the row in Quick Add, the Day End form and Won Deals forms; a new switch **"Call outcome tile on deals"** hides the log-call tile on deal cards/rows/record page.
- **More customising**: choose the order of the rows (up / down), show or hide the Task / Call / WhatsApp / Ticket / Other section buttons in Quick Add, limit how many chips each row shows, hide the small row labels, and the Contact buttons style above.
- Everything stays one shared setting for Day End, Won Deals, Quick Add and the record page, on phone and PC.

## Limits (honest)
- Devices that already ran Round 47 have their numbers, contacts and backups erased, so those old calls **cannot be linked there**. Linking works on devices (or the cloud copy / a restored backup) that still hold the older data.
- The number→deal list exists only while the page is open; data that arrives in pieces can occasionally link only part of the entries.
- The first merge with the cloud may show some entries twice.
- Sync keys are remembered per browser; a different browser needs the Sync button once.

## Status (end of round)
| Part | Status |
|---|---|
| A  Sync button / remembered keys / no config.js in zip / sw v3 | Done, tested on PC + phone (blank config → Sync button → paste keys → remembered → login) |
| B  Calls & WhatsApp linked to deals (migration + incoming data), deal timeline + search | Done, tested on seeded old data (number match on last 7 digits, so "+960 777 1234" = "777 1234") |
| C  Contact names → deal names (tickets, calls) | Done, tested |
| D  WhatsApp / Email icons + ✓ / ✗ buttons (deal cards, deal page, Day End entries, Contact row) | Done, tested on PC + phone |
| E  Quick Add: call-outcome off everywhere, per-row limit, labels, contact style | Done, tested |

## Tests
- New `tests/test_v48.py` (PC + phone): all pass.
- Full regression of all older suites: all pass except the ones that already failed before this round (v38 "separate folders" and "unable text makes no to-do", v31 "tools menu has no emoji icons", v7 "renewal-due rule made a task"). `test_v38` and `test_cloud` were updated for the new behaviour (written contact shortcuts are switched on for that test; without keys the app shows the Sync button). v27 (moon) failed once in the full run and passed when re-run alone.
- Palette scan clean, parity OK.

## Also worth knowing
- On very narrow phones (320–340 px wide) the Sync set-up button is hidden because the tab strip needs the room; from 341 px up it shows as a ☁ icon (labelled "Sync" on wider phones and PC).
- The Day End Contact row now shows the icons; if you prefer the written shortcuts: Settings → Quick Add → Contact buttons → Written (or Both).
- I read "two buttons beneath" as **one ✓ / ✗ / off button beneath each of the two icons** (WhatsApp, Email). If you meant something different, tell me and I'll change it.
