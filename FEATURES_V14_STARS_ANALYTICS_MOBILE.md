# Round 14
1. **Day End stars**: more at shift start (22 -> ~55), a few more at the end (170 -> ~200), slightly more twinkling. Same sparkle, not busy.
2. **Analytics fixed**: find why it fails, fix, and test it.
3. **Mobile check**: run every section at phone sizes (320/390), open records, popups, moon, Analytics; fix overflow or broken things.
4. **Moon stillness night sky (other sections)**: when the moon stays in one place for 5 seconds the page dims slightly and stars appear, fading from the moon outwards into darkness (soft radial mask, no visible circle). Star amount follows the moon phase. Moving the moon fades it away smoothly. Dark theme only, never blocks clicks.
Nothing existing is removed.

## Status (delivered)
1. Stars: ~55 at start, ~205 at the end, a quarter of them blink faster.
2. Analytics: it was a load-order race (the dashboard builder started before the dashboard it depends on was ready, so Analytics drew nothing). Both now wait until ready and retry. This also fixed the earlier flaky `sweep` and `colors` tests.
3. Mobile: all 9 sections at 320 and 390 wide have no overflow or errors; touch taps open records; moon drags by touch; the moon now sits above the round scroll button on phones.
4. Moon stillness: 5 s without moving -> the page around the moon dims slightly and stars fade in (more as the moon fills), fading out smoothly into the normal page; moving the moon fades it away. Dark theme only, off when reduced-motion is on.
Tests: test_v14 (11), v12 (28), v11, sweep, colors all pass; parity OK.
