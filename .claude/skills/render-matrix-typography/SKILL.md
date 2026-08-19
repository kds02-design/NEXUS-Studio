---
name: render-matrix-typography
description: Render flat monochrome typography shapes from Typecore Sovereign or Breeze into material-rich title artwork using the user's local Render Matrix logic. Use for 렌더 메트릭스, 타이틀 렌더링, 재질 렌더, 금속 타이틀, bevel, PBR, or when a flat Typecore title must become a finished game title without changing its letterforms.
---

# Render Matrix Typography

Render only after Typecore has produced a clean flat monochrome title shape.

## Workflow

1. Read `references/engine-map.md` before selecting a material direction.
2. Require a perfectly separated base: one solid foreground color, transparent or pure contrasting background, no bevel, outline, gradient, shadow, glow, texture, or internal colored fill.
3. Reject bases with cyan/teal/magenta fringe, filled counters, changed Hangul, or merged background pixels.
4. Run `node scripts/build-render-brief.mjs --input <path> --concept "..." --output <path>`.
5. Render with strict shape lock. Treat the input alpha silhouette, counters, spacing, line breaks, and every Hangul syllable as immutable.
6. Default to Render Matrix `Locked` edit budget, `Telephoto`, `projectionDepth=None`, restrained FX, and material/surface changes only.
7. Send black-background light passes through Mask Forge effect transparency before compositing.
8. Verify against the flat base using identical canvas dimensions and occupancy. Reject any changed outline or counter.

Keep rendered body and light effects separate when Figma or PSD compositing is requested.
