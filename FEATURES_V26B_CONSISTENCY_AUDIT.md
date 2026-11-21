# Round 26b — Consistency audit: do the new features behave like the rest of the app?

Checked every Round 25–26 feature (time clock, moon-card clock strip, adjust-time dialog, HR & Time overlay and all its dialogs, call log / renewals board / speed report panels, saved views, column picker, owners, tracker) against what the rest of the app already does.

| App-wide behaviour | Before this audit | Now |
|---|---|---|
| 7 colour palettes change everything | HR/clock/dialogs followed the palette, but the HR overlay had no colour button and the palette popup would have opened *behind* it | 🎨 Colours button inside HR & Time; popup always on top; scan of all 28 HR tabs, dialogs, clock sheet, reports and the Day End clock strip in every palette: no leftover red |
| Status colours | Calendar “missing clock-out” and “no record” used fixed red | Missing = amber, no record = dashed grey, so nothing red remains in non-red palettes |
| Light theme | Several greys and the warning box were too faint on white; one heading was hard-coded red | Light-theme rules for every HR element; headings follow the palette colour; contrast check (≥ 2.6:1) passes on 11 tabs + dialogs |
| Light/Dark switch | Only inside Day End | ◐ Theme button inside HR & Time |
| Moon and its light, night sky | Hidden behind the full-screen HR page | Moon, moon-light and night layers stay above the HR page |
| Same-format headlines | New headings used their own style | HR titles, section headings, dialog titles use the shared headline style |
| Palette-coloured check boxes | Default white boxes in HR/dialogs | Same palette-coloured boxes as Deals/Contacts bulk select |
| Calm mode | n/a | HR background glow switches off in calm mode |
| Search bar without icon | Applied | HR search boxes are plain too; HR items are found by global search with group chips |
| Keyboard shortcuts | `G then D/H/A/C/T` | Added `G then R` (HR & Time) and `G then K` (time clock); both listed in the `?` help |
| Phone layouts, no sideways scroll | Tested | Re-tested at 390 px for every tab, dialog and report |
| Backup / Restore, restore points | Covered by `hub_` keys | Confirmed: HR data, views, owners, sort/columns included. (Attached document files stay on the device) |
| Cloud sync (phone + PC) | **Not synced: HR data would have stayed on one device** | HR data, saved views, owners, templates, lists and goals now sync like Day End and Deals |
| Exact time | Added | Also shown in call log, tracker, audit, signatures |

**Not applied (honest):** the engraved filigree/texture background of Day End and Won Deals is not used behind the HR page (it keeps a plain black page with a soft palette-coloured glow); the Contacts column picker only exists for real tables.

Tests: `tests/test_v26c.py` (palette scan ×7 on PC, ×3 on phone, popup over overlay, moon over overlay, light-theme contrast, shortcuts, no page errors).
