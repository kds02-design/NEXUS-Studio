import assert from "node:assert/strict";
import path from "node:path";
import {
  formatNexusCriteriaMarkdown,
  loadActiveNexusCriteria,
} from "./lib/nexus-evaluation-criteria.mjs";

const encodeValue = (value) => {
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "object" && value) return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeValue(item)])) } };
  return { stringValue: String(value) };
};
const document = (id, data, updateTime) => ({
  name: `projects/test/databases/(default)/documents/evaluationCriteria/banner/versions/${id}`,
  fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)])),
  updateTime,
});
const criteria = [
  { id: "focus", name: "포컬", description: "주목도", weight: 60, maxScore: 100 },
  { id: "finish", name: "마감", description: "디테일", weight: 40, maxScore: 100 },
];
const livePayload = {
  documents: [
    document("old", { name: "old", isActive: false, criteria }, "2026-01-01T00:00:00Z"),
    document("active-v2", { name: "active v2", isActive: true, criteria, rules: "custom rule" }, "2026-08-30T00:00:00Z"),
  ],
};

const originalFetch = globalThis.fetch;
const oldProject = process.env.VITE_FIREBASE_PROJECT_ID;
const oldKey = process.env.VITE_FIREBASE_API_KEY;
process.env.VITE_FIREBASE_PROJECT_ID = "test-project";
process.env.VITE_FIREBASE_API_KEY = "test-key";
const cachePath = path.resolve(".tmp", "test-nexus-criteria-sync", "banner.json");

try {
  globalThis.fetch = async () => new Response(JSON.stringify(livePayload), { status: 200, headers: { "Content-Type": "application/json" } });
  const live = await loadActiveNexusCriteria({ type: "banner", projectRoot: process.cwd(), cachePath });
  assert.equal(live.criteriaVersionId, "active-v2");
  assert.equal(live.source, "nexus-live");
  assert.equal(live.stale, false);
  assert.deepEqual(live.criteria.map((item) => item.id), ["focus", "finish"]);
  assert.match(formatNexusCriteriaMarkdown(live), /active-v2/);

  globalThis.fetch = async () => { throw new Error("offline"); };
  const cached = await loadActiveNexusCriteria({ type: "banner", projectRoot: process.cwd(), cachePath });
  assert.equal(cached.criteriaVersionId, "active-v2");
  assert.equal(cached.source, "last-known-good-cache");
  assert.equal(cached.stale, true);
  assert.match(cached.syncWarning, /offline/);
  await assert.rejects(
    loadActiveNexusCriteria({ type: "banner", projectRoot: process.cwd(), cachePath, strictLive: true }),
    /offline/,
  );
} finally {
  globalThis.fetch = originalFetch;
  if (oldProject === undefined) delete process.env.VITE_FIREBASE_PROJECT_ID;
  else process.env.VITE_FIREBASE_PROJECT_ID = oldProject;
  if (oldKey === undefined) delete process.env.VITE_FIREBASE_API_KEY;
  else process.env.VITE_FIREBASE_API_KEY = oldKey;
}

console.log("nexus evaluation criteria sync: ok");
