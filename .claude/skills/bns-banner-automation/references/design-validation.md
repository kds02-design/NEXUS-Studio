# Master-banner design validation

Evaluate only `1180x750_Notice`. It is the source composition for typography, hierarchy, atmosphere, character treatment, and the 1200 adaptation.

1. Export the completed 1180 frame as PNG at 1×.
2. Invoke `$nexus-design-evaluator` in banner mode. Its 10-metric rubric and weights are the **same criteria Banner Codex uses** (`src/lib/evaluationCriteria.js` `promo` defaults) — one rubric, not two competing evaluators. A single evaluation result is sufficient; if you run more than one model (e.g. Gemini + ChatGPT), feed them as `models` and let `scripts/evaluation-gate.mjs` average per metric.
3. Pass at weighted score 85+, every metric 75+, and no hard failure. Compute the gate with `node scripts/evaluation-gate.mjs --input evaluation.json`.
4. Fix no more than the three lowest metrics and re-evaluate the actual export. Stop after three rounds or two non-improving rounds.
5. Propagate accepted corrections:
   - title, copy, date, atmosphere, color, and FX corrections → 1200
   - background grade, character treatment, and FX corrections → all image-only sizes
   - do not propagate master text into image-only frames
6. Perform rule-based QA—not full design scoring—on the other seven sizes: correct logo on 1200, centered character on Purple/620/EventON, transparent top on Toast, transparent character-only Ingame, and face crop on 72×40.

Do not require the Nexus UI, Gemini API key, Banner Codex registration, or external image transmission. The evaluator scores the image directly using the shared banner rubric (identical to Banner Codex), so a Banner Codex round-trip is optional, not required.
