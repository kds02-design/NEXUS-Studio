---
name: typecore-title
description: Rapidly create Korean promotional titles by remapping approved reference materials onto prepared text shapes, update recurring title tokens, maintain a reusable approved-title library, or create genuinely new shapes through Nexus Typecore. Use for reference-led title production, rendered-title reuse, season updates, title PNG delivery, repeated-banner title matching, or Figma placement.
---

# Typecore Title

Prefer approved title references over new shape generation. Reuse a verified material language on a prepared target-text shape whenever possible; use Nexus Typecore shape generation only when no suitable shape or reference-led route exists.

## Mandatory Figma title authority

When a destination Figma file is supplied, read [figma-title-authority.md](references/figma-title-authority.md) and measure the destination slot before choosing line count, shape, material, or rendering settings. Run the title geometry gate below before selecting a guide shape. For the BNS consolidated guide, also read [figma-shape-search.md](references/figma-shape-search.md) and save `figma-shape-search.json` before `title-guide-audit.json`. Inspect the live shape-guide page, rendered-sample page, and GPT preset page. Save `title-guide-audit.json` and `render-preset-audit.json` with exact page/node IDs and settings. Do not generate a flat shape or material render until the required search and audits pass. A remembered preset name, local prose recreation, or prior exported image is not sufficient evidence.

For BNS, search the relocated guide in file `xBPE1bR5luASNBpdOMyp10`, page `0:1` (current name `Page 1`) through the Figma shape-search gate. Discover the live named typography sections, shortlist by structure, inspect actual previews, score the candidates, and record selected and rejected node IDs. Choose title geometry only from a selected shape reference compatible with `title-geometry-plan.json`; a one-line guide is not compatible when the requested wording fails the one-line capacity gate. For rendering, enumerate every category and card under `Render Matrix · Individual Pro 1K Presets`, inspect actual samples, and record the compared candidates before selecting one. Never prefilter to `CAMPAIGN THEMES` or `CT-*`; those are samples rather than a default subset. Reuse or remap a fitting guide choice. Enter `creative-new` only when `figma-shape-search.json` records `result: no-match`, or when a selected visual reference lacks a trustworthy exact target-text shape and deterministic target-shape preparation has failed. In the latter case, keep the selected guide node as primary shape evidence. Do not treat an unsearched page or a mood-only mismatch as proof, and do not invent a new material recipe when a guide preset is selected.

Never ask an AI image generation or generative image-editing tool for transparency, alpha, background removal, a transparent PNG, a checkerboard, or simulated transparency. Every AI-generated shape and material candidate must use the explicitly locked opaque matte; reject any output that changes or patterns that matte. No caller or prompt template may override this rule.

After material approval, use `/nexus-mask-forge` controlled-matte removal as the default title transparency route when the matte is uniform. Preserve the opaque master, limit any proportional title processing copy to a 1200 px long edge, and never upscale. Use Nexus Remove AI only as a fallback after local extraction fails; the external Remove.bg upload requires explicit confirmation on every call. Alpha recomposition is conditional recovery only.

## Figma boundary for production game banners

For `/game-banner-automation`, Figma is a guide-inspection and final-assembly destination only. Complete title shape, exact-Hangul QA, material rendering, and transparency before the Figma master-assembly stage. The Figma file may supply shape and render reference samples, but it must never be used to author or recreate the target title.

At placement, import the exact approved transparent title PNG as an unconditional pass-through asset and allow only proportional scale and position. Never inspect alpha to choose another route; never create, replace, recompute, or repair alpha; never mask, trim, normalize, remap RGB, remove a background, re-render, re-save, create title text, select a title font, convert text to vectors, export a destination text node as a shape lock, or retain hidden editable title/title-shadow layers. Do not invoke Mask Forge or any transparency tool after title handoff. When a required title asset is missing or fails QA, return the same file to title production instead of synthesizing or modifying it.

## Select the title mode first

Choose exactly one mode before calling a generation engine, in this priority order:

- `repeat-update`: the approved campaign base title, line structure, proportions, and rendered material remain fixed and only a season number, round, part, phase, or equivalent token changes.
- `reference-remap`: the requested wording differs, but the user supplies a prepared target-text shape or an editable title layout and selects an approved rendered reference whose material, bevel, outline, palette, and lighting should be transferred. Skip Typecore shape ideation and perform one locked reference-led material render.
- `creative-new`: the fixed wording, title family, layout, or material direction is new or the prior source is not trustworthy enough for deterministic reuse.

For `repeat-update`, search in this order: editable approved Figma or PSD title master; separated rendered title with an independent token layer; approved transparent rendered title plus material/handoff metadata; Nexus handoff record; flattened prior banner only as evidence. Figma is helpful but not mandatory.

Record `title-mode.json` with `mode`, `campaignBaseTitle`, `fixedText`, `variableToken`, `previousToken`, `requestedToken`, `matchedSource`, `sourceType`, `editableTokenLayer`, `targetShapeSource`, `referenceId`, `referenceSource`, `materialRecord`, and `confidence`. Use `repeat-update` only when the fixed text and material identity are unambiguous. Use `reference-remap` only when the exact target wording and row structure already exist as a trustworthy shape input.

## Title geometry gate

Run this gate after measuring the title slot and before shape search, Typecore, Prompt Arc, or image generation:

```powershell
node scripts/plan-title-geometry.mjs --text "..." --slot-width <px> --slot-height <px> --output title-geometry-plan.json
```

The plan is mandatory for every new or remapped title and especially for titles with nine or more visible graphemes. It separates the render-canvas ratio from the visible title artwork ratio, estimates natural per-glyph width/height, and fits the entire title only by uniform scaling. A 10-character one-line Hangul title may naturally have an `8–10:1` visible artwork ratio inside a `2.76:1` canvas; this is valid when the extra width is absorbed as top/bottom whitespace rather than by narrowing the glyphs. The default gate keeps mean per-glyph width/height within `0.78–1.15`, keeps `horizontalScale: 1` and `verticalScale: 1`, requires at least 32 px glyph height in the destination slot, and moves to two rows only when those natural-proportion or legibility checks fail. There is no fixed maximum visible artwork ratio.

- Continue only when `status: planned`. A `blocked` forced one-line plan requires a wider title region, a semantically approved two-row break, or a separated qualifier. Do not solve it with a condensed/tall-narrow reference letterform.
- When a no-space title receives `requiresSemanticApproval: true`, treat the proposed break as a layout candidate and confirm the semantic break before generation. Word-boundary breaks do not need a separate approval unless their hierarchy changes meaning.
- An explicit user line break is authoritative only when it passes capacity. If it fails, preserve the requested wording and discuss slot or hierarchy changes; never repair it with non-proportional scaling.
- Use `selected.rows`, `canvasAspectRatio`, `artworkRatio`, `glyphAspectRatios`, `renderPlacement`, `horizontalScale`, and `verticalScale` as separate locks. `canvasAspectRatio` controls the generated image; `artworkRatio` describes only the visible title bounds. Keep the canvas ratio fixed when production requires it and derive width/height occupancy plus top/bottom whitespace from title length.
- A guide or approved reference must match the planned line count and length class. Reject it as structurally incompatible when it would force the title back into an over-capacity single line.

## Two-row proxy to single-line recomposition

Use this fallback for a long final one-line goal when the geometry plan passes at natural glyph proportions but direct one-line flat-shape generation still produces horizontally condensed, tall-narrow, or structurally unstable Hangul after one controlled retry. The two-row source gives the image model more room per glyph; deterministic recomposition then joins the approved rows without changing glyph proportions. It does not override a failed final one-line legibility plan.

1. Confirm `title-geometry-plan.json` has `selected.lineCount: 1`, `selected.verticalScale: 1`, and `proxyRecomposition.eligible: true`. If not, keep the planned two-row result or reopen layout selection.
2. Build the intermediate generation brief with `node scripts/build-title-brief.mjs --text "..." --geometry-plan title-geometry-plan.json --proxy-recompose --output title-brief.json`. Generate exactly two flat monochrome rows with identical glyph height, weight, and scale. Do not apply material, bevel, outline decoration, shadow, glow, or FX.
3. Validate exact Hangul and the planned proxy row order, show the valid flat proxy candidates through the normal A/B shape gate, and obtain selection. The selected two-row proxy is an intermediate source, never the final shape authority.
4. Recompose the approved source deterministically:

```powershell
& '<python-executable>' scripts/recompose-title-line.py --source title-flat-proxy-2row-approved.png --output title-flat-recomposed-1row.png --manifest title-proxy-recomposition.json --geometry-plan title-geometry-plan.json --text "전체 제목" --row1-text "첫 행" --row2-text "둘째 행" --join-with " "
```

Resolve `<python-executable>` from the current workspace dependencies before running; do not assume `python` is on `PATH`.

5. The recomposer may crop, translate, and uniformly downscale the taller row to the shorter row only within an 8% source-height tolerance. It must never apply non-proportional scaling, horizontal condensation, per-glyph warping, or upscaling. It rejects unclear row separation, text-order mismatch, mean source-glyph width/height outside `0.78–1.15`, or final visible-art ratio drift above 15%. It does not reject a valid long title merely because its visible artwork ratio exceeds the canvas ratio.
6. Promote `title-flat-recomposed-1row.png` to `TITLE_SHAPE_LOCK` only when `title-proxy-recomposition.json` reports `status: pass`, `verticalScale: 1`, `nonProportionalScaling: false`, and a compatible final ratio. Apply material once to this recomposed one-line lock; never material-render the two proxy rows separately and join them afterward.
7. If recomposition fails, do not repair it by stretching. Regenerate a cleaner equal-height proxy once, then stop and use the planned two-row title, separate a qualifier, or revise the title slot.

## Approved-title library

Before entering `creative-new`, read [title-library.md](references/title-library.md) and search the configured approved-title library. Prefer an exact campaign/fixed-text match, then a replaceable-token family, then a structurally compatible approved title. A visual mood match alone is not enough to select a reusable master.

After a title passes explicit approval, structural QA, material QA, alpha QA, and final banner placement, promote it to the configured library as an immutable approved package. Never register drafts, rejected candidates, unselected variations, inferred approvals, or intermediate renders. Deduplicate by campaign family, fixed text, shape identity, and source node; add repeat results as versions instead of creating unrelated entries.

Use the machine-readable library index for retrieval and treat any Figma library page as its visual projection. Do not crawl a large Figma page as the only source of truth. If no approved library root is configured or writable, save `pending-library-entry.json` beside the delivery assets and report that promotion is pending rather than inventing a global location or silently skipping the record.

## Repeat-update fast path

1. Preserve the approved rendered master as immutable input and create a new versioned output for the requested token.
2. Skip Typecore flat-shape generation, the A/B candidate gate, and full-title Render Matrix rendering.
3. Replace only the independent token layer in an external editable master such as PSD or the Typecore/Nexus source. An existing Figma title may be inspected as read-only evidence, but it must not be edited, duplicated, outlined, exported as a shape source, or used as the production master. Preserve baseline, cap height, spacing, optical weight, bevel, outline, shadow, palette, and light direction.
4. When only an approved transparent rendered title exists, isolate the token region and reuse the fixed rendered text. Prefer deterministic reconstruction from stored layer styles or an approved matching numeral asset. If a generative material patch is unavoidable, constrain it to the token region and lock the rest of the title as an immutable reference.
5. Validate the requested token, fixed wording, counters, row structure, visible bounds, material match, and final title ratio. Reject seams, stretched numerals, different bevel depth, mismatched highlights, or changes outside the token region.
6. Do not require A/B approval for a deterministic token replacement. Show one updated proof when interaction is available; in an approved one-shot production request, continue after exact-token and pixel-structure validation unless the source is ambiguous.
7. Reuse existing title-front FX when its placement still fits. Move or recrop only FX particles that collide with the new token; never bake FX into the title master.

If the source is flattened into a banner, the token overlaps complex artwork, the fixed text differs, or confidence is not high, do not guess. Switch to `creative-new` or request an editable/transparent approved source.

## Reference-remap fast path

Read [reference-remap.md](references/reference-remap.md) and [reference-catalog.json](references/reference-catalog.json). This is the default path when a prepared target-text shape exists.

1. Accept either a user-uploaded title reference or a built-in catalog entry. A user-selected reference is authoritative. Otherwise present 3-5 structurally relevant catalog choices with thumbnails or file links and wait for one selection; do not browse every preset.
2. Require two distinct inputs: `TARGET_SHAPE`, containing the exact requested Hangul and row structure, and `MATERIAL_REFERENCE`, containing the approved rendered look. The attached example pattern—new wording already arranged in the desired title form plus a proven gold rendered reference—is a valid `reference-remap` case.
3. Skip Typecore Sovereign/Breeze shape generation, Prompt Arc search, A/B shape candidates, and the flat-candidate approval gate. Do not ask Nexus to redesign the glyphs.
4. Send the target shape and material reference together through the locked Nexus image-to-image/Render Matrix path in one material pass. Lock exact spelling, counters, row breaks, width relationship, silhouette, and title ratio. Transfer only face material, bevel depth, outline stack, edge highlights, shadow depth, palette, texture, and light direction.
5. Generate one result by default. Create a second candidate only when the first fails structural validation or the user explicitly requests alternatives.
6. Compare the result against `TARGET_SHAPE`, not merely against the visual mood. Reject changed glyphs, counters, spacing, row hierarchy, or stretched width. A beautiful but structurally altered result is a failure.
7. After the one-pass render succeeds, accept only the externally completed transparent title PNG handed off by title production. Use it byte-for-byte without Mask Forge, alpha work, trimming, normalization, or re-save, then continue to native-size QA and placement. Preserve the handed-off asset as the immutable authority.

If the user provides only a rendered reference and no trustworthy target-text shape, do not pretend material transfer can preserve exact Hangul. Offer a simple editable/deterministic target-shape preparation step or switch to `creative-new`.

## Workflow

The workflow below applies only to `creative-new`. Do not run it for a validated `repeat-update` or `reference-remap`.

1. Read `references/engine-map.md` when choosing an engine or mapping an app preset. Read `references/nexus-app-handoff.md` before operating Nexus Studio or handing an image to Render Matrix. Read `references/prompt-arc-retrieval.md` before searching Nexus Prompt Arc.
2. Choose `sovereign` for RPG, combat, monumental, emblematic, sharp, metallic, or cinematic titles. Choose `breeze` for casual, handwritten, sticker, rounded, festive, soft, or calligraphic titles.
3. Before generating, inspect the actual background together with the character, item, logo, and existing effects. Require a direction brief containing mood, palette, lighting, material cues, main-visual weight, title-safe area, exact row structure, and avoid rules. When invoked by `/game-banner-automation`, consume its `title-direction-brief.json`; do not replace it with an event-copy-only guess. Measure the destination slot, run `plan-title-geometry.mjs`, and resolve `lineCount` from the passing plan before selecting a live Figma shape reference. Do not keep a one-line guide when the exact wording fails capacity, and do not introduce a second row merely to fill a generation canvas when the one-line plan passes.
4. Audit title references before choosing an engine or prompt. Check user-named references first, then supplied files/PSD layers, the target Figma title-sample page, and current-campaign references. A user-named approved reference remains authoritative. When the BNS consolidated guide is available, run [figma-shape-search.md](references/figma-shape-search.md) before Prompt Arc retrieval. A selected guide node becomes the primary `SHAPE_REFERENCE`; Prompt Arc may be used only after the search returns `no-match` or as separately recorded secondary recipe evidence that does not override the selected guide geometry.
5. Search Nexus Prompt Arc for reusable Typecore title recipes. Call `nexus_prompt_arc_list` with `category="타이포"` and `nature="typography"`; select `style`, `theme`, and short targeted `query` values from the direction brief. Fetch the strongest candidates with `nexus_prompt_arc_get` so selection uses the actual prompt stages, image, tags, keywords, and linked records—not list thumbnails alone. Follow `references/prompt-arc-retrieval.md`.
6. Require `prompt-arc-audit.json` containing the queries, filters, candidate IDs, structural comparison, selected Prompt Arc ID or explicit `none`, source image URL, reusable prompt stages, locked recipe fields, changeable fields, and rejection reasons. Also require `title-reference-audit.json` with all searched locations and the final reference relationship.
7. Prefer a Prompt Arc candidate only when its row hierarchy, title length class, width relationship, stroke language, and mood materially fit the requested title. Visual theme similarity alone is insufficient. If several credible candidates remain unresolved, show the strongest candidates and stop for selection. If none is structurally credible, record `promptArcMode: none` and continue without forcing a match.
8. When a Prompt Arc recipe is selected, preserve its structural and stylistic prompt clauses verbatim. Change only the exact title text, requested line breaks, required output ratio, and campaign-specific palette/material fields identified as changeable. Do not rewrite, embellish, or merge the locked recipe with a generic house prompt.
9. Run `node scripts/build-title-brief.mjs --text "..." --engine auto --concept "..." --geometry-plan title-geometry-plan.json --output <path>` to produce the canonical generation brief. The builder has no implicit ratio fallback: `--ratio` is a legacy explicit override only. Merge the direction brief, authoritative user reference, and selected Prompt Arc recipe without overriding locked clauses. Use explicit `--engine sovereign|breeze` when the user specifies an app.
10. Invoke `/nexus-imagen-render` through the protected Nexus `/api/codex-imagen` endpoint using the selected Typecore engine's prompt rules. Generate two meaningfully different flat monochrome candidates by default. Use a solid pure-black blank input when no visual reference is required; transmit supplied references only after authorization. Every AI-generated Typecore candidate and Render Matrix result must use a solid pure-black background. Never request transparency, alpha, a transparent background, a checkerboard, or simulated transparency from an image model. Vary letter rhythm, silhouette, or emphasis while keeping the same exact text, rows, ratio, and concept.
11. Retrieve the actual Typecore renders as `title-flat-a.png` and `title-flat-b.png`; do not substitute locally re-created approximations. Preserve each source app, preset, full applied prompt, selected Prompt Arc ID, source image URL, and recipe fields.
12. Validate each candidate's silhouette, counters, spelling, spacing, and line breaks. Discard and regenerate any candidate that changes the requested Hangul or row structure.
    - When `generationMode` is `two-row-proxy-for-single-line-recomposition`, validate the two proxy rows against `proxyRecomposition.sourceRows`; after approval, run `recompose-title-line.py` and treat only its passing one-line output as the shape candidate for material rendering.
13. Display every valid flat candidate inline in the chat before any material rendering. Label them `A` and `B`, briefly describe the structural difference, and provide clickable local asset links as a fallback when inline previews do not render.
14. Stop and wait for explicit user selection or approval. Accept responses such as `A`, `B`, `1번`, `2번`, `이대로 진행`, or a concrete revision request. Do not call Render Matrix, remove backgrounds, upload to Figma, or create final title nodes before this approval.
15. When the user requests a revision, generate revised flat candidates and repeat the preview gate. Do not treat silence, general positive sentiment, or approval of the overall project as approval of a specific candidate.
16. After approval, rename or copy a direct selected candidate as `title-flat-approved.png`. For the proxy route, preserve the selected source as `title-flat-proxy-2row-approved.png`, recompose it, then copy the passing `title-flat-recomposed-1row.png` as `title-flat-approved.png`. Record the selected candidate id and recomposition manifest in the handoff metadata.
17. Pass only `title-flat-approved.png` to `/nexus-imagen-render` through `/api/codex-imagen`; record the handoff as `renderMatrixMode: api`.
18. Before material rendering, verify that `title-flat-approved.png` is genuinely flat: no pre-existing bevel, metallic highlight, colored rim, stacked outline, extrusion, cast shadow, glow, or gray depth fringe. Reject and regenerate a contaminated shape candidate rather than letting the material pass amplify its edges.
19. Use locked-material image-to-image mode with the exact selected Figma GPT preset. Copy its persona, material, relief, detail, texture, wear, depth, lens, FX, rim, shadow, background, model size, and Mask Forge route into the handoff. Also export and attach the selected preset's actual rendered sample as `MATERIAL_REFERENCE`; textual settings alone are insufficient for exact preset fidelity. `title-flat-approved.png` controls glyph geometry, while `MATERIAL_REFERENCE` controls surface, bevel scale, rim width, and optical restraint. Change only fields explicitly listed as adaptable in `render-preset-audit.json`; never replace the preset with a generic mood prompt. Render only material, bevel, outline stack, depth, and lighting on a solid pure-black background. Do not request transparency from the image model. Do not open or depend on the Nexus UI.
20. Treat hairline bevel, rim, separation edge, and palette accent as one coordinated edge stack. Do not prompt them as additive concentric outlines unless the sample visibly contains each layer. Match the sample's relative border thickness; when direct measurement is not reliable, keep total external expansion below 1.5% of visible glyph height and keep hairline bevel/rim primarily inside the shape silhouette. Never add a campaign-color outline solely because that color appears elsewhere in the banner.
21. Inspect the Render Matrix result against both `title-flat-approved.png` and the exported preset sample. Reject any changed glyph, counter, line break, width relationship, or silhouette, and reject a candidate that is optically bulkier, duller, rounder, or more heavily outlined than the sample. Save `render-preset-fidelity.json` with the preset node ID, sample export, observed edge stack, allowed external expansion, and comparison result. Keep the flat source and rendered candidates separate.
20. Title handoff must already provide the final transparent PNG. Treat it as byte-immutable and never invoke Mask Forge, Remove AI, Adobe background removal, alpha extraction, trimming, normalization, RGB recomposition, or another transparency operation. If the file is unusable, stop and return it unchanged to title production.
21. When a Figma destination is supplied, load and follow `figma-use`. Place the already completed trimmed transparent PNG at its delivery aspect ratio rather than retaining the Render Matrix canvas ratio. In production game banners, Figma operations on the title are limited to upload, proportional scale, and position; keep subtitle and date editable unless requested otherwise.
22. Verify at final banner size and preserve the Prompt Arc audit, both candidates, approval record, brief, handoff record, selected Render Matrix output, and final trimmed delivery PNG for reproducibility.

## Approval gate

- In `creative-new`, default to two flat candidates and one explicit selection. This gate does not apply to a validated deterministic `repeat-update`.
- In `reference-remap`, approval applies to the selected material reference before rendering; do not add a second shape-candidate gate. One locked material result is the default.
- Treat the chat preview as a mandatory production gate, not an optional progress update.
- End the turn after showing candidates and asking the user to choose. Continue the pipeline only in a later turn containing an explicit selection or approval.
- Never pre-render materials for all candidates unless the user explicitly requests rendered comparisons.
- If inline images fail to display, re-attach them and include clickable file links; do not skip the gate.
- Begin the preview gate only after the mood-analysis and reference-audit gate is resolved. A named but unretrieved reference blocks generation.

## Source integrity

- Reuse the source app's rules and presets; do not copy UI implementation into the skill.
- Keep the exact requested title string as the highest-priority lock.
- Preserve requested line breaks. If none are supplied, split Korean text at word boundaries into balanced rows.
- Do not silently add English, logos, subtitles, dates, or decorative words.
- Keep body and lighting separable whenever the output will be composited in Figma or Photoshop.
- Ban transparency instructions in all AI-generation prompts. The assembly workflow accepts only a separately completed transparent title PNG and then uses it unchanged. Never convert, replace, or repair title alpha inside Typecore handoff or Figma assembly, and never route a handed-off title through Mask Forge, Remove AI, Adobe transparency, effect transparency, or luminance-to-alpha extraction.
- Require `NEXUS_API_BASE_URL` and `NEXUS_CODEX_RENDER_TOKEN`. Stop on API failure and do not create a local approximation unless the user explicitly authorizes a fallback.

## Long-title proportion lock

Treat every Korean title as a geometry-locked asset before material rendering. Long titles must solve capacity through row structure, token hierarchy, tracking, or a purpose-built condensed letterform—not by flattening glyph height.

1. Preserve `title-geometry-plan.json` as the authority for slot size, rows, target ratio, and permitted horizontal scale. A long title may use one line only when that plan passes.
2. When no campaign-specific slot exists for an 1180×750 banner, start from a title region occupying roughly 65–72% of frame width and 14–18% of frame height, then run the planner. This range is not a fixed output ratio.
3. Build the flat `TARGET_SHAPE` on the planned render canvas with `horizontalScale: 1`, `verticalScale: 1`, and natural near-square Hangul skeletons. The previous `82–90% verticalScale` wording is invalid for this problem. The prohibited operation is narrowing glyph width relative to height to force more letters into one line. Do not select Sovereign `P_Condensed`, Breeze `P_Condensed`/`P_Slim`, or `Narrow` width for a long one-line title unless the user explicitly requests a tall-narrow lettering style.
4. For nine or more visible graphemes, allow the visible one-line silhouette to reach its natural `8–10:1` or larger ratio while the render canvas remains, for example, `2.76:1`. Preserve width occupancy and derive lower height occupancy plus symmetric top/bottom whitespace. When direct generation is unstable, use the two-row proxy recomposition fallback. When natural-proportion legibility fails, prefer a semantic 2-row split, a smaller independent qualifier, or a different measured layout slot.
5. Crop the flat shape to visible alpha bounds with only antialias-safe padding, then save its visible-bounds width, height, ratio, cap-height proxy, baseline, row gap, and counter boxes as `title-geometry-lock.json`.
6. Pass this exact flat shape to Render Matrix. Material rendering may change surface, bevel, outline, and internal lighting only. It may not change glyph width/height proportion, row structure, baseline, counters, or visible artwork ratio by more than 2%.
7. Compare alpha/subject bounds of every material result with both geometry artifacts. Reject and rerender when height retention, ratio, row count, baseline, or counter geometry exceeds tolerance. Never repair a failed result with non-proportional scaling.
8. Figma placement must preserve the approved asset ratio. Any non-proportional Figma compression is an assembly defect. Keep shadow, glow, flames, smoke, and particles outside geometry measurement and on separate layers.

Campaign-specific title ratios belong in the external title manifest. Never derive or approve a new title ratio from a destination-Figma distortion.

## Output handoff

For `repeat-update`, return the matched campaign master, source type, previous and requested token, deterministic or constrained-patch method, validation result, new versioned title asset, retained title-front FX, library family/version IDs, and Figma node link when applied. For `reference-remap`, return the target-shape source, Figma shape-search result and selected node when used, selected catalog ID or user-reference path, one-pass material-render result, structure-lock QA, transparency method, opaque and transparent pixel dimensions, library promotion result, and Figma node link when applied. For `creative-new`, before approval return the analyzed mood, Figma shape-search result, selected guide reference or explicit `no-match`, Prompt Arc queries, selected Prompt Arc ID or `none`, recipe-fit reason, candidate labels, inline previews, flat asset links, and structural differences only. After approval, return the selected engine, candidate id, approval text, preset direction, approved Typecore flat asset path, proxy source and `title-proxy-recomposition.json` when used, selected guide node, selected Prompt Arc ID and source URL, Render Matrix result path, transparency method, opaque and transparent pixel dimensions, alpha QA result, library promotion result, and Figma node link when applied. Save the mode record, Figma shape-search audit when applicable, direction brief, title-reference audit, Prompt Arc audit when used, generation brief, and handoff metadata next to the output assets so the title can be reproduced.
