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
  STATUS,
  ADMIN_EMAILS,
  USAGE_ERROR_MESSAGES,
  CREDIT_ERROR_MESSAGES,
  invalidateUsageCache,
  deleteUserDoc,
} from "../lib/grades";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // 프로필이 한 번이라도 성공적으로 로드됐는지. false인 동안엔 권한 판정 보류.
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [usageToday, setUsageToday] = useState(0);
  const pendingInviteRef = useRef(null);

  const loadProfile = useCallback(async (u) => {
    if (!u?.uid) {
      setProfile(null); setProfileLoaded(true); setUsageToday(0);
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
      try {
        const count = await getTodayUsage(u.uid);
        setUsageToday(count);
      } catch (e) {
        console.warn("[Auth] usage fetch failed (계속 진행):", e?.message || e);
      }
    } catch (e) {
      // 일시적 네트워크 오류 등 — 기존 profile을 유지해서 잘못된 PendingScreen 표시 방지.
      console.error("[Auth] profile load failed (기존 값 유지):", e);
      // profileLoaded가 한 번이라도 true였다면 그대로 유지. 첫 로드 실패면 false 유지(LoadingScreen 노출).
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

  const grade = profile?.grade || GRADES.general;
  const limit = dailyLimit(grade);
  const remaining = remainingToday(grade, usageToday);

  const isAdmin = (profile?.role === "admin") || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const status = profile?.status || STATUS.approved;
  const isRejected = !!user && !isAdmin && profileLoaded && profile && status === STATUS.rejected;
  // user가 있는데 profile이 아직이면 auth 자체는 로딩 중으로 본다.
  const isAuthLoading = loading || (!!user && !profileLoaded);
  // 서브앱 접근 가능 여부 — 로그인 안 했거나 general 등급이면 인덱스만.
  // 프로필 로딩 중에는 보수적으로 false (false → 인덱스만, 진입 시도 시 로그인 모달).
  const canAccessSubApps = !!user && profileLoaded && grade !== GRADES.general && !isRejected;

  // 로그인 모달 — 비로그인/일반 사용자가 서브앱 진입 시도 시 트리거.
  // 닫기는 LoginScreen 성공 콜백 / X 버튼 / 배경 클릭으로만. (effect 자동닫기는 cascade 재렌더 유발)
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  // Provider value 를 useMemo 로 안정화 — 매 렌더 새 객체 reference 가 모든 useAuth consumer 의
  // cascade 재렌더를 일으키는 것을 차단.
  const ctxValue = useMemo(() => ({
    user, profile, grade, loading, profileLoaded, isAuthLoading,
    isAdmin, isRejected, status, canAccessSubApps,
    usageToday, dailyLimit: limit, remainingToday: remaining,
    signInEmail, signUpEmail, signInGoogle, signOut, deleteAccount,
    setPendingInviteCode, applyInviteCode,
    refreshProfile, tryConsumeUsage,
    loginModalOpen, openLoginModal, closeLoginModal,
  }), [
    user, profile, grade, loading, profileLoaded, isAuthLoading,
    isAdmin, isRejected, status, canAccessSubApps,
    usageToday, limit, remaining,
    signInEmail, signUpEmail, signInGoogle, signOut, deleteAccount,
    setPendingInviteCode, applyInviteCode,
    refreshProfile, tryConsumeUsage,
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
