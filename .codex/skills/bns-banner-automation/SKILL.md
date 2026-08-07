---
name: bns-banner-automation
description: Create, evaluate, and automatically refine a complete Blade & Soul live-event banner set from a request folder and PSD, including separated assets, Typecore title, Render Matrix rendering, Mask Forge transparency, eight Figma sizes, and direct Nexus weighted evaluation of the 1180 master banner. Use for 블소 배너, 봉마 소울패스, 진무 시즌 banners, Season 5 follow-ups, similar multi-size game promotion banners, or requests to score and improve completed banners.
---

# BNS Banner Automation

Produce the whole banner family as one controlled workflow. Preserve the approved Season 4 visual grammar while replacing season-specific content and assets.

## Required inputs

Collect or infer these values before mutating Figma:

- request/resource folder and its PSD files
- season number and combined title text, normally `봉마 소울패스\n진무 시즌 N`
- subcopy and date range
- target Figma file and destination page name
- approved official game logo asset or PSD logo layer

If the official logo is absent, continue with the seven non-logo compositions and clearly report the missing 1200 logo. Never invent or redraw the logo.

## One-shot workflow

1. Read [pipeline.md](references/pipeline.md), [banner-spec.md](references/banner-spec.md), and [design-validation.md](references/design-validation.md).
2. Run `scripts/build-banner-job.mjs` to normalize inputs into a job JSON.
3. Inspect the request folder and PSD. Extract the untouched background, character alpha, effects, title references, and logo candidate. Do not flatten assets that must stay independently positionable.
4. Build the title through `$typecore-title` in two-line mode. Sovereign/Breeze creates only a flat monochrome letterform. Include `봉마 소울패스` and `진무 시즌 N` in one title image.
5. Invoke `$nexus-imagen-render` with the Render Matrix locked-material prompt to render the title from that immutable flat reference. Material and lighting may change; Hangul structure, counters, line breaks, proportions, and silhouette may not.
6. Apply `$nexus-kv-enhance` to the background and character effect, using `$nexus-imagen-render` for final API quality when a valid key and transmission approval are available. Preserve the original character silhouette and placement. Use Mask Forge effect transparency; never replace the original character with the generated pixels.
7. Create a new page in the supplied Figma file. Assemble 1180 first, then duplicate it for 1200. Build the remaining six image-only sizes from the same separated assets.
8. Compare every frame against the source PSD and the Season 4 template. Verify alpha edges, title transparency, text centering, crop, logo, effect alignment, and layer visibility.
9. Export only the finalized `1180x750_Notice` master and invoke `$nexus-design-evaluator`. Save its weighted 10-metric score and reasons.
10. If the master fails, apply only the recommended layer-scoped corrections, export again, and re-evaluate. After passing, propagate relevant master changes to 1200 and the image-only crops. Stop after passing or three correction rounds.

## Non-negotiable rules

- Only 1180 and 1200 contain title, editable subcopy, editable date, and date dim.
- Do not add a decorative line or a dim behind the entire text block.
- Title transparency must be clean: no black matte, teal residue, or color-key fringe.
- Keep background, atmosphere, character, character FX, title, copy, date dim, date, and logo separate.
- Character FX must share the original character coordinate system. Align from the untouched alpha canvas, not visual guesswork.
- 1200 is derived by duplicating the finalized 1180 layout and adapting it to 1200×628. Add the approved game logo at top-right.
- Purple, EventON, and 620×640 use a centered character. Toast has a transparent top area. Ingame is transparent character-only. 72×40 is a large face crop.
- Treat the coordinates in `banner-spec.md` as starting anchors. Preserve user-made spacing adjustments unless the new artwork's intrinsic aspect ratio requires optical correction.
- Never declare completion before the 1180 master passes Nexus evaluation or the three-round limit is reached. Do not raise scores manually.
- Keep Google-rendered results as candidates until visual comparison passes. Automatically fall back to the untouched PSD/local result when the API changes locked structure.

## Output contract

Return:

- the Figma page URL
- eight frame names and sizes
- source asset paths used for background, character, FX, title, and logo
- any substituted or missing asset
- a short QA result for alpha, alignment, crop, text, and logo
- initial and final Nexus weighted scores for the 1180 master, per-metric reasons, correction history, and gate status
