# Seven-stage evidence contracts

All evidence files are UTF-8 JSON objects. These are minimum fields, not complete campaign schemas.

## Analysis

`request-analysis.json` records `status: analyzed`, exact text, requested sizes, Figma target, campaign goal, unresolved inputs, and a required `itemPresentationDetection` object. The detection stores `decision: required | not-required`, non-empty evidence signals, and the matching visual semantics such as bundle, floating, orbit, bubble, sphere, crescent, chest satellites, primary-satellites, hero-item FX, or informational-only. `itemPresentationRequired` must agree with that decision. When true, also record item count, reward semantics, hierarchy, labels, quantities, and source authority. `asset-inventory.json` records the authority and path for every source role. `working-assets-manifest.json` records immutable and working dimensions.

## Layout

```json
{
  "status": "locked",
  "catalog": "aion-bns-shared-40",
  "rankedCandidates": [{"id": "...", "sourceTag": "aion | bns", "rank": 1}],
  "selectedLayoutId": "...",
  "masterFrame": {"width": 1180, "height": 750},
  "titleSlot": {},
  "characterCore": {},
  "informationArea": {},
  "itemSlot": {}
}
```

`rankedCandidates` contains exactly 40 unique IDs: 20 tagged Aion and 20 tagged BNS. Source tags record provenance and do not affect scoring. `layout-blueprint-lock.json` stores measured masses, safe areas, crop landmarks, tolerances, and any approved deviations.

## Title shape

```json
{
  "status": "locked",
  "exactText": "캠페인 타이틀",
  "lineBreaks": ["캠페인", "타이틀"],
  "source": "approved-library | typecore | editable-master",
  "visibleArtworkRatio": 3.12,
  "layoutBlueprint": "layout-blueprint-lock.json"
}
```

`status: omitted` is valid for a titleless campaign.

## Title render

```json
{
  "status": "accepted",
  "shapeLock": "title-shape-lock.json",
  "shapePreserved": true,
  "opaqueSource": "...",
  "transparentOutput": "...",
  "alphaQA": {}
}
```

`status: reused` or `omitted` is valid; omitted rendering still records `shapePreserved: true`.

## Visual asset production

```json
{
  "status": "accepted",
  "layoutPreserved": true,
  "identityPreserved": true,
  "background": {},
  "character": {},
  "effects": [],
  "rejectedCandidates": []
}
```

`item-presentation-manifest.json`:

```json
{
  "status": "accepted",
  "route": "nexus-item-bundle | nexus-floating | primary-satellites | rubicon-effect-only | deterministic",
  "slotPreserved": true,
  "identityPreserved": true,
  "groupMode": "all | each | primary-satellites | custom",
  "sourceItems": [],
  "identityAudit": [],
  "layers": ["FX_BACK", "GROUND_OR_CONTACT", "ITEMS", "FX_FRONT"]
}
```

Use `status: omitted` only when `request-analysis.json` does not require an item presentation.

## 1180 master

`game-profile-lock.json` is produced immediately before assembly by `resolve-game-profile.mjs` and snapshots the selected profile and version.

`master-assembly-manifest.json` uses `status: assembled`, records a `masterFrame` whose width is 1180, live Figma node IDs, role geometry, active game-profile brand assets, and overrides.

`master-evaluation.json` uses `status: pass | max-rounds | not-required` and stores correction rounds.

`master-approval.json` requires `approved: true`, approval source, timestamp, approved Figma frame ID, and a geometry or manifest hash.

## Variants and delivery

`variant-assembly-manifest.json` and `frame-manifest.json` contain non-empty `frames` arrays and reference the approved master. `delivery-validation.json` uses `pass: true` and records export paths, dimensions, formats, alpha checks, text checks, and brand checks.
