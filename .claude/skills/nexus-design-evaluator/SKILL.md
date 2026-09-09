---
name: nexus-design-evaluator
description: Evaluate game banners, key visuals, brand-web pages, promotion pages, typography renders, and in-game webview UI with Nexus Studio's active, versioned weighted rubrics — the same prompt, criteria, and scoring the NEXUS Studio app uses — producing actionable Korean critique, a deterministic score, and layer-scoped correction priorities. Use for 디자인 평가, 배너 평가, 브랜드웹 평가, 프로모션 페이지 평가, 게임 인웹브라우저/웹뷰 UI QA, Nexus 평가, Banner Codex scoring, or automatic design refinement.
---

# Nexus Design Evaluator

Evaluate the supplied visual directly with Claude vision. The prompt, the criteria list, the response schema, and the score arithmetic come from NEXUS Studio itself, so a score produced here must match what the DesignEvaluator app would produce for the same judgment. Never re-type criteria or weights.

## Choose one profile

- Nexus criteria types (live from NexusAdmin): `banner` (배너·KV), `promotion` / `promotionMobile` / `promotionKv` (프로모션 페이지·모바일·상단 KV), `brandweb` / `brandwebSub` / `brandwebMobile` (브랜드웹 메인·서브·모바일), `typo2d` / `typoRender` / `typoMotion` (타이포). Contract: [references/rubric.md](references/rubric.md).
- In-game web browser / webview UI (notice, event, system, maintenance, error, community, support pages inside or over a game): [references/ingame-webview-rubric.md](references/ingame-webview-rubric.md) with the bundled criteria file `references/ingame-webview-criteria.json`. This profile is not managed in NexusAdmin.

Do not mix profiles in one score. For a family of screens, score the declared master and use the others as consistency evidence unless separate scores are requested.

## Procedure — preferred path (nexus-studio MCP available)

1. Load the target image at original resolution. For a webview family also inspect the smallest supplied preview and both themes.
2. Call `nexus_design_evaluation_prompt` with the criteria `type`. It returns the exact app prompt, the active criteria version, `scoreKeys`, and the response schema. If `stale` is true, disclose `syncWarning`; never present cached or seed criteria as live.
3. Inspect text accuracy, alpha edges, safe areas, hierarchy, character/FX registration, crop, logo, and required transparent regions before aesthetic scoring.
4. Judge the image with that prompt. Produce JSON with every `scoreKeys` entry as `{score 0-100, reason}` in Korean, plus `hardFailures` and `recommendedCorrections` (max 3). Do not add, omit, rename, or reorder criteria.
5. Call `nexus_design_evaluation_score` with `type`, `scores`, `hardFailures`, `recommendedCorrections`, and the `criteriaVersionId` from step 2. The tool applies the shared weighted average and quality gate and rejects a version mismatch.
6. If the report fails, fix no more than the three lowest metrics, changing only layers named in the correction mapping. Re-render and score the actual revised image; never predict a post-fix score.
7. Stop when the score passes, after three rounds, or after two rounds with less than one point improvement. Preserve the best version.

## Procedure — fallback (no MCP)

Run `node scripts/sync-criteria.mjs --type <type> --output <criteria.json>` to fetch the active criteria (falls back to last-known cache, then to the bundled seed, and says so), judge the image using `promptMarkdown` from that file, save raw JSON per `rubric.md`, then run `node scripts/score-evaluation.mjs --input <raw.json> --criteria <criteria.json> --output <report.json>`. For the webview profile pass `--criteria references/ingame-webview-criteria.json`. The scripts locate NEXUS Studio through `NEXUS_STUDIO_ROOT` or by walking up from this skill; set the variable when the skill lives outside the repository.

## Integrity rules

- Do not inflate scores to pass the gate.
- Do not apply a manual score adjustment.
- Do not penalize an intentionally image-only banner for missing text or CTA.
- Treat incorrect copy/date/logo, clipped content, broken transparency, and character/FX misregistration as hard failures regardless of score.
- Separate observed facts from aesthetic judgment.

## Output

Return the criteria type, Nexus criteria version and synchronization source, weighted score, all metric scores and reasons, hard failures, three highest-priority corrections, iteration history, and pass/fail status.
