# Banner recipe contract — how identical results are guaranteed

Consistency in this pipeline does not mean pixel-identity (the render steps are generative). It means **every decision is pinned in one versioned recipe and applied by the same rule every run**. Read `recipes/bns-live-event.v1.json` and do exactly what it says. Do not re-decide anything it already fixes.

## Three determinism classes

| Class | Elements | How the recipe pins it |
| --- | --- | --- |
| A. Fixed | sizes, layer order/names, anchors, fonts, safe areas | `structure.*` — treat as **hard constants**, not starting points |
| B. Preset effect | title material/bevel/outline/glow, character FX, Mask Forge | `titleEffect.*`, `characterFx.*` — named preset + numeric params + fixed seed |
| C. Constrained generation | background light/atmosphere | `background.*` — reference lock + allow/forbid + seed + fallback |

## Title effect — AI render with strong preset lock (chosen mode)

The title is still rendered by `$render-matrix-typography`, but every stylistic degree of freedom is locked in `titleEffect`:

- `editBudget=Locked`, `cameraLens=Telephoto`, `projectionDepth=None`.
- Fixed materials: `polished-steel` main, `antique-matte-gold` eyebrow.
- Fixed `bevel`, `outline` stack, `glow`, `shadow` values — apply these exact numbers, do not invent per run.
- Fixed `seed` so the same flat input reproduces the same material.
- `structureLock.immutable` (Hangul forms, counters, line breaks, width relationships, silhouette) may never change. On any violation: **reject, retry up to 2×, then fall back to the flat Typecore base**. Never ship a title whose letterforms drifted.

## Two gates — floor and sameness

Run both after building the 1180 master. A banner ships only if it passes both.

1. **Quality floor** — `node scripts/evaluation-gate.mjs --input evaluation.json --criteria criteria.json`
   Weighted overall ≥85, every metric ≥75, no hard failure. Rubric = synchronized Nexus active banner criteria snapshot.
2. **Consistency / sameness** — `node scripts/consistency-gate.mjs --recipe recipes/bns-live-event.v1.json --manifest produced.json`
   The built banner's layer order, anchors (±`anchorTolerancePx`), fonts, preset IDs, Mask Forge curve, and seeds must match the recipe. Any `fail` blocks completion; `07_로고` absence on non-1200 frames is a `warn` only.

The quality gate stops results from getting worse; the consistency gate stops them from silently drifting "better/different." Together they produce a stable, repeatable look.

## Produced manifest

`consistency-gate.mjs` reads a manifest describing what was actually built:

```jsonc
{
  "title":       { "preset": "steel-season-title/v1", "seed": 730425 },
  "characterFx": { "preset": "pond-jade-cyan/v1", "maskForge": { "cutoff":6,"gamma":0.85,"opacity":100,"recoverColor":true,"preserveCanvas":true } },
  "background":  { "seed": 730425 },
  "layers":  ["01_배경","02_분위기_그라데이션","03_캐릭터","CHAR_LIGHT_FX__ORIGINAL_ALPHA__MASK_FORGE","TITLE__TYPECORE_BASE__RENDER_MATRIX_LOCKED","서브 카피","날짜_딤드","날짜"],
  "anchors": { "title":[470,167,700,302.45], "subcopy":[548.5,455,543,30], "date":[583.5,525,473,18] },
  "fonts":   { "subcopyPx": 30, "datePx": 18 }
}
```

Emit this manifest as you assemble Figma so the consistency gate can verify the real output, not intentions.

## Changing the look

Never hand-edit values per run. To change a rule, **bump the recipe version** (`v1` → `v2`) and edit the JSON. The version string travels into every output, so any banner's exact rule set is always identifiable.
