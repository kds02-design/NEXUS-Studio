// PromptAudit Firestore 스키마.
//
// 개인 기록 — 자신의 감사 이력 (List/Detail).
//   artifacts/prompt-audit/users/{uid}/audits/{auditId}
//   {
//     id, uid, displayName,
//     sourcePrompt,                  // 원문
//     improvedPrompt,                // Gemini 가 생성한 정제본
//     finalPrompt,                   // 사용자가 최종 채택한 본문 (편집 가능)
//     summary, score,
//     conflicts: [{ id, type, severity, title, evidence, explanation, suggestions }],
//     globalSuggestions: [string],
//     acceptedFixes: [{ conflictId, suggestionLabel, rewrite }],
//                                    // 사용자가 채택한 수정안 — 엔진 학습용 핵심 데이터
//     sourceApp, sourceId,           // 어디서 왔는지 (prompt-arc / render-metrics 등 + 원본 doc id)
//     createdAt, updatedAt,
//   }
//
// 누적 패턴 — 관리자 큐레이션 / 자동 집계 (Phase 2).
//   artifacts/prompt-audit/public/data/patterns/{patternId}
//   {
//     conflictType, signature, examples:[], frequency, recommendedFix,
//     upstreamApps:{ "render-metrics": 12, "typecore-sovereign": 4, ... },
//     createdAt, updatedAt,
//   }
import { collection, collectionGroup, doc, addDoc, setDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";

const APP_ID = "prompt-audit";

export const auditsCollection = (uid) =>
  uid && db ? collection(db, "artifacts", APP_ID, "users", uid, "audits") : null;

export const auditDocRef = (uid, id) =>
  uid && id && db ? doc(db, "artifacts", APP_ID, "users", uid, "audits", id) : null;

export const patternsCollection = () =>
  db ? collection(db, "artifacts", APP_ID, "public", "data", "patterns") : null;

// 분석 세션 저장. 채택한 수정안은 별도 updateAudit 으로 갱신.
export async function saveAudit({
  user, sourcePrompt, result,
  sourceApp = null, sourceId = null,
}) {
  if (!user?.uid) throw new Error("로그인이 필요합니다.");
  const col = auditsCollection(user.uid);
  if (!col) throw new Error("Firestore 미연결");
  const ref = await addDoc(col, {
    uid: user.uid,
    displayName: user.displayName || user.email || "",
    sourcePrompt: String(sourcePrompt || ""),
    improvedPrompt: String(result?.improvedPrompt || ""),
    finalPrompt: String(result?.improvedPrompt || sourcePrompt || ""),
    summary: String(result?.summary || ""),
    score: Number(result?.score || 0),
    conflicts: Array.isArray(result?.conflicts) ? result.conflicts : [],
    globalSuggestions: Array.isArray(result?.globalSuggestions) ? result.globalSuggestions : [],
    acceptedFixes: [],
    sourceApp: sourceApp || "",
    sourceId: sourceId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

// 본인 audits 컬렉션 실시간 구독. cb(arr) 형태로 호출. unsubscribe 함수 반환.
// orderBy(createdAt desc) — 인덱스 없으면 fallback 으로 client-side 정렬.
export function subscribeAudits(uid, cb, max = 50) {
  const col = auditsCollection(uid);
  if (!col) { cb([]); return () => {}; }
  try {
    const q = query(col, orderBy("createdAt", "desc"), limit(max));
    return onSnapshot(q,
      (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => {
        // 인덱스 없으면 orderBy 빠진 fallback
        console.warn("[PromptAudit] subscribeAudits with orderBy failed, fallback:", err?.message);
        const q2 = query(col, limit(max));
        return onSnapshot(q2, (snap) => {
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          arr.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          cb(arr);
        });
      }
    );
  } catch (e) {
    console.error("[PromptAudit] subscribeAudits failed", e);
    cb([]);
    return () => {};
  }
}

// 관리자 전용 — 전체 사용자의 audits 를 collectionGroup 으로 한꺼번에 구독.
// Firestore Rules 가 admin role 에게만 collectionGroup("audits") 읽기를 허용해야 함.
// 인덱스 없으면 fallback (정렬 없이 fetch 후 client-side 정렬).
export function subscribeAllAudits(cb, max = 500) {
  if (!db) { cb([]); return () => {}; }
  try {
    const q = query(collectionGroup(db, "audits"), orderBy("createdAt", "desc"), limit(max));
    return onSnapshot(q,
      (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.warn("[PromptAudit] subscribeAllAudits with orderBy failed, fallback:", err?.message);
        const q2 = query(collectionGroup(db, "audits"), limit(max));
        return onSnapshot(q2, (snap) => {
          const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          arr.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
          cb(arr);
        });
      }
    );
  } catch (e) {
    console.error("[PromptAudit] subscribeAllAudits failed", e);
    cb([]);
    return () => {};
  }
}

export async function updateAuditFinal(user, auditId, { finalPrompt, acceptedFixes }) {
  const ref = auditDocRef(user?.uid, auditId);
  if (!ref) throw new Error("auditId 또는 Firestore 미연결");
  await setDoc(ref, {
    finalPrompt: String(finalPrompt || ""),
    acceptedFixes: Array.isArray(acceptedFixes) ? acceptedFixes : [],
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
