# Round 52 – Everything more organised and compact; Tickets get one tab per type; boards swipe by stage like a mobile pipeline

Request (24 Nov, 00:22): "everything that is not organized to be more organized, a lot more compact. Tickets should have separate tabs for each type … like how the pipeline is in the mobile app. Research app design thoroughly, write a md and apply it."

## Research – what the well-known apps do (and what I take from it)
Sources read: Apple Human Interface Guidelines (Tab bars), HubSpot Knowledge Base (working with records in the mobile app), Salesforce mobile UI best-practice article. (A search for Material density returned no readable text, so Material/Apple touch-target figures below are the commonly published ones – 48 dp / 44 pt – not something I verified this round.)

| Finding | Source | Decision for this app |
|---|---|---|
| In HubSpot's mobile app a deal/ticket pipeline is a **board you swipe sideways through, one stage column at a time**, with a table/list toggle, a Pipeline picker, **saved views as tabs**, a search field, a "sorted by" control and filters that apply with Done / Clear. | HubSpot KB | Tickets (and Deals) boards on phone: **one stage per screen, snap-scrolling, with a stage tab strip** that follows the swipe and jumps on tap. Types become tabs. |
| Tabs are for **navigating between kinds of content**, not for actions; keep the number of tabs small, avoid hidden overflow, use **short single-word labels** and **badges only for what needs attention**. | Apple HIG | Type tabs = short labels + small count; the active tab scrolls into view; actions stay in the toolbar/pop-up, not in the tab strip. Sub-types are a second, lighter strip (segmented), not more tabs. |
| "Less is more" on mobile: show only what most people need, **hide rarely used items behind one control**, avoid desktop-style pop-ups, don't push key content far down the page, use compact record headers with a handful of key fields. | Salesforce | Header collapses to one title row + one control row; secondary controls stay behind the existing single "Filters & more" pop-up (bottom sheet on phone); cards show the few key fields first, extras smaller. |
| Dense does not mean tiny targets: compact the **spacing and type**, keep tappable things ≥ 28–32 px high on phone, never shrink text below legible. | Material/Apple density guidance (general) | Reduce paddings/margins/gaps and secondary text; main controls keep ≥ 30 px height; no horizontal page overflow. |

## Part 1 – Tickets: one tab per type
- The type chips (All types, Demo, Support, Product List, Setup, Hardware Delivery, Printer Setup, Training, plus any type you add) become a **single-row tab strip**: underlined tabs, label + small count, **swipe sideways**, never wrap into several rows, active tab scrolled into view.
- The sub-types of the chosen type (Online / Physical / AnyDesk) become a **compact segmented strip** right under it, also one row.
- Counts, filtering rules and "multi-type tickets appear under each type" stay exactly as they are.
- Works on PC and phone (on PC the strip simply fits or scrolls).

## Part 2 – Boards by stage, like a mobile pipeline (Tickets and Deals, phone)
- On the phone the board shows **one stage column at a time at nearly full width** and snaps when you swipe.
- A **stage tab strip** above the board (stage name + count) highlights the stage in view, follows the swipe and jumps to a stage when tapped. Includes the automatic "Today" and "Closed this month" columns.
- PC boards stay as they are (several columns side by side).
- Drag-and-drop on PC and the "Move to…" selector keep working.

## Part 3 – Compact and organised everywhere
Applied through one shared stylesheet block so every section follows the same rhythm:
- **Section headers**: smaller title, one-line subtitle, tighter spacing; the pipeline switch, Board/List switch and "+ New" sit in one row; search and the single "Filters & more" button share a row.
- **Chips / pills / segmented / tabs**: smaller padding and gap, single-row scroll instead of wrapping rows wherever there were wrapping rows (Tickets types, Deals types, Lost Deals filters, Tasks folder/day strips).
- **Cards (deals, tickets, tasks, contacts)**: tighter padding, smaller secondary lines, 2-line clamp on notes.
- **Tables / lists**: tighter row height; no change to columns.
- **Pop-ups / sheets**: tighter padding, sections separated by a thin line instead of big gaps.
- Nothing is removed; no feature moves behind another control except what is already behind "Filters & more".

## Not changing
Day End Report layout, data, storage keys, sync, privacy rules (no numbers/emails/contacts), desktop top bar, phone bottom dock, the moon.

## Tests
- Tickets: type strip is one row (no wrap), scrolls, active type in view, counts equal the old chips, sub-type strip appears for a chosen type, filtering unchanged.
- Phone board: columns snap, stage strip lists every column, tap jumps, swipe updates the highlight; no horizontal page overflow.
- Compact: header rows ≤ 2 lines on phone for Tickets/Deals/Lost/Tasks; main controls ≥ 30 px high.
- Re-run: v49, v28, v34, v41_mob, v48, header, tickets, deals, lost, palette scan; screenshot PC + phone, dark + light.

## Status
**Built and tested. NOT deployed.**
- Done: Tickets type tabs (single scrolling row, underlined, counts, active in view) with a lighter one-row sub-type strip; phone Tickets board = one stage per screen, snap-swipe, with a stage tab strip that follows the swipe and jumps on tap (empty stages stay as tabs with 0); compact spacing/sizes for headers, chips, segmented controls, cards, table rows and pop-ups in Deals, Tickets and Lost Deals (shared block `style-19-r52.css`, `script-73-r52.js`).
- Deals board on phone already had its own stage jump chips, so it keeps those (no second strip); it only got the compact spacing.
- Tested: new `tests/test_v52.py` (PC + phone, 0 failures), palette scan, v28, v40 design, header, v41_mob, deals; screenshots PC/phone dark and phone light looked at.
- Not done: Tasks, Contacts, Dashboard, Analytics and HR only got what the shared rules reach; I did not redo each of those layouts individually – tell me which screens still feel messy and I will tackle them one by one. Day End and Won Deals untouched (rebuild is separate).
- Test status: `tickets`, `lost` and `v34` time out on a click (a button that moved into the Filters & more pop-up / is covered by an open panel); they fail identically with the Round 52 files removed, so they are old stale tests, not caused by this round. `v49`/`v48` have stale assertions from Round 51 (old tick filter key, old call-outcome shortcut); `v30` "custom snippet" failure not investigated. Not tested on a real iPhone.
