# Round 22 – Moon colour follows the palette everywhere

## Problem
With some palettes the moon (Day End and the other sections) stayed red, or switched colour and then went back to red when moving between sections.

## Cause (found by reproducing it)
1. The palette code first applied colours instantly, then applied the re-tinted artwork. When the tinted artwork was already cached (every section/frame load after the first), the artwork was applied first and then immediately overwritten by the instant step, which put the original red moon picture back.
2. The moon only reloaded its picture when the old one had finished loading, so a change during loading was lost.
3. Rapid switching let an older, slower palette finish last and overwrite the newer one.

## Fix
- The instant step no longer touches the moon picture once a tinted one exists.
- Each palette change gets a sequence number; stale results are ignored.
- The moon reloads its picture whenever the requested one changes, even mid-load, and queued redraws are kept.

## Verified
`tests/test_v22_moon.py`: for all 6 non-red palettes, the moon colour in Day End and the hub moon is checked after a fresh load with the palette saved, while going through sections, after rapid switching, and after switching from another palette. 0 failures. Earlier suites and parity pass.
