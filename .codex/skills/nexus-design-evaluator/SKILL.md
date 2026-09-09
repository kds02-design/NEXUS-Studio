---
name: nexus-design-evaluator
description: Evaluate game banners and key visuals with the currently active, versioned Nexus Studio rubric, produce actionable Korean critique, calculate a deterministic score, and generate layer-scoped correction priorities. Use for 디자인 평가, 배너 평가, Nexus 평가, Banner Codex scoring, completed-banner QA, or automatic design refinement.
---

# Nexus Design Evaluator

Evaluate the supplied image directly. Do not require the Nexus Studio UI or an external model API. Use Codex vision for visual judgment and the bundled scripts for live criteria synchronization and score arithmetic.

## Procedure

1. Load the target image at its original resolution. For a multi-size banner family, evaluate only the declared master unless the user requests additional sizes.
2. Read [rubric.md](references/rubric.md) completely. Then run `node scripts/sync-criteria.mjs --type banner --output <criteria.json>` before judging. The returned Nexus version, criteria IDs, weights, descriptions, and rules are authoritative for this run. Do not replace them with the bundled examples.
3. If the criteria snapshot reports `stale: true`, disclose its `syncWarning`; never present cached or seed criteria as live Nexus state.
4. Inspect text accuracy, alpha edges, safe areas, hierarchy, character/FX registration, crop, logo, and required transparent regions before aesthetic scoring.
5. Assign every metric in the synchronized snapshot a score from 0 to 100. Write one concrete Korean reason per metric, grounded in visible evidence.
6. Save the raw judgment JSON using the schema in `rubric.md`, including the synchronized `criteriaType` and `criteriaVersionId`.
7. Run `node scripts/score-evaluation.mjs --input <raw.json> --criteria <criteria.json> --output <report.json>`. The scorer rejects a version mismatch instead of silently mixing criteria.
8. If the report fails, fix no more than the three lowest metrics. Change only layers named in the correction mapping. Re-render and score the actual revised image; never predict a post-fix score.
9. Stop when the score passes, after three rounds, or after two rounds with less than one point improvement. Preserve the best version.

## Integrity rules

- Do not inflate scores to pass the gate.
- Do not apply a manual score adjustment.
- Do not penalize an intentionally image-only banner for missing text or CTA.
- Treat incorrect copy/date/logo, clipped content, broken transparency, and character/FX misregistration as hard failures regardless of score.
- Separate observed facts from aesthetic judgment.

## Output

Return the criteria type, Nexus criteria version and synchronization source, weighted score, all active metric scores and reasons, hard failures, three highest-priority corrections, iteration history, and pass/fail status.
