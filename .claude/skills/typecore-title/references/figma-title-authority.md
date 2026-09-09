# Figma title authority

Use this contract whenever the destination Figma file contains title guides or render presets.

This is read-only reference authority, not title-authoring authority. Figma may be inspected to identify approved guide samples, preset IDs, and destination slot geometry. Never create, retype, edit, outline, vectorize, mask, render, alpha-repair, or export the target title from Figma. The exact target title must be produced and validated externally as a transparent PNG before assembly. Destination Figma may only upload, proportionally scale, and position that immutable PNG.

For BNS, discover every role first in the relocated guide file `xBPE1bR5luASNBpdOMyp10`, page `0:1` (current name `Page 1`): named typography sections control glyph geometry and `Render Matrix · Individual Pro 1K Presets` controls rendering. Read [figma-shape-search.md](figma-shape-search.md), complete its live search, and save `figma-shape-search.json` before selecting geometry. The older `타이틀_형태_샘플`, `타이틀_랜더링_샘플`, and `타이틀 재질 샘플` pages are fallback references only when the relocated guide lacks the needed role. Known node IDs are cache hints; confirm live names every run.

Material selection is an exhaustive live comparison. Enumerate every category and card in the Render Matrix, retrieve each plausible sample preview, and record selected and rejected preset node IDs. Do not narrow candidates from the request word “banner,” a category label, or a preset prefix. `CAMPAIGN THEMES` and `CT-*` have equal standing with GOLD, STEEL, ICE, LAVA, and VARIETY.

`title-guide-audit.json` must contain `figmaFileKey`, `shapeGuidePageId`, `shapeGuidePageName`, `shapeSearchAuditPath`, `selectedShapeNodeId`, `selectedShapeNodeName`, `lineCount`, `targetText`, `targetArtworkRatio`, `slotWidth`, `slotHeight`, `selectionReason`, and `rejectedShapes`. Its selected node must match `figma-shape-search.json`; a manual prose choice cannot replace the search artifact.

`render-preset-audit.json` must contain `figmaFileKey`, `presetPageId`, `presetPageName`, `renderedSamplePageId`, `searchedCategories`, `candidatePresetNodeIds`, `selectedPresetNodeId`, `presetId`, `presetName`, `settings`, `adaptableFields`, `lockedFields`, `selectionReason`, and `rejectedPresets`. `searchedCategories` must include GOLD, STEEL, ICE, LAVA, CAMPAIGN THEMES, and VARIETY from the live Render Matrix. `candidatePresetNodeIds` must contain the selected node plus every visually inspected finalist.

The settings object retains persona, material, relief, detail, texture, wear, depth, lens, FX kind/placement/intensity, rim, shadow, background, model, size, and transparency route. Omitted values are explicit `null`, never invented defaults. Run `node scripts/validate-figma-title-audit.mjs --guide=title-guide-audit.json --preset=render-preset-audit.json` before generation. The shape guide controls glyph geometry and immutable line count; the selected preset controls rendering.
