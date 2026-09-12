---
name: SVG chart typography
description: How to keep typography visually consistent between Recharts and fixed-viewBox SVG charts.
---

Typography shared between Recharts and a fixed-viewBox SVG must be compared by its rendered glyph size, not by the numeric SVG `font-size` attribute. Define the visual targets in CSS pixels and convert them to viewBox units using the live card content width.

**Why:** A 1000-unit SVG rendered in a roughly 400px card scales its text to about 40%. A stale initial width can make two charts use the same family and nominal token while still looking substantially different.

**How to apply:** Measure the card with `ResizeObserver`, calculate `viewBoxWidth / cardWidth`, and multiply CSS-pixel targets by that inverse for SVG text. Verify font family, weight, and rendered bounding-box height against the corresponding Recharts labels.