import { GlobalProvider } from "./context/GlobalContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Shell from "./components/Shell";
import LoginScreen from "./components/LoginScreen";
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

// Switches the visible view based on auth state.
// Both providers stay mounted above this so context never disappears under any descendant.
function AuthGate() {
  const { user, isAuthLoading, isPending, isRejected } = useAuth();
  // 1) Auth 자체 로딩 중 (Firebase Auth 초기 + 프로필 로드 완료 전): 로딩 스피너
  if (isAuthLoading) return <LoadingScreen />;
  // 2) 로그아웃 상태
  if (!user) return <LoginScreen />;
  // 3) 프로필 확정 후에만 pending/rejected 판정
  if (isPending || isRejected) return <PendingScreen />;
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
