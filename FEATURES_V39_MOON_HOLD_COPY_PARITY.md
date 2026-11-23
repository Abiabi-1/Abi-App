# Round 39 – moon hold = Quick Add, copy saved entries in the right format, every feature everywhere

Request (22 Nov 2026): (1) press and hold the moon for 1 second to open Day End Quick Add – everywhere the moon is; (2) entries already saved in Day End must copy in the proper format (extra numbers, additional notes); (3) go through every recently added feature and make it available in every place that can take it; check for bugs.

Nothing here is deployed – upload the unzipped `abi-deploy.zip` to GitHub yourself.

## 1. Hold the moon for 1 second → Day End Quick Add
Moons in the app: (a) the floating shift moon in every section except Day End (also over the HR lock screen and full-screen tools), (b) its ☾ tab when the moon is hidden, (c) the shift moon inside the Day End page, (d) the "echo" copy of the moon drawn behind pop-ups (cannot be pressed – it is only light behind a dialog).
- Hold (finger or mouse, without moving) for 1 s on (a), (b) or (c): short vibration on phones, the moon glows while you hold, then Day End opens (if you were in another section) and the Quick Add panel opens. If Quick Add is already open it stays open.
- Moving more than a few pixels cancels the hold, so dragging the moon still moves it. A normal tap / double-tap behaviour (double-tap hides the moon, ☾ tab brings it back) is unchanged; a hold never also counts as a tap.
- The long-press text-selection / context menu on phones is suppressed on the moon.

## 2. Copy saved entries in the same format as "Copy notes"
Saved Day End entries keep the extra numbers and additional notes in one line ("N1 - note; N2 - note; additional"). Copy now gives the proper layout, one per line:
```
+960-790-1790 - main note
+960-777-1234 - wife number
additional note
```
- Applies to the copy buttons on every saved entry (Notes, Everything, All numbers keeps "a / b"), to the copy button on the notes box while editing a saved entry, and to "Copy notes" in the edit form.
- New entries also store the line-by-line version, so entries whose own text contains "; " are not split wrongly; older entries are split only when they have extra numbers.
- Won Deals already saves line-by-line; I checked its copy chips and copy buttons give the same layout.

## 3. Features available everywhere (audit)
Recent features and where they now live (✔ already, ＋ added this round, – cannot apply and why):

| Feature | Day End form | Day End Quick Add | Won Deals form | Won Deals Quick Add | Hub record note box |
|---|---|---|---|---|---|
| Quick-note chips + ✎ edit | ✔ | ✔ | ＋ | ＋ | ＋ |
| Templates (notes) + ✎ edit | ✔ | ✔ | ＋ | ＋ | – (a note box has no stage; chips are enough) |
| Contact row (WhatsApped … Email today) + auto tasks | ＋(R38) | ＋(R38) | ＋ | ＋ | ＋ |
| Contact filter bar | ＋(R38) | – | ＋ (over the day's deals) | – | – (Deals board already has WhatsApp/Email filters) |
| "Already in Deals" + Use last details (popup) | ✔ | ✔ | – (it looks up Won Deals itself) | – | – |
| Typing preview / long-text popup | ✔ | ✔ | ✔ | ✔ | ✔ |
| Phone format, snippets, copy button on boxes | ✔ | ✔ | ✔ | ✔ | ✔ |
| Call outcome row + best-time hint | ✔ | ✔ | – (a deal form is not a call) | – | ✔ (log buttons) |
| Copy chips on saved entries, proper format | ✔ fixed | – | ✔ | – | – |
| Hold moon → Quick Add | ＋ | ＋ | ＋ | ＋ | ＋ (any section) |

Also checked for bugs/inconsistencies: duplicate rows, hidden-input leaks, light theme, 390 px overflow, z-order of new popups, no page errors – see test results at the end.

## Status (filled at the end)
| # | Item | Status |
|---|------|--------|
| 1 | Hold the moon 1 s → Day End Quick Add (Day End moon, hub moon in every section, moon tab) | Done, tested PC + phone |
| 2 | Saved entries copy in the proper line-by-line / extra-number format | Done, tested |
| 3 | Quick notes, templates, ✎ editors, Contact row + WhatsApp/Email Today tasks in Won Deals form, Won Deals Quick Add, hub record note box | Done, tested PC + phone |
| 4 | Contact filter bar over the day's deals in Won Deals | Done, tested (works by note wording) |
| 5 | "Use last details" popup in Won Deals | Not applicable – that feature looks up Won Deals from Day End |
| 6 | Regression | All suites pass except known stale tests (`deals`, `v3` "call + whatsapp links", old drawer) and load-flaky ones that pass on rerun (v27 moon, cloud). Nothing deployed. |
