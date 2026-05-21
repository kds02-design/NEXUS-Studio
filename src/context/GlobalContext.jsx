import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { APP_MAP, pickTheme } from "../config/apps";
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

  // ─── 전역 테마 (라이트/다크 토글) ─────────────────────
  // Shell 골조(Topbar/AppCard/ProfilePopover/Dashboard*)는 라이트 토큰을 따라가지만,
  // 개별 앱(BannerCodex 외)은 아직 다크 하드코딩이라 라이트로 전환 시 mixed appearance.
  // 완료된 앱: BannerCodex, PromotionArchive.
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

  // Provider value 를 useMemo 로 안정화 — Provider 가 리렌더돼도 deps 가 안 바뀌면 같은 객체 reference.
  // 이 객체 reference 가 매번 새로 만들어지면 모든 useGlobal consumer 가 cascade 재렌더되어
  // 인덱스 화면이 깜빡이는 양상으로 보일 수 있음.
  const ctxValue = useMemo(() => ({
    currentApp, setCurrentApp, navigate,
    payload, setPayload, clearPayload,
    notification,
    user, isAuthLoading,
    theme, setTheme, toggleTheme,
    isLight: theme === "light", isDark: theme === "dark",
  }), [
    currentApp, setCurrentApp, navigate,
    payload, clearPayload,
    notification,
    user, isAuthLoading,
    theme, setTheme, toggleTheme,
  ]);

  return (
    <GlobalContext.Provider value={ctxValue}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() { return useContext(GlobalContext); }

// 활성 테마 토큰 객체를 반환. 컴포넌트는 `const T = useTheme()` 후 T.bg / T.text 등 사용.
export function useTheme() {
  const ctx = useContext(GlobalContext);
  return pickTheme(!!ctx?.isLight);
}
