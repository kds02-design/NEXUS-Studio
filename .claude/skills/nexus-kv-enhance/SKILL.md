---
name: nexus-kv-enhance
description: Enhance game key visuals using the user's local NexusPreview Background Quality Up and RubiconForge/NexusPreview character Light FX logic. Use when the user asks for 키비주얼 광원, 캐릭터 이펙트, 림라이트, 오라, Light FX, 배경 품질 향상, Background Quality Up, KV polish, or wants separated compositing effects applied in Figma.
---

# Nexus KV Enhance

Reuse the local NexusPreview and RubiconForge directing rules for key-visual finishing.

## Workflow

1. Read `references/engine-map.md` before choosing a mode.
2. Inspect the supplied background or character reference. Preserve the full-resolution source as immutable, then create one working copy. If its width exceeds 1920px, resize proportionally to exactly 1920px wide; never upscale a narrower source. Preserve aspect ratio, alpha, and pixel origin; never crop or repeatedly resample. Use this exact working copy for every enhancement, grade, effect call, and aligned Figma plate. Record original dimensions, working dimensions, and scale factor. If the selected engine imposes an additional height or total-pixel cap, downscale further only as required and record that secondary scale.
3. Run `node scripts/build-kv-brief.mjs --mode background|character-light --concept "..." --output <path>`.
4. Read `references/api-schema.md` and call the protected Nexus Studio API. For background enhancement, run `scripts/call-nexus-background.mjs --env <path>` with `engine=google` and `quality=final`. For character-light generation, invoke `/nexus-imagen-render` against `/api/codex-imagen`. Never transmit a background or character wider than 1920px.
5. For `background`, edit the source image and preserve composition, crop, camera, object positions, title, character identity, and edge fades. Enhance lighting, fog or haze, particles, motivated light, grading, texture clarity, and foreground/middle-ground/distance separation before any character grade or character FX work. Never add text or new scene objects. Treat the accepted enhanced background as the color-and-light authority for every later layer.
5a. After accepting the background, composite the untouched character over it and invoke `/photographer-layout` for its light-and-color continuity pass. Grade the original character without generative rendering. Prefer a Photoshop-capable non-destructive workflow using clipped Curves, Color Balance, Selective Color, Hue/Saturation, Levels, Camera Raw, and local dodge/burn; preserve source alpha, silhouette, anatomy, face, costume, and pixels. Save the untouched source, adjustment record, and transparent graded derivative separately.
6. For `character-light`, use the accepted enhanced background and graded original character to direct the effect language. Generate effect material only on pure black. Default to a broad foreground-atmosphere pass that extends around and partly across the character, continuing the background's fog, particles, light flow, wind, depth, and palette. Add optional sparse contact glints as a separate pass. Rear environmental light is secondary and allowed only when the background motivates a rear source. Rim light is optional and must never be the primary visible result. Never reproduce the character or any solid object.
6a. For a dramatic brief, start with rear aura and an optional alpha-derived rim bloom below the untouched character. Treat a crisp front rim as an exception, not a default: use it only when the approved reference or a hard directional source clearly requires it. If it reads as a synthetic outline, replace it with front atmosphere such as smoke, mist, wisps, shallow haze, or sparse glints. Limit every alpha-derived mask to the intended body/gear silhouette and exclude pre-existing particles, wing-internal decoration, and unrelated effect alpha.
7. Convert black-background light assets with the exact Mask Forge effect curve: cutoff 6, gamma 0.85, opacity 100, recoverColor true. Prefer the nexus-studio MCP tool `nexus_extract_effect` (it runs the Mask Forge app's own `extractEffectPixels`), or `node scripts/maskforge_effect_transparency.mjs --input <png> --output <png> --report <json>` which calls the same library; use `scripts/maskforge_effect_transparency.ps1` only when neither Node nor MCP is available. Do not use generic black-key removal.
7a. Do not generate character-light assets on green chroma key. Soft emission blends with green, so key removal destroys low-luminance falloff and shifts amber/violet light. After Mask Forge, compare non-zero alpha coverage, partial-alpha coverage, and composited luminance against the black-background source; regenerate or loosen the conversion only when meaningful light has disappeared.
8. Never ask the image model to reproduce the character for effect alignment. Generate light-only atmosphere, then use the untouched original character canvas as the placement reference. Keep effects soft enough that small contour differences are not visible.
8a. Preserve the default dramatic stack as `BG_ATMOSPHERE`, optional `CHAR_LIGHT_FX_BACK`, graded original character, `CHAR_ATMOSPHERE_FX_FRONT`, optional `CHAR_PARTICLE_FX_FRONT`, and optional sparse `CHAR_CONTACT_LIGHT_FRONT`. Keep every aligned character layer on identical canvas dimensions, origin, placement, scale, and crop. Keep the foreground atmosphere spatially broader than a rim and let it extend beyond the silhouette. Use `CHAR_RIM_LIGHT_FRONT` only for an explicitly justified hard-light direction.
8b. When the user asks for a character-only result, create a transparent export frame on the normalized character working canvas, whose width must not exceed 1920px, containing only the character effect stack. Do not include the background, title, copy, date, logo, or item layers. Preserve each effect as an editable layer and set the frame export to transparent PNG.
9. When applying in Figma, load and follow `figma-use`. Keep `BG_ATMOSPHERE`, optional `CHAR_LIGHT_FX_BACK`, `03_캐릭터__GRADED_ORIGINAL`, `CHAR_ATMOSPHERE_FX_FRONT`, optional `CHAR_PARTICLE_FX_FRONT`, and optional `CHAR_CONTACT_LIGHT_FRONT` as independent layers with user-adjustable opacity. Use ordinary groups for editable organization and a frame only for clipping/export.
10. Verify at final banner size. Compare original and enhanced backgrounds and reject changed composition, changed character identity, regenerated silhouettes, added text/objects, excessive bloom, unmotivated full-outline rim, smoke that obscures the face or torso, or front FX that competes with the character. Start smoke around 15-25% opacity in Normal blend; raise it only after visual comparison. Screen blend with recovered-color smoke often becomes neon and must be rejected or reduced.

## Engine policy

- Require `NEXUS_API_BASE_URL` and `NEXUS_CODEX_RENDER_TOKEN`.
- Use the protected Nexus API with `google` for production generation.
- Never use `auto` for production because preview routing can select the local renderer.
- Treat local processing as an explicit user-approved fallback only.
- Stop and report the HTTP status when authentication or rendering fails; never silently downgrade to local generation.

## Defaults

- Pond/nature KV: jade-cyan rim, pale gold fill, subtle water-flow wisps, medium-low intensity.
- Dark/action KV: cool white/cyan rim, sparse sharp glints, stronger contrast.
- Background strength: standard unless the user requests subtle or dramatic.
- Preserve exact aspect ratio. Keep every background and character working input at 1920px or less in width; never upscale a smaller source. Apply stricter engine-specific height or pixel limits only when required, and record them.

Return the selected mode, prompt brief path, image paths, and Figma link.
