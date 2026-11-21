# Round 31b – MDV button placement and "apply to all boxes"

| Request | Done |
|---|---|
| MDV button outside the text box, next to + Note | MDV now sits in the same row as **Copy notes** and **+ Note** (Day End form, quick add, extra-number rows, and a small row under the number box in the Deals Tracker). Invisible until you hover that row; highlighted red when ON. The floating button inside the box is gone. |
| When toggled ON it applies to all number boxes | Turning it on instantly reformats every number box already filled (first number, extra numbers, quick add, other frames/pages) – 7 digits → +960-777-7777. Notes are never touched. Turning it off leaves everything as typed. State is remembered and shared between Day End, Deals and the main page. |
| Extra | Tools menu entry "MDV number format (on)" to switch it from anywhere. |

Tests: tests/test_v31.py (placement, hover, off/on bulk apply, notes untouched, memory, Tools entry). Nothing deployed to Netlify/Vercel.
