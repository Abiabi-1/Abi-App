# Round 11 — HubSpot-style boards, filigree design, stage logic, blood-moon timer

Rules kept: nothing existing is removed or changed in meaning; only additions and fixes. Day End data and reports are untouched (parity check must stay OK). The page background stays pure black with the section glow.

## Your answers (decisions)
1. WhatsApp/Email icon turns **green** if you pressed it OR Day End has a WhatsApp entry for that number.
2. Stage auto-update: **newest of last task / last note / manual move wins.**
3. Filigree: **strong in every box and header**; text you type into (inputs, textareas) gets a **subtler** version.
4. Moon timer: **phases follow shift progress** (new moon at start → full moon at end).

## 1. Deals / Contacts / Tickets — one shared layout
- One compact top row on all three: small icon tile + title (with the count beside it), search (max ~340px, not full width), Filters, + New, More. The big subtitle and wide capsule go.
- Second slim row: pipeline pills, Board/List toggle, links.
- Board is HubSpot-style: columns sit in a horizontally scrolling lane that fills the screen height, each column scrolls inside itself, sticky column headers, fixed column width (~270px) so nothing is cut in half, visible slim scrollbar.
- Tickets board uses exactly the same board, column, card and colour styles as Deals/Contacts.
- List view: **Rows** pop-up button (25 / 50 / 100 / 250 / All / type any number) plus Prev/Next page controls; remembered per view. Applies to Deals, Contacts and Tickets lists.

## 2. Stage order and colours (all boards, all sections)
Order: Lead → Interested → Demo Completed → Going Live → Closed Won All → No response → Waiting on Contact → Overdue → Churn → Closed Lost All.
Colours (cold to hot to done): Lead grey · Interested blue · Demo Completed amber · Going Live orange · Closed Won green · No response muted violet · Waiting on Contact teal · Overdue red · Churn deep crimson · Closed Lost dark rose.
"Waiting on Contact" exists in every pipeline (Deals, Contacts, Day End list, Analytics, Rules). Day End's own internal list is not reordered.

## 3. Auto stage
For each deal: collect (a) every Day End task with a stage (or whose note clearly implies one), (b) every note added on the deal, (c) the last manual move (now stamped with a time). The newest one sets the stage. Keyword reading of notes is conservative (demo / going live / interested / no answer / waiting / cancel / lost / paid-subscribed). A manual move holds until something newer arrives.

## 4. WhatsApp / Email icons in Deals
Fixed-width action column so every deal has the icons in the same place, on cards, list and the deal pop-up. Three states: black (not sent), green (sent), red (cannot send: no number / no email). Press = opens the app and marks it sent.
Tiles are the homescreen look: black squircle, thin bevel, crimson glyph.

## 5. Filigree design everywhere
Assets cropped from your images: filigree tile (from the clock widget), crimson glyph-texture (from the embossed icons), blood moon (from the moon artwork). Applied to: every card, column, stat tile, popup, toolbar, menu tile; headers and big numbers get the textured crimson text; inputs get a subtle version. Reduced-motion and phone performance respected (static images, no heavy filters).

## 6. Quick Add
Fix the leaking buttons (wrap/ellipsis/min-width 0 inside the panel).

## 7. Blood-moon timer
- Day End: the ring becomes a blood moon from your artwork. Phase = shift progress: new moon → crescent → quarter → gibbous → full. Time stays in the middle with a crimson glow; label says left / to start / **OVERTIME**; the other items stay.
- Other sections: a small floating moon pop-up (bottom-left by default, never over the content edge buttons), draggable, position remembered, a hide button appears on hover; a small tab brings it back. Hidden on Day End itself.

## Honest limits
Phases are drawn live on canvas from the texture, not 8 separate photos. Keyword stage reading is conservative so it never guesses wildly; unclear notes leave the stage alone.

## Checks
Parity OK; all suites; no overflow at 320/390/768/1280; Deals/Contacts/Tickets screenshots; moon phases at 0/25/50/75/100% and overtime; icon states; pagination custom number.

## Status (delivered)
Done: one-row toolbar and HubSpot-style board on Deals, Tickets and Contacts (equal 272px columns, each scrolls inside, lane fits the screen); Rows pop-up (25/50/100/250/All/any number) with Prev/Next on all three lists; new stage order and colours on Deals, Contacts, Analytics, Rules, Dashboard filters; auto stage (newest task / note / manual move); aligned call/WhatsApp/email tiles (black/green/red) on cards, list and the deal pop-up; filigree texture on boxes, headers and inputs (subtler); Quick Add leak fixes; blood-moon timer on Day End (phases, OVERTIME) and floating draggable pop-up elsewhere with hover-hide and a tab to bring it back.
Checks: test_v11 (28 checks), parity OK, all older suites pass, no overflow at 320/390/768/1280.
Limits: Day End's own internal stage list keeps its old order (Day End is untouched); Contacts keep their own stage logic (only the order/colours changed); Won Deals/Lost Deals frames keep their own look; moon phase edge is hard, not blurred.
