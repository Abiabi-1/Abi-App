# Round 23 – Same headings, bulk select everywhere, HubSpot gap list

## Delivered this round
1. **One heading format** in every section (Dashboard, Analytics, Deals, Tickets, Contacts, Tasks, Lost Deals): red title, same size/weight/font, same muted subtitle line. (Checked by test: identical computed style in all 7.)
2. **Search icon removed** from the top-bar Search button (label only). On phones, where the labels are hidden to save space, the icon stays so the button is not empty.
3. **Bulk select follows the palette.** Checkboxes, selection highlight, bulk bars and dialogs all use the current colour.
4. **Bulk actions**
   - Deals (list view): Create tasks, Add note, Set follow-up, Mark WhatsApp sent, Export, plus the existing Move stage, Add tag, Delete.
   - Contacts, Tickets, Lost deals: new **Select** button in the toolbar. Tick rows (or click a row), then Create tasks, Add note, Add follow-up / Set due date, Export, Select all, Clear. (Lost deals: Create tasks + Export, since Day End owns those records.)
   - Tasks: new **Select** button. Complete, Reopen, Set due date, Priority, Move to folder, Create follow-up tasks, Delete (two-step), Select all shown, Clear.
   - One shared dialog (today/tomorrow/+1 week date shortcuts).

## HubSpot comparison – what HubSpot has that is missing here
Based on HubSpot's own bulk-edit help page and Sales Hub feature summaries.

**Bulk / editing**
| HubSpot | Here |
|---|---|
| Bulk **Assign owner** | Missing (no owners/users yet) |
| Bulk **Edit one property** (stage, plan, billing, price, any custom field) | Only stage + tag for deals; missing for contacts/tickets |
| Multi-select property: append / replace / remove | Missing (tags: add only, no remove) |
| Bulk **Delete** that can be restored | Deals only (to Trash); not Contacts/Tickets/Tasks bulk-delete-to-Trash |
| "Select all N records" across pages | Missing (selects what is shown) |
| **Edit cells in the table** (click a cell, type, copy down) | Missing |
| Edit associated records inline under a row | Missing |
| Bulk edit in **board view** | Missing (list only) |
| **Import to update** existing records by ID/email | Missing (import only creates) |
| Add to **static list/segment** | Missing (no lists yet) |
| Enroll in sequence / workflow | Missing |

**Filtering / views**
- Saved **views** per object with their own columns, filters and sort (here: saved filters on Deals only).
- Pick and reorder **table columns**, sort by any column, freeze first column.
- Filter by **associated** records ("contacts whose deals are Interested"), AND/OR groups, "is known / unknown", relative dates ("last 30 days").
- Active **lists/segments** that update themselves.

**Sales tools**
- **Sequences** (timed multi-step follow-up with auto-stop on reply), **email templates + snippets**, meeting scheduler link, call logging with outcome, deal **forecast** (weighted pipeline), **quotes**, lead scoring, playbooks, deal-stage **required fields**, deal rotting/aging alerts, **workflows** (if X then do Y), **duplicate management** (we have review duplicates), custom/calculated properties, roles & permissions, audit log, mobile app, notifications.

## Features I recommend next (with rough effort)
**High value, small–medium**
1. Bulk **edit any field** for Deals/Contacts/Tickets (stage, plan, billing, price, tags add/remove) with "undo last bulk action".
2. **Select all N** (across the whole filtered list), then act.
3. Bulk delete to Trash for Contacts, Tickets, Tasks (restorable, like HubSpot).
4. **Stuck filter** in Deals + "no follow-up set" filter; show stuck days in list rows.
5. **Column picker + sort** in every list (Deals, Contacts, Tickets, Lost).
6. **Saved views** for Contacts, Tickets, Tasks, Lost (same as Deals' saved filters).
7. **Templates**: WhatsApp / email templates with {name} {deal} {plan}, one tap from record page and bulk ("send template to selected" opens WhatsApp one by one).
8. **CSV import wizard** with column mapping, duplicate skip, and "update existing" mode.
9. **Required fields on stage change** (e.g. moving to Closed Won asks for plan, billing, price).
10. **Overdue / due-today reminders** (in-app banner + optional browser notification).

**Medium**
11. **Workflows light**: rules like "Stage = Demo Completed → create task in 2 days", "No activity 7 days → tag Stuck".
12. **Lists** (static + live) that you can bulk-add to and filter by; used in export and Today.
13. **Forecast**: weighted pipeline value by stage, expected this month vs goal.
14. **Activity log / undo history** (who/when for each change; one-tap undo).
15. **Owners** (even for a small team): assign, filter "my deals", bulk assign.
16. **Duplicate prevention at entry** (warn when a number already exists, merge on the spot).
17. **Table cell editing** (click to edit stage/plan/price right in the list).
18. **Calls**: log outcome (no answer / spoke / voicemail) with duration; call list for the day.
19. **Customer health / renewal board** for won deals (renewal date, last contact, risk tag).
20. **Reports on speed**: time in stage, first-response time, win rate by plan/source.

**Quality / safety**
21. Automatic **daily backup reminder + one-tap restore point** list (not only manual files).
22. **Search everything** results grouped by type with keyboard navigation (already Ctrl+K; add filters).
23. **Light-theme pass**, empty states, skeleton loaders, accessibility (focus rings, labels).
24. **Phone**: pull-to-refresh, swipe to complete a task, bottom action bar on records.

## Still open from earlier rounds
WhatsApp/Email templates, CSV import wizard, empty states, light-theme pass, Stuck filter in the Deals filter pop-up (see items 4, 7, 8, 23).

## Verified
`tests/test_v23.py` (headings identical, search icon, bulk in Contacts/Tickets/Tasks/Deals incl. creating tasks and palette-coloured checkboxes), all older suites and parity pass.

Sources: HubSpot Knowledge Base "Bulk edit records" (knowledge.hubspot.com/records/bulk-edit-records); ZoomInfo "HubSpot Features: A Complete Breakdown in 2026" (pipeline.zoominfo.com/sales/hubspot-features).
