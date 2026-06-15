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

// 첫 프로필 로드가 (자동 재시도 후에도) 실패했을 때 표시 — 무한 로딩 대신 복구 경로 제공.
// 주 원인: 만료된 캐시 세션 토큰 / Firestore 권한 거부. 재시도 또는 로그아웃으로 빠져나간다.
function ProfileErrorScreen() {
  const { retryProfile, signOut } = useAuth();
  const btn = {
    padding: "8px 18px", fontSize: 13, borderRadius: 6, cursor: "pointer",
    border: `1px solid ${THEME.border || "#333"}`, background: "transparent", color: THEME.text,
  };
  return (
    <div style={{
      minHeight: "100vh", background: THEME.bg, color: THEME.text,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
      padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>프로필을 불러오지 못했습니다</div>
      <div style={{ fontSize: 13, color: THEME.textMuted, maxWidth: 420, lineHeight: 1.6 }}>
        로그인 세션이 만료되었거나 일시적인 연결 문제일 수 있습니다.<br />
        다시 시도하거나 로그아웃 후 재로그인해 주세요.
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button style={{ ...btn, borderColor: THEME.accent || THEME.text }} onClick={retryProfile}>다시 시도</button>
        <button style={btn} onClick={signOut}>로그아웃</button>
      </div>
    </div>
  );
}

// 인증 시스템 폐기 — 비로그인 사용자도 인덱스 페이지를 볼 수 있다. 로그인은 Topbar 버튼 → 모달.
// 서브앱 접근은 GlobalContext 의 navigate/setCurrentApp 게이트가 차단.
// rejected (관리자가 명시적으로 차단한 계정) 만 별도 처리.
function AuthGate() {
  const { isAuthLoading, isRejected, profileError, profileLoaded } = useAuth();
  if (isAuthLoading) return <LoadingScreen />;
  if (profileError && !profileLoaded) return <ProfileErrorScreen />;
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
