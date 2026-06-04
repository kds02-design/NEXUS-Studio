// Firestore schema
//   users/{uid}                    { email, role: "user"|"admin",
//                                    status: "approved"|"pending"|"rejected",
//                                    grade: "general"|"pro"|"expert",
//                                    invitedBy?, createdAt, updatedAt }
//   users/{uid}/usage/{YYYY-MM-DD} { count, grade, updatedAt }
//   inviteCodes/{CODE}             { active: true, maxUses?, usedCount, expiresAt?,
//                                    createdAt, lastUsedAt?, lastUsedBy? }
// Admins can override `grade`/`status` directly in the Firebase Console.
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp,
  runTransaction, increment,
  collection, query, where, getDocs, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export const ADMIN_EMAILS = ["kds02@ncsoft.com"];

export const STATUS = {
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
};

export const STATUS_LABEL = {
  approved: "승인됨",
  pending: "승인 대기",
  rejected: "거절됨",
};

export const GRADES = {
  general: "general",
  pro: "pro",
  pro_plus: "pro_plus", // 내부 관계자 전용. NexusAdmin에서 관리자가 직접 부여.
  expert: "expert",
};

export const GRADE_LABEL = {
  general: "General",
  pro: "Pro",
  pro_plus: "Pro+",
  expert: "Expert",
};

// 주간 크레딧 예산. 월요일 00:00 KST 리셋 (weekKey() 참조).
// general 50  = 이미지3 (30c) + 분석20 (20c)              · 또는 영상 1편(30c) + 분석20
// pro     500 = 이미지30 (300) + 분석200 (200)            · 영상 16편 가능
// pro+    800 = 이미지50 (500) + 분석300 (300)            · 영상 26편 가능
// expert  1000= 이미지50 (500) + 분석500 (500)            · 영상 33편 가능
export const WEEKLY_CREDITS = {
  general: 50,
  pro: 500,
  pro_plus: 800,
  expert: 1000,
};

// 액션별 크레딧 비용.
//   image    — Imagen / Banner 등 이미지 생성 호출
//   video    — MotionMatrix 영상 생성 (Veo 등). 이미지 대비 ~3배 비용.
//   analysis — Gemini 기반 프롬프트 최적화, 디자인 분석, 검색 등 텍스트 API
export const ACTION_COSTS = {
  image: 10,
  video: 30,
  analysis: 1,
};

// 등급별 참고용 산출 (UI 표시 / FAQ용). 실제 차감은 크레딧 잔액만 검사.
// video 칸은 "분석/이미지 사용 안 했을 때 최대 영상 편수".
export const GRADE_QUOTAS = {
  general:  { image: 3,  video: 1,  analysis: 20  },
  pro:      { image: 30, video: 16, analysis: 200 },
  pro_plus: { image: 50, video: 26, analysis: 300 },
  expert:   { image: 50, video: 33, analysis: 500 },
};

// 레거시 — 일부 컴포넌트가 아직 일일 카운트로 동작. 주간 예산의 1/7 로 근사 (정수).
// 새 코드는 weekly credits 사용을 권장.
export const DAILY_LIMITS = {
  general: 10,
  pro: 50,
  pro_plus: 100,
  expert: Infinity,
};

const PRO_DOMAINS = ["ncsoft.com"];
// 외부 메일이라도 local part에 'ncsoft' 토큰이 들어있으면 pro로 인정 (예: id.ncsoft@gmail.com)
const NCSOFT_LOCAL_TOKEN = "ncsoft";

function isNcsoftLocal(email) {
  const local = String(email || "").toLowerCase().split("@")[0] || "";
  // 점(.) 또는 언더스코어(_) 또는 하이픈(-)으로 분리한 토큰 중에 'ncsoft'가 있으면 매치.
  // 예: "id.ncsoft", "ncsoft.kim", "id_ncsoft", "ncsoft-id" → 매치 / "myncsoftid" → 비매치
  return local.split(/[._-]/).includes(NCSOFT_LOCAL_TOKEN);
}

export function gradeFromEmail(email) {
  if (!email) return GRADES.general;
  const e = String(email).toLowerCase();
  const domain = e.split("@")[1] || "";
  if (PRO_DOMAINS.includes(domain) || isNcsoftLocal(e)) return GRADES.pro;
  return GRADES.general;
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ISO 8601 주 단위 키. 월요일 시작. 예: "2026-W21".
// 한국시간 기준이라도 ISO 주는 Date 객체에서 그대로 산출 가능 (UTC 사용해도 주 경계가 거의 같음).
export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 일요일(0) → 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // ISO: 목요일이 속한 해의 주.
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const userRef = (uid) => doc(db, "users", uid);
const usageRef = (uid, dayKey) => doc(db, "users", uid, "usage", dayKey);
// 주간 크레딧 doc — users/{uid}/credits/{YYYY-Www} { used, byAction, grade, updatedAt }
export const creditsRef = (uid, wk = weekKey()) => doc(db, "users", uid, "credits", wk);
const inviteRef = (code) => doc(db, "inviteCodes", code);

// Decide initial role/status/grade based on email.
//   1) ADMIN_EMAILS                                  → role=admin, grade=expert, approved
//   2) @ncsoft.com 또는 local 'ncsoft' 토큰          → grade=pro, approved
//   3) 그 외 외부 이메일                             → grade=general, approved (인덱스만 노출, 서브앱은 게이트로 차단)
// 모든 신규 가입자는 즉시 approved 로 진입. 서브앱 접근은 grade 로 게이트.
// 인증 시스템 제거: 이메일 검증/관리자 승인 단계 모두 폐기.
export function isNcsoftDomain(email) {
  const domain = String(email || "").toLowerCase().split("@")[1] || "";
  return PRO_DOMAINS.includes(domain);
}

function inferAccessFromEmail(emailOrUser) {
  // 하위호환 — 기존 호출부가 email 문자열만 넘기는 경우도 지원.
  const user = typeof emailOrUser === "string" ? { email: emailOrUser } : (emailOrUser || {});
  const e = String(user.email || "").toLowerCase();
  const domain = e.split("@")[1] || "";
  const isAdmin = ADMIN_EMAILS.includes(e);
  const grantPro = PRO_DOMAINS.includes(domain) || isNcsoftLocal(e);
  return {
    role: isAdmin ? "admin" : "user",
    grade: isAdmin ? GRADES.expert : (grantPro ? GRADES.pro : GRADES.general),
    status: STATUS.approved,
  };
}

export async function ensureUserProfile(user) {
  if (!user?.uid) throw new Error("user.uid required");
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  const inferred = inferAccessFromEmail(user);

  if (snap.exists()) {
    const data = snap.data();
    // Backfill missing fields without overwriting admin-set values.
    const patch = {};
    if (!data.email) patch.email = user.email || "";
    if (!data.grade) patch.grade = inferred.grade;
    if (!data.role) patch.role = inferred.role;
    if (!data.status) patch.status = inferred.status;
    // 인증 시스템 폐기 마이그레이션 — 기존 status=pending 은 모두 approved 로 승격.
    // 외부 메일(general)은 어차피 서브앱 게이트로 차단되므로 status 차이가 의미 없음.
    // rejected 는 관리자가 명시적으로 막은 케이스라 유지.
    if (data.status === STATUS.pending) {
      patch.status = STATUS.approved;
    }
    // ncsoft 도메인 자격 보유 사용자의 grade 백필 — 과거에 general 로 박혀 있던 doc 도 pro 로 승급.
    if (inferred.grade === GRADES.pro && data.grade === GRADES.general) {
      patch.grade = GRADES.pro;
    }
    // Always promote known admin emails (idempotent safety).
    if (ADMIN_EMAILS.includes(String(data.email || user.email || "").toLowerCase())) {
      if (data.role !== "admin") patch.role = "admin";
      if (data.status !== STATUS.approved) patch.status = STATUS.approved;
    }
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = serverTimestamp();
      await updateDoc(ref, patch);
      return { uid: user.uid, ...data, ...patch };
    }
    return { uid: user.uid, ...data };
  }

  const profile = {
    email: user.email || "",
    displayName: user.displayName || "",
    grade: inferred.grade,
    role: inferred.role,
    status: inferred.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { uid: user.uid, ...profile };
}

// Admin-only helpers. Firestore Rules must allow admin to read/write users/*.
export async function listUsersByStatus(status) {
  // Try with orderBy; fallback if index missing.
  try {
    const q = query(collection(db, "users"), where("status", "==", status), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch {
    const q = query(collection(db, "users"), where("status", "==", status));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  }
}

export async function approveUser(uid, grade = GRADES.general) {
  await updateDoc(userRef(uid), {
    status: STATUS.approved,
    grade,
    updatedAt: serverTimestamp(),
  });
}

export async function rejectUser(uid) {
  await updateDoc(userRef(uid), {
    status: STATUS.rejected,
    updatedAt: serverTimestamp(),
  });
}

// Firestore의 사용자 doc만 삭제. Firebase Auth 계정 자체는 Admin SDK / Cloud Function 필요.
// 다음 로그인 시 ensureUserProfile이 새 프로필을 다시 만들 수 있으므로,
// 영구 차단이 목적이면 rejectUser()를 권장.
export async function deleteUserDoc(uid) {
  await deleteDoc(userRef(uid));
}

export async function fetchUserProfile(uid) {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// 프로필 아바타 저장.
//   avatarType: 'emoji' | 'initial' | 'photo' (photo는 Google profilePhoto fallback용 마커)
//   avatarValue: 이모지 문자 또는 #RRGGBB 컬러 코드
export async function updateUserAvatar(uid, avatarType, avatarValue) {
  if (!uid) throw new Error("uid required");
  await updateDoc(userRef(uid), {
    avatarType,
    avatarValue,
    updatedAt: serverTimestamp(),
  });
}

// 등급 업그레이드 요청 저장. 관리자가 NEXUS Admin에서 검토.
export async function submitUpgradeRequest({ uid, email, displayName, currentGrade, targetGrade, reason }) {
  if (!uid) throw new Error("uid required");
  const ref = doc(collection(db, "upgradeRequests"));
  await setDoc(ref, {
    uid, email: email || "", displayName: displayName || "",
    currentGrade, targetGrade, reason: String(reason || "").trim(),
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function redeemInviteCode(uid, rawCode) {
  if (!uid) throw new Error("uid required");
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) throw new Error("EMPTY_CODE");

  return runTransaction(db, async (tx) => {
    const codeSnap = await tx.get(inviteRef(code));
    if (!codeSnap.exists()) throw new Error("INVALID_CODE");
    const c = codeSnap.data();

    if (c.active === false) throw new Error("INACTIVE_CODE");
    if (c.expiresAt?.toMillis && c.expiresAt.toMillis() < Date.now()) {
      throw new Error("EXPIRED_CODE");
    }
    if (typeof c.maxUses === "number" && (c.usedCount || 0) >= c.maxUses) {
      throw new Error("EXHAUSTED_CODE");
    }

    tx.update(inviteRef(code), {
      usedCount: increment(1),
      lastUsedAt: serverTimestamp(),
      lastUsedBy: uid,
    });
    tx.set(userRef(uid), {
      grade: GRADES.expert,
      invitedBy: code,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { grade: GRADES.expert, code };
  });
}

// usage 읽기 메모이제이션 — 같은 uid + 같은 날짜면 한 번만 Firestore 읽음.
// 429(quota) 회피 + 동시 다발 호출 합치기. consumeUsage 가 성공한 직후엔 그 결과로 캐시 갱신해서
// 즉시 후속 getTodayUsage 호출이 Firestore 를 건드리지 않음.
let _usageCache = { uid: null, date: null, count: 0 };
let _usageInflight = null; // 동시에 여러 호출이 와도 fetch 한 번만.

export function invalidateUsageCache() {
  _usageCache = { uid: null, date: null, count: 0 };
}
export function setUsageCache(uid, count, dayKey = todayKey()) {
  _usageCache = { uid, date: dayKey, count: count || 0 };
}

export async function getTodayUsage(uid, dayKey = todayKey()) {
  if (!uid) return 0;
  // 캐시 히트 — Firestore 안 읽음.
  if (_usageCache.uid === uid && _usageCache.date === dayKey) {
    return _usageCache.count;
  }
  // 진행 중 fetch 가 있으면 같은 promise 공유 (다중 호출 합치기).
  if (_usageInflight && _usageInflight.uid === uid && _usageInflight.date === dayKey) {
    return _usageInflight.promise;
  }
  const promise = (async () => {
    const snap = await getDoc(usageRef(uid, dayKey));
    const count = snap.exists() ? (snap.data().count || 0) : 0;
    _usageCache = { uid, date: dayKey, count };
    _usageInflight = null;
    return count;
  })();
  _usageInflight = { uid, date: dayKey, promise };
  return promise;
}

export function dailyLimit(grade) {
  return DAILY_LIMITS[grade] ?? DAILY_LIMITS.general;
}

export function remainingToday(grade, usedCount) {
  const limit = dailyLimit(grade);
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - (usedCount || 0));
}

export async function consumeUsage(uid, grade) {
  if (!uid) throw new Error("uid required");
  const limit = dailyLimit(grade);
  const dayKey = todayKey();
  const ref = usageRef(uid, dayKey);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().count || 0) : 0;
    if (limit !== Infinity && current >= limit) {
      throw new Error("LIMIT_EXCEEDED");
    }
    const next = current + 1;
    tx.set(ref, {
      count: next,
      grade,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { count: next, limit };
  });
  // 성공한 결과로 캐시 갱신 — 후속 getTodayUsage 가 Firestore 안 읽음.
  setUsageCache(uid, result.count, dayKey);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly credit system — 새 API. 기존 daily consumeUsage 와 병행 운영 가능.
//   users/{uid}/credits/{YYYY-Www}   { used, byAction:{image,analysis}, grade, updatedAt }
// ─────────────────────────────────────────────────────────────────────────────

export function creditCap(grade) {
  return WEEKLY_CREDITS[grade] ?? WEEKLY_CREDITS.general;
}

export function actionCost(action) {
  return ACTION_COSTS[action] ?? 1;
}

export function remainingCredits(grade, used) {
  return Math.max(0, creditCap(grade) - (used || 0));
}

// 주간 크레딧 캐시 — Topbar 칩 같은 곳에서 빈번히 읽을 수 있어 메모이즈.
let _creditCache = { uid: null, week: null, used: 0, byAction: {} };
let _creditInflight = null;

export function invalidateCreditCache() {
  _creditCache = { uid: null, week: null, used: 0, byAction: {} };
}
export function setCreditCache(uid, used, byAction = {}, wk = weekKey()) {
  _creditCache = { uid, week: wk, used: used || 0, byAction: byAction || {} };
}

export async function getWeekUsage(uid, wk = weekKey()) {
  if (!uid) return { used: 0, byAction: {} };
  if (_creditCache.uid === uid && _creditCache.week === wk) {
    return { used: _creditCache.used, byAction: _creditCache.byAction };
  }
  if (_creditInflight && _creditInflight.uid === uid && _creditInflight.week === wk) {
    return _creditInflight.promise;
  }
  const promise = (async () => {
    const snap = await getDoc(creditsRef(uid, wk));
    const data = snap.exists() ? snap.data() : {};
    const used = data.used || 0;
    const byAction = data.byAction || {};
    _creditCache = { uid, week: wk, used, byAction };
    _creditInflight = null;
    return { used, byAction };
  })();
  _creditInflight = { uid, week: wk, promise };
  return promise;
}

// 액션 1회 차감. 실패 시 throw('INSUFFICIENT_CREDITS').
// grade 가 expert 라도 cap(1000)이 있으므로 동일하게 잔여 검사.
export async function consumeCredits(uid, grade, action) {
  if (!uid) throw new Error("uid required");
  const cost = actionCost(action);
  const cap = creditCap(grade);
  const wk = weekKey();
  const ref = creditsRef(uid, wk);

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data().used || 0) : 0;
    const byAction = snap.exists() ? (snap.data().byAction || {}) : {};
    if (current + cost > cap) throw new Error("INSUFFICIENT_CREDITS");
    const nextUsed = current + cost;
    const nextBy = { ...byAction, [action]: (byAction[action] || 0) + cost };
    tx.set(ref, {
      used: nextUsed,
      byAction: nextBy,
      grade,
      cap,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { used: nextUsed, cap, cost, action, byAction: nextBy };
  });
  setCreditCache(uid, result.used, result.byAction, wk);
  return result;
}

export const CREDIT_ERROR_MESSAGES = {
  INSUFFICIENT_CREDITS: "이번 주 크레딧이 부족합니다. 다음 주 월요일에 리셋됩니다.",
};

export const REDEEM_ERROR_MESSAGES = {
  EMPTY_CODE: "초대 코드를 입력해주세요.",
  INVALID_CODE: "유효하지 않은 초대 코드입니다.",
  INACTIVE_CODE: "사용 중지된 코드입니다.",
  EXPIRED_CODE: "만료된 초대 코드입니다.",
  EXHAUSTED_CODE: "사용 횟수가 모두 소진된 코드입니다.",
};

export const USAGE_ERROR_MESSAGES = {
  LIMIT_EXCEEDED: "오늘 사용 한도를 모두 사용했어요.",
};
