# Round 12 — full-page records, one app, realistic blood moon, icons

Rules kept: nothing removed; additions and fixes only. Day End data/reports untouched (parity must stay OK).

## 0. Your question: why are Day End Report and Won Deals separate?
They began as two separate apps. This app loads each inside its own frame so their data logic could stay exactly as written. A frame has its own page, styles and scripts, which is why they looked different. Truly merging the code would put Day End's calculations at risk, so they stay separate *inside* but will look and feel like one app: same texture, tiles, glow, buttons, popups, same Quick Add look, same navigation. (Data was already shared.)

## 1. Audit of earlier requests (checked before building)
| Earlier request | Status |
|---|---|
| Pure black, no grey blacks | Done (R10). Re-check Day End / Won Deals frames: they still use grey-black card fills -> fix this round |
| Top bar blends with section; nav like Quick Add | Done (R10) |
| Deals/Contacts boards fully visible, HubSpot-like, search in title row, same for Tickets | Done (R11) |
| Rows pop-up 25..All + custom | Done (R11) |
| Stage order + colours + Waiting on Contact | Done (R11); Won Deals frame list re-checked this round |
| Auto stage from last task/note | Done (R11) |
| WhatsApp/Email icons aligned, green/red/black | Done (R11) |
| Quick Add buttons leaking | Hardened (R11); re-verify on phone this round |
| Moon timer + popup | Done (R11); improved this round |
| **Contacts open in a buggy way** | REGRESSION from my R11 layout (record page broken) -> fixed + replaced by full-page record |
| **Tickets/Deals open as pop-ups** | Not done -> this round |
| Filigree inside Day End boxes | Not done -> this round |

## 2. Full-page records (Deals, Contacts, Tickets — identical)
Clicking a deal, contact or ticket (board card, list row, search, dashboard link, association link) opens a full page, not a pop-up. A "‹ Deals / Contacts / Tickets" button goes back to the exact list you left.
- **Left column:** icon tile, name, key facts (stage/status, amount, pipeline, number, email, dates), action buttons: Note, Email, Call, WhatsApp, Task, Edit, then an "About" list of every property.
- **Centre:** tabs **Overview** and **Activities**.
  - Overview: data highlights (created, stage, last activity, amount) + recent activities.
  - Activities: filters All / Notes / Tasks / Calls / WhatsApp / Tickets, search, month groups, Collapse all. Day End tasks show as "Task completed" with their note inside; notes added on their own show as plain "Note". Follow-ups show as upcoming tasks. Stage changes show as events.
  - Note and Task composers sit at the top of Activities and save to the real record.
- **Right column:** associations: Contacts, Deals, Tickets (click to open that record) and a small summary (counts, last contact).
- "Edit" opens the old editor, so no editing feature is lost.
- Same layout on phone: one column, tabs stay, sections stack.

## 3. One app look
Day End Report and Won Deals frames get the same filigree boxes (including the task / call / WhatsApp / ticket boxes when expanded), tile icons, pure-black fills, same buttons.

## 4. Moon
No outline ring. Higher-resolution texture, softer terminator, realistic corona that grows with the phase (new moon barely glows; full moon blazes). Shift card becomes a red-and-black night sky (stars, faint haze) that brightens with the moon. In other sections the floating moon casts a soft red light across the page, stronger as it fills, following it while dragged.

## 5. Icons
New consistent line-icon set (HubSpot-like simplicity) on crimson filigree tiles: section headers, menu, Day End section boxes, dashboard cards.

## Checks
Parity OK; all suites; new test_v12 (records open full page for all three kinds, tabs, note saves, back returns, no pop-up, phone/overflow); screenshots at 1280/390.

---
## Status (delivered)
- **Records as full pages**: Deals, Contacts and Tickets all open the same HubSpot-style page (hero card with Note / Email / Call / WhatsApp / Task / Edit, About list, Overview + Activities tabs, associations, back button). No more pop-ups on click; **Edit** opens the old editor so nothing was removed. Deal pages now sync contacts first so "Contacts" is filled on first open.
- **One app**: Day End and Won Deals now share the filigree texture, pure-black boxes, crimson headers/icons and the same theme as everything else (Won Deals used to open light when the rest was dark – fixed). They are still two frames internally, to keep your Day End data and reports untouched.
- **Blood moon**: no outline ring, new higher-resolution artwork, soft terminator, glow that grows with the phase (new moon barely glows, full moon blazes).
- **Night sky**: the shift card is black with red twinkling stars; its red horizon glow rises with the moon.
- **Moon light in other tabs**: a red light follows the floating moon as you drag it and gets stronger with the phase; smooth fade, never blocks clicks.
- **Icons**: one simple stroke icon set for every section header, the menu and Tasks/Contacts.
- Test: `tests/test_v12.py` (28 checks, desktop + phone) passes; parity OK.
