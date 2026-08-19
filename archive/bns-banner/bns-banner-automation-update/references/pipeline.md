# Production pipeline

## Asset extraction

Use `ag-psd` or the existing workspace scripts `scripts/psd-extract.mjs` and `scripts/psd-extract-layer.mjs`. Create an inventory before choosing layers. Prefer original PSD pixels over regenerated substitutes.

Required separated assets:

1. background without character and typography
2. atmosphere/color-grade overlay where present
3. untouched transparent character
4. original character/light effect canvas
5. approved official game logo
6. title reference only; do not reuse an outdated seasonal title as final artwork

## Title

Invoke `$typecore-title` in Sovereign or Breeze two-line mode. Output one combined, flat, monochrome transparent title image containing the eyebrow and main season title. It must have no bevel, material, glow, rendered outline, or shadow.

Pass that exact alpha-locked image to `$render-matrix-typography`. Use locked edit budget. Render only surface, material, outline stack, bevel, and lighting. Reject a result if any Hangul form, counter, line break, width relationship, or silhouette changes. Remove black/teal matte contamination before Figma placement.

## Background and character FX

Invoke `$nexus-kv-enhance` for background quality and light FX. Background enhancement may adjust light, atmosphere, particles, grading, and depth, but must not change camera, crop, object positions, or introduce text/new objects.

Keep the original character alpha untouched. Derive FX in the same full-size coordinate canvas, then use Mask Forge transparency with cutoff 6, gamma 0.85, opacity 100, recoverColor enabled, and canvas preservation enabled. Composite by identical canvas coordinates. Do not align from visible glow bounds.

## Figma assembly

Create a new page named for the season. Use this layer order:

1. `01_배경`
2. `02_분위기_그라데이션`
3. `03_캐릭터`
4. `CHAR_LIGHT_FX__ORIGINAL_ALPHA__MASK_FORGE`
5. `TITLE__TYPECORE_BASE__RENDER_MATRIX_LOCKED`
6. `서브 카피`
7. `날짜_딤드`
8. `날짜`
9. `07_로고` where required

Subcopy and date remain editable Figma text. The title is one transparent image. Make 1180 first and treat it as the master; duplicate/adapt for 1200. Do not add the removed decorative line or full text-block dim.

## QA gates

- Inspect title at 100% and over black/white checker backgrounds for matte residue.
- Toggle character and FX separately; silhouette and canvas origins must coincide.
- Verify 1180/1200 text block optical centering and title-to-copy spacing.
- Verify only two frames contain text.
- Verify Toast transparency, Ingame character-only transparency, and 72×40 facial legibility.
- Verify the 1200 logo is the approved supplied asset, not an extracted placeholder.
- Protect the 1200 top-right logo safe zone; move character and FX as one aligned pair.
- Re-open Toast and Ingame after any user adjustment and verify the upper silhouette is not clipped.
- During delivery, verify actual alpha pixels. An ARGB pixel format alone does not prove transparency; ordinary Figma asset export may flatten transparent backgrounds to white.
- Export the 1180 master and complete the direct `$nexus-design-evaluator` loop in `design-validation.md`; perform rule-based QA on the other seven frames.
