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
4. Call the nexus-studio MCP tool `nexus_render_matrix_prompt` with the chosen material direction (option ids from `nexus_list_options` → `renderMatrix`; `variant: pop` for casual titles), the exact title text as `exactText`/`lines`, and leave `strictLock` on. It runs the Render Matrix app's own compiler, so the prompt is identical to what the app renders. Do not paraphrase or hand-write the prompt from source. Optionally run `node scripts/build-render-brief.mjs --input <path> --concept "..." --output <path>` to record the brief.
5. Render with `nexus_render_image` using the flat base PNG as the reference image (image-to-image) and the returned `prompt`. Keep strict shape lock. Treat the input alpha silhouette, counters, spacing, line breaks, and every Hangul syllable as immutable.
6. Default to Render Matrix `Locked` edit budget, `Telephoto`, `projectionDepth=None`, restrained FX, and material/surface changes only.
7. For a separate light pass, call `nexus_render_matrix_prompt` again with `vfxPassMode: true`, render it, then convert with `nexus_extract_effect` (Mask Forge effect curve) before compositing.
8. Verify against the flat base using identical canvas dimensions and occupancy. Reject any changed outline or counter.

Keep rendered body and light effects separate when Figma or PSD compositing is requested.
