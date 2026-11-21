# Round 8 — UI/UX Consistency & Visual Redesign (md first, then implemented)

Source: "UI/UX Consistency & Visual Redesign Brief". Day End Report is the benchmark.
**Visual only. No feature, data, handler, ID, sync, import/export, storage or navigation change.**

## Approach (how it stays safe)
1. One new stylesheet `src/hub/style-07-design-system.css`, included LAST. It only restyles; every rule is scoped to a section id
   (`#dashView #analyticsView #dealsView #lostView #ticketsView`, plus small touch-ups in `#crmView/#tasksView`). No global element rules.
2. Contacts + Tasks already carry the Day End recipe (style-02). Their recipe is extracted into shared tokens/recipes and re-applied to the other views.
3. Page header icon tile: added with CSS `::before` on the existing header (no markup/ID change), same 46px tile + gradient title + subtitle as Day End.
4. A tiny non-behavioural script (`script-26-design.js`) only: adds the Dashboard "Today / Needs attention" strip (reads existing data, read-only),
   marks overdue/today rows with classes, and sets `data-` styling hooks. It never writes data.
5. Light theme maps through the same tokens (`--card --card-solid --border --text --text2 --text3 --accent`).

## Shared tokens / recipes (from Day End)
- Surfaces: page `--bg` + red glow; card `--card`; elevated `--card-solid`; border `--border` (restrained red tint) / `--border-strong`.
- Spacing 4/8/12/16/20/24/32; radius: input/button 9–10px, card 14–16px, chips pill 999px; page padding 24/20 (16/12 phones), max-width 1100–1300.
- Typography: Sora body/headings, JetBrains Mono only for chips, counts, tab labels; labels not all-caps except tiny field labels.
- Buttons: secondary = bordered, primary = crimson gradient, destructive = rose on hover. Inputs: one height/radius/focus ring.
- Segmented controls/tabs: pill chips, active = accent tint. Status chips: one shape, semantic colours only (green won/done, amber warn, rose lost/overdue, blue info).
- Glow only on the header tile and primary buttons; quiet hover (border/surface shift); `prefers-reduced-motion` respected.

## Per section
| Section | Change |
|---|---|
| Dashboard | Icon header; metric tiles = compact cards; "Today / Needs attention" strip (overdue tasks, follow-ups due, open tickets); unified cards |
| Analytics | Icon header; filter bar, pills, cards = shared recipe |
| Won Deals / Day End | Reference (unchanged); shares the tokens |
| Deals | Icon header; toolbar, segmented switcher, Kanban column headers/counts/cards = Contacts pipeline recipe |
| Lost Deals | Icon header; same system as Won; restrained loss styling (rose only on the number / chip, never page); reason line neutral |
| Tickets | Icon header; board/list same as Deals; priority + status chips (urgent rose, high amber, normal neutral); modal template |
| Contacts | Already on recipe; tabs/segments verified identical to shared component |
| Tasks | Open/Done/All pattern kept; overdue/today/upcoming via one muted marker; larger tap target for the checkbox |
| Modals/drawers | Shared header/footer spacing, radius, blur, animation for `.ld-modal .tc-modal .cm .fu-card` |
| Empty states | Dashed card, small icon, plain text |

## Mobile
Tabs scroll; headers wrap; toolbars wrap; tables keep controlled horizontal scroll; modals max-height 92vh; touch targets ≥38px; no page overflow (sweep test).

## Checklist (verified before delivery — see bottom status)
Header hierarchy · tile size · padding/max-width · card recipe · buttons · toolbar · tabs · inputs/focus · chips · modal · empty states · type/spacing · dark+light · mobile ×9 sections · no behaviour change (all test suites).

## Status (delivered)
- `style-07-design-system.css` (scoped, loaded last) + Dashboard "Today / Needs attention" (read-only counts/links; `script-17`).
- Icon-tile headers with gradient title + subtitle now on Dashboard, Analytics, Deals, Lost Deals, Tickets (same as Day End / Contacts / Tasks).
- Shared toolbar card, buttons, pill segmented controls, inputs + focus ring, chips (urgent = rose, high = amber), Kanban columns/cards, cards, empty states, modals — dark and light.
- Bug fixed on the way: Kanban cards squashed/overlapping on phones; deal/ticket cards with very long text no longer widen the page.
- Day End Report and Won Deals pages were left as they are (they are the reference).
- Verified: screenshots dark/light at 320/390/1280; all test suites pass (parity, sweep 0 issues, colours, header, v3–v7, tickets, deals, lost, builder, automations, features, cloud).
- Honest limits: Contacts profile + Tasks already used this recipe so only checked, not restyled; Won Deals/Day End run in their own frames and were not touched. Each section was judged by screenshot, not by a pixel-diff tool.
