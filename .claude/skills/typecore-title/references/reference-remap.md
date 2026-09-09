# Reference-remap workflow

Use this mode when the requested text has already been arranged as a clean title shape and an approved rendered title supplies the desired material language.

## Inputs

- `TARGET_SHAPE`: exact text, counters, line breaks, proportions, and silhouette to preserve. Prefer a clean black-and-white or high-contrast opaque image, editable Figma/PSD text, or a manually prepared title bitmap.
- `MATERIAL_REFERENCE`: approved title artwork used only for face material, bevel, outline, texture, shadow, palette, and lighting.
- `PLACEMENT_CONTEXT`: optional banner background and character crop used only to choose contrast and light direction.

Do not use a flattened banner as `TARGET_SHAPE` when the text cannot be isolated cleanly. A flattened banner may still be supporting evidence for material or scale.

## Reference selection

1. User-uploaded or explicitly named reference wins.
2. Otherwise filter the built-in catalog by mood, material family, stroke character, row count, title length class, and expected banner size.
3. Present a small selection rather than generating alternatives. State which attributes will transfer and which will remain locked to the target shape.
4. Record the selection before any external render call.

## One-pass material prompt contract

The target shape is immutable. Preserve every Hangul glyph, closed counter, line break, row-width relationship, stroke skeleton, baseline, and overall silhouette. Apply only the selected reference's surface material, bevel depth, outline layers, edge highlights, texture density, shadow depth, palette, and light direction. Use a solid pure-black background. Do not add words, logos, decorative subtitles, particles, or a new type style. Do not warp, condense, widen, redraw, or reinterpret the lettering.

## Acceptance gate

Compare the opaque result to `TARGET_SHAPE` using aligned overlays or equivalent pixel/visual inspection. Confirm:

- exact wording and row order;
- preserved counters and terminals;
- no missing or fused strokes;
- unchanged width relationship and title ratio;
- coherent reference material across every glyph;
- no decorative element mistaken for part of a glyph.

If structure fails, retry once with a stricter structure lock. If the second result still changes the shape, stop the remap path and use deterministic layer styling or `creative-new`; do not loop expensive rendering.

After acceptance, use only the exact transparent PNG supplied by title production. Do not run Mask Forge, trim, or alter alpha; follow the pass-through contract in `title-transparency.md`.
