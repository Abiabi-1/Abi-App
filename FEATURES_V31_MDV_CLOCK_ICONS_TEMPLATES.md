# Round 31 – HR scroll, MDV format, clock strip, HR side menu, icon group, smart text, templates

Rules applied: nothing existing removed (only the 🕒 hover icons and bordered chips you asked to lose); features applied everywhere applicable; sweep done.

| # | Your request | Root cause found | What was done | Status |
|---|---|---|---|---|
| 1 | Horizontal scroll button missing on HR page | The ‹ › buttons sat *under* the HR overlay (z-index) | Raised above every overlay; test checks the button is really the top element and scrolls the HR tabs | Done |
| 2 | "+960" button: invisible until hover, rename MDV, no "+9" needed, 7 digits → +960-777-7777, pasted formatted number kept, other formats free when off | Old logic needed "+9", button was large and overlapped the "+" button | Rewritten: tiny `MDV` toggle left of the copy button, fully transparent until hover; ON = any typed/pasted 7-digit number becomes +960-xxx-xxxx; formatted paste untouched; other formats (+91…) untouched; OFF = nothing changes. State remembered | Done |
| 3 | MDV applied to additional-number notes | "Note for this number" matched the word *number* | Notes/reason/remark fields are never treated as phone boxes; every real number box (incl. extra numbers) is | Done |
| 4 | Odd icon (clock on hover over Clock in/out) | 🕒 pick buttons | Removed everywhere (Day End strip + HR time clock). Pick an exact time with long-press / right-click on the button, or tap an empty In/Break/Back/Out time | Done |
| 5 | Clock buttons out of place, rectangle behind them | Bordered chips + divider + panel | Strip now has no box/divider/border; buttons left, times right, same row, stacked neatly on phones | Done |
| 6 | Side menu available from HR page | Drawer was under the HR overlay | ☰ button in HR top bar; drawer sits above HR; picking a section closes HR and goes there | Done |
| 7 | Copy buttons leaking above the entry → 4 small invisible icons at bottom | Absolutely positioned above the box | Icons (phone, deal, notes, everything; ✉ only if the entry has an email) inside the bottom-right of the entry, transparent until hover; same on Deals Tracker and hub rows; touch toggle kept | Done |
| 8 | Icons out of theme (quick add excepted) | ~60 colourful emoji used as icons | New `script-48-icons.js` draws bell, gear, calendar, palette, trash, warning, etc. as line icons in the text colour, in every menu/button/card, including future ones. User-chosen folder/automation emoji pickers left alone on purpose | Done |
| 9 | Smart text not learning from existing data | "Learn from existing data" ran once (before data existed on a device) and its button threw an error | Learns from all saved Day End, deals, tasks, tickets, contacts, lost deals; re-checks on load, when data changes and every 90 s (only new text); button fixed | Done |
| 10 | Message templates: separate name/note boxes, categories, move in/out | Single textarea dialog | Name box + category + message box (like Quick Add) with {field} buttons; categories add / rename / remove; Move-to menu per template; shared categories in the WhatsApp/Email templates manager | Done |

Not done / honest limits: nothing was deployed to Netlify; mood emoji in the HR mood dropdown stay (a dropdown option cannot hold an icon); Quick Add ⚡ left as you said.
