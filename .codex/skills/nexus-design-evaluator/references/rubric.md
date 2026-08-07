# Nexus banner evaluation rubric

## Scoring schema

Create JSON in this form:

```json
{
  "frame": "1180x750_Notice",
  "scores": {
    "impression": {"score": 0, "reason": ""},
    "concept": {"score": 0, "reason": ""},
    "layout": {"score": 0, "reason": ""},
    "typography": {"score": 0, "reason": ""},
    "color": {"score": 0, "reason": ""},
    "readability": {"score": 0, "reason": ""},
    "brand": {"score": 0, "reason": ""},
    "flow": {"score": 0, "reason": ""},
    "detail": {"score": 0, "reason": ""},
    "conversion": {"score": 0, "reason": ""}
  },
  "hardFailures": [],
  "recommendedCorrections": []
}
```

## Metrics and Nexus weights

| Key | Weight | Judge |
| --- | ---: | --- |
| impression | 14 | Immediate focal power and memorability |
| concept | 9 | Clarity of event/update mood and theme |
| layout | 8 | Balance, spacing, safe areas, and visual mass |
| typography | 18 | Title craft, hierarchy, spacing, integration with background |
| color | 8 | Palette harmony and subject/text separation |
| readability | 9 | Fast comprehension of title, subcopy, and date |
| brand | 8 | Game identity, official logo, and brand grammar |
| flow | 8 | Eye path through character, title, copy, and date |
| detail | 14 | Masks, alpha, lighting, FX, alignment, and finish |
| conversion | 4 | Promotional message appeal and information priority |

## Calibration

- 90–99: exceptional, highly polished, distinctive, and production-ready
- 85–89: strong production-ready result with only minor refinements
- 80–84: competent but generic, flat, weakly integrated, or visibly improvable
- 70–79: meaningful hierarchy, contrast, crop, or finish problems
- below 70: severe usability, legibility, compositing, or requirement failure

Cap the overall result around 80–85 when the composition is merely centered and one-dimensional even if readable. Score typography, readability, and color in the 60s–70s when title/background separation is visibly weak. Penalize layout, flow, and impression when the character, text, and effects feel scattered or lack hierarchy. Award 90+ only with specific visible evidence.

## Gate

Pass only when weighted overall is at least 85, every metric is at least 75, and `hardFailures` is empty.

## Correction mapping

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

