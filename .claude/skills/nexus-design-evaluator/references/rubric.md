# Nexus design evaluation contract

The JSON produced by `scripts/sync-criteria.mjs` is the authority for metric IDs, names, descriptions, weights, active scoring rules, and version metadata. The table formerly copied into this file was removed because it could drift from Nexus Admin.

## Scoring schema

Create JSON in this form:

```json
{
  "frame": "1180x750_Notice",
  "criteriaType": "banner",
  "criteriaVersionId": "copy exactly from criteria.json",
  "scores": {
    "<every synchronized criterion id>": {"score": 0, "reason": "visible evidence in Korean"}
  },
  "hardFailures": [],
  "recommendedCorrections": []
}
```

Do not add, omit, rename, or reorder synchronized criteria. Apply the active `rules` text from the snapshot when assigning scores.

## Calibration

- 90–99: exceptional, highly polished, distinctive, and production-ready
- 85–89: strong production-ready result with only minor refinements
- 80–84: competent but generic, flat, weakly integrated, or visibly improvable
- 70–79: meaningful hierarchy, contrast, crop, or finish problems
- below 70: severe usability, legibility, compositing, or requirement failure

Cap the overall result around 80–85 when the composition is merely centered and one-dimensional even if readable. Score typography, readability, and color in the 60s–70s when title/background separation is visibly weak. Penalize layout, flow, and impression when the character, text, and effects feel scattered or lack hierarchy. Award 90+ only with specific visible evidence.

## Gate

The scorer reads the shared Nexus gate. Currently it passes only when weighted overall is at least 85, every metric is at least 75, and `hardFailures` is empty.

## Standard correction mapping

Use this mapping when the synchronized criterion uses a standard key. For a custom key, derive the smallest layer-scoped correction from its synchronized name and description.

- impression: focal contrast, competing FX, master crop
- concept: background grade, seasonal mood, title material harmony
- layout: character/title/text-block position, scale, margins, centering
- typography: title scale, two-line balance, title-copy spacing, hierarchy
- color: grading, saturation, luminance separation
- readability: text shadow, date dim, local contrast, safe area
- brand: approved logo and Blade & Soul visual grammar
- flow: positional and contrast path from character to title to information
- detail: alpha fringe, masking, character/FX registration, clipping
- conversion: title/subcopy/date prominence without inventing CTA text
