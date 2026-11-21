# FEATURES_V6 — one colour language (plan, written before implementing)

Request (Abi): "I don't like the colors you added to everything. I want everything to look like the Day End Report headline design colors. Apply the same design to everything except the Day End Report — just the ones you implemented just now."

## What "Day End headline design" means
- Theme accent only: dark = red `--accent` / `--accent2`, light = blue / violet.
- Headline text: gradient from text colour to `--accent` to `--accent2`.
- Icon tiles and active buttons: gradient `--accent` → `--accent2`.
- Cards: soft accent tint (accent 10% → accent2 6% → transparent) over the card colour, 1px accent border at ~18%.
- No green / amber / blue / pink category colours.

## What changes (only the things added in the last rounds)
| Where | Before | After |
|---|---|---|
| Board column stripes (Tickets, Deals, Contacts) | green / red / blue / amber by stage name | one accent stripe + accent header text, same on every column |
| Dashboard tiles (top border) | 5 different colours | accent tint card like Day End, no coloured border |
| Dashboard builder widgets | 8-colour palette picker | accent only; picker removed (stored colours are kept but unused) |
| Task folders (dot, card edge) | per-folder colour | accent; colour swatches removed from the Folders tab |
| Automations cards, rule list | per-folder colour edge | accent edge |
| Won Deals Revenue & Renewals chips | red / amber / green | Overdue = solid accent, Due soon = accent outline, Later = muted |
| Titles (Dashboard, popups) | plain text | Day End gradient headline |

## Not changed
Day End Report itself, stored data (nothing is deleted; colours saved earlier are simply ignored), all features and behaviour.

## Tests
No coloured stripes left (computed colours of columns/tiles/widgets/folders all resolve to accent); sweep for overflow still 0; all existing suites pass.
