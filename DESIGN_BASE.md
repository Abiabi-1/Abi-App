# Abi App – Design Base (living reference)

Learned from the real CSS and from computed styles of the live app. Every new feature must start from this table; the audit `tests/test_v40_design.py` checks it.

## 1. Identity
Black + red "filigree" look. Palettes only change the accent family (`--t1…--t4`, `--accent`, `--accent-rgb`); never hard-code a red/blue. Light theme (`:root[data-theme=light]`) swaps surfaces and text but keeps the same shapes. The moon works on every screen.

## 2. Tokens (use these, not literals)
| Purpose | Token |
|---|---|
| Accent / hover / active | `var(--accent)`, `rgba(var(--accent-rgb), .x)` |
| Surface (cards, popups) | `var(--card-solid)` (black dark / white light), tinted `var(--card)` |
| Borders | `var(--border)` (quiet, accent-tinted .16), `var(--border-strong)` (popups, active .40) |
| Text | `var(--text)`, `var(--text2)` (labels), `var(--text3)` (captions) |
| Status | `--green`, `--amber`, `--rose` (done / warning / unable) |
| Shadow | `var(--shadow)` for floating things |
| Motion | `var(--ease)` |

## 3. Type
- Sora: all text, headings, buttons (primary).
- JetBrains Mono: numbers, chips of state, inputs, counts, phone numbers.
- Sizes: caption/label `.62–.66rem` uppercase `letter-spacing .06–.1em` (`--text3`); chips `.68–.76rem`; body `.8–.9rem`; big numbers `1.7rem` mono bold.

## 4. Shapes
| Element | Radius | Border |
|---|---|---|
| Chips / pills / tabs / segmented | 999px | 1px `--border`; active = accent border + `rgba(accent,.12–.2)` fill |
| Inputs / selects / small buttons | 9px | 1px `--border` |
| Tiles, sections, rows | 8–12px | 1px `--border` (rows: none, tinted fill) |
| Cards / blocks / popups | 12–16px | 1px `--border` / `--border-strong` (popups) + shadow |
| Moon | 50% | none |
Primary button (`btn-add`): accent gradient, white text, glow shadow, 9px radius. Buttons are compact: padding ≤ 9px 18px, never full-width pills unless on phone forms.

## 5. Layout rules
- No horizontal page overflow at 390 px (`scrollWidth ≤ innerWidth`).
- Groups of tiles of one kind have **equal size** and scroll sideways like the Pipeline when they do not fit (flex row, fixed width, `scroll-snap`).
- Popups sit above everything (`z-index ≥ 2147483000` for tool overlays), have `--card-solid`, 1px accent border, radius 12–14px, `max-height` with inner scroll, never covering the box being typed in.
- Tap targets: chips can be small on PC but ≥ 28 px high on phone only if they are the main control; do not enlarge helper chips.

## 6. Scrollbars (Round 40)
Glass: transparent track, no lines, no arrows, a thin translucent rounded thumb (white at ~25 % in dark, navy at ~28 % in light), slightly stronger on hover. Same everywhere (hub, Day End, Won Deals, popups, lists, boards). Intentionally hidden bars (`scrollbar-width:none`, tab strips) stay hidden.

## 7. Component recipes (copy these)
- **Helper chip** (quick notes, templates, contact row, filters): pill, Sora `.68rem`, 1px `--border`, transparent, `opacity .8`; hover accent border; `.on` accent border + `rgba(accent,.2)`.
- **Popup**: `position:fixed`, `--card-solid`, `1px solid var(--accent)`, `border-radius:14px`, `--shadow`, close on outside tap/Esc.
- **Tile**: `--card-solid`, 1px `--border`, radius 12, padding 12×14, caption (label) + big mono number.
- **Row in a tile**: rounded 8, tinted fill `rgba(255,255,255,.05)` (light `rgba(20,30,60,.04)`).

## 8. Naming/collision rules
New features use their own prefix (`q39-`, `cx-`, `qe-`, `dp-`) and never reuse an existing class. Shared helpers come from `tools/*.tpl.js` through `make_assets.py` so all three documents (hub, Day End, Won Deals) get identical behaviour.

## 9. Checklist for any new feature
Works in dark + light + every palette · phone 390 px and PC · moon/popup z-order · no overflow · no duplicate rows · state survives re-render · same feature appears in Day End form, Day End Quick Add, Won Deals form, Won Deals Quick Add and hub where it makes sense · listed in `FEATURE_LIST.md`.
