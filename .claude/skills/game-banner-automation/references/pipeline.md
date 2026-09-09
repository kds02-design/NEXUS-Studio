# Seven-stage banner production pipeline

This is the visible workflow for every game. Technical checks, manifests, and specialist skills live inside these seven production decisions instead of appearing as separate user-facing stages.

## Controller

Create `banner-job.json` and `banner-workflow-state.json` with `scripts/build-game-banner-job.mjs`. Work only on the active stage. Complete it with `scripts/banner-workflow-gate.mjs --action complete --stage <id>` after its evidence passes validation.

The controller hashes completed evidence. An intentional upstream change must be reopened with `--action reopen --stage <id> --reason <text>` and every dependent stage is rebuilt.

## 01 Request and resource analysis

Read the request, source folders, PSDs, live Figma target, finished references, exact title and line breaks, copy, date, required sizes, logos, badges, characters, items, and backgrounds. Preserve immutable originals and create bounded working copies without cropping or upscaling.

Detect item presentation from evidence rather than waiting for an explicit request. Set `itemPresentationRequired=true` when rewards or products are intended as a promoted visual mass: a bundle, floating/orbit/bubble/sphere/crescent cluster, chest satellites, primary item with supporting items, or a single hero item needing rear/contact/front FX. Signals may come from request wording, multiple item authorities, PSD/Figma grouping, a finished reference, or the chosen hierarchy. Flat reward tables, inventory grids, and tiny inline icons remain informational and do not trigger it. Record the signals and decision, item count, reward semantics, primary/satellite hierarchy, labels, quantities, and immutable identity sources.

Record the requested game for later brand routing. Do not resolve or apply its profile yet; the layout pool is shared across games.

Evidence:

- `request-analysis.json`
- `asset-inventory.json`
- `working-assets-manifest.json`

## 02 Layout selection

Invoke `/photographer-layout`. Load `shared-layout-pool.json`, inspect both source collections, rank all 40 Aion+BNS samples as one game-neutral pool, and select one measured parent blueprint. Decide the 1180 hierarchy, character side and core occupancy, title slot, information area, item slot, negative space, and permitted crop exits.

When `itemPresentationRequired=true`, create and lock `ITEM_SLOT`: canvas, center, maximum bounds, item count, primary/satellite hierarchy, group semantics, intended overlap, safe distance from character/title/copy, and flow direction. Use untouched icons or neutral placeholders; do not create the finished bundle or floating effect yet. A missing pre-existing slot is not a reason to omit the specialist skill.

Do not boost or reject a sample because its source tag differs from the current game. Score structural suitability: subject count and type, title volume, information density, item emphasis, negative space, crop tolerance, and action direction.

This is a blueprint decision, not Figma production assembly. Do not generate a title, enhance images, or add effects to make a weak layout appear viable.

Evidence:

- `layout-selection.json` with exactly 40 ranked candidates, their source tags, and one selected ID
- `layout-blueprint-lock.json`

## 03 Title shape production

Use the selected blueprint's title slot and campaign wording. Search the approved title library first. Reuse a repeat-family master when the fixed wording and structure match; otherwise create the exact flat title shape.

Lock spelling, line breaks, counters, glyph silhouette, row relationship, and visible artwork ratio. A title may be rebuilt at the shape stage to suit the slot, but it may not be non-uniformly stretched after approval.

Evidence: `title-shape-lock.json`. Use `status: omitted` for a genuinely titleless campaign.

## 04 Title rendering

Render only material, bevel, outlines, lighting, and surface finish on the locked title shape. Validate Hangul, counters, row proportions, visible ratio, dark material, and actual alpha. Keep title-body transparency separate from title FX extraction.

Evidence: `title-render-manifest.json` with `shapePreserved: true`. Reused and omitted routes remain explicit.

## 05 Visual asset production

Improve the background first while preserving camera, crop, and structural masses. Then integrate the untouched character through deterministic color matching or an identity-protected rendering workflow. Protect the face, anatomy, costume identifiers, weapons, and source alpha.

After background, character, title material, palette, and principal light direction are accepted, invoke `/rubicon-item-effect-template` for every required item slot and choose one route. Do not substitute generic background removal or a flattened effect composite:

- `nexus-item-bundle`: three or more rewards that must read as one claimable or purchasable cluster;
- `nexus-floating`: independent rewards, exchange choices, labeled items, or compositions that need separate floating objects;
- `primary-satellites`: one hero reward with subordinate items;
- `rubicon-effect-only`: already sharp items whose original pixels must remain exact;
- `deterministic`: fallback when generated item identity does not pass audit.

Nexus creates the bundle or floating arrangement; Rubicon provides the coherent rear/contact/front light stack. Preserve all untouched item sources, audit each item, and keep every output registered to the locked `ITEM_SLOT`. Reject count, silhouette, emblem, border, dominant-color, orientation, or major-part drift.

After image quality is accepted, optional effects may be added in the order rear, contact or reflected light, source or identity-restored character, and front atmosphere. Keep aligned layers separate. Effects cannot change the locked blueprint or character core scale.

Evidence:

- `visual-asset-production-manifest.json` with `layoutPreserved: true` and `identityPreserved: true`
- `item-presentation-manifest.json` with `status: accepted | omitted`, selected route, slot parity, identity audit, and layered outputs

## 06 Figma 1180 master assembly and approval

Resolve and snapshot the game profile now. Load `figma-use` and assemble the production 1180 master from accepted title, background, character, item, and effect assets. Apply the active profile's 1180 logo, channel badge, safe zones, and role visibility. Keep all roles independently editable.

Invoke `/nexus-design-evaluator`, apply only layer-scoped corrections, re-read the live 1180 frame, and stop for explicit final approval. Do not create the remaining banners before approval.

Evidence:

- `master-assembly-manifest.json`
- `master-evaluation.json`
- `master-approval.json` with `approved: true`
- `game-profile-lock.json`

## 07 Remaining banner assembly and delivery

Use the approved live 1180 frame as the family master. Build the remaining frames by reusing approved role assets and recomposing each aspect ratio independently. Do not flatten and proportionally resize the master. Apply each profile frame's visibility, logo, badge, transparency, and export rules.

Re-read all live frames, validate actual dimensions and alpha pixels, then export and deliver.

Evidence:

- `variant-assembly-manifest.json`
- `frame-manifest.json`
- `delivery-validation.json` with `pass: true`
