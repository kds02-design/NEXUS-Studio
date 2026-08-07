---
name: typecore-title
description: Create Korean game, event, promotional, or casual typography titles using the local Typecore Sovereign and Typecore Breeze design logic. Use when the user mentions 타이포코어, 소버린, 브리즈, 넥서스 스튜디오, 게임 타이틀, 이벤트 타이틀, title artwork, title PNG, or asks to generate and place a separated title/body/glow asset in Figma.
---

# Typecore Title

Use the user's local Typecore logic to direct production-ready title artwork from chat.

## Workflow

1. Read `references/engine-map.md` when choosing an engine or mapping an app preset.
2. Choose `sovereign` for RPG, combat, monumental, emblematic, sharp, metallic, or cinematic titles. Choose `breeze` for casual, handwritten, sticker, rounded, festive, soft, or calligraphic titles.
3. Inspect any supplied banner/background before generating. Match its palette, lighting direction, available title area, and visual weight.
4. Run `node scripts/build-title-brief.mjs --text "..." --engine auto --concept "..." --ratio 2.76:1 --output <path>` to produce the canonical generation brief. Use explicit `--engine sovereign|breeze` when the user specifies an app.
5. Generate the title bitmap by running the bundled renderer (no external image tool needed): `node scripts/render-title.mjs --brief <brief.json> --output title-body.png --model gemini-3-pro-image-preview --aspect <ratio> --size 2K`. It reads `GEMINI_API_KEY` from the project `.env` and calls the Gemini image API directly. Treat the generated brief as mandatory constraints, especially exact Hangul spelling and layout.
6. Prefer two deliverables — render each with `render-title.mjs`:
   - `title-body.png`: title lettering and material only, transparent background, no glow or cast light. Use the brief prompt: `node scripts/render-title.mjs --brief <brief.json> --output title-body.png ...`.
   - `title-light.png`: glow, rays, particles, and light accents only, transparent background, no dark matte. Craft a glow-only prompt (same layout/spelling lock, black-friendly light on transparent) and run `node scripts/render-title.mjs --prompt "..." --output title-light.png ...`.
   Add `title-decoration.png` when an ornament must move independently.
   Note: Gemini image output is often opaque. If a result lacks true transparency, hand it to the local Mask Forge (color/luma key) or `src/lib/smartTransparency.js` before compositing so no black rectangle remains.
7. Inspect every result. Reject misspelled, missing, substituted, romanized, or duplicated Hangul. Regenerate or repair before placement.
8. When a Figma destination is supplied, load and follow the `figma-use` skill before writing. Place the assets in a group named `TITLE_SWAP__NEXUS_STUDIO_TYPOCORE`, ordered `title-light` above `title-body`, with decoration separate. Keep subtitle and date as editable Figma text unless the user requests otherwise.
9. Verify at final banner size. Check crop, title hierarchy, contrast, spelling, and that transparent effects do not render with a black rectangle.

## Source integrity

- Reuse the source app's rules and presets; do not copy UI implementation into the skill.
- Keep the exact requested title string as the highest-priority lock.
- Preserve requested line breaks. If none are supplied, split Korean text at word boundaries into balanced rows.
- Do not silently add English, logos, subtitles, dates, or decorative words.
- Keep body and lighting separable whenever the output will be composited in Figma or Photoshop.

## Output handoff

Return the selected engine, preset direction, generated asset paths, and Figma node link when applied. Save the generated JSON brief next to the output assets so the title can be reproduced.
