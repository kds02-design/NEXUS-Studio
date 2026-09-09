// Centralized evaluation criteria service.
//
// Firestore: evaluationCriteria/{type}/versions/{versionId}
//   { name, isActive, note?, criteria: [{ id, name, weight, description, maxScore }],
//     createdAt, updatedAt }
//
// 각 앱은 fetchActiveCriteria(type) 으로 활성 버전 항목을 가져와 사용합니다.
// 첫 실행 시 마이그레이션 (앱 최초 로드되거나 NexusAdmin 첫 진입 시) 으로
// 하드코딩 시드를 v1.0 으로 자동 등록합니다.

import {
  collection, getDocs, getDoc, setDoc, addDoc, doc, deleteDoc, query, where, limit, orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  normalizeCriteria,
  validateCriteria,
} from "./designEvaluationCore";
// 시드·타입·순수 헬퍼는 Node 에서도 쓰이도록 evaluationCriteriaSeeds.js 로 분리 (Firestore 의존 없음).
// 기존 import 경로 호환을 위해 여기서 그대로 재수출한다.
import {
  CRITERIA_TYPES, SCORING_RULES_SEED, SEEDS,
  getSeedCriteria, getSeedRules, formatCriteriaList, weightsMap, labelsMap, resolveCriteriaType,
} from "./evaluationCriteriaSeeds";
export {
  CRITERIA_TYPES, SCORING_RULES_SEED,
  getSeedCriteria, getSeedRules, formatCriteriaList, weightsMap, labelsMap, resolveCriteriaType,
};

const versionsCol = (type) => collection(db, "evaluationCriteria", type, "versions");

// ─── 마이그레이션 ──────────────────────────────────────
// 각 type 의 versions 컬렉션이 비어있으면 시드를 v1.0(active) 로 추가.
// 한 번만 실행되도록 호출부에서 가드 (sessionStorage 또는 첫 admin 진입 시점).
export async function migrateInitialCriteria() {
  const result = { seeded: [], skipped: [], failed: [] };
  for (const type of Object.values(CRITERIA_TYPES)) {
    try {
      const snap = await getDocs(query(versionsCol(type), limit(1)));
      if (!snap.empty) { result.skipped.push(type); continue; }
      const seed = SEEDS[type];
      const seedRef = doc(versionsCol(type), "seed-v1");
      if (!seed || seed.items.length === 0) {
        // 빈 시드라도 placeholder 빈 버전으로 마킹해두어 다음 실행에서 또 시도하지 않게 함
        await setDoc(seedRef, {
          name: seed?.name || "v1.0 (빈 시드)",
          isActive: true,
          note: "초기 빈 버전. NexusAdmin 에서 항목을 추가하세요.",
          criteria: [],
          rules: seed?.rules || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(seedRef, {
          name: seed.name,
          isActive: true,
          note: "초기 버전 (앱 하드코딩에서 자동 마이그레이션)",
          criteria: seed.items,
          rules: seed.rules || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      result.seeded.push(type);
    } catch (e) {
      console.error(`[evaluationCriteria] migrate failed for type=${type}`, e);
      result.failed.push({ type, error: e.message });
    }
  }
  return result;
}

// ─── 활성 버전 조회 ────────────────────────────────────
// 활성 버전이 없으면 가장 최근 버전 fallback. 둘 다 없으면 null.
export async function fetchActiveCriteria(type) {
  try {
    // 1) isActive == true
    const q1 = query(versionsCol(type), where("isActive", "==", true));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const active = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
      active.sort((a, b) => {
        const timeOf = (v) => v?.updatedAt?.toMillis?.() || v?.createdAt?.toMillis?.() || 0;
        return timeOf(b) - timeOf(a) || String(b.id).localeCompare(String(a.id));
      });
      if (active.length > 1) {
        console.warn(`[evaluationCriteria] duplicate active versions type=${type}; selected=${active[0].id}; count=${active.length}`);
      }
      const selected = active[0];
      const check = validateCriteria(selected.criteria || []);
      return {
        ...selected,
        criteria: check.valid ? check.normalized : normalizeCriteria(selected.criteria || []),
        criteriaHealth: {
          duplicateActiveCount: active.length,
          duplicateIds: check.duplicateIds,
          invalidWeights: check.invalidWeights,
          weightSum: check.weightSum,
          valid: check.valid,
        },
      };
    }
    // 2) fallback — 아무 버전이나 1개
    const snap2 = await getDocs(query(versionsCol(type), limit(50)));
    if (snap2.empty) return null;
    // createdAt 기준 최신 것
    const all = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
    all.sort((a, b) => {
      const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bt - at;
    });
    return all[0];
  } catch (e) {
    console.warn(`[evaluationCriteria] fetchActive(${type}) failed`, e);
    return null;
  }
}

// ─── 채점 규칙(rules) 조회 ─────────────────────────────
// 활성 버전 doc 의 rules → 없으면 시드 rules 폴백.
export function getActiveRules(versionOrType) {
  if (versionOrType && typeof versionOrType === "object") {
    if (typeof versionOrType.rules === "string" && versionOrType.rules.trim()) return versionOrType.rules;
    return "";
  }
  return getSeedRules(versionOrType);
}

// ─── 기준점 앵커(calibration anchors) ───────────────────
// 경로: evaluationCriteria/{type}/anchors/{id}
//   { score:0-99, verdict:한줄평, tags:[], thumbnailUrl?, createdAt }
// DesignEvaluator(허브)에서 큐레이션, BannerCodex/DesignEvaluator 가 분석 시 few-shot 으로 주입.
const anchorsCol = (type) => collection(db, "evaluationCriteria", type, "anchors");

export async function fetchAnchors(type) {
  if (!type) return [];
  try {
    const snap = await getDocs(query(anchorsCol(type), orderBy("score", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    try {
      const snap = await getDocs(anchorsCol(type));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn(`[evaluationCriteria] fetchAnchors(${type}) failed`, e);
      return [];
    }
  }
}

export async function addAnchor(type, { score, aiScore, verdict, tags, thumbnailUrl } = {}) {
  if (!type) throw new Error("type required");
  // aiScore = 앵커 등록 시점에 AI 가 줬던 원본 점수(0~99). 평가자 점수(score)와의 차이가
  // 전역 offset 제안값의 데이터 소스. null 허용(구버전 앵커 호환).
  const aiNum = (aiScore == null || Number.isNaN(Number(aiScore))) ? null : Math.max(0, Math.min(99, Number(aiScore)));
  const ref = await addDoc(anchorsCol(type), {
    score: Math.max(0, Math.min(99, Number(score) || 0)),
    aiScore: aiNum,
    verdict: String(verdict || "").trim(),
    tags: Array.isArray(tags) ? tags.map(String) : [],
    thumbnailUrl: thumbnailUrl || "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeAnchor(type, id) {
  if (!type || !id) return;
  await deleteDoc(doc(anchorsCol(type), id));
}

// 프롬프트 주입용 텍스트 블록. buildLearningContext 스타일.
export function formatAnchorsForPrompt(anchors) {
  if (!Array.isArray(anchors) || anchors.length === 0) return "";
  const lines = anchors
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(a => {
      const tags = Array.isArray(a.tags) && a.tags.length ? ` · 태그: ${a.tags.join(", ")}` : "";
      const verdict = a.verdict ? ` · "${a.verdict}"` : "";
      return `- [기준점] ${a.score}점${verdict}${tags}`;
    });
  return `\n[★ 평가자 기준점(Calibration Anchors) — 아래는 평가자가 직접 점수를 확정한 레퍼런스입니다. 이 점수 감각에 맞춰 일관되게 채점하세요.]\n${lines.join("\n")}\n`;
}

// ─── 전역 점수 보정(calibration offset) ─────────────────
// 경로: evaluationCriteria/{type}/calibration/current → { offset:Number(0~100 스케일), updatedAt }
// AI 가중평균(0~100)에 더해지는 일률 보정값. "AI 가 전반적으로 N점 높/낮게 느껴진다"를 한 번에 당김.
// 어드민 수동값(기본 0). 앵커 기반 제안값은 computeSuggestedOffset 로 계산해 참고만 함(자동 적용 안 함).
const calibrationDoc = (type) => doc(db, "evaluationCriteria", type, "calibration", "current");

export async function fetchCalibration(type) {
  if (!type) return { offset: 0 };
  try {
    const snap = await getDoc(calibrationDoc(type));
    if (snap.exists()) {
      const offset = Number(snap.data()?.offset);
      return { offset: Number.isFinite(offset) ? offset : 0 };
    }
  } catch (e) {
    console.warn(`[evaluationCriteria] fetchCalibration(${type}) failed`, e);
  }
  return { offset: 0 };
}

export async function saveCalibration(type, offset) {
  if (!type) throw new Error("type required");
  const clamped = Math.max(-50, Math.min(50, Math.round(Number(offset) || 0)));
  await setDoc(calibrationDoc(type), { offset: clamped, updatedAt: serverTimestamp() }, { merge: true });
  return clamped;
}

// 앵커의 (평가자 점수 - AI 점수) 평균 → 제안 offset. aiScore 가 있는 앵커만 표본.
export function computeSuggestedOffset(anchors) {
  const samples = (anchors || []).filter(a => a && typeof a.aiScore === "number" && typeof a.score === "number");
  if (samples.length === 0) return { offset: 0, sampleCount: 0 };
  const sum = samples.reduce((acc, a) => acc + (a.score - a.aiScore), 0);
  return { offset: Math.round(sum / samples.length), sampleCount: samples.length };
}

// AI 가중평균(0~100)에 offset 적용 → 0~99 clamp.
export function applyOffset(weightedAvg100, offset) {
  const base = Number(weightedAvg100) || 0;
  const off = Number(offset) || 0;
  return Math.max(0, Math.min(99, Math.round(base + off)));
}

// ─── 시각 few-shot 빌더 ─────────────────────────────────
// 점수대를 고르게 덮는 상위 max 개 앵커를 골라 프롬프트 텍스트 + 선택 앵커 배열 반환.
// 이미지 변환은 lib/anchorImages.prepareAnchorImages 가 담당(여기선 텍스트만).
// 썸네일 있는 앵커를 우선(시각 비교 가능), 점수 내림차순.
export function buildAnchorFewShot(anchors, max = 8) {
  const withImg = (anchors || []).filter(a => a && a.thumbnailUrl);
  if (withImg.length === 0) return { text: "", anchors: [] };
  // 점수 내림차순 정렬 후, max 보다 많으면 점수대를 고르게 샘플링.
  const sorted = withImg.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
  let picked = sorted;
  if (sorted.length > max) {
    picked = [];
    for (let i = 0; i < max; i++) {
      picked.push(sorted[Math.round((i * (sorted.length - 1)) / (max - 1))]);
    }
    // 중복 제거(반올림 충돌)
    picked = picked.filter((a, i, arr) => arr.indexOf(a) === i);
  }
  const lines = picked.map((a, i) => {
    const verdict = a.verdict ? ` — "${a.verdict}"` : "";
    const tags = Array.isArray(a.tags) && a.tags.length ? ` (${a.tags.join(", ")})` : "";
    return `참고 이미지 ${i + 1}: ${a.score}점${verdict}${tags}`;
  });
  const text = `\n[★★ 평가자 기준 레퍼런스 이미지 — 아래 첨부된 "참고 이미지"들은 평가자가 직접 점수를 확정한 디자인입니다. 새 평가 대상의 점수는 이 레퍼런스들의 점수 감각(분포)에 정렬되어야 합니다. 마지막에 첨부된 이미지가 실제 평가 대상입니다.]\n${lines.join("\n")}\n`;
  return { text, anchors: picked };
}
