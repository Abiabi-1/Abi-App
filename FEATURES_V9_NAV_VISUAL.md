# Round 9 — Deals as the parent section + premium visual refinement (md first, then implemented)

Sources: your message ("Contacts, Tickets under Deals… Won/Lost under Deals too, still in the side menu") and the
"CRM Visual Enhancement & UI Redesign Brief". Improvement only: nothing is removed; Day End Report stays as it is.

## A. Navigation restructure
| Item | Top bar | Side menu | Inside Deals |
|---|---|---|---|
| Deals | visible (highlighted whenever you are in Deals, Contacts, Tickets, Won or Lost) | top-level item with an **arrow**; arrow opens a drop-down | main page |
| Contacts | hidden | inside the Deals drop-down | tab in the Deals / Contacts / Tickets row |
| Tickets | hidden | inside the Deals drop-down | tab in the same row |
| Won Deals | hidden | **separate top-level item** (kept) | own button in a **separate row** ("Records") below the tab row |
| Lost Deals | hidden | **separate top-level item** (kept) | same separate row |
| Day End, Dashboard, Analytics, Tasks | unchanged | unchanged | – |

- Won Deals and Lost Deals pages get a slim trail bar ("‹ Deals" + Won Deals / Lost Deals chips) so you can always go back,
  because they are no longer in the top bar.
- Deals / Contacts / Tickets pages: row 1 = Deals · Contacts · Tickets, row 2 (separate, labelled "Records") = Won Deals · Lost Deals.
- Drop-down opens automatically when you are inside Deals, Contacts or Tickets; arrow toggles it; state is remembered.
- All existing routes (`hubShow('crm')` etc.), search results, Quick Add, links between records keep working. Customize sections still lists everything.
- No data/storage/handler change. The only code changes: CSS to hide the four top tabs, the drawer markup, the sub-bar markup, a small wrapper that keeps the Deals tab highlighted.

## B. Visual refinement (from the brief)
1. **Softer separation**: default borders become low-contrast neutral charcoal (dark) / soft grey (light); red tint only for selected/active states and primary actions. Red left-borders and red card outlines removed from ordinary cards.
2. **Layered surfaces**: deep charcoal page, slightly lighter content surface, raised card surface, darker inset inputs, elevated popovers; tonal differences instead of outlines.
3. **Red used selectively**: primary buttons, selected nav/tab/filter, key numbers, progress/selected chart series; deeper crimson on large areas, brighter only on small highlights.
4. **Gradients/glow** restrained: header tile and primary buttons keep them; cards get a faint charcoal gradient; ambient page glow lowered.
5. **Dashboard**: grouped KPI sections (Today / Results) with consistent card height, value/label hierarchy, small type accent per metric, softer attention list, smoother bars. All widgets/metrics kept.
6. **Analytics**: chart cards blended into the page, subtle gridlines, softer bar/area gradients, compact legend, tooltip matching the app, KPI hierarchy. Calculations untouched.
7. **Deals / Won / Lost / Contacts / Tasks / Tickets**: same card, toolbar, chip, table, modal recipe; green only as a quiet won marker, rose only as a quiet lost marker.
8. Radii family 9 / 12 / 16 / pill for chips; soft shadows; short transitions; `prefers-reduced-motion` respected.
9. Light theme gets its own soft neutral surfaces (not an inverted dark theme). Mobile re-checked.

## C. Not done / limits (stated up front)
- No invented trends or insights: the data has no previous-period figures, so KPI cards show no change arrows.
- Day End Report and the Won Deals page body (both in their own frames) are not restyled.

## Status (delivered)
**Navigation** — done as specified: top bar now shows Day End · Dashboard · Analytics · Deals · Tasks. Contacts, Tickets, Won Deals, Lost Deals are hidden from it
(the Deals tab stays highlighted inside any of them). Deals / Contacts / Tickets pages: row 1 = Deals · Contacts · Tickets, separate row 2 "Records" = Won Deals · Lost Deals.
Won Deals / Lost Deals pages have a trail bar (‹ Deals · Won Deals · Lost Deals). Side menu: Deals has an arrow drop-down with Contacts and Tickets (auto-opens when you are inside them, remembered);
Won Deals and Lost Deals stay as their own menu items. New test `tests/test_v9.py` (24 checks).
**Visual** — softer neutral separators, layered charcoal surfaces (dark) / soft white surfaces (light), red kept for primary/selected/key numbers, stage columns get meaningful quiet tones
(won green, lost rose, in-progress blue, waiting amber; the old per-card red left bars are now thin and tinted), calm header tiles, Dashboard grouped (Today / Results / Pipeline and follow-up) with consistent KPI cards,
Analytics KPI cards, chart cards, gridlines, bar/area gradients and a multi-colour series palette for donut/legend (red first). Tokens were refined at their source (`style-01`, `style-02`); the rest sits in `style-07`.
**Tests** — parity (Day End unchanged), sweep 0 issues, colours, header, v3–v9, tickets, deals, lost, builder, automations, rules, billing, renew, features pass. Tests that clicked the now-hidden tabs were switched to `hubShow()`;
the drag-reorder test now uses Dashboard/Day End; header test expects the Deals tab highlighted inside Lost Deals.
**Honest limits** — (1) no KPI change arrows: there is no previous-period data to compare. (2) Chart tooltips are the browser's native ones (cannot be styled); not replaced. (3) Day End Report and the Won Deals page body are untouched (they live in their own frames).
(4) The cloud-sync test is timing-sensitive in this sandbox: it passes on some runs and fails different steps on others, on the previous build too; the sync code was not touched.
(5) Customize sections still lists Contacts/Tickets/Won/Lost; reordering them has no visible effect since they are not in the bar.
