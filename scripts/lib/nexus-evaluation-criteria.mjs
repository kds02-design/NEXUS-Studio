import fs from "node:fs";
import path from "node:path";
import {
  NEXUS_QUALITY_GATE,
  criteriaSnapshot,
  validateCriteria,
} from "../../src/lib/designEvaluationCore.js";
// 앱과 같은 시드(evaluationCriteriaSeeds.js) — 예전엔 banner 만 fallback 이 있었다.
import { getSeedCriteria, getSeedRules } from "../../src/lib/evaluationCriteriaSeeds.js";

const DEFAULT_TIMEOUT_MS = 15_000;

function readEnvFile(projectRoot) {
  try {
    const text = fs.readFileSync(path.join(projectRoot, ".env"), "utf8");
    return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) return [];
      return [[match[1], match[2].replace(/^(?:"(.*)"|'(.*)')$/, (_m, a, b) => a ?? b ?? "")]];
    }));
  } catch {
    return {};
  }
}

function firebaseConfig(projectRoot) {
  const fileEnv = readEnvFile(projectRoot);
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || fileEnv.VITE_FIREBASE_PROJECT_ID || "",
    apiKey: process.env.VITE_FIREBASE_API_KEY || fileEnv.VITE_FIREBASE_API_KEY || "",
  };
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ("mapValue" in value) return decodeFirestoreFields(value.mapValue.fields || {});
  return value;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function decodeFirestoreDocument(document) {
  return {
    id: String(document?.name || "").split("/").pop(),
    ...decodeFirestoreFields(document?.fields || {}),
    _documentCreatedAt: document?.createTime || null,
    _documentUpdatedAt: document?.updateTime || null,
  };
}

function timeOf(version) {
  for (const value of [version?.updatedAt, version?.createdAt, version?._documentUpdatedAt, version?._documentCreatedAt]) {
    const parsed = Date.parse(String(value || ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function defaultCachePath(projectRoot, type) {
  return path.join(projectRoot, ".tmp", "nexus-skill-cache", `evaluation-criteria-${type}.json`);
}

async function listCriteriaVersions({ projectRoot, type, timeoutMs }) {
  const { projectId, apiKey } = firebaseConfig(projectRoot);
  if (!projectId) throw new Error("VITE_FIREBASE_PROJECT_ID가 없어 Nexus 활성 기준을 조회할 수 없습니다.");
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`;
  const documents = [];
  let pageToken = "";
  do {
    const url = new URL(`${base}/evaluationCriteria/${encodeURIComponent(type)}/versions`);
    url.searchParams.set("pageSize", "100");
    if (apiKey) url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      const body = await response.text();
      let detail = body;
      try { detail = JSON.parse(body)?.error?.message || body; } catch { /* text response */ }
      throw new Error(`Firestore ${response.status}: ${detail}`);
    }
    const payload = await response.json();
    documents.push(...(payload.documents || []).map(decodeFirestoreDocument));
    pageToken = payload.nextPageToken || "";
  } while (pageToken && documents.length < 500);
  return documents;
}

function chooseVersion(versions, type) {
  if (!versions.length) throw new Error(`Nexus에 ${type} 평가 기준 버전이 없습니다.`);
  const active = versions.filter((version) => version.isActive === true);
  const candidates = (active.length ? active : versions).sort((a, b) => timeOf(b) - timeOf(a) || String(b.id).localeCompare(String(a.id)));
  const selected = candidates[0];
  const validation = validateCriteria(selected.criteria || []);
  if (!validation.valid) {
    const details = [
      validation.missingIds.length ? `ID 누락=${validation.missingIds.join(",")}` : "",
      validation.duplicateIds.length ? `중복 ID=${validation.duplicateIds.join(",")}` : "",
      validation.invalidWeights.length ? `가중치 오류=${validation.invalidWeights.join(",")}` : "",
    ].filter(Boolean).join("; ");
    throw new Error(`Nexus 활성 기준이 유효하지 않습니다${details ? `: ${details}` : ""}.`);
  }
  return {
    criteriaType: type,
    criteriaVersionId: selected.id,
    criteriaVersionName: selected.name || selected.id,
    criteria: criteriaSnapshot(validation.normalized),
    rules: typeof selected.rules === "string" ? selected.rules : "",
    gate: NEXUS_QUALITY_GATE,
    duplicateActiveCount: active.length,
    weightSum: validation.weightSum,
    remoteUpdatedAt: selected.updatedAt || selected._documentUpdatedAt || null,
  };
}

function readCache(cachePath, type) {
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const validation = validateCriteria(cached.criteria || []);
    if (!validation.valid || cached.criteriaType !== type) return null;
    return { ...cached, criteria: criteriaSnapshot(validation.normalized) };
  } catch {
    return null;
  }
}

function writeCache(cachePath, snapshot) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

function seedFallback(type) {
  const items = getSeedCriteria(type);
  if (!items.length) return null;
  return {
    criteriaType: type,
    criteriaVersionId: "seed",
    criteriaVersionName: `${type} 시드 (v1.0)`,
    criteria: criteriaSnapshot(items),
    rules: getSeedRules(type) || "",
    gate: NEXUS_QUALITY_GATE,
    duplicateActiveCount: 0,
    remoteUpdatedAt: null,
  };
}

export async function loadActiveNexusCriteria({
  type = "banner",
  projectRoot = process.cwd(),
  cachePath = defaultCachePath(projectRoot, type),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  strictLive = false,
} = {}) {
  const normalizedType = String(type || "banner").trim();
  try {
    const versions = await listCriteriaVersions({ projectRoot, type: normalizedType, timeoutMs });
    const selected = chooseVersion(versions, normalizedType);
    const warnings = [];
    if (selected.duplicateActiveCount > 1) warnings.push(`활성 버전이 ${selected.duplicateActiveCount}개라 최신 버전 ${selected.criteriaVersionId}을 선택했습니다.`);
    if (Math.abs(selected.weightSum - 100) > 0.001) warnings.push(`활성 기준의 가중치 합이 ${selected.weightSum}입니다. 계산은 상대 가중치로 정규화됩니다.`);
    const snapshot = {
      ...selected,
      source: "nexus-live",
      stale: false,
      syncWarning: warnings.join(" "),
      syncedAt: new Date().toISOString(),
    };
    writeCache(cachePath, snapshot);
    return snapshot;
  } catch (error) {
    if (strictLive) throw error;
    const cached = readCache(cachePath, normalizedType);
    if (cached) {
      return {
        ...cached,
        source: "last-known-good-cache",
        stale: true,
        syncWarning: [`Nexus 실시간 조회 실패로 마지막 정상 기준을 사용했습니다: ${error.message}`, cached.syncWarning].filter(Boolean).join(" "),
      };
    }
    const fallback = seedFallback(normalizedType);
    if (!fallback) throw error;
    return {
      ...fallback,
      source: "bundled-seed-fallback",
      stale: true,
      syncWarning: `Nexus 실시간 조회 실패 및 캐시 없음으로 공용 시드를 사용했습니다: ${error.message}`,
      syncedAt: new Date().toISOString(),
    };
  }
}

export function formatNexusCriteriaMarkdown(snapshot) {
  const criteriaLines = snapshot.criteria.map((item, index) =>
    `${index + 1}. \`${item.id}\` — ${item.name} (가중치 ${item.weight})${item.description ? `\n   - ${item.description}` : ""}`
  ).join("\n");
  const rules = snapshot.rules?.trim() || "(추가 채점 규칙 없음)";
  const warning = snapshot.syncWarning ? `\n> 동기화 경고: ${snapshot.syncWarning}\n` : "";
  return `# Nexus 활성 디자인 평가 기준\n\n- 유형: ${snapshot.criteriaType}\n- 버전: ${snapshot.criteriaVersionName} (\`${snapshot.criteriaVersionId}\`)\n- 소스: ${snapshot.source}\n- 동기화: ${snapshot.syncedAt}${warning}\n## 평가 항목\n\n${criteriaLines}\n\n## 활성 채점 규칙\n\n${rules}\n\n## 품질 게이트\n\n- 가중 종합점수 ${snapshot.gate.overall} 이상\n- 모든 항목 ${snapshot.gate.everyMetric} 이상\n- 치명적 결함 ${snapshot.gate.hardFailures}건 이하\n`;
}
