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
5. Apply the selected Render Matrix preset and compile its base NanoBanana prompt.
6. Run Render Matrix AI optimization on the compiled prompt. Preserve the negative-prompt section and all shape-lock, framing, single-composition, and depth constraints verbatim.
7. Render the optimized prompt with the Pro image model (`gemini-3-pro-image-preview` unless the configured Pro model changes). Treat the input alpha silhouette, counters, spacing, line breaks, and every Hangul syllable as immutable.
8. Default to Render Matrix `Locked` edit budget, `Telephoto`, and restrained FX. For banner presets use `projectionDepth=Flat2D` with front-face bevel/carving only, plus `enableShadow=false`, so no rear extrusion, side walls, offset silhouette, or backing shadow can appear.
   For banner-production title renders, request `1K` output by default; use 2K/4K only when the user explicitly asks for a larger source.
   When evaluating multiple presets, render every preset as a separate one-title request. Never ask the image model to create a contact sheet, grid, labels, or multiple material variants in one render. Add labels and assemble comparison boards deterministically after all individual renders pass validation.
9. Send black-background light passes through Mask Forge effect transparency before compositing.
10. Verify against the flat base using identical canvas dimensions and occupancy. Reject any changed outline or counter.

Keep rendered body and light effects separate when Figma or PSD compositing is requested.
