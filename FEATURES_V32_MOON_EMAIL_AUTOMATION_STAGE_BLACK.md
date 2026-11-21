# Round 32 – Moon info, layout, email→contact, automations, stage auto-pick, Black palette + 13 efficiency features

Rules kept: nothing removed, only added/fixed; every feature applied everywhere applicable; sweep at the end; honest status filled in last.

## A. Your direct requests
| # | Request | Plan | Status |
|---|---|---|---|
| 1 | Moon shows **time left** in the shift, plus clocked in / on break with the clock-in time, small and pretty, without spoiling the moon; everywhere a moon exists (hub moon + Day End moon) | one shared formatter used by both moons: big line = time left, small label under = "clocked in 09:02" / "on break 00:12" | Done – both moons show time left + small status line ("in · 11:00am" / "break · 00:12") |
| 2 | Bigger moon, vertically centred with Shift start / end / On shift row; smaller Clock in / Break / Clock out buttons; Break button transparent, no outline | CSS on shift card, `.clk-b` | Done – moon 196px, shift row centred, smaller buttons, Break transparent without outline |
| 3 | Email added to a task → linked to that number's **contact** (always) | on save of a task/deal with email: find contact by number (any of its numbers), add email; create the contact if missing | Done – email goes to every contact with that number; new contacts inherit it (tested) |
| 4 | Copy notes broken when an email is added; email must never touch notes | find where the email leaks into notes/copy and separate it | Done – email no longer touches notes; Copy notes works with an email (tested) |
| 5 | Automations: cannot create more task folders; more automation everywhere (research) | fix folder creation; audit rule triggers/actions and add more | Done – folders: Enter key + confirmation, couldn't reproduce the original failure so this is hardening; 6 new starter templates (19 total). Not done: brand-new trigger/action types |
| 6 | Deal stage auto-selects when the number or deal name is recognised; can be changed by hand | look up number / name in Deals, Contacts and past entries when typing; pre-select stage, mark as auto | Done – picks by number (last 7 digits) or deal name, hint shown, your manual choice kept (tested) |
| 7 | Hold the copy button: turns into X and clears faster | shorten hold time (~550 ms → ~250 ms) on all three copies | Done – 220 ms on all three copy buttons |
| 8 | Black palette darker, stars working, things not working in it | audit `mono` palette: backgrounds pure black, star layers and moon respect it | Done – pure black, visible stars, palette scan clean; I can't see your phone so tell me anything still off |

## B. Efficiency features I suggested (all 13)
| # | Feature | Status |
|---|---|---|
| 1 | One-tap "log this call" from a contact / deal | Partial – 'Log call' button on rows in Follow-ups & goals (Tools menu); not on every contact/deal screen yet |
| 2 | Smart paste (number, name, email out of pasted text) | Done in Day End / Quick add number box (number, email, name); other screens not yet |
| 3 | Day End auto-draft button | Partial – 'Copy today's draft' summary (counts per stage); does not fill the report itself |
| 4 | Templates: one-tap send from a deal row, logs "sent" | Partial – template picker on dashboard rows opens WhatsApp chat with the text and logs 'sent'; real auto-sending needs WhatsApp Business API (paid) |
| 5 | Follow-up dashboard (stale deals, overdue, today, snooze) | Done – Tools → Follow-ups & goals: overdue, due today, quiet 7+ days, snooze +1d/+3d. Task-list items are not included |
| 6 | Duplicate warning while typing a number/email | Done in Day End / Quick add (number + email vs Deals) |
| 7 | Reminders / notifications | Partial – existing follow-up notifications kept; snooze added. Push when app is closed depends on browser/phone |
| 8 | Weekly summary | Done – Tools → Weekly summary, copy button |
| 9 | Daily/weekly goals + progress | Done – daily/weekly goals with progress bars |
| 10 | Voice notes to text | Done where browser supports it (Chrome/Android; iPhone Safari limited): Tools → Voice note dictates into the notes box you last tapped |
| 11 | Auto-backup + restore previous | Done – daily automatic copy (last 3), Tools → Restore automatic backup |
| 12 | "New version available" notice | Done – banner when a newer version is on the site (checks every 10 min) |
| 13 | Offline status / queue indicator | Partial – offline pill shown; no queue count (data is saved locally and syncs when back online) |

Status column and the honest list of anything not finished is filled in at the end of the round.
