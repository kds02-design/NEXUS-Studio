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
  const [notification, setNotification] = useState(null);
  // popstate에서 setCurrentApp 호출 시 다시 pushState하지 않도록 가드
  const skipPushRef = useRef(false);

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
      skipPushRef.current = true; // 다음 setCurrentApp 호출 때 pushState 생략
      setCurrentAppRaw(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 외부에서 호출하는 setCurrentApp — URL도 같이 갱신
  const setCurrentApp = useCallback((appId) => {
    setCurrentAppRaw((prev) => {
      const same = prev === appId;
      if (!same && !skipPushRef.current && typeof window !== "undefined") {
        try { window.history.pushState({ app: appId }, "", appToPath(appId)); } catch {}
      }
      skipPushRef.current = false;
      return appId;
    });
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
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() { return useContext(GlobalContext); }
