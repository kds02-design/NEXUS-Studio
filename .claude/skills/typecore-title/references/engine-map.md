# Typecore engine map

## Local sources

- Sovereign entry: `C:/work/00_claude/src/apps/TypecoreSovereign`
- Sovereign prompt engine: `C:/work/00_claude/src/apps/TypecoreSovereign/versions/current/hooks/useSovereignPromptCurrent.js`
- Sovereign friendly styles: `C:/work/00_claude/src/apps/TypecoreSovereign/versions/friendly/constants/styles.jsx`
- Breeze entry: `C:/work/00_claude/src/apps/TypecoreBreeze`
- Breeze prompt engine: `C:/work/00_claude/src/apps/TypecoreBreeze/hooks/useBreezePrompt.js`
- Breeze presets: `C:/work/00_claude/src/apps/TypecoreBreeze/constants/presets.js`

Read only the relevant source when the user requests exact parity with a named preset or when the app logic has changed.

## Selection

| Intent | Engine | Starting direction |
|---|---|---|
| MMORPG, season, boss, battle, faction | Sovereign | monumental-game |
| Blade, speed, impact, aggressive cuts | Sovereign | sharp-action |
| Crest, seal, guild, compact symbol | Sovereign | emblem-glyph |
| Ancient, ruined, weathered artifact | Sovereign | weathered-relic |
| Clean editorial title | Sovereign | modern-sans or classic-serif |
| Festival, cute, friendly, playful | Breeze | sticker or rounded casual |
| Brush, handwriting, emotional script | Breeze | calligraphic |
| Soft wind, water, flowers, seasonal calm | Breeze | flowing or soft calligraphic |

## Shared locks

1. Exact text and Hangul syllable preservation.
2. Explicit row count and line break positions.
3. Explicit aspect ratio and occupancy.
4. Readability before decorative transformation.
5. No unrelated scene, character, logo, or extra lettering.
6. Transparent asset handoff with body and light separated.

## Banner defaults

- Wide title zone: `2.76:1`, 65–80% occupancy.
- Notice/Facebook main title: two rows when an eyebrow and season title are required.
- Small image-only banners: do not generate or place title artwork.
- Produce at least 2× the intended Figma display dimensions.
