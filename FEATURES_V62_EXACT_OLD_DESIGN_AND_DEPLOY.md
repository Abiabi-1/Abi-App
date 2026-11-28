# Round 62 – The exact old design in every section, merge and deploy

Request (28 Nov 2026): *"Check the old file and implement the exact design colors for all sections … you have the permission to merge with the main branch. Just write a md for everything and deploy. Right now the design isn't the same as before."*

## 1. What was different (old app measured in the browser, same data, PC 1280 px and phone 390 px)
| Part | Old app (measured) | New app before this round |
|---|---|---|
| Page background | Black, with a soft crimson glow behind each section (`rgba(134,10,26,.22–.30)`, a different spot per section), plus a faint plum glow bottom-right | Plain black |
| Cards, board columns, data boxes | Filigree artwork showing through a dark veil (`rgba(0,0,0,.40→.66)`). Light rim: border `rgba(255,255,255,.09)` plus a light inner edge top-left. Corners 22 px on cards and columns, 16 px on boxes and small cards | Flat near-black, red-tinted border, 12–14 px corners |
| Page title | 24 px, weight 800. The filigree shows through crimson letters (`rgba(254,89,104,.7)` over the second artwork, “glyph”) | Gradient text, 23 px |
| Column / card titles | Board column titles use the same crimson artwork lettering. Card titles are white, 14.7 px, weight 900 | Small grey pills |
| Buttons | Bordered, rounded 13 px: `rgba(255,255,255,.03)` fill, `rgba(255,255,255,.12)` border, white 600 text | Borderless glowing text |
| Main button (+ New …) | Crimson gradient `#e12a39 → #860a1a`, light top edge, soft crimson shadow, 13 px corners | Round pill, pink gradient |
| Chips / day filters | Pill with a light border. Selected: crimson fill `rgba(229,48,63,.18–.2)` and a `#e12a39` border | Borderless |
| Board / List switch | Mono pills with a light border. The selected one has crimson text | Glow text |
| Search boxes, drop-downs | Black with a faint filigree (`.84→.92` veil), border `rgba(255,255,255,.12)`, 13 px corners (drop-downs fully round), inner shadow | Plain dark, 10 px |
| Data box labels | Mono, uppercase, 10.9 px, letter-spaced, `#756a6d` | Same style in a different grey |
| Section labels (“YOUR DAY”) | Mono, uppercase, `#ff8791`, with a line after | Bold white heading |
| Bars | 9 px, rounded 6, `#860a1a → #e12a39` | 8 px, lighter gradient |
| Pills | Coloured outline plus a light fill of the same colour (amber, green, red …) | Fill only |
| Pop-ups / notices | Black, crimson border `rgba(229,48,63,.6)`, crimson glow | Similar |
| Text colours | `#f4eded` / `#ab9fa2` / `#756a6d` | `#f4eded` / `#ab9fa2` / `#7c7173` |

## 2. What this round does
- A new stylesheet (`ui/oldlook.css`) applies all of the values above to the shared parts of every section:
  - Dashboard, Analytics, Deals, Lost Deals, Tickets, Tasks;
  - HR & Time, Tools, Automations, Settings;
  - sheets / pop-ups, the Quick Add sheet and the search sheet.

  Because each section is built from the shared parts, every section takes the old look at once. Day End and Won Deals already use the old pages' own styles (Rounds 58 / 59) and are not changed.
- The second artwork of the old app (“glyph”, used for the crimson lettering) is added as `gly.jpg`. The filigree is the same file as before.
- The section glows follow the old positions: Day End / Won Deals top centre, Dashboard top left, Analytics top right, Deals centre, Lost Deals left, Tickets right, Tasks right of centre. Every other section gets the Dashboard glow.
- The colour palettes still work: everything uses the palette colours, so Deep blue, Deep green and the others re-tint it as before.
- Light theme: you pick it yourself (never automatic). The textures are turned off there, as in the old app's light theme, and the rest follows.
- Phone: the same look. The bottom bar stays the copy of the top bar (24 Nov decision).

**This replaces the 24 Nov “borderless design bases” for sections other than Day End and Won Deals.** You asked for the design to be the same as before, so buttons have borders again, as in the old app.

## 3. Merge and deploy
- The branch `claude/app-rebuild-sync-fixes-ozrbm2` is merged into `main` (you gave permission).
- **Deploy:**
  - The new app becomes the site's main page: the build is copied to the repository root (`index.html`, `assets/`, `sw.js`, icons).
  - The old single-file app is kept at `old/index.html`, so nothing is removed and you can still open it.
  - `config.js` (your Supabase settings) is kept, and the new app reads it.
  - Your data carries over by itself: the new app reads the old app's saved data on the same site the first time it opens.
- Hosting:
  - If the site is connected to the GitHub repository (for example Netlify linked to `main`), it deploys on its own after the merge.
  - If you upload the folder by hand (Netlify drop), use the `abi-deploy-new.zip` attached (the repository root without the source code).

## Status
**Done, merged into `main` and pushed. The site files in `main` are the new app.**

I can't see where your site is hosted, so whether it is live depends on your hosting:
- If it is linked to the GitHub repository, it updates on its own from `main`.
- If you drag the folder in by hand, use `abi-deploy-new.zip`.

Not tested on a real iPhone.

| Part | State |
|---|---|
| Old design on every section (§1 / §2) | Done. A new test (`look62`, 39 checks) checks the measured old values on Dashboard, Analytics, Deals, Lost Deals, Tickets, Tasks, HR, Tools, Automations and Settings: title lettering, textured cards with the light rim, section glow, main button, bordered buttons, search box, board columns with the old stage dot colours, data box labels, bars, selected period. It also checks the light theme. |
| Exact crimson colours | The crimson palette was built with a colour formula and came out one step off the old colours (`#e02938` instead of `#e12a39`). It now uses the old exact values, including the old glow colour `rgb(229,48,63)`. The other palettes are unchanged. |
| Board column titles | Back as before: a coloured dot with a glow, in the old colours per stage (Lead grey, Interested blue, Demo Completed amber, Going Live orange, Closed Won green, No response violet, Waiting on Contact teal, Overdue red, Churn rose, Closed Lost wine), and crimson lettering. |
| Phone | Checked at 390 px: no sideways scroll; the Deals and Tickets controls stay on one line. |
| Deploy | `app/tools/deploy.sh` copies the build to the site root, keeps `config.js`, and keeps the old app at `old/index.html`. A check on the deployed root confirms: the new app opens, the old data on the same site carries over, the old design is applied, and the old app still opens at `old/`. |
| Tests | `look62` 39, `r61` 39, `ui` 52 (its old “borderless buttons” check is replaced by the old bordered-button rule), `won_look` 31, `dayend_look` 33, `smart` 29, `sync` 16, `parity` 5, `import` 4. All pass. |

**Notes (honest):**
- **First visit after deploy:** the old app's offline cache may show the old page once; the next reload shows the new app. The new app checks the network first, so this happens only once.
- **The red “stars” in the old screenshots** are the night sky that appears after the moon rests for 5 seconds. The new app has this too (Round 58), so it is not part of the colour changes.
- **Old top bar:** the old app showed text labels next to some top-bar buttons (Search, Smart text, Backup …); the new bar has icons there. Its colours and the glow of the active tab now match. I kept the 24 Nov bar layout; say if you want the labels back.
