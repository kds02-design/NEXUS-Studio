import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/GlobalContext";

// 관리자가 명시적으로 차단(rejected)한 계정 전용 화면.
// 인증 시스템 자체는 폐기됐지만 관리자 차단 수단은 유지.
export default function PendingScreen() {
  const T = useTheme();
  const { user, signOut } = useAuth();
  const onLogout = async () => { try { await signOut(); } catch {} };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 440, background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: 14, padding: "36px 32px",
        textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
          background: "rgba(255,117,117,0.12)",
          border: "1px solid rgba(255,117,117,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: "#ff7575",
        }}>
          ✕
        </div>

        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
          color: "#ff7575", textTransform: "uppercase", marginBottom: 8,
        }}>
          Access Denied
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          접근이 거절되었습니다
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6, marginBottom: 22 }}>
          관리자가 이 계정의 접근을 차단했습니다. 문의가 필요하면 다른 계정으로 시도해주세요.
        </div>

        <div style={{
          fontSize: 11, color: T.textDim, padding: "9px 12px",
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 6, marginBottom: 16, fontFamily: "monospace",
          wordBreak: "break-all",
        }}>
          {user?.email || user?.uid}
        </div>

        <button onClick={onLogout} style={{
          width: "100%", padding: "10px 14px", background: "transparent", color: T.textMuted,
          border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 500,
          cursor: "pointer",
        }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
