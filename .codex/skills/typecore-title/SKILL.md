---
name: typecore-title
description: Create Korean game, event, promotional, or casual typography titles using the local Typecore Sovereign and Typecore Breeze design logic. Use when the user mentions 타이포코어, 소버린, 브리즈, 넥서스 스튜디오, 게임 타이틀, 이벤트 타이틀, title artwork, title PNG, or asks to generate and place a separated title/body/glow asset in Figma.
---

# Typecore Title

Use the user's local Typecore logic to create flat monochrome title shapes. Delegate material rendering to `render-matrix-typography`.

## Workflow

1. Read `references/engine-map.md` when choosing an engine or mapping an app preset.
2. Choose `sovereign` for RPG, combat, monumental, emblematic, sharp, metallic, or cinematic titles. Choose `breeze` for casual, handwritten, sticker, rounded, festive, soft, or calligraphic titles.
3. Inspect any supplied banner/background before generating. Match its palette, lighting direction, available title area, and visual weight.
4. Run `node scripts/build-title-brief.mjs --text "..." --engine auto --concept "..." --ratio 2.76:1 --output <path>` to produce the canonical generation brief. Use explicit `--engine sovereign|breeze` when the user specifies an app.
5. Generate only a flat monochrome shape: one solid foreground, transparent or pure contrasting background, zero bevel, material, gradient, outline, shadow, glow, or texture.
6. Validate the alpha silhouette, counters, spelling, spacing, and line breaks. Do not render materials inside Typecore.
7. When a finished title is requested, build a Render Matrix locked-material prompt and invoke `$nexus-imagen-render` with the flat output as the immutable image-to-image reference.
8. Inspect every result. Reject misspelled, missing, substituted, romanized, duplicated, rendered, beveled, outlined, or multicolor output.
9. When a Figma destination is supplied, load and follow `figma-use`. Keep subtitle and date editable unless requested otherwise.
10. Verify at final banner size and preserve the flat source beside Render Matrix outputs for reproducibility.

## Source integrity

- Reuse the source app's rules and presets; do not copy UI implementation into the skill.
- Keep the exact requested title string as the highest-priority lock.
- Preserve requested line breaks. If none are supplied, split Korean text at word boundaries into balanced rows.
- Do not silently add English, logos, subtitles, dates, or decorative words.
- Keep body and lighting separable whenever the output will be composited in Figma or Photoshop.

## Output handoff

Return the selected engine, preset direction, generated asset paths, and Figma node link when applied. Save the generated JSON brief next to the output assets so the title can be reproduced.
