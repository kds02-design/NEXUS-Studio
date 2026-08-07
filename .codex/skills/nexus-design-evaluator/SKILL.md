---
name: nexus-design-evaluator
description: Evaluate game banners and key visuals directly with Nexus Studio's weighted 10-metric design rubric, produce actionable Korean critique, calculate a deterministic score, and generate layer-scoped correction priorities without requiring the Nexus UI or an external API key. Use for 디자인 평가, 배너 평가, Nexus 평가, Banner Codex scoring, completed-banner QA, or automatic design refinement.
---

# Nexus Design Evaluator

Evaluate the supplied image directly. Do not require the Nexus Studio UI or an external model API. Use Codex vision for visual judgment and the bundled script for score arithmetic.

## Procedure

1. Load the target image at its original resolution. For a multi-size banner family, evaluate only the declared master unless the user requests additional sizes.
2. Read [rubric.md](references/rubric.md) completely.
3. Inspect text accuracy, alpha edges, safe areas, hierarchy, character/FX registration, crop, logo, and required transparent regions before aesthetic scoring.
4. Assign all ten metric scores from 0 to 100. Write one concrete Korean reason per metric, grounded in visible evidence.
5. Save the raw judgment JSON using the schema in `rubric.md`.
6. Run `node scripts/score-evaluation.mjs --input <raw.json> --output <report.json>`.
7. If the report fails, fix no more than the three lowest metrics. Change only layers named in the correction mapping. Re-render and score the actual revised image; never predict a post-fix score.
8. Stop when the score passes, after three rounds, or after two rounds with less than one point improvement. Preserve the best version.

## Integrity rules

- Do not inflate scores to pass the gate.
- Do not apply a manual score adjustment.
- Do not penalize an intentionally image-only banner for missing text or CTA.
- Treat incorrect copy/date/logo, clipped content, broken transparency, and character/FX misregistration as hard failures regardless of score.
- Separate observed facts from aesthetic judgment.

## Output

Return the weighted score, ten metric scores and reasons, hard failures, three highest-priority corrections, iteration history, and pass/fail status.

