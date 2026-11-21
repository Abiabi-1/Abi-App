# Round 10 — "Blackout" design: your homescreen look applied to the whole CRM (md first, then implemented)

## 0. What you said (checklist — every line must be true at the end)
1. Round 9's grey-black surfaces are ugly → **pitch black (#000) wherever black is used. No grey blacks.**
2. Keep the red-and-black gradient, but **not everywhere** (soft ambient glow only, never as card fills).
3. **Top bar blends with the section** you are in; when you switch, bar + glow + the selected tab name all blend into the new section.
4. **Navigation menu works like Quick Add**: slides in, **compresses the rest of the screen**, everything stays usable while it is open. More blended with the page.
5. Research what makes a UI more appealing/satisfying and apply it.
6. Day End Report stays as it is (liked); everything else must look better.
7. Use the **homescreen design** (6 pictures) everywhere: black squircle tiles, thin bevel edge, embossed crimson filigree glyphs, moon-red glow, frosted dock/search pill.
8. Replace the small **WhatsApp / call / email icons in Deals** with icons in the same style (feature kept).
9. Manly but really attractive. All features kept (no removals, no logic/data/sync changes).

## 1. Research → decisions (sources: DEV "8 CSS properties that make dark UIs feel premium"; Superhuman "How to design delightful dark themes"; saasui.design CRM dashboard patterns)
| Finding | Decision |
|---|---|
| Translucent borders beat solid greys: `rgba(255,255,255,.08–.12)` | all card/input borders are white-alpha, `.09` normal, `.16` interactive; red rim only for active/selected |
| Shadows are invisible on pure black, so depth must come from light | depth = 1px inner top highlight + bevel edge + faint top-light gradient + crimson glow on important things |
| Faint top-to-transparent gradient reads as light on the top edge | cards: `linear-gradient(rgba(255,255,255,.028), transparent)` on `#000` (no grey fill) |
| Superhuman advises #010101 over #000 for OLED smear; **you asked for the blackest black** | page and cards stay **#000** (your choice wins; the screenshots show your homescreen is #000 too) |
| Accent in dark: slightly less light, keep hue | crimson `#e0303f` (small highlights), deeper `#8f0d19` for big areas |
| CRM pattern: KPI strip above the fold, kanban with stage totals, overdue/at-risk highlighted, drill-in without page loads | already present; keep red for truly critical (overdue) only |
| Motion with weight: custom easing | `cubic-bezier(.22,1,.36,1)` everywhere, 180–280 ms, reduced-motion respected |

## 2. Design language (taken from your pictures)
- **Tile** = black squircle (radius ≈ 30%), 1px bevel (brighter top-left, darker bottom-right), faint damask ornament, a **crimson glyph embossed with speckled texture + soft red rim light**. Used for: page header icons, side-menu icons, contact/WhatsApp/mail buttons, empty states.
- **Widget** = large squircle (radius 22px) black with bevel and a faint ornament corner. Used for: cards, KPI tiles, kanban columns.
- **Wallpaper** = pure black with a **dark-crimson moon glow** (soft, mid-screen) and a hint of plum at the bottom; per-section placement so switching feels alive.
- **Dock / search pill** = frosted, translucent, thin light border → top bar tabs, toolbar, Quick Add, menu panel.
- **Typography** unchanged (Sora; JetBrains Mono for numbers/labels).
- Shape family: cards 22px, controls 13px, chips pill. Primary button = crimson gradient with top highlight; secondary = black bevel.

## 3. Top bar blends with the section
- Bar becomes **transparent** (no strip, no line). One fixed ambient layer sits behind bar + page, so the glow flows through the bar.
- Each section has its own glow placement (Day End matches its own top glow so the seam is invisible; Dashboard left-leaning; Analytics right; Deals centre; Lost dimmer rose; Tickets right; Contacts left; Tasks right). Layers cross-fade (600 ms) on switch.
- The sliding **selected-tab pill** becomes a black glass pill with a crimson rim and soft glow — the same material as the page tiles — and glides to the new tab while the glow cross-fades.
- Section panels (Dashboard, Analytics, Deals, Lost, Tickets, Contacts, Tasks) become transparent so the ambient layer shows; Day End / Won Deals frames are untouched.

## 4. Navigation menu = Quick-Add-style, non-blocking, compressing
- No dark backdrop, nothing blocks clicks. Panel slides from the left; on screens ≥ 760 px the **bar, notice bar and page shift right by the panel width** (smooth), so the page is squeezed, not covered. On phones the panel overlays but the rest stays tappable.
- Stays open while you navigate on desktop (close with ✕, Esc, or the menu button); on phones it closes after you pick a section.
- Pure-black panel, bevel edge, red glow at the bottom, **each item has a tile icon** like the homescreen; active item = crimson rim glow. Drop-down arrow for Deals (Contacts, Tickets) kept.

## 5. Appeal & satisfaction features (all visual / motion only)
1. Cursor **spotlight** on cards/tiles (soft crimson light follows the pointer).
2. Section **entrance** (cards rise in with a 40 ms stagger when you switch section, not on every re-render).
3. Dashboard KPI **count-up** (first show only; final text identical; off with reduced motion).
4. Bevel/inner-highlight on every control; press-down scale on buttons; focus ring in crimson.
5. Embossed crimson **glyph tiles** for headers, menu, contact actions.
6. Frosted **toolbar/search** pills.
7. Calm empty states with tile icon.
8. Stage colour dots on kanban headers (kept), thin tone stripes.
9. Selection and scrollbar tinted to the accent.

## 6. Deals contact icons
`📞` and `💬` (and the text links "WhatsApp"/"Mail" in the template list, plus the email link) become 34 px black bevel tiles with crimson glyphs (phone, WhatsApp bubble, envelope). Same `href`s, same `title`s, same behaviour; larger tap area; the template row keeps a text label next to the icon.

## 7. Files touched / rules to avoid mistakes
- Tokens at source: `style-01-hub-shell.css`, `style-02-hubPolishStyle.css`. New layer `style-08-blackout.css` loaded after style-07 (the visual rules). New `script-27-ambient.js` (ambient layer, section class, entrance, spotlight, count-up hook). `script-24-nav.js` (panel behaviour + markup), `script-13-deals.js` (icons markup only), `script-17-dashboard.js` (count-up hook).
- No change to: storage keys, handlers, IDs, data, sync, import/export, Day End/Won Deals frames, routes.
- Light theme: keeps working with its own soft surfaces; ambient layer is off in light.
- Verify: parity (Day End unchanged), sweep 0 issues, all suites, screenshots at 320/390/768/1280 dark + light, seam check of bar vs Day End.
- Known limits stated up front: chart tooltips remain native; iframe sections (Day End, Won Deals) keep their own backgrounds, so only the bar blends with them (matched glow), not the page itself.

## Status (delivered)
- Pure #000 everywhere in dark mode (page, bar, cards, inputs, popups); depth comes from thin white-alpha bevels and glow, not grey fills.
- Red/black gradient only as a soft per-section ambient glow, red-moon style; the top bar is transparent so it blends with the section, and the selected tab is a black-glass pill with a crimson rim.
- Navigation is now a Quick-Add-style panel: no dark backdrop, the page compresses beside it on desktop and stays usable while it is open; on phones it overlays and closes after a pick.
- Homescreen-style glyph tiles on section headers, the menu and Deals; Deals call/WhatsApp/email are now proper tiles with line icons.
- Spotlight on cards, entrance stagger, count-up numbers, frosted toolbars. Reduced-motion respected.
- Nothing removed; Day End Report logic untouched (parity OK).
- Honest limits: native chart tooltips keep browser styling; Day End and Won Deals frames keep their own backgrounds (matched by glow at the seam); cloud test is timing-flaky in this sandbox.
