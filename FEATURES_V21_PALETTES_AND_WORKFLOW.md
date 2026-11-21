# Round 21 – colour palettes everywhere + the suggested workflow features

## Part A – Palette switcher (the big one)
**What you get:** a palette button in the top bar of every section (and next to the light/dark button in Day End and Won Deals). It opens a small picker: **Blood red (current), Deep grey, Deep blue, Deep purple, Deep green, Fluorescent yellow, Hot pink**. Choosing one recolours the whole app at once, remembered per device. Everything else (layout, black backgrounds, green/red meaning colours on sent/lost/overdue) stays.

**How I will build it (so nothing is missed):**
1. **One colour source.** Every hard-coded brand red in the CSS, JS strings and templates (`#e5303f`, `rgba(229,48,63,…)`, the lighter pinks, the deep maroons, the glow colours) is replaced by palette variables (`--t1` main, `--t2` light, `--t3` deep, plus `-rgb` versions for transparency). The default values are the exact current reds, so Blood red looks identical to today (I will verify by screenshot comparison).
2. **Palette table** in one place: for each palette the main / light / deep colours and the app accent tokens (`--accent`, `--accent-rgb`, `--accent2` …).
3. **Applied to all three pages** (hub, Day End frame, Won Deals frame) by setting the variables on each page's root; the frames follow instantly.
4. **Artwork recolour.** Your filigree, glyph texture and moon image are red artwork. At runtime they are re-tinted (dark→deep, mid→main, light→light) on a canvas into the chosen palette and swapped in, so the texture, title text and moon all change colour, not just overlays.
5. **Canvas drawings** (moon, glow, stars, moon light, night sky, charts that use the accent) read the palette when they draw, so the moon and the light it emits change colour too.
6. **Meaning colours stay**: green = sent/won, red = lost/overdue/unable. Charts keep their data palette.
7. **Audit**: an automated test switches through all 7 palettes on every section and checks (a) no leftover brand-red in computed colours of visible elements, (b) no errors, (c) screenshots per palette/section that I review.
Dark theme gets the full palette; the light theme also takes the accent colour.

## Part B – Workflow features (how each is built)
1. **Quick "log activity"** – a row of one-tap chips on every Deal/Contact record page (Called – no answer, Called – spoke, WhatsApp sent, Email sent, Demo done, Needs follow-up). Each adds a timeline note with the right wording, marks WhatsApp/email as sent where relevant, and the existing note-based stage auto-update moves the stage.
2. **Today view** – new section "Today" (tab + menu): follow-ups due/overdue, tasks due, overdue tickets, stuck deals, goals, today's activity. Every row opens its record page. Built from the existing deals/tasks/tickets data (no new storage).
3. **Stuck-deal alerts** – deals with no activity for N days (default 7, changeable in Today: 3/5/7/14/30) get a "Stuck 9d" badge on cards/list, a new "Stuck" filter in Deals, and appear in Today. Won/lost/churn deals are excluded.
4. **Bulk actions in Contacts, Tickets, Lost deals** – a Select button per section: tick several, then move/close, tag, export, delete (with the existing Trash/undo safety). Same look as Deals.
5. **Templates on record pages** – WhatsApp and Email buttons gain a small template picker (defaults included, editable, saved on device); the chosen text has {name}/{deal} filled in and opens WhatsApp/mail with it.
6. **Goals** – monthly target for won deals and revenue (MRR); progress rings in Today. Targets saved on device.
7. **CSV import wizard** – choose a CSV, map columns (name, number, email, company, plan, stage, notes), preview, import as Deals or Contacts; duplicates by number/name are skipped and reported.
8. **Empty states** – friendly hint + button for empty boards/lists.
9. **Keyboard shortcuts** – `N` new, `/` search, `G` then `D/C/T/A/H` to jump sections, `?` shows the list. Off while typing in fields.
10. **Skeleton loaders** – short soft shimmer while a section paints (never blocks clicks).
11. **Calm mode** – switch in the palette picker: turns off stars, moon light, night sky and animations (also automatic with the device's reduce-motion setting).
12. **Light-theme pass** – check every section in light mode and fix anything unreadable.

## Safety
Nothing is removed. After the build: parity check, all test suites, a new `test_v21.py`, and screenshots of every section in every palette.

---
## Status (delivered)

**Palettes – done.** A **Colours** button (header, and next to the theme button in Day End and Won Deals; inside the Tools menu on phones) offers Blood red (default, unchanged), Deep grey, Deep blue, Deep purple, Deep green, Fluorescent yellow and Hot pink. It recolours every accent: buttons, glows, borders, tabs, badges, the filigree and glyph textures, the moon (artwork and corona), the moon-light overlay, the night-sky glow, across all three pages (hub, Day End, Won Deals). The choice is remembered. Fluorescent yellow uses dark text on buttons. Test: 6 palettes x 9 sections scanned for leftover red (none), no page errors.
Intentionally unchanged: meaning colours (green = done/won, red = lost/overdue), chart data colours, exported documents (they keep red).

**Workflow features**
- Done: 1 quick log chips on record pages; 2 Today view (button, `T`); 3 stuck-deal badge + Today list with threshold 3/5/7/14/30; 6 goals rings (won deals, revenue) in Today; 9 keyboard shortcuts (`/ N T ? G+D/H/A/C/T`); 11 calm mode (in the Colours popup).
- Style only: 10 skeleton shimmer (CSS added, not attached to a section yet).
- **Not done yet:** 4 bulk actions in Contacts/Tickets/Lost; 5 WhatsApp/Email templates; 7 CSV import wizard; 8 empty states; 12 light-theme pass; a "Stuck" filter in the Deals filter pop-up.
