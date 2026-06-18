import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  deleteUser as fbDeleteUser,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import {
  ensureUserProfile,
  fetchUserProfile,
  redeemInviteCode,
  getTodayUsage,
  consumeUsage,
  consumeCredits,
  dailyLimit,
  remainingToday,
  GRADES,
  gradeFromEmail,
  STATUS,
  ADMIN_EMAILS,
  USAGE_ERROR_MESSAGES,
  CREDIT_ERROR_MESSAGES,
  invalidateUsageCache,
  deleteUserDoc,
} from "../lib/grades";

const AuthContext = createContext(null);

// 등급 우선순위 — 저장 등급과 이메일 자격 중 더 높은 쪽을 고르기 위한 랭크.
const GRADE_RANK = { general: 0, pro: 1, pro_plus: 2, expert: 3 };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // 프로필이 한 번이라도 성공적으로 로드됐는지. false인 동안엔 권한 판정 보류.
  const [profileLoaded, setProfileLoaded] = useState(false);
  // 첫 프로필 로드가 (재시도 소진 후에도) 실패했을 때의 에러. set 되면 LoadingScreen 대신
  // 복구 화면(재시도/로그아웃)으로 빠진다 — Firestore 권한 거부로 인한 무한 로딩 방지.
  const [profileError, setProfileError] = useState(null);
  const [usageToday, setUsageToday] = useState(0);
  const pendingInviteRef = useRef(null);

  const loadProfile = useCallback(async (u, attempt = 0) => {
    if (!u?.uid) {
      setProfile(null); setProfileLoaded(true); setUsageToday(0); setProfileError(null);
      return;
    }
    try {
      const p = await ensureUserProfile(u);
      const code = pendingInviteRef.current;
      if (code && p.grade !== GRADES.expert) {
        try {
          await redeemInviteCode(u.uid, code);
          pendingInviteRef.current = null;
          const refreshed = await fetchUserProfile(u.uid);
          setProfile(refreshed || p);
        } catch (e) {
          console.warn("[Auth] invite redeem failed", e.message);
          pendingInviteRef.current = null;
          setProfile(p);
        }
      } else {
        pendingInviteRef.current = null;
        setProfile(p);
      }
      setProfileLoaded(true);
      setProfileError(null);
      try {
        const count = await getTodayUsage(u.uid);
        setUsageToday(count);
      } catch (e) {
        console.warn("[Auth] usage fetch failed (계속 진행):", e?.message || e);
      }
    } catch (e) {
      // 일시적 네트워크 오류 등 — 기존 profile을 유지해서 잘못된 PendingScreen 표시 방지.
      console.error("[Auth] profile load failed:", e);
      // 일시적 오류 대비 제한적 자동 재시도 (지수 백오프). 재시도 동안엔 LoadingScreen 유지.
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        return loadProfile(u, attempt + 1);
      }
      // 재시도 소진 — profileError 설정. 첫 로드 실패면 게이트(!profileLoaded && profileError)가
      // 복구 화면을 띄우고, 이미 로드된 적 있으면 게이트가 무시해 기존 profile 을 무중단 유지.
      setProfileError(e);
    }
  }, []);

  // 가장 최근에 loadProfile 을 실행한 uid. 같은 uid 로 onAuthStateChanged 가 다시 호출돼도(토큰 refresh 등)
  // 불필요한 Firestore 재읽기를 피하기 위한 가드.
  const lastLoadedUidRef = useRef(null);

  useEffect(() => {
    if (!auth) { setLoading(false); setProfileLoaded(true); return; }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const prevUid = lastLoadedUidRef.current;
      const nextUid = u?.uid || null;
      // 같은 uid 면 setUser 도 스킵 — Firebase 가 token refresh 등으로 콜백을 다시 호출할 때
      // 매번 새 user 객체 reference 로 setState 하면 AuthProvider 가 재렌더되어 모든 useAuth
      // consumer 가 cascade 재렌더 → 인덱스 화면이 깜빡이는 양상으로 보임. uid 같으면 의미상
      // 동일하므로 state 변경 자체를 안 함.
      if (prevUid !== null && prevUid === nextUid) {
        setLoading(false);
        return;
      }
      // uid 가 실제 바뀌었음(첫 로그인 / 로그아웃 / 다른 계정) → stale usage 캐시 정리 + 전체 로드.
      invalidateUsageCache();
      lastLoadedUidRef.current = nextUid;
      setUser(u);
      await loadProfile(u);
      setLoading(false);
    }, (err) => {
      console.error("[Auth] state change error", err);
      setLoading(false);
      setProfileLoaded(true);
    });
    return () => unsubscribe();
  }, [loadProfile]);

  // 복구 화면의 "다시 시도" — 캐시된 현재 user 로 프로필 로드를 재시도.
  const retryProfile = useCallback(async () => {
    const u = auth?.currentUser || user;
    if (!u?.uid) { setProfileError(null); return; }
    setProfileError(null);
    setLoading(true);
    await loadProfile(u);
    setLoading(false);
  }, [loadProfile, user]);

  const setPendingInviteCode = useCallback((code) => {
    pendingInviteRef.current = code ? String(code).trim() : null;
  }, []);

  // deps 를 uid/grade 같은 primitive 로 좁힘 — user/profile 객체 reference 변경(매 렌더 새 객체)에도
  // useCallback identity 가 안정적. 호출부의 useEffect 가 무한 재실행 되는 것을 차단.
  const refreshProfile = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const p = await fetchUserProfile(user.uid);
      if (p) { setProfile(p); setProfileLoaded(true); }
      try {
        const count = await getTodayUsage(user.uid);
        setUsageToday(count);
      } catch {}
    } catch (e) {
      console.warn("[Auth] refreshProfile 실패 (기존 값 유지):", e?.message || e);
    }
  }, [user?.uid]);

  // 로컬 프로필 즉시 패치 — 서버 재조회(refreshProfile)가 실패/지연돼도 UI 가 바로 반영되도록.
  // "쓰기는 성공했는데 화면이 안 바뀌는"(예: 아바타 변경) 케이스 방지.
  const patchProfile = useCallback((patch) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const applyInviteCode = useCallback(async (code) => {
    if (!user?.uid) throw new Error("NOT_AUTHENTICATED");
    const result = await redeemInviteCode(user.uid, code);
    await refreshProfile();
    return result;
  }, [user?.uid, refreshProfile]);

  // 주간 크레딧 차감. action: 'image'(10c) | 'analysis'(1c, default).
  // 호출부는 동일하게 { ok, reason, message } 받음. LimitReachedModal 트리거 reason = "INSUFFICIENT_CREDITS".
  const tryConsumeUsage = useCallback(async (action = "analysis") => {
    if (!user?.uid || !profile) return { ok: false, reason: "NO_PROFILE" };
    const grade = profile.grade || GRADES.general;
    try {
      const r = await consumeCredits(user.uid, grade, action);
      return { ok: true, used: r.used, cap: r.cap, cost: r.cost, action: r.action };
    } catch (e) {
      const reason = e.message || "UNKNOWN";
      return { ok: false, reason, message: CREDIT_ERROR_MESSAGES[reason] || USAGE_ERROR_MESSAGES[reason] || reason };
    }
  }, [user?.uid, profile?.grade]);

  const signInEmail = useCallback((email, password) =>
    signInWithEmailAndPassword(auth, email, password), []);

  const signUpEmail = useCallback(async (email, password) =>
    createUserWithEmailAndPassword(auth, email, password), []);

  const signInGoogle = useCallback(() =>
    signInWithPopup(auth, googleProvider), []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  // 회원 탈퇴 — Firestore 사용자 doc 정리 후 Auth 계정 삭제.
  // Firestore 를 먼저 지워야 함 (Auth 삭제 후엔 본인 권한이 사라져 doc 정리 불가).
  // 오래된 세션이면 deleteUser 가 auth/requires-recent-login 을 throw → 호출부에서 재로그인 안내.
  const deleteAccount = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) throw new Error("로그인이 필요합니다.");
    try { await deleteUserDoc(u.uid); }
    catch (e) { console.warn("[Auth] deleteUserDoc failed (계속 진행)", e); }
    await fbDeleteUser(u); // 성공 시 onAuthStateChanged 가 자동으로 로그아웃 처리
  }, []);

  const isAdmin = (profile?.role === "admin") || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  // 유효 등급 — 저장된 doc 등급과 이메일 기반 자격(admin=expert, ncsoft=pro) 중 더 높은 쪽을 채택.
  // Firestore 백필 "쓰기"가 지연되거나 보안 규칙에 막혀도, 권한 판정·등급 표시가 즉시 올바르게
  // 나오도록 read-time 에서 보정한다. (관리자가 수동 부여한 pro_plus/expert 는 더 높으므로 그대로 유지)
  const storedGrade = profile?.grade || GRADES.general;
  const entitledGrade = isAdmin ? GRADES.expert : gradeFromEmail(user?.email || "");
  const grade = (GRADE_RANK[entitledGrade] ?? 0) > (GRADE_RANK[storedGrade] ?? 0) ? entitledGrade : storedGrade;
  const limit = dailyLimit(grade);
  const remaining = remainingToday(grade, usageToday);
  const status = profile?.status || STATUS.approved;
  const isRejected = !!user && !isAdmin && profileLoaded && profile && status === STATUS.rejected;
  // user가 있는데 profile이 아직이면 auth 자체는 로딩 중으로 본다.
  // 단, 첫 로드가 끝내 실패해 profileError 가 세워지면 로딩을 풀고 복구 화면으로 넘긴다.
  const isAuthLoading = loading || (!!user && !profileLoaded && !profileError);
  // 서브앱 접근 가능 여부 — 로그인 안 했거나 general 등급이면 인덱스만.
  // 프로필 로딩 중에는 보수적으로 false (false → 인덱스만, 진입 시도 시 로그인 모달).
  // admin 은 grade/프로필 로딩 상태와 무관하게 항상 서브앱 접근 — 백필 지연이나 프로필 로드 실패 시에도 잠기지 않도록 방어.
  const canAccessSubApps = !!user && (isAdmin || (profileLoaded && grade !== GRADES.general && !isRejected));

  // 로그인 모달 — 비로그인/일반 사용자가 서브앱 진입 시도 시 트리거.
  // 닫기는 LoginScreen 성공 콜백 / X 버튼 / 배경 클릭으로만. (effect 자동닫기는 cascade 재렌더 유발)
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // Provider value 를 useMemo 로 안정화 — 매 렌더 새 객체 reference 가 모든 useAuth consumer 의
  // cascade 재렌더를 일으키는 것을 차단.
  const ctxValue = useMemo(() => ({
    user, profile, grade, loading, profileLoaded, isAuthLoading,
    profileError, retryProfile,
    isAdmin, isRejected, status, canAccessSubApps,
    usageToday, dailyLimit: limit, remainingToday: remaining,
    signInEmail, signUpEmail, signInGoogle, signOut, deleteAccount,
    setPendingInviteCode, applyInviteCode,
    refreshProfile, patchProfile, tryConsumeUsage,
    loginModalOpen, openLoginModal, closeLoginModal,
  }), [
    user, profile, grade, loading, profileLoaded, isAuthLoading,
    profileError, retryProfile,
    isAdmin, isRejected, status, canAccessSubApps,
    usageToday, limit, remaining,
    signInEmail, signUpEmail, signInGoogle, signOut, deleteAccount,
    setPendingInviteCode, applyInviteCode,
    refreshProfile, patchProfile, tryConsumeUsage,
    loginModalOpen, openLoginModal, closeLoginModal,
  ]);

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
