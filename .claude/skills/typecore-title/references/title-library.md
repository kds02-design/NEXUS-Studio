# Approved Title Library

Read this reference when searching for a reusable title, promoting an approved delivery, or reconciling library versions.

## Authority and storage

Resolve the library root from an explicit request, campaign configuration, or `TITLE_LIBRARY_ROOT`, in that order. The root must already be authorized and writable. Keep a machine-readable index as the retrieval authority; a Figma library page is an optional visual projection for human review.

Recommended layout:

```text
title-library/
|-- index.jsonl
|-- families/
|   `-- <game>/<campaign>/<family-id>/
|       |-- manifest.json
|       |-- shape-lock.png
|       |-- material-master.png
|       |-- alpha-master.png
|       |-- fx-front.png              optional
|       |-- preview-banner.jpg        optional
|       `-- versions/<version-id>/
`-- thumbnails/
```

Do not overwrite an approved master. Use immutable version directories and update only the family's `latestApproved` pointer and index record after the new package is complete.

## Search before generation

Normalize spacing for lookup without changing the requested display text. Search in this order:

1. exact `game + campaignBaseTitle + fixedText` match;
2. same family with a compatible `tokenType` such as season, round, phase, part, `추가`, or `신규`;
3. same campaign with compatible line count, title-length class, visible ratio, and editable source;
4. approved style reference with compatible shape family, row hierarchy, width relationship, material preset, and banner role;
5. `creative-new` only when no trustworthy result remains.

Select `repeat-update` only for high-confidence fixed-text and material identity. Select `reference-remap` when a trustworthy target shape exists but the wording differs. Never choose a master solely because its color or mood resembles the new banner.

Record the query, candidates, match reasons, rejected candidates, selected family/version, and confidence in `title-library-match.json`. When several similarly credible non-exact references remain, show at most the strongest three for selection instead of silently blending them.

## Promotion gate

Promote only when all of the following are evidenced:

- explicit user selection or approval of the final title;
- exact wording and line breaks pass;
- shape/geometry validation passes;
- material validation passes;
- real-alpha validation passes;
- final banner placement is accepted;
- source paths and Figma node IDs, when used, are known.

Do not promote AI candidates, rejected outputs, intermediate opaque renders, failed alpha extractions, or flattened banner crops that lack a trustworthy title master.

## Package contract

Each approved family manifest should contain the fields that are actually known and needed for retrieval:

```json
{
  "libraryId": "bns-soulpass-main",
  "status": "approved",
  "game": "bns",
  "campaign": "soulpass",
  "campaignBaseTitle": "봉마 소울패스",
  "displayText": "봉마 소울패스 시즌 3",
  "fixedText": "봉마 소울패스",
  "variableToken": "시즌 3",
  "tokenType": "season",
  "roles": ["campaign-master", "style-reference"],
  "lineCount": 1,
  "visibleRatio": 5.84,
  "lengthClass": "medium",
  "shapeFamily": "fantasy-emblem",
  "materialPreset": "GOLD-004",
  "editableTokenLayer": true,
  "shapeLockPath": "shape-lock.png",
  "materialMasterPath": "material-master.png",
  "alphaMasterPath": "alpha-master.png",
  "fxFrontPath": "fx-front.png",
  "previewPath": "preview-banner.jpg",
  "figmaFileKey": "<file-key>",
  "figmaNodeId": "<node-id>",
  "sourceEngine": "nexus",
  "approvedAt": "<ISO-8601 timestamp>",
  "latestApproved": "season-03",
  "versions": ["season-01", "season-02", "season-03"]
}
```

Preserve the actual opaque, transparent, shape, and optional FX assets independently. Do not infer `editableTokenLayer: true` from visual appearance; record it only when an editable source exists.

## Deduplication and versioning

Use campaign identity and fixed wording as the primary family key. Use the shape-lock or alpha silhouette hash, source Figma node ID, and material preset as supporting duplicate evidence. Do not merge different fixed wording merely because their silhouettes or materials look similar.

When an exact family exists:

- add the accepted result under a new immutable version ID;
- retain prior approved versions;
- update `latestApproved` only after the new package and index record are complete;
- preserve which token changed and which assets were reused;
- keep separate style-reference relationships instead of duplicating the same assets.

## Figma visual projection

When the workflow is authorized to update a Figma library page, create or update one card per approved family rather than one card per render. Show the transparent preview, campaign base title, current token, shape family, material preset, visible ratio, approval date, and latest version. Name cards predictably, for example `TITLE_LIB / BNS / SOULPASS / 봉마 소울패스 / APPROVED`.

The Figma page helps people browse and select. Retrieval should still begin with the machine-readable index so large pages, cropped previews, or renamed layers do not become the only evidence.

## Missing library root

If the root is unavailable, write `pending-library-entry.json` beside the approved delivery. Include the proposed family ID, manifest fields, asset paths, approval evidence, and intended operation (`create-family` or `add-version`). Do not create an arbitrary global directory, mutate an unrelated Figma file, or claim that the title was promoted.
