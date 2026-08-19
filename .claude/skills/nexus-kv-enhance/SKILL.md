---
name: nexus-kv-enhance
description: Enhance game key visuals using the user's local NexusPreview Background Quality Up and RubiconForge/NexusPreview character Light FX logic. Use when the user asks for 키비주얼 광원, 캐릭터 이펙트, 림라이트, 오라, Light FX, 배경 품질 향상, Background Quality Up, KV polish, or wants separated compositing effects applied in Figma.
---

# Nexus KV Enhance

Reuse the local NexusPreview and RubiconForge directing rules for key-visual finishing.

## Workflow

1. Read `references/engine-map.md` before choosing a mode.
2. Inspect the supplied background or character reference.
3. Run `node scripts/build-kv-brief.mjs --mode background|character-light --concept "..." --output <path>`.
4. Use `$nexus-imagen-render` to execute final-quality briefs through the Nexus Studio Google image path when a valid key and transmission approval are available. Use `imagegen` or local processing only as fallback.
5. For `background`, edit the source image and preserve composition, crop, camera, object positions, title, character identity, and edge fades. Enhance only lighting, atmosphere, particles, grading, texture clarity, and depth separation. Never add text or new scene objects.
6. For `character-light`, use the character image only as a shaping reference. Generate light only on pure black: a sparse edge-hugging rim, backlight bloom, and restrained particles. Never reproduce the character or any solid object.
7. Convert black-background light assets with the exact Mask Forge effect curve: cutoff 6, gamma 0.85, opacity 100, recoverColor true. Use `scripts/maskforge_effect_transparency.ps1`; do not use generic black-key removal.
8. Never ask the image model to reproduce the character for effect alignment. Generate light-only atmosphere, then use the untouched original character canvas as the placement reference. Keep effects soft enough that small contour differences are not visible.
9. When applying in Figma, load and follow `figma-use`. Keep layers named `KV_BG_QUALITY_UP`, `CHAR_LIGHT_FX`, and `03_캐릭터`; place background behind the character and light FX directly above it.
10. Verify at final banner size. Reject changed composition, changed character identity, regenerated character silhouettes, added text/objects, excessive bloom, or effects that obscure the face.

## Defaults

- Pond/nature KV: jade-cyan rim, pale gold fill, subtle water-flow wisps, medium-low intensity.
- Dark/action KV: cool white/cyan rim, sparse sharp glints, stronger contrast.
- Background strength: standard unless the user requests subtle or dramatic.
- Preserve exact aspect ratio and generate at least 2K.

Return the selected mode, prompt brief path, image paths, and Figma link.
