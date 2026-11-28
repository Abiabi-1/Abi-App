# Round 58 – Day End Report and the moon exactly as before · full check · sync check

Request (28 Nov 2026), with the old deploy zip attached: *"This is how it looked like before. Could you go through everything and double check and see if everything looks good? I want the moon and the day end report to look like it was before. Just go through everything and check for the sync error too. Write a md and implement this."*

## 1. What I compared
I opened the old app from your zip (`abi-deploy.zip`, the build you use) next to the new app with the same sample data, on PC (1280 px) and phone (390 px), and went through each section.

## 2. Day End Report – back to the old look, exactly
**Found:** the new Day End used the new shared design (borderless controls, a ring around the moon, simpler tiles and entries). That is not what you asked for: the Day End keeps its own look.

**Change:** the new Day End now uses **the old Day End page's own stylesheet** (taken unchanged from your build) and **the same page structure and class names** as before. It is drawn in an isolated container, so its styles cannot leak into other sections and theirs cannot leak into it. This brings back, as before:
- Header: icon, red gradient "Day End Report", subtitle, Clock in chip, date pill, colour button, theme button.
- Day card: ← date → Today, the long date on the right, the bordered day chips with counts.
- Shift card: night sky with red stars, the blood moon on the left with the countdown, Shift Start / Shift End boxes, hours, the Upcoming / On Shift / Finished pill, the Clock in button and the In · Break · Back · Out strip (tap a time to change it, double-click × to delete it).
- Filter row "Filter · day" with the 2 × 2 WhatsApp / Email / tick buttons.
- Hour blocks with the filigree header, coloured count chips, ▾; each section with its coloured icon, title, sub-title and count; the input row with ↗ and "+ Add"; the stage row (stage → plan → billing → standard/custom → USD/MVR → ▼ registers ▲).
- Entries: 01, text, "↗ HubSpot", the exact-time pill (tap to change), coloured tags, the WhatsApp/Email icons with the tick under each, Follow-up, the copy buttons (link, deal name, notes, whole entry), Edit, ✕.
- "Deal Stage Breakdown" card with All time / Day / Month / Year, the stage tiles, "Closed Won All · Plans" with Monthly / Biannual / Annual boxes, the Support Calls · Whatsapp · Tickets · Other tiles and the totals line.
- "Final Report" card with **Reset, Import file, Paste report, Export day, Export all days, Download Report (HTML), Copy**, and the report text.
- "Monthly & Yearly Report" card with Monthly / Yearly / All days, month and year pickers, **Import file, Paste report, Export Excel, Download report, Download HTML, Copy**.
- The "⚡ Quick Add" tab on the right edge (PC).
- Light theme and colour palettes work as before.

**Brought back with it (they were missing in Round 57):** Import file (Excel exports, Download Report .html, report .txt), Paste report, Reset day, Download Report as HTML, and the per-entry copy buttons. They use the same rules as before: duplicates are skipped, phone numbers and e-mails are cleaned out, and the shift widens if an imported hour is outside it.

**Not brought back:** "Save App HTML". It saved the old single-file app, and the new app is no longer one file. Your data is covered by Backup / Restore.

## 3. The moon – exactly as before
**Found:** the new moon was a flat picture with a bright ring around it. The old moon is drawn: the **phase follows the shift** (new moon before the shift → full blood moon at the end), with a soft glow that grows with the phase, a soft shadow edge, darker edges and **no outline**. Before the shift starts it is almost dark, as in your screenshot.

**Change:** the old moon drawing code is ported line for line and used in both places:
- **Day End:** inside the shift card, the same size, with the glow that lights the card ("moon light"), and the stars switching on as the shift goes on. Stars show only after a 5-second rest, and only inside the shift box.
- **Every other page:** the floating moon, as before: 118 px at the bottom left, the time in the middle with LEFT / TO START / OVERTIME under it (OVERTIME in a pill), drag to move, double-click to hide, the "☾ Moon" tab and Alt+M to bring it back, hold 0.4 s for Quick Add. On phone it sits above the bottom bar.
- On the other pages the stars appear around the moon after 5 seconds without moving, as before.
- It follows the colour palette, like before.

## 4. Sync check
I re-read the whole sync engine and the server rules. Problems found and fixed:
1. **No sync at all after an offline first start.** If the very first start had no internet, the app never fetched your workspace again until it was reopened. It now retries on the next cycle.
2. **Very large items could block a whole batch.** Old areas such as HR files can be big, and the cloud rejects very large requests, which would stop that whole batch. Saves are now split by size (about 1 MB per request), and a single item too large to send is reported clearly instead of blocking everything else.
3. **Live updates after the phone wakes up.** The live connection is restarted when the app comes back to the front if it was dropped while in the background (iPhone closes it).
4. **Old app open at the same time.** Both apps share the same sign-in. The new app already re-reads the sign-in before refreshing it, so the two never fight over it. The old app does not do this, so **keep only one of the two apps open** on the same device until you switch. This is written in the switch steps.
5. **"Sync now" waited for nothing.** If a background sync was already running, "Sync now" returned at once without syncing. It now waits for the running sync and then syncs again. This was found by the new test.
6. **Status that says what is wrong.** The pill shows "Offline · n" (changes waiting), "Sign in" (with the reason when the session ended) or "Sync problem" (reason on hover and in Settings → Sync & devices, where **Sync now** is).

Checked and fine: field-level merge, deletes never coming back, the offline outbox surviving a restart, no duplicates when two devices migrate, version-checked saves, and cleaning of phone numbers and e-mails on data arriving from the cloud (two-device test).

## 5. Everything else (checked, unchanged by request)
Dashboard, Analytics, Deals, Won Deals, Lost Deals, Tickets, Tasks, HR, Automations and Settings keep the Round 57 design bases (borderless, compact, data boxes). Each section was opened on PC and phone: no sideways scrolling, no errors. The items listed in Round 57 §8 are still not rebuilt.

## 6. Tests
- `tests/parity.test.cjs`: the report texts are still identical to the old app.
- `tests/dayend_look.test.cjs` (new): the new Day End uses the old class structure (shift card, countdown, hour blocks, sections, entries, report cards). The old styles apply and do not leak into the rest of the app. The moon has no ring, and is dark before the shift and lit near its end (the test sets the clock). The floating moon is drawn, borderless and 118 px. The filter works and the clock strip shows the day's punches. Side-by-side screenshots of the old and new page were compared by eye (PC and phone).
- `tests/import.test.cjs` (new): Paste report and report .html / Excel import bring back the same entries; duplicates are skipped.
- `tests/sync.test.cjs`: plus offline first start, the size-split batch, and an oversized item reported without blocking.
- `tests/ui.test.cjs`: every section, PC and phone.

## Status
**Built and tested in Chromium (PC 1280 px and phone 390 px). NOT deployed, NOT merged, NOT tested on a real iPhone.**

| Part | State |
|---|---|
| Day End in the old look (old stylesheet + old structure, isolated) | Done. Compared side by side with your zip's build on PC and phone. Test `dayend_look` (33 checks) passes. |
| Report texts identical to the old app | Done, test `parity` passes. |
| Import file / Paste report / Reset / Download Report (HTML) / copy buttons back | Done, test `import` passes (paste, re-paste skips duplicates, Excel round trip). |
| Moon drawn as before (phase, glow, no outline) in Day End and on other pages; night sky | Done, tested at two times of day. |
| Sync fixes 1–6 | Done, test `sync` passes (16 checks, including offline first start and an oversized item). Live updates against the real Supabase are still untested here (no access to your project from tests, by design). |
| Every other section on PC + phone | Opened, no sideways scrolling, no errors (`ui`, 43 checks). |

**Not changed / for you to decide:**
- The phone bottom bar stays the exact copy of the PC top bar (your 24 Nov decision). Your zip's build still has the older icon dock (Day End / Dashboard / Analytics / Quick Add / Menu / Search). Tell me if you want that dock back instead.
- "Save App HTML" is not brought back (see §2).
- The other sections (Tasks and the rest) keep the new compact design. In the old app they looked different (bordered buttons, "Saved views", "Scan entries" …). Tell me which old screens you also want back as they were.
- I made the root text size 16 px, as in the old page. The other sections' text is therefore slightly larger than in Round 57.
