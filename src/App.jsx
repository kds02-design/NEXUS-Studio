import { GlobalProvider } from "./context/GlobalContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Shell from "./components/Shell";
import PendingScreen from "./components/PendingScreen";
import { THEME } from "./config/apps";
import { initGeminiGate } from "./lib/gemini";

// 앱 마운트 즉시 1회 — settings/gemini 구독 + window.fetch wrap 으로 Gemini 차단 게이트 활성.
// 관리자가 NexusAdmin 에서 비활성화하면 모든 Gemini 호출이 즉시 차단됨.
initGeminiGate();

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", background: THEME.bg, color: THEME.textMuted,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, letterSpacing: "0.1em",
    }}>
      Loading...
    </div>
  );
}

// 인증 시스템 폐기 — 비로그인 사용자도 인덱스 페이지를 볼 수 있다. 로그인은 Topbar 버튼 → 모달.
// 서브앱 접근은 GlobalContext 의 navigate/setCurrentApp 게이트가 차단.
// rejected (관리자가 명시적으로 차단한 계정) 만 별도 처리.
function AuthGate() {
  const { isAuthLoading, isRejected } = useAuth();
  if (isAuthLoading) return <LoadingScreen />;
  if (isRejected) return <PendingScreen />;
  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalProvider>
        <AuthGate />
      </GlobalProvider>
    </AuthProvider>
  );
}
