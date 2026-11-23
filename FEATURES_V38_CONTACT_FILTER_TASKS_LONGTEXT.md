# Round 38 – WhatsApp / Email filter for Day End, "WhatsApp Today" / "Email Today" tasks, long-text preview popup

Request (22 Nov 2026): (1) filter the Day End entries that were WhatsApped today, "unable to WhatsApp", emailed, "unable to email" and so on; maybe make a task by itself under "WhatsApp Today" or "Email Today" separately. (2) Show what I'm writing in a popup like Smart Text, when the text is long and is different from anything Smart Text already offers.

Nothing here is deployed – upload the unzipped `abi-deploy.zip` to GitHub yourself.

## 1. Contact filter in Day End
A small chip bar sits above the hour blocks (inside the Day End page). Counts are for the day you are looking at (today by default; the heading says "today" or the date).

| Chip | Counts / shows entries that… |
|------|------------------------------|
| All | everything (normal view) |
| WhatsApped | are in the WhatsApp section, or whose note says WhatsApp was sent/used |
| Unable to WhatsApp | say "unable to WhatsApp", "not on WhatsApp", "no WhatsApp", "WhatsApp failed"… (same wording rules the Deals board already uses) |
| To WhatsApp | say the message still has to be sent ("will WhatsApp", "send on WhatsApp", "WhatsApp later/today/him/her") |
| Emailed | say an email was sent ("email sent", "emailed") – an e-mail address alone does not count |
| Unable to email | say "unable to email", "email bounced / invalid / wrong", "no email" |
| To email | say the email still has to be sent ("will email", "send an email", "email later/today/him/her") |

- Choosing a chip hides every other entry and hour block, and opens the hour blocks that match (the normal open/closed state returns when you pick All).
- Tapping the chip again returns to All. Works on phone and PC, light and dark themes, moon and filigree designs.

## 2. Tap-to-mark row in every entry form (Day End and Quick Add)
A compact "Contact" row of small chips under the notes: **WhatsApped · No WhatsApp · Emailed · No email · WhatsApp today · Email today**.
- WhatsApped / No WhatsApp / Emailed / No email put the matching standard wording into the notes ("WhatsApp sent", "Unable to WhatsApp", "Email sent", "Unable to email") so the filter, the Deals board icons (green / red) and reports all read it the same way. Tapping again removes the wording.
- WhatsApp today / Email today are task switches (see 3). A note that says it plainly ("will WhatsApp him", "send email later") does the same by itself.

## 3. Automatic tasks: "WhatsApp Today" and "Email Today"
- Saving an entry marked WhatsApp today / Email today (or whose note says so) creates a task due today in two separate Task folders: **WhatsApp Today** and **Email Today** (the folders are created the first time, visible next to "No response" in Tasks).
- Task title: "WhatsApp – Deal name", number attached (Call button works), "Go to entry" works.
- When you later save an entry for the same number/deal as WhatsApped (or in the WhatsApp section) / Emailed, the matching open task is completed by itself. Unable to WhatsApp / Unable to email also closes it with a note, so the list only holds what is still to do.
- Nothing is created twice for the same deal on the same day.

## 4. Long-text preview popup
- While you type, if the text is long (about 45+ characters, or longer than the box can show) **and** Smart Text has nothing to offer for it (its suggestion popup is not showing and the text is not already one of its saved phrases), a preview popup appears next to the box (above it, or below when there is no room) showing everything you wrote, with a blinking caret. It scrolls for very long text, has a ✕ to hide, and goes away when the text is short again or you leave the box.
- On phones with the keyboard open it stays docked above the keyboard as in Round 37.
- Works in the hub, Day End, Won Deals and Quick Add.

## Status (filled at the end)
| # | Item | Status |
|---|------|--------|
| 1 | Contact filter chips in Day End (WhatsApped / Unable to WhatsApp / To WhatsApp / Emailed / Unable to email / To email, with counts, day label) | DONE (tested: counts, filter, hides other hours, tap again = All) |
| 2 | Tap-to-mark "Contact" row in Day End and Quick Add forms (wording written into the note, groups exclusive, tap again removes) | DONE |
| 3 | Automatic tasks in two separate folders "WhatsApp Today" / "Email Today"; from the chips or from words in the note; completed when the contact is logged (also from the WhatsApp section); "Unable" closes with a note; no duplicates | DONE (tested) |
| 3b | "WhatsApp Today (n)" / "Email Today (n)" shortcuts in the filter bar open those task folders | DONE |
| 4 | Long-text preview popup next to the box, hidden when Smart Text is offering suggestions or already has the phrase; docks above the keyboard on phones | DONE (tested on desktop; phone docking tested in Round 37 style) |

## Honest notes
- The filter reads the wording of entries (same rules the Deals board already uses for the green/red icons), so entries written long ago are classified by what they say; entries made with the new Contact chips are exact.
- "To WhatsApp" / "To email" entries are the ones still waiting; once you log the contact the task closes but the old entry keeps its wording.
- Tasks are created for the day you save the entry (due today). Not deployed.
