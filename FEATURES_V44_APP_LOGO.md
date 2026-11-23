# Round 44 – Your artwork as the app logo

Source: the blue clock-face artwork you sent, stored as `cloud/logo.png` (1254 px master, never modified).

## Where it is used
| # | Place | File | Status |
|---|-------|------|--------|
| 1 | iPhone/iPad home-screen icon ("Add to Home Screen") | `icon-180.png` (apple-touch-icon) | Done |
| 2 | Android / installed-app icon | `icon-192.png`, `icon-512.png` (in the manifest) | Done |
| 3 | Android adaptive (round/squircle) icon | `icon-maskable-512.png` – art shrunk to 78 % on black so no edge is cut | Done |
| 4 | Browser tab icon (PC and phone) | `favicon-16.png`, `favicon-32.png`, `favicon.ico` | Done |
| 5 | Installed-app splash / shortcuts / task switcher | same manifest icons | Done |
| 6 | Offline cache refreshed so the old icon is replaced | `sw.js` cache name `dayend-v2`; icon links carry `?v=2` | Done |

## Notes
- Icon only: no text added and no in-app header changes; the app's look is untouched.
- The art's background is black, so it sits cleanly on the black app theme.
- Phones cache home-screen icons: to see the new one, delete the old home-screen shortcut and add it again (browser tab icons update after a refresh or two).
- Generated automatically by `python3 tools/build.py --deploy deploy`, so future builds keep the logo.
