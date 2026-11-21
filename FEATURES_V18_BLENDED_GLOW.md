# Round 18 – blended moon glow (Day End + other sections)
Realistic reference: a blood moon has (1) a soft bloom hugging the moon, brightest next to the limb and fading fast, and (2) a wide faint atmospheric haze that melts into the dark. Together they read as one blended glow with no edge.
Implementation: two smooth gaussian layers added together (bloom: warmer red, tight; haze: deeper red, wide), both scaled by the moon phase (new moon barely glows, full moon glows most). Both reach exactly zero at the canvas edge so there is no ring. Applies to the Day End moon and the floating moon. Nothing else changes.

## Status (delivered)
Bloom (warm, wide) + haze (deep red, very wide) added together, scaled by phase, both fade to zero. Day End and floating moon. Parity OK, v12 passes.
