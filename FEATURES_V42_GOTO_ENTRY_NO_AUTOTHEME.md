# Round 42 – "Go to entry" from the breakdown details, auto light/dark removed

## Request
1. No automatic light/dark by time of day.
2. From the Deal Stage Breakdown details (the pop-up that lists the entries behind a number), a button on each entry that takes you straight to where it was entered.

## Plan
| # | Change | How |
|---|---|---|
| 1 | Remove auto light/dark | Delete the setting, its switch in "Comfort and speed", and the timer that flipped the theme. A previously saved "auto" value is ignored. Manual theme button untouched |
| 2 | **Go to entry** button (Day End) | Every row in every breakdown pop-up (stages, Closed Won plans/billing, Support Calls, Whatsapp, Tickets, Other) gets a "Go to entry" button. It closes the pop-up, opens that day, clears any contact filter that would hide the entry, opens the hour block, scrolls the entry to the middle and highlights it for a few seconds |
| 3 | Same button in Won Deals | The Won Deals plan breakdown pop-up gets it too: opens that deal's day, scrolls to the deal and highlights it |
| 4 | Checks | works on phone and PC, in light and dark, entry in another day, entry hidden by a filter, no overflow, no page errors |

Rules kept: nothing removed except the auto-theme feature you asked to drop. Nothing deployed by me.

## Status (filled at the end)
| # | Item | Status |
|---|---|---|
| 1 | Auto light/dark by time of day removed (theme now only changes when you tap the moon / theme control; Comfort panel row removed) | Done, tested |
| 2 | "Go to entry" button on every row of the Day End stage-breakdown pop-up: opens the day, opens the hour block, scrolls to and highlights the entry | Done, tested PC + phone |
| 3 | "Go to entry" in the Won Deals breakdown pop-up: opens the day, scrolls to and highlights the deal | Done, tested |
| 4 | Clears active filters so the entry is never hidden; highlight fades after ~3.5 s | Done |
| 5 | Design: accent-outlined small button, glow highlight, works in light theme | Done, design audit OFF=0 |
Regression: no failures from these changes; remaining failures are old known ones (v7 date-dependent, stale deals/v3) and time-of-day tests that time out outside the live-hour window. Not deployed.
