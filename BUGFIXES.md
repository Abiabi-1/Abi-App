# Bug review and fixes

Checked by reading the code, running the automated tests, and driving the app in a browser. Rule kept: only fixes, nothing existing changed or removed.

| # | Where | Problem | Fix | Status |
|---|---|---|---|---|
| 1 | Cloud sync | The app's saved data can be re-written with the same content in a different order. Two devices could then keep re-uploading it to each other and reloading every ~20 s. | Data is now compared by content, not by text order. | Fixed |
| 2 | Cloud sync | An update arriving from another device could reload the page while a Lost Deals / Tickets window was open with text typed in it. | Those windows now count as "typing in progress", so the app waits and shows the Apply bar. | Fixed |
| 3 | Cloud sign-in | The new Supabase "publishable" key (sb_publishable_…) is not a login token, but was sent as one. | It is now sent only as the API key. | Fixed |
| 4 | Tickets board | An empty column had no height, so you could not drop a ticket into it. | Columns have a minimum height. | Fixed |
| 5 | Backup / Restore | New data (Lost Deals, Tickets) would not be in the backup file. | Added to the backup and restore list. | Fixed |
| 6 | Scroll shortcut | The scroll-to-top/bottom button did not know about the new tabs. | Added for Lost Deals and Tickets. | Fixed |
| 7 | Netlify (not code) | A site uploaded without an account is private and expires. | Claim it (SETUP_CLOUD.md). | Needs you |

## Known limits (not bugs, noted honestly)
- Same field edited on two devices at the same moment: this device wins; the other value is in the conflict log.
- Smart text phrases and theme stay per device (not synced).
- Signing in as a different person on the same device would merge that device's old data into the new account. Single-user for now.
- Free Supabase pauses after about a week unused and has no automatic backups.

- Round 4: Won Deals panel needed the new script registered in manifest.json (gap_modes) — keep both in sync when adding an iframe script. Parity golden `deals_report.txt` allows the additive "Renewals" block.
- Round 5: engine "similar" matching ignored phrases that contain their own negation ("no issues") — negation check is skipped when the phrase itself contains a negator. Typos ("makng bills") now match via raw-word edit distance. Dashboard custom bars must not reuse the `.db-bar` class (the drill-down handler assumes a parent `.db-card`).
- Cloud test race: the offline step now waits for any apply-by-reload to finish before editing.


## Round 7
- Merged contacts re-created from Day End/deals after a merge: merged names are now remembered on the kept contact.
- Dashboard drill-down showed '(no name)' for Day End calls/WhatsApp/tickets and Won entries: fixed.
- Widget editor/customize pop-up unstyled until Automations was opened: styles load at start-up.
- Quick Add Details needed scrolling: compact top block.
- Ticket names no longer carry the D… code.
