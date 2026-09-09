---
name: game-banner-automation
description: Create, refine, evaluate, and deliver multi-size promotional game-banner families through one evidence-gated pipeline with pluggable game profiles. Use for Aion, Blade & Soul, future game campaigns, character-led or item-led banners, reward bundles and floating-item emphasis, title production, Figma assembly, multi-size adaptation, and banner QA.
---

# Game Banner Automation

Produce one coherent banner family through a shared production system. Keep game-specific logo, channel badge, frame-role, guide, and delivery differences in a profile instead of branching the core workflow by game.

## Required reading and routing

- Read [references/pipeline.md](references/pipeline.md) before starting or changing a campaign job.
- Read [references/contracts.md](references/contracts.md) before creating stage evidence.
- During `02-layout-selection`, read [references/shared-layout-pool.json](references/shared-layout-pool.json) and use the combined Aion+BNS 40-sample pool without filtering by game.
- During `06-master-assembly`, resolve the game with `scripts/resolve-game-profile.mjs`, then read only the selected profile's guide named in its `guide` field.
- Invoke `/photographer-layout` before locking subject scale, crop, focal placement, or Core-20 composition. Require its machine-readable crop contract when a character is present.
- Invoke `/typecore-title` before choosing a rendered-title route or generating a repeated campaign title. Use `/gpt-banner-title` when a genuinely new GPT-rendered title direction, material, or title FX is required.
- Use `/nexus-mask-forge` for solid-title or solid-subject transparency. Use `/nexus-effect-extractor` only for light, smoke, aura, fog, sparkle, and particle plates.
- Use `/nexus-kv-enhance` only during `05-visual-asset-production`. Preserve the approved source character and locked geometry.
- During `01-request-analysis`, automatically set `itemPresentationRequired=true` when request text, supplied item assets, PSD/Figma groups, references, or the chosen composition show a promoted reward bundle, floating/orbit/bubble cluster, chest satellites, primary item with satellites, or a hero item needing rear/front FX. This detection creates the requirement; do not wait for a pre-existing `ITEM_SLOT` or an explicit “아이템 효과” request.
- During `02-layout-selection`, create and lock `ITEM_SLOT` for every detected item presentation.
- During `05-visual-asset-production`, invoke `/rubicon-item-effect-template` for every required item slot. Route coherent clusters through Nexus Item Bundle, independent floating rewards through Nexus Floating, and preserve the approved item slot and item identities. Omit only flat reward tables, inventory grids, tiny inline icons, or explicitly informational items, and record the omission evidence.
- Load and follow `figma-use` immediately before every programmatic Figma read or write.
- Invoke `/nexus-design-evaluator` for the assembled 1180 master during `06-master-assembly`.

## Decision priority

Honor this order for every game and frame:

1. **Form** — identity, glyph structure, silhouettes, camera, and protected source content.
2. **Proportion** — subject occupancy, crop landmarks, title ratio, relative scale, and safe-area allocation.
3. **Composition** — positions, overlaps, depth, reading order, and frame-specific geometry.
4. **Image quality** — material, texture, color, lighting, integration, and identity-preserving restoration.
5. **Effects** — rear, contact, front, atmospheric, title, and item effects.

A later operation may not repair or silently change a higher-priority decision. This is a conflict-resolution order, not the visible production sequence. Layout is selected before title production because it supplies the title slot and visual hierarchy; the approved title shape must still never be stretched or redrawn merely to fit that slot.

## Seven-stage production workflow

Initialize a campaign with `scripts/build-game-banner-job.mjs`. Work only on the active stage reported by `scripts/banner-workflow-gate.mjs --action status`.

1. `01-request-analysis` — analyze the request and image resources, preserve sources, record the requested game, and detect whether promotional item presentation is required.
2. `02-layout-selection` — rank the shared Aion+BNS 40-layout pool, lock one measured blueprint, and reserve `ITEM_SLOT` when detected.
3. `03-title-shape` — create or reuse the exact title shape for the selected title slot.
4. `04-title-render` — render material and transparency without changing the approved shape.
5. `05-visual-asset-production` — improve the background and character, create item bundle or floating-item presentation when required, then add aligned effects.
6. `06-master-assembly` — assemble and evaluate the 1180 Figma master and stop for final approval.
7. `07-variant-assembly` — only after master approval, build and deliver the remaining banner sizes.

Do not start a later stage merely because an asset is available. Do not use glow, wings, weapons, long cloth, particles, or transparent canvas bounds to determine the character's core scale. Effects may inherit locked geometry but may not resize or move it.

## Game-profile boundary

Record the requested game during analysis, but do not use it to filter or score layout candidates. Aion and BNS sample origins are provenance tags only. Activate the game profile only when brand and frame rules are needed:

- Stage 2: use the shared 40-sample layout pool; no game-profile rule applies.
- Stage 6: resolve the game profile, then apply official logo, channel badge, measured placement, and protected zones on the 1180 master.
- Stage 7: remaining frame names, visibility roles, brand placements, and delivery exceptions.

Profiles may define only game-specific differences:

- frame names, dimensions, and visibility roles;
- official logo and channel-badge routing;
- measured logo or badge bounds and protected zones;
- live Figma guide authority;
- game-specific recurring campaign or delivery exceptions.

Profiles must not redefine the seven production stages, five-step decision priority, transparency semantics, source-integrity rules, or evidence-gate behavior. A current user-approved live frame overrides profile defaults and must be recorded as an explicit override.

If a game has no maintained profile, create a campaign-local custom profile that follows [references/game-profile-schema.md](references/game-profile-schema.md). Do not guess official logos, badges, or fixed placement coordinates. Promote the local profile into this skill only after it becomes reusable.

## Figma assembly

Do not assemble the production Figma frame before the title, background, and character assets are accepted. The layout blueprint remains a measured plan until stage 6.

At stage 6, build the 1180 master from the accepted title, background, character, item-presentation, and effect assets, apply the active game's logo and badge rules, evaluate it, and stop for explicit final approval. At stage 7, duplicate roles rather than flattening the master and recompose every remaining aspect ratio from the approved master intent.

Keep background, atmosphere, rear FX, source or graded character, front FX, item layers, title body, title FX, copy, date, logo, and badges independently addressable. Layer cleanup and grouping are responsibilities of assembly, not a separate skill.

Re-read live Figma geometry before approval, propagation, and delivery. Intentional user edits are the strongest authority. A pre-approval edit updates the 1180 master; a post-approval structural edit invalidates variant assembly until the master is approved again.

## Completion

Run `scripts/banner-workflow-gate.mjs --action assert-delivery`. Return the selected game profile and version, selected shared-pool layout ID and source tag, title shape and render sources, preserved image resources, background and character outputs, item route and identity audit, layered item effects, approved 1180 Figma master, approval evidence, remaining frame list, evaluation result, delivery paths, and unresolved risks.
