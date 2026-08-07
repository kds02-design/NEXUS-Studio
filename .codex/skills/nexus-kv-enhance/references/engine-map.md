# Engine map

## Local sources

- Runtime manifests: `C:/work/00_claude/src/skills-runtime/nexuspreviewSkills.js`, `C:/work/00_claude/src/skills-runtime/lightfxSkill.js`
- Background Quality Up: `C:/work/00_claude/src/apps/NexusPreview/services/qualityEnhancer.js`
- Character Up: `C:/work/00_claude/src/apps/NexusPreview/services/characterEnhancer.js`
- Light FX prompt engine: `C:/work/00_claude/src/apps/RubiconForge/services/lightfx.js`
- Light FX presets: `C:/work/00_claude/src/apps/RubiconForge/constants/lightfx.js`

## Background locks

- Preserve layout, camera, crop, subject identity, title letterforms, and edge fades.
- Add no text, title, logo, character, silhouette, object, or outpainting.
- Improve with dramatic-but-controlled light, atmosphere, particles, grading, and depth.
- Keep one coherent light source and stable exposure.

## Character-light locks

- Treat reference as silhouette placement only.
- Output light only on pure black.
- Concentrate light tightly along outer contours and key edges.
- Prefer sparse thin rim light, a few glints, and short delicate rays.
- Keep interior and most of canvas dark; never flood the frame.
- Never reproduce the face, body, clothes, weapon, or recognizable reference object.

## Mask Forge effect transparency

Use the local `MaskForge effectToBlob` defaults exactly:

- cutoff: 6/255
- gamma: 0.85
- opacity: 100%
- recoverColor: true
- background: sampled solid background, normally black

Alpha is based on maximum RGB distance from the background, then gamma-shaped. Recover color by removing the background contribution. Preserve the original canvas dimensions; do not trim when alignment matters.

## Preset mapping

| Scene | Light form | Style | Color | Intensity |
|---|---|---|---|---|
| Pond, water, forest | charAura + water | soft/magical | cyan + gold | subtle/medium |
| Battle, metal | charAura | sharp/realistic | white/cyan | medium |
| Magic, arcane | halo + particle | magical | violet/cyan | medium |
| Premium clean | iconBack | soft/realistic | white | subtle |
