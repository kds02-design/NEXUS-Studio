# Engine map

## Local sources

- Primary migrating host: Rubicon Forge `KV Edit` for background quality and character light editing when available.
- Runtime manifests: `C:/work/00_claude/src/skills-runtime/nexuspreviewSkills.js`, `C:/work/00_claude/src/skills-runtime/lightfxSkill.js`
- Background Quality Up: `C:/work/00_claude/src/apps/NexusPreview/services/qualityEnhancer.js`
- Character Up: `C:/work/00_claude/src/apps/NexusPreview/services/characterEnhancer.js`
- Light FX prompt engine: `C:/work/00_claude/src/apps/RubiconForge/services/lightfx.js`
- Light FX presets: `C:/work/00_claude/src/apps/RubiconForge/constants/lightfx.js`

Treat the Nexus Preview paths as compatibility references while KV Edit is being moved. Prefer the active Rubicon Forge implementation once its route is configured; do not guess a missing endpoint.

## Processing-size lock

- Preserve full-resolution originals outside the processing stack.
- Normalize each raster working copy so `max(width, height) <= 1920` with aspect ratio and alpha preserved.
- Never upscale, crop during normalization, or resize from an already resized derivative.
- Keep character back FX, character, and front FX on one identical 1920-bounded canvas.

## Background locks

- Preserve layout, camera, crop, subject identity, title letterforms, and edge fades.
- Add no text, title, logo, character, silhouette, object, or outpainting.
- Improve with dramatic-but-controlled light, atmosphere, particles, grading, and depth.
- Keep one coherent light source and stable exposure.

## Character-light locks

- Treat reference as silhouette placement only.
- Output light only on pure black.
- Concentrate light tightly along outer contours and key edges.
- Prefer rear aura, localized rim bloom, atmospheric smoke or mist, a few glints, and short delicate rays. Do not default to a crisp full-body front rim.
- Keep interior and most of canvas dark; never flood the frame.
- Never reproduce the face, body, clothes, weapon, or recognizable reference object.
- Use pure black, never green chroma key, for light-only assets with soft falloff.
- In dramatic mode, combine a broad rear aura with optional alpha-derived rim bloom and a restrained front atmospheric pass. Use a crisp localized rim only when a hard directional source justifies it. Replace a synthetic-looking rim with smoke, mist, wisps, haze, or sparse front glints.
- Restrict alpha-derived rims to the intended character silhouette. Exclude source particles, internal wing decoration, and unrelated FX alpha before edge extraction.
- Keep smoke away from the face and central torso. Let it rise from the lower center or sides with irregular density and open negative space around key anatomy.
- After recovered-color conversion, test front smoke in Normal blend near 15-25% opacity before trying Screen. Reject neon saturation, opaque smoke walls, and effects that become the primary subject.

## Mask Forge effect transparency

Use the local `MaskForge effectToBlob` defaults exactly:

- cutoff: 6/255
- gamma: 0.85
- opacity: 100%
- recoverColor: true
- background: sampled solid background, normally black

Alpha is based on maximum RGB distance from the background, then gamma-shaped. Recover color by removing the background contribution. Preserve the original canvas dimensions; do not trim when alignment matters.

Validate effect survival after conversion: retain meaningful partial-alpha coverage and visually compare the composited result to the black-background source. A technically transparent PNG that has lost most bloom, aura, or color energy fails.

## Preset mapping

| Scene | Light form | Style | Color | Intensity |
|---|---|---|---|---|
| Pond, water, forest | charAura + water | soft/magical | cyan + gold | subtle/medium |
| Battle, metal | charAura | sharp/realistic | white/cyan | medium |
| Magic, arcane | halo + particle | magical | violet/cyan | medium |
| Premium clean | iconBack | soft/realistic | white | subtle |
