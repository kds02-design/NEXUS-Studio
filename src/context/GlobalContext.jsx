import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { APP_MAP } from "../config/apps";
import { useAuth } from "./AuthContext";

const GlobalContext = createContext(null);

const emptyPayload = () => ({ source: null, target: null, timestamp: null, prompt: { text: "", tags: [], style: "" }, image: { url: "", metadata: {} }, params: {} });

// URL ↔ currentApp 변환
//   '/' or '/dashboard' → null (대시보드)
//   '/prompt-arc'       → 'prompt-arc'
//   알 수 없는 경로     → null (안전 fallback)
const pathToApp = (pathname) => {
  if (typeof pathname !== "string") return null;
  const seg = pathname.replace(/^\/+|\/+$/g, "").split("/")[0]; // 첫 세그먼트만
  if (!seg || seg === "dashboard") return null;
  return APP_MAP[seg] ? seg : null;
};
const appToPath = (appId) => (appId ? `/${appId}` : "/");

export function GlobalProvider({ children }) {
  // Auth 상태를 그대로 통과시켜 모든 앱이 useGlobal() 하나로 읽을 수 있게 한다.
  // (개별 앱은 자체 onAuthStateChanged / signInAnonymously 를 호출해선 안 됨.)
  const { user, isAuthLoading } = useAuth();

  // 초기 상태: 현재 URL에서 추론. 새로고침/직접 접근에서도 정상 동작.
  const [currentApp, setCurrentAppRaw] = useState(() =>
    typeof window !== "undefined" ? pathToApp(window.location.pathname) : null
  );
  const [payload, setPayload] = useState(emptyPayload());
  // eslint-disable-next-line no-unused-vars
  const [notification, setNotification] = useState(null);
  // popstate에서 setCurrentApp 호출 시 다시 pushState하지 않도록 가드
  const skipPushRef = useRef(false);

  // ─── 전역 테마 (다크 모드 강제 고정) ─────────────────────
  // 라이트 모드는 미완성 상태라 임시로 비활성화. 다크로 강제 고정.
  // 나중에 라이트 모드 완성되면 아래 블록 주석 해제 + 강제 고정 코드 제거.
  const theme = "dark";
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
  }, []);
  // 토글 호출은 무시 (호출부 깨지지 않도록 no-op으로 유지)
  const setTheme = useCallback(() => {}, []);
  const toggleTheme = useCallback(() => {}, []);

  /* ── 라이트/다크 토글 원본 (재활성화 시 위 블록 제거 후 아래 주석 해제) ──
  const [theme, setThemeRaw] = useState(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const saved = localStorage.getItem("nexus.theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    try {
      return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch { return "dark"; }
  });
  useEffect(() => {
    try { localStorage.setItem("nexus.theme", theme); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);
  const setTheme = useCallback((next) => {
    setThemeRaw(next === "light" ? "light" : "dark");
  }, []);
  const toggleTheme = useCallback(() => {
    setThemeRaw((prev) => (prev === "light" ? "dark" : "light"));
  }, []);
  ── */

  // 첫 마운트: 현재 URL의 history state를 표준화 (replaceState).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.history.replaceState({ app: currentApp }, "", appToPath(currentApp)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 뒤로/앞으로 가기 감지
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = (e) => {
      const next = (e.state && e.state.app !== undefined) ? e.state.app : pathToApp(window.location.pathname);
      skipPushRef.current = true; // 다음 currentApp 변경 effect에서 pushState 생략
      setCurrentAppRaw(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // currentApp 변경 → URL 동기화. 부수효과는 setter updater 가 아닌 effect 에서.
  // (StrictMode 에서 updater 가 2회 실행되어 pushState 가 중복되는 문제를 차단)
  // history.state 와 currentApp 이 이미 일치하면 push 스킵 — 멱등.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipPushRef.current) { skipPushRef.current = false; return; }
    const cur = window.history.state?.app;
    if (cur === currentApp) return;
    try { window.history.pushState({ app: currentApp }, "", appToPath(currentApp)); } catch {}
  }, [currentApp]);

  // 외부에서 호출하는 setCurrentApp — URL 동기화는 위 effect 가 처리.
  const setCurrentApp = useCallback((appId) => {
    setCurrentAppRaw(appId);
  }, []);

  const navigate = useCallback((targetId, incomingPayload = null) => {
    if (incomingPayload) setPayload({ ...incomingPayload, target: targetId, timestamp: Date.now() });
    setCurrentApp(targetId);
  }, [setCurrentApp]);

  const clearPayload = useCallback(() => setPayload(emptyPayload()), []);

  return (
    <GlobalContext.Provider value={{
      currentApp, setCurrentApp, navigate,
      payload, setPayload, clearPayload,
      notification,
      // Auth bridge — apps should read these, not call firebase auth themselves.
      user, isAuthLoading,
      // Theme bridge — 모든 앱이 동일한 light/dark 상태를 공유.
      theme, setTheme, toggleTheme,
      isLight: theme === "light", isDark: theme === "dark",
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() { return useContext(GlobalContext); }
