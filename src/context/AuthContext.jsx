import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import {
  ensureUserProfile,
  fetchUserProfile,
  redeemInviteCode,
  getTodayUsage,
  consumeUsage,
  dailyLimit,
  remainingToday,
  GRADES,
  STATUS,
  ADMIN_EMAILS,
  USAGE_ERROR_MESSAGES,
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

  useEffect(() => {
    if (!auth) { setLoading(false); setProfileLoaded(true); return; }
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
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
  }, [user]);

  const applyInviteCode = useCallback(async (code) => {
    if (!user?.uid) throw new Error("NOT_AUTHENTICATED");
    const result = await redeemInviteCode(user.uid, code);
    await refreshProfile();
    return result;
  }, [user, refreshProfile]);

  const tryConsumeUsage = useCallback(async () => {
    if (!user?.uid || !profile) return { ok: false, reason: "NO_PROFILE" };
    const grade = profile.grade || GRADES.general;
    try {
      const { count, limit } = await consumeUsage(user.uid, grade);
      setUsageToday(count);
      return { ok: true, count, limit };
    } catch (e) {
      const reason = e.message || "UNKNOWN";
      return { ok: false, reason, message: USAGE_ERROR_MESSAGES[reason] || reason };
    }
  }, [user, profile]);

  const signInEmail = useCallback((email, password) =>
    signInWithEmailAndPassword(auth, email, password), []);

  const signUpEmail = useCallback((email, password) =>
    createUserWithEmailAndPassword(auth, email, password), []);

  const signInGoogle = useCallback(() =>
    signInWithPopup(auth, googleProvider), []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  const grade = profile?.grade || GRADES.general;
  const limit = dailyLimit(grade);
  const remaining = remainingToday(grade, usageToday);

  const isAdmin = (profile?.role === "admin") || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const status = profile?.status || STATUS.pending;
  // 프로필이 아직 안 들어온 상태에선 권한 판단을 보류 (false). 잘못된 PendingScreen 방지.
  const isPending  = !!user && !isAdmin && profileLoaded && profile && status === STATUS.pending;
  const isRejected = !!user && !isAdmin && profileLoaded && profile && status === STATUS.rejected;
  // user가 있는데 profile이 아직이면 auth 자체는 로딩 중으로 본다.
  const isAuthLoading = loading || (!!user && !profileLoaded);

  return (
    <AuthContext.Provider value={{
      user, profile, grade, loading, profileLoaded, isAuthLoading,
      isAdmin, isPending, isRejected, status,
      usageToday, dailyLimit: limit, remainingToday: remaining,
      signInEmail, signUpEmail, signInGoogle, signOut,
      setPendingInviteCode, applyInviteCode,
      refreshProfile, tryConsumeUsage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
