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
  expert: "expert",
};

export const GRADE_LABEL = {
  general: "General",
  pro: "Pro",
  expert: "Expert",
};

export const DAILY_LIMITS = {
  general: 10,
  pro: 50,
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

const userRef = (uid) => doc(db, "users", uid);
const usageRef = (uid, dayKey) => doc(db, "users", uid, "usage", dayKey);
const inviteRef = (code) => doc(db, "inviteCodes", code);

// Decide initial role/status/grade based on email.
//   1) ADMIN_EMAILS              → role=admin, grade=expert, approved
//   2) @ncsoft.com 회사 도메인     → grade=pro,  approved
//   3) 외부 도메인이지만 local에 'ncsoft' 토큰 (예: id.ncsoft@gmail.com)
//                                 → grade=pro,  approved
//   4) 그 외 외부 이메일           → grade=general, pending (관리자 승인 대기)
function inferAccessFromEmail(email) {
  const e = String(email || "").toLowerCase();
  const domain = e.split("@")[1] || "";
  const isAdmin = ADMIN_EMAILS.includes(e);
  const isProDomain = PRO_DOMAINS.includes(domain);
  const isProLocal = isNcsoftLocal(e);
  const isPro = isProDomain || isProLocal;
  return {
    role: isAdmin ? "admin" : "user",
    grade: isAdmin ? GRADES.expert : (isPro ? GRADES.pro : GRADES.general),
    status: (isAdmin || isPro) ? STATUS.approved : STATUS.pending,
  };
}

export async function ensureUserProfile(user) {
  if (!user?.uid) throw new Error("user.uid required");
  const ref = userRef(user.uid);
  const snap = await getDoc(ref);
  const inferred = inferAccessFromEmail(user.email);

  if (snap.exists()) {
    const data = snap.data();
    // Backfill missing fields without overwriting admin-set values.
    const patch = {};
    if (!data.email) patch.email = user.email || "";
    if (!data.grade) patch.grade = inferred.grade;
    if (!data.role) patch.role = inferred.role;
    if (!data.status) patch.status = inferred.status;
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

export async function getTodayUsage(uid, dayKey = todayKey()) {
  const snap = await getDoc(usageRef(uid, dayKey));
  return snap.exists() ? (snap.data().count || 0) : 0;
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

  return runTransaction(db, async (tx) => {
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
}

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
