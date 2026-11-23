# Round 41 – mobile efficiency pack, desktop parity, Message Templates page

Rules kept: nothing existing removed (only added/aligned); design follows `DESIGN_BASE.md`; works on phone and PC; nothing deployed by me. "Existing" = already in the app from an earlier round (checked in the code), so it is not rebuilt – this round adds only what was missing.

## A. Message Templates page (the big one)
A full page (not a small popup), opened from Tools → Message templates, the bottom bar, `#templates`, and the record picker's "Manage templates".
| # | Feature |
|---|---|
| T1 | Page with a header, search, and **category chips that scroll sideways** (phone) / **category rail** (PC) |
| T2 | One long scrollable feed grouped by category; tapping a chip jumps to the section, scrolling highlights the chip (scroll-spy) |
| T3 | Pseudo-categories at the top: ★ Favourites, 🕘 Recent, All |
| T4 | Each card: name, channel badge (WhatsApp / Email / Any), full text, **big Copy button** (copies with `{name}` etc. filled when a contact is chosen, otherwise raw), Use, Edit, Move, ★ |
| T5 | **Use** = pick a deal/contact → fields filled (`{name} {deal} {number} {plan} {price} {stage} {date}`) → preview → Copy / WhatsApp / Email; logs "template sent" in the timeline and marks WhatsApp/Email sent |
| T6 | **Easy categorising:** Move button on every card (bottom sheet of categories with "+ New category"), category dropdown in the editor, **drag a card onto a category** on PC, **Select mode** to move many at once |
| T7 | Category management: add, rename, delete (templates kept as Uncategorised), reorder up/down, optional emoji |
| T8 | Add / edit / duplicate / delete templates; insert-field chips; character count; Undo toast on delete |
| T9 | Both existing template lists (Tools list and record picker list) are shown together; edits are saved back where they came from; nothing is lost; export/import stay in the old panel |
| T10 | Usage count + last used on each card; "Copy as WhatsApp" keeps line breaks |

## B. First list – mobile suggestions (20)
| # | Suggestion | Status before | Round 41 |
|---|---|---|---|
| 1 | Bottom action bar (Quick Add, Search, Today, Tasks, Templates) | one-hand dock existed (opt-in, R36) | **New** always-on bar on phones + Comfort toggle |
| 2 | Swipe on entries/deals | Existing (R36) | kept |
| 3 | Call/WhatsApp/Email buttons on Day End entries | Existing on deal cards/hub, Day End has mail/WhatsApp buttons | verified, kept |
| 4 | Remember last place | missing | **New** (screen, Day End day, scroll) |
| 5 | Bigger sticky Quick Add + Save and add another | Existing | kept |
| 6 | Contact suggestions while typing | partly (Already in Deals) | **New** suggestion list under the number box |
| 7 | Dictation mic on notes | Existing (R32 voice notes) | kept |
| 8 | Numeric keypad, +960 format, paste cleaning | Existing phone format (R33+) | **New** keypad/keyboard hints on every box |
| 9 | Undo toast instead of confirm | Existing (hubKit undo) | kept |
| 10 | Sticky filter chips | missing | **New** last filter remembered per screen |
| 11 | Search everywhere + recents | Existing (Ctrl+K palette, hub search) | **New** shortcut on bottom bar |
| 12 | Today home view | Existing (R33/R34) | **New** one tap from bar + `#today` |
| 13 | Offline/sync indicator | offline pill existed | **New** "Synced 2 min ago" + states |
| 14 | Install as an app | missing | **New** manifest (runtime) + iPhone/Android meta + theme colour |
| 15 | Haptic tick and sound on save | haptics existed (R35) | **New** optional sound tick + setting |
| 16 | Backup reminder + one-tap export | Existing (R24/R32) | kept |
| 17 | Large tap areas for main controls only | partial | **New** ≥44 px for Save/Call/Done on phones |
| 18 | One-handed side toggle | Existing dock | **New** left/right switch for the floating buttons |
| 19 | Auto dark/light by time | missing | **New** setting (light 6am–6pm) |
| 20 | Reduce motion | only OS setting | **New** in-app toggle (particles, glow) |

## C. Second list – efficiency (25)
| # | Suggestion | Status before | Round 41 |
|---|---|---|---|
| 1 | Smart defaults by time of day | partly | **New** Quick Add opens in the current hour, number focused |
| 2 | Paste and parse | smart paste existed (R36) | **New** paste a message into the number box → number/name/notes split |
| 3 | Repeat-caller detection | missing | **New** "Called 3 times · last: Interested · 2 days ago" before saving |
| 4 | Note shortcuts `/nr` | Existing (Smart Text snippets, `.zz` style) | kept |
| 5 | Duplicate guard | missing | **New** same number within 10 min → "Add to existing / Add anyway" |
| 6 | One-tap follow-up | missing | **New** after saving: Tomorrow / 3 days / Next week chips create the task |
| 7 | Multi-select batch | Existing in hub boards (R30s) | kept (not added to Day End list – see notes) |
| 8 | Auto-advance in call list | Today call-back queue existed | not changed (see notes) |
| 9 | Quick stage change on card | Existing "Move to…" on hub cards | kept |
| 10 | Sent? confirmation after WhatsApp/email | missing | **New** asks Yes / Couldn't when you return, updates contact status |
| 11 | Priority / call-first list | contact score + ordering existed (R35) | kept, shown in Today |
| 12 | "Good time to call now" | best-time hints existed | kept |
| 13 | Daily goal ring | goals existed (R32) | kept |
| 14 | End-of-day auto summary | daily summary existed (R32) | kept |
| 15 | Stale nudges + snooze | stuck alerts + snooze existed (R36) | kept |
| 16 | Drafts everywhere | Day End draft existed | **New** Won Deals form, Quick Add and record note box keep drafts |
| 17 | Edit history + restore | existed for records (R36) | kept |
| 18 | Search inside notes with highlight | search exists | **New** highlight on Templates page search; hub search unchanged |
| 19 | Share a deal/day | share existed (R35) | kept |
| 20 | Pin favourite filters | missing | **New** pin star on Won Deals / Day End filter chips (pinned first) |
| 21 | Home-screen shortcuts | in-app only | **New** `#quickadd #today #search #templates` + manifest shortcuts |
| 22 | Pull to refresh + last synced | missing | **New** |
| 23 | Voice command Quick Add | missing | **New** mic on bar: "add call from 7771234 interested follow up tomorrow" (needs browser speech support; iPhone Safari support is limited) |
| 24 | Keyboard hints per box | partly | **New** (same as B8) |
| 25 | Low-data / battery saver | missing | **New** auto when the browser reports data-saver or battery < 20 %; manual toggle |

## D. Desktop
Everything marked New works on PC too, plus PC-only: keyboard shortcuts (Alt+Q Quick Add, Alt+T Today, Alt+M Templates, Alt+S search, `?` help), category rail, drag-and-drop in Templates.

## E. Settings
One "Comfort and speed" panel (Tools menu): bottom bar, side, auto theme, reduce motion, saver, sound, haptics, remember place.

## Honest limits
- Phone vibration works on Android only (iPhone Safari blocks it).
- Install-as-app uses a runtime manifest (the app is a single page; no offline service worker added).
- Voice depends on the browser's speech support.

## Status (filled at the end)
| # | Item | Status |
|---|---|---|
| T1–T10 | Message Templates page (categories scroll, copy, use, move, select mode, drag on PC, category manager, starter categories, favourites, recent, search highlight, undo on delete, both lists merged) | Done, tested on phone + PC (`tests/test_v41_tpl.py`) |
| A1 | Bottom action bar | Done (phones). Stays clear of the moon, moon tab, bulk bars; old + button kept and lifted above it |
| A4 | Remember last place | Done for the screen (not the exact scroll position or Day End date) |
| A6 | Contact suggestions while typing | Done (under the number/deal box, tap to fill) |
| A8/B24 | Keyboard hints | Done (numeric keypad, email keyboard, capitals, autocorrect off) |
| A10/B20 | Sticky + pinned filters | Done: remembered per screen; long-press (0.65 s) a filter chip to pin it to the front |
| A13/B22 | Last-synced time + pull to refresh | Done (pull down at the top of a screen syncs; also stops the browser reloading the page) |
| A14/B21 | Install as app + home-screen shortcuts | Done via runtime manifest + `#quickadd #today #search #templates`. Needs "Add to Home Screen" on your phone; not tested on a real phone |
| A15 | Sound/vibration on save | Done (off by default; Comfort panel) |
| A17 | 44 px main buttons | Done (CSS, phones) |
| A18 | Left/right side | Done for the floating + button (moon is draggable already) |
| A19 | Auto light/dark by time | Done (setting) |
| A20/B25 | Reduce motion / saver | Done (setting; saver also automatic when the browser asks for low data or battery < 20%) |
| B3 | Repeat-caller hint | Done ("Seen 3× · last 2 days ago · stage · name") |
| B5 | Duplicate guard | Done (same number saved in the last 10 minutes asks Add anyway / Cancel) |
| B6 | One-tap follow-up chips | Done (turn off in Comfort) |
| B10 | "Sent?" check after WhatsApp / email | Done (Sent / Couldn't; Couldn't writes "Unable to WhatsApp/email" so the filters pick it up) |
| B16 | Drafts | Done for Won Deals form + Quick Add (Day End already had it); hub record note box not added |
| B23 | Voice quick add | Done (mic on the bar); needs browser speech support – not testable here, only the sentence parser is tested |
| B2 | Paste & parse | Already worked (smart paste, R36) – I removed my duplicate so they do not clash |
| Existing, kept | A2, A3, A5, A7, A9, A11, A12, A16, B4, B7, B9, B11–B15, B17, B19 | Already in the app from earlier rounds |
| Not done | B1 smart default hour (existing behaviour kept), B8 auto-advance in the call list, multi-select inside the Day End list | Not built this round |
| Desktop | Alt+Q / Alt+T / Alt+M / Alt+S, `?` panel, category rail and drag-and-drop in Templates | Done, tested |
| Regression | Palette scan clean, parity OK, design audit 0 findings, new tests pass. Time-of-day tests (v37, v38, v39, v30, v31) cannot find the "current hour" block after 9 pm and fail at night; `v7` fails on both this build and the previous one (date-dependent, not caused by this round); old stale `deals`/`v3` tests unchanged | See note |
