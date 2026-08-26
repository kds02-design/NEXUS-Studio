import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFloatingPrompt,
  buildFloatingRepairPrompt,
  buildFloatingSeparationPrompt,
  FLOATING_EFFECT_OPTIONS,
  FLOATING_FORM_OPTIONS,
  FLOATING_GROUP_OPTIONS,
  FLOATING_LAYOUT_OPTIONS,
  resolveFloatingGroupPlan,
} from "../src/apps/NexusPreview/services/floatingPrompt.js";

test("effect-only mode forbids item reproduction and fixes pure black", () => {
  const prompt = buildFloatingPrompt({
    outputMode: "effect-only",
    effect: "gold",
    form: "broken-orbit",
    layout: "grouped",
    itemCount: 4,
    opening: 30,
    frontCross: 8,
  });
  assert.match(prompt, /OUTPUT EFFECT ONLY/);
  assert.match(prompt, /reproduce zero item pixels/);
  assert.match(prompt, /pure solid black #000000/);
  assert.match(prompt, /exactly 4 supplied item references/);
  assert.match(prompt, /Opening\/gap: 30%/);
  assert.match(prompt, /at or below 8%/);
});

test("unsafe numeric controls are clamped", () => {
  const prompt = buildFloatingPrompt({ opening: 999, frontCross: 99 });
  assert.match(prompt, /Opening\/gap: 50%/);
  assert.match(prompt, /at or below 15%/);
});

test("group plans follow reward semantics instead of item count", () => {
  assert.deepEqual(resolveFloatingGroupPlan(4, "all").assignments, ["A", "A", "A", "A"]);
  assert.deepEqual(resolveFloatingGroupPlan(3, "each").assignments, ["ITEM_1", "ITEM_2", "ITEM_3"]);
  assert.deepEqual(resolveFloatingGroupPlan(4, "custom", ["A", "A", "B", "C"]).groups, [
    { id: "A", itemIndices: [1, 2] },
    { id: "B", itemIndices: [3] },
    { id: "C", itemIndices: [4] },
  ]);
  const auto = resolveFloatingGroupPlan(2, "auto");
  assert.equal(auto.requiresReview, true);
  assert.equal(auto.confidence, "low");
});

test("prompt preserves exact custom light groups", () => {
  const prompt = buildFloatingPrompt({ itemCount: 4, groupMode: "custom", groupAssignments: ["A", "A", "B", "C"] });
  assert.match(prompt, /A=\[references 1, 2\]/);
  assert.match(prompt, /B=\[references 3\]/);
  assert.match(prompt, /C=\[references 4\]/);
  assert.match(prompt, /exactly 3 light-effect group\(s\)/);
});

test("integrated mode harmonizes quality while repair pass audits identity", () => {
  const prompt = buildFloatingPrompt({ outputMode: "integrated-preserve", itemCount: 3, groupMode: "all" });
  assert.match(prompt, /OUTPUT INTEGRATED PRESERVATION MASTER/);
  assert.match(prompt, /Harmonize resolution/);
  assert.match(prompt, /emblem\/seal/);
  const repair = buildFloatingRepairPrompt({ itemCount: 3, groupMode: "custom", groupAssignments: ["A", "A", "B"] });
  assert.match(repair, /Reference 1 is the integrated render/);
  assert.match(repair, /References 2 through 4/);
  assert.match(repair, /A=\[items 1, 2\]/);
  assert.match(repair, /B=\[items 3\]/);
  assert.match(repair, /minimal repair/);
});

test("layered transparent mode derives registered effect and item plates", () => {
  const prompt = buildFloatingPrompt({ outputMode: "layered-transparent", itemCount: 2, groupMode: "all" });
  assert.match(prompt, /OUTPUT INTEGRATED PRESERVATION MASTER/);
  const effect = buildFloatingSeparationPrompt("effect", { itemCount: 2 });
  assert.match(effect, /BACKGROUND EFFECT LAYER only/);
  assert.match(effect, /pure solid black #000000/);
  assert.match(effect, /same canvas size and registration/);
  const items = buildFloatingSeparationPrompt("items", { itemCount: 2 });
  assert.match(items, /ITEM LAYER only/);
  assert.match(items, /chroma green #00FF00/);
  assert.match(items, /same canvas size and registration/);
});

test("production option families cover reference-driven archetypes", () => {
  assert.ok(FLOATING_EFFECT_OPTIONS.some((o) => o.key === "wind"));
  assert.ok(FLOATING_EFFECT_OPTIONS.some((o) => o.key === "shadow"));
  assert.ok(FLOATING_FORM_OPTIONS.some((o) => o.key === "vertical-helix"));
  assert.ok(FLOATING_FORM_OPTIONS.some((o) => o.key === "tilted-orbit"));
  assert.ok(FLOATING_LAYOUT_OPTIONS.some((o) => o.key === "arc"));
  assert.ok(FLOATING_LAYOUT_OPTIONS.some((o) => o.key === "orbit"));
  assert.ok(FLOATING_GROUP_OPTIONS.some((o) => o.key === "primary-satellites"));
});
