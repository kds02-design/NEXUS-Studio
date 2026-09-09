# Live Figma Shape Search

Use this gate before choosing or generating a title shape from the BNS consolidated guide. It selects glyph geometry only. Search material presets separately after the shape is locked.

## Scope and authority

Search page `0:1` (current name `Page 1`) in live file `xBPE1bR5luASNBpdOMyp10`. Confirm the page by the seven named typography sections and re-read node names on every run; stored IDs are cache hints, not authority.

Primary shape pools are the live sections named:

- `01_고딕·블록`
- `02_세리프·판타지`
- `03_붓글씨·캘리`
- `04_캐주얼·카툰`
- `05_레트로·테크노`
- `06_로고·엠블럼`

`07_효과·텍스처` is a modifier pool used only after selecting a primary shape. `Render Matrix · Individual Pro 1K Presets` is a material pool and must never enter shape ranking.

A user-named guide node is authoritative when it is retrievable and compatible with the requested line structure. Otherwise run the complete search below.

## Build the target query

Derive the query from the exact title, destination slot, passing `title-geometry-plan.json`, current banner/previsual, and approved campaign records. Record:

- exact target text and fixed/variable tokens;
- line count and row hierarchy;
- word and syllable counts plus `short | medium | long` length class;
- slot width, slot height, and target artwork ratio;
- `gothic-block | serif-fantasy | brush-calli | casual-cartoon | retro-techno | logo-emblem` family preference or `open`;
- horizontal, vertical, stacked, emblem, or freeform composition;
- intended emphasis location and relative word scale;
- mood and banner role.

Copy the plan's `status`, selected rows, `horizontalScale`, `verticalScale`, artwork ratio, and capacity thresholds into the search artifact. A selected guide must fit these locks. A one-line sample is not structurally compatible when the planned one-line candidate failed capacity, even if its mood and material look suitable.

Do not infer a different line count merely because a reference preview uses a convenient canvas shape.

## Discover and shortlist

1. Read live metadata for the page and confirm all primary section names.
2. Enumerate every child sample node name and ID inside the primary sections.
3. Use node names and section roles to remove clearly incompatible candidates. Do not reject solely by color or material visible in the preview.
4. Shortlist at most five structurally plausible samples.
5. Retrieve the actual preview or screenshot for every shortlisted node. Metadata names alone do not prove line count, rhythm, or silhouette.
6. Treat image-filled rectangles as visual references, not editable glyph paths. Record whether a trustworthy editable or exact target-text shape exists separately.

Hard-reject a candidate when its row hierarchy conflicts with the passing geometry plan, its length class would require vertical compression, its title role is incompatible, the preview cannot be retrieved, or the visible shape is too damaged/cropped to judge. A user may explicitly authorize a new row structure, but rerun the geometry planner and record the new passing plan; an override never authorizes non-proportional scaling.

## Score structural fit

Score every valid shortlist candidate out of 100:

- row hierarchy and line-count fit: 0–30;
- title-length class, width relationship, and artwork-ratio fit: 0–25;
- stroke/shape-family fit: 0–20;
- emphasis structure and word rhythm: 0–15;
- campaign mood and banner-role fit: 0–10.

Structure outranks mood. Do not award structural points because colors or materials feel similar. Record a short evidence-based reason for every component score.

Interpret totals as follows:

- `85–100`: high-confidence shape reference;
- `70–84`: usable reference with named adaptations;
- below `70`: reject as primary shape.

If the top candidate scores at least 85 and leads the runner-up by more than 5 points, select it automatically unless the user requested choices. Otherwise show the strongest two or three candidates and wait for selection. Never average or silently blend candidates. A second reference may contribute one explicitly named micro-feature only.

## Decide the route

- Exact approved wording or editable master: route to `repeat-update`.
- Selected guide reference plus trustworthy exact target-text shape: route to `reference-remap`.
- Selected visual reference but no trustworthy target-text shape: use it as primary shape evidence while preparing or generating flat target-text candidates; do not claim direct remap.
- No candidate at 70 or above: record `result: no-match`, then allow Prompt Arc or `creative-new`.

Select optional `07_효과·텍스처` modifiers only after this route is fixed. Select Render Matrix material only after the final shape is locked.

## Required artifact

Save `figma-shape-search.json` beside the campaign title artifacts:

```json
{
  "figmaFileKey": "xBPE1bR5luASNBpdOMyp10",
  "pageId": "0:1",
  "pageName": "Page 1",
  "query": {
    "targetText": "",
    "lineCount": 1,
    "rowHierarchy": "single",
    "lengthClass": "medium",
    "slotWidth": 0,
    "slotHeight": 0,
    "targetArtworkRatio": 0,
    "geometryPlanStatus": "planned",
    "horizontalScale": 1,
    "verticalScale": 1,
    "preferredFamily": "open",
    "composition": "horizontal",
    "emphasis": "none",
    "mood": "",
    "bannerRole": "main-title"
  },
  "searchedSections": [],
  "candidates": [
    {
      "nodeId": "",
      "nodeName": "",
      "sectionName": "",
      "previewEvidence": "",
      "editableShapeAvailable": false,
      "scores": {
        "rowHierarchy": 0,
        "lengthAndRatio": 0,
        "shapeFamily": 0,
        "emphasisRhythm": 0,
        "moodRole": 0,
        "total": 0
      },
      "adaptations": [],
      "rejectionReason": null
    }
  ],
  "result": "selected",
  "selectedShapeNodeId": "",
  "selectedShapeNodeName": "",
  "selectionReason": "",
  "secondaryMicroFeature": null,
  "nextRoute": "reference-remap"
}
```

Allowed `result` values are `selected`, `needs-selection`, and `no-match`. Allowed `nextRoute` values are `repeat-update`, `reference-remap`, `prepare-target-shape`, and `creative-new`.

`title-guide-audit.json` must reference this artifact and repeat the same selected node. Do not continue to material selection when the result is `needs-selection`. Do not enter `creative-new` unless the result is `no-match` or the selected visual reference lacks a trustworthy target-text shape and target-shape preparation has explicitly failed.
