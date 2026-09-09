// Shared, side-effect-free design evaluation core.
//
// Firestore owns the active criteria versions. This module owns the mechanics
// that must be identical in every evaluator: score merging, weighted arithmetic,
// prompt section injection, and the Nexus quality gate.

export const NEXUS_SCORE_KEYS = [
  "impression", "concept", "layout", "typography", "color",
  "readability", "brand", "flow", "detail", "conversion",
];

export const NEXUS_BANNER_WEIGHTS = Object.freeze({
  impression: 14,
  concept: 9,
  layout: 8,
  typography: 18,
  color: 8,
  readability: 9,
  brand: 8,
  flow: 8,
  detail: 14,
  conversion: 4,
});

export const NEXUS_BANNER_CRITERIA = Object.freeze([
  { id: "impression", name: "첫인상 / 주목도", weight: NEXUS_BANNER_WEIGHTS.impression, maxScore: 100, description: "한눈에 시선을 사로잡는 강렬함과 매력. 단조롭고 1차원적인 상자 배치 수준이면 80점대 부여." },
  { id: "concept", name: "콘셉트 전달력", weight: NEXUS_BANNER_WEIGHTS.concept, maxScore: 100, description: "이벤트나 업데이트의 성격, 맥락이 잘 전달되는지." },
  { id: "layout", name: "레이아웃 균형", weight: NEXUS_BANNER_WEIGHTS.layout, maxScore: 100, description: "요소들의 화면 배치와 시각적 무게 중심. 중앙 정렬 단순 나열이면 80점대 초중반, 산만하면 70점대." },
  { id: "typography", name: "타이포그래피", weight: NEXUS_BANNER_WEIGHTS.typography, maxScore: 100, description: "폰트 렌더링, 시각적 위계 및 세련미. 타이틀이 배경과 묻히면 60~70점대." },
  { id: "color", name: "컬러 완성도", weight: NEXUS_BANNER_WEIGHTS.color, maxScore: 100, description: "배너 무드에 맞는 색상 조합과 완성도. 텍스트와 배경 컬러가 분리되지 않고 겹치면 70점대." },
  { id: "readability", name: "정보 가독성", weight: NEXUS_BANNER_WEIGHTS.readability, maxScore: 100, description: "타이틀, 날짜, 혜택 등 핵심 정보의 가독성." },
  { id: "brand", name: "브랜드 적합성", weight: NEXUS_BANNER_WEIGHTS.brand, maxScore: 100, description: "해당 게임/이벤트 감성에 부합하는 톤앤매너." },
  { id: "flow", name: "시선 흐름", weight: NEXUS_BANNER_WEIGHTS.flow, maxScore: 100, description: "텍스트→캐릭터→아이템으로 자연스럽게 이어지면 고득점, 시선이 방황하면 감점." },
  { id: "detail", name: "완성도 / 디테일", weight: NEXUS_BANNER_WEIGHTS.detail, maxScore: 100, description: "배경, 빛, 뎁스, 합성의 디테일과 마감. 캐릭터 없는 단순 나열은 90점 이상 금지." },
  { id: "conversion", name: "클릭/전환 가능성", weight: NEXUS_BANNER_WEIGHTS.conversion, maxScore: 100, description: "유저로 하여금 클릭하고 싶게 만드는 매력도." },
].map((item) => Object.freeze(item)));

export const NEXUS_QUALITY_GATE = Object.freeze({
  overall: 85,
  everyMetric: 75,
  hardFailures: 0,
});

const finiteScore = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
};

export function normalizeCriteria(items = []) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      ...item,
      id: String(item?.id || "").trim(),
      name: String(item?.name || item?.id || "").trim(),
      description: String(item?.description || "").trim(),
      weight: Number(item?.weight),
      maxScore: Number(item?.maxScore) || 100,
    }))
    .filter((item) => {
      if (!item.id || seen.has(item.id) || !Number.isFinite(item.weight) || item.weight <= 0) return false;
      seen.add(item.id);
      return true;
    });
}

export function validateCriteria(items = []) {
  const list = Array.isArray(items) ? items : [];
  const normalized = normalizeCriteria(list);
  const missingIds = list
    .filter((item) => !String(item?.id || "").trim())
    .map((item) => String(item?.name || "(이름 없음)"));
  const ids = list.map((item) => String(item?.id || "").trim()).filter(Boolean);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const invalidWeights = list
    .filter((item) => !Number.isFinite(Number(item?.weight)) || Number(item.weight) <= 0)
    .map((item) => String(item?.id || item?.name || "(이름 없음)"));
  const weightSum = normalized.reduce((sum, item) => sum + item.weight, 0);
  return {
    valid: normalized.length > 0 && normalized.length === list.length && missingIds.length === 0 && duplicateIds.length === 0 && invalidWeights.length === 0,
    normalized,
    missingIds,
    duplicateIds,
    invalidWeights,
    weightSum: Math.round(weightSum * 100) / 100,
  };
}

export function mergeEvaluationScores(criteria, scoreSets = []) {
  const items = normalizeCriteria(criteria);
  const sets = (Array.isArray(scoreSets) ? scoreSets : []).filter(Boolean);
  const scores = {};
  const missing = [];

  items.forEach((criterion) => {
    const entries = sets.map((set) => set?.[criterion.id]).filter(Boolean);
    const values = entries.map((entry) => finiteScore(entry?.score ?? entry)).filter((value) => value != null);
    if (!values.length) {
      missing.push(criterion.id);
      scores[criterion.id] = { score: null, reason: "(분석 누락 — AI 응답에 없음)", weight: criterion.weight };
      return;
    }
    const score = values.reduce((sum, value) => sum + value, 0) / values.length;
    const reasons = entries.map((entry) => String(entry?.reason || "").trim()).filter(Boolean);
    scores[criterion.id] = {
      score: Math.round(score * 10) / 10,
      reason: reasons[0] || "",
      reasons,
      weight: criterion.weight,
    };
  });

  return { scores, missing, modelsAveraged: sets.length };
}

export function calculateEvaluationReport({
  criteria,
  scores,
  hardFailures = [],
  recommendedCorrections = [],
  offset = 0,
  gate = NEXUS_QUALITY_GATE,
} = {}) {
  const items = normalizeCriteria(criteria);
  let weightedSum = 0;
  let totalWeight = 0;
  const metrics = items.map((criterion) => {
    const score = finiteScore(scores?.[criterion.id]?.score ?? scores?.[criterion.id]);
    if (score != null) {
      weightedSum += score * criterion.weight;
      totalWeight += criterion.weight;
    }
    return {
      key: criterion.id,
      name: criterion.name,
      weight: criterion.weight,
      score,
      reason: String(scores?.[criterion.id]?.reason || ""),
    };
  });
  const rawOverall = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const adjustedOverall = Math.max(0, Math.min(99, Math.round((rawOverall + Number(offset || 0)) * 10) / 10));
  const failures = Array.isArray(hardFailures) ? hardFailures.map(String).filter(Boolean) : [];
  const missing = metrics.filter((metric) => metric.score == null).map((metric) => metric.key);
  const lowMetrics = metrics
    .filter((metric) => metric.score != null && metric.score < gate.everyMetric)
    .sort((a, b) => a.score - b.score);
  const priorities = [...metrics]
    .filter((metric) => metric.score != null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const pass = missing.length === 0
    && adjustedOverall >= gate.overall
    && lowMetrics.length === 0
    && failures.length <= gate.hardFailures;

  return {
    overall: adjustedOverall,
    rawOverall: Math.round(rawOverall * 10) / 10,
    pass,
    gate,
    hardFailures: failures,
    missing,
    lowMetrics,
    priorities,
    recommendedCorrections: (Array.isArray(recommendedCorrections) ? recommendedCorrections : []).map(String).filter(Boolean).slice(0, 3),
    metrics,
  };
}

export function appendOrReplacePromptSection(prompt, placeholder, content, heading) {
  const base = String(prompt || "");
  const body = String(content || "").trim();
  if (base.includes(placeholder)) return base.replace(placeholder, body);
  if (!body) return base;
  return `${base.trim()}\n\n[${heading}]\n${body}\n`;
}

export function criteriaSnapshot(items = []) {
  return normalizeCriteria(items).map(({ id, name, description, weight, maxScore }) => ({
    id, name, description, weight, maxScore,
  }));
}
