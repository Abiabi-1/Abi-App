# Round 34 – mobile fixes, HR rework, pipeline goals + conversion, Insights page, salary, Black palette, efficiency batch 3

Rules kept: nothing removed, only added/fixed; every feature applied everywhere applicable; same design everywhere; honest status filled in at the end.

## A. Your new requests
| # | Request | Plan | Status |
|---|---|---|---|
| 1 | Stars do not move on mobile; I like the desktop sparkle | find why mobile stops animation (reduced-motion / low-power / mobile branch); make stars twinkle and drift on phones |Done – global starfield twinkles/drifts on touch even with reduce-motion |
| 2 | Stars missing in other sections on mobile | stars layer for every section/iframe on phone widths |Done – new sky layer behind every section on phone |
| 3 | Delete clock in/out/break entries with two taps, no pop-up | first tap arms the delete button ("Sure?"), second tap deletes, disarms after 3 s |Done – two taps (arm, then delete); also schedule shifts, slips |
| 4 | No permanent X on moon on mobile; real double tap/click hides the moon | remove X on phones, dblclick/double-tap hides, a small way to bring it back |Done – X hidden on touch; double tap/click hides; tab brings it back |
| 5 | Attendance filled from Day End: edit shifts, put them on days of the week, off days; remove a shift on mobile | weekly schedule editor (Mon–Sun, each day shift or Off), edit/remove any filled shift |Done – Weekly schedule tab, off days, edit/remove shift, fill dialog per-day fill/off/skip |
| 6 | HR needs much more work on mobile; Save button in a bad place | HR sheet re-laid out for phones, sticky bottom action bar with Save |Partly – sticky save bar and bottom-sheet layout; HR top bar still crowded on small phones |
| 7 | Goal = close deals fast: Lead → Interested → Demo Completed → Going Live → Closed Won; show conversion rate | funnel + stage-to-stage conversion, time-to-close, shown in Analytics and Today |Done – funnel with stage-to-stage conversion in Analytics > Insights |
| 8 | Cannot scroll pipelines on mobile / not fully visible | horizontal scroll with snap, full width columns |Partly – stage jump bar, empty columns hidden; a real touch swipe scrolled in my tests, so the original problem was not reproduced |
| 9 | List checkbox looks odd | themed round checkbox used everywhere |Done – round themed checkbox |
| 10 | Improve automations | more triggers/actions, run history, test, folder tools |Not improved this round (only the 6 templates from Round 32) |
| 11 | Copy buttons and some buttons leak on mobile | audit every row/card at 320–430 px, fix overflow |Partly – overflow scan found no leaks at 320–430 px; button layouts tightened |
| 12 | Salary slip tracking | Salary section: monthly slips (basic, allowances, deductions, net), attach photo of slip, totals and chart |Done – Salary slips tab (gross/deductions/net, photo kept on this device only); no chart |
| 13 | Compression issues | audit tight layouts on phone and PC and fix |Partly – banner, shift fields and list rows compacted |
| 14 | Quick add available on mobile | floating quick-add button on phones |Done – floating quick-add button on phones |
| 15 | Bulk assign and other HubSpot bulk tools | bulk owner/stage/tag/follow-up/delete on selected deals and contacts |Done – bulk owner, follow-up date and log call added to the bulk bar |
| 16 | Black palette: gradient black = current black; pure black as page background; boxes identifiable, blended | new layered surfaces: page #000, cards current dark, subtle edge glow |Done – page #000, cards/panels/inputs in layered near-black with edge ring; palette scan clean |
| 17 | Insights as a page/section in Analytics, not a pop-up; new areas consistent | Insights, Today, Follow-ups, Salary become sections with the hub design |Partly – Insights is now an Analytics section; Today still opens as a pop-up |

## B. Suggested features you approved
| # | Feature | Status |
|---|---|---|
| 1 | Auto-complete from history |Done |
| 2 | Smart defaults by time of day |Done (chips reorder by time of day) |
| 3 | Entry templates (one tap fills a common call) |Done |
| 4 | Paste a list → many entries |Done |
| 5 | Recent contacts strip |Done |
| 6 | Duplicate merge |Not done |
| 7 | Daily start screen |Done |
| 8 | Escalation colours for overdue |Done (overdue badge) |
| 9 | Recurring tasks |Done |
| 10 | Promise tracker |Done |
| 11 | Snooze with time of day |Not done |
| 12 | Conversion funnel |Done |
| 13 | Lost-reason tracking |Already existed |
| 14 | Best hours to call |Not confirmed this round |
| 15 | Plan and price mix |Not confirmed this round |
| 16 | Monthly goals/targets |Done (goals day/week/month) |
| 17 | Compare months |Existing monthly report from Round 33 |
| 18 | Template variables |Done |
| 19 | Email composer from templates |Done – built, only lightly tested |
| 20 | Follow-up message suggestions |Done – built, only lightly tested |
| 21 | Birthday/renewal greetings |Not done |
| 22 | Call outcome buttons on every deal row |Partly – in the call-back queue, not on every row |
| 23 | Missing-info finder |Existing health check (Round 33) |
| 24 | Number format cleaner |Not done |
| 25 | Per-deal edit history with restore |Not done |
| 26 | Import from Excel/CSV |CSV done; Excel (.xlsx) not done |
| 27 | Backup reminder |Already existed |
| 28 | Swipe actions on rows |Not done |
| 29 | One-hand mode |Not done |
| 30 | Home-screen shortcuts |Done (shortcuts + ?go=) |
| 31 | Command palette (Ctrl+K) |Done |
| 32 | Global search |Already existed |
| 33 | Team features (manager view, shared ownership, roles) | |

Items 33 needs real accounts and permissions and is not planned. Not planned: team features (#33).
