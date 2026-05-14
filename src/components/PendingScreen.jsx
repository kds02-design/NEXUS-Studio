import { THEME } from "../config/apps";
import { useAuth } from "../context/AuthContext";

export default function PendingScreen() {
  const { user, status, signOut, refreshProfile } = useAuth();
  const rejected = status === "rejected";
  const onLogout = async () => { try { await signOut(); } catch {} };

  return (
    <div style={{
      minHeight: "100vh", background: THEME.bg, color: THEME.text,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 420, background: THEME.surface,
        border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "36px 32px",
        textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
          background: rejected ? "rgba(255,117,117,0.12)" : "rgba(108,92,231,0.18)",
          border: `1px solid ${rejected ? "rgba(255,117,117,0.4)" : THEME.accent + "55"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: rejected ? "#ff7575" : THEME.accent,
        }}>
          {rejected ? "✕" : "⏳"}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: rejected ? "#ff7575" : THEME.accent, textTransform: "uppercase", marginBottom: 8 }}>
          {rejected ? "Access Denied" : "Approval Pending"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {rejected ? "접근이 거절되었습니다" : "승인 대기 중입니다"}
        </div>
        <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.6, marginBottom: 22 }}>
          {rejected
            ? "관리자가 접근을 거절했습니다. 문의가 필요하면 다른 계정으로 시도해주세요."
            : <>외부 계정은 관리자 승인 후 사용할 수 있어요.<br/>승인되면 다시 로그인하거나 새로고침해주세요.</>}
        </div>

        <div style={{
          fontSize: 11, color: THEME.textDim, padding: "9px 12px",
          background: THEME.bg, border: `1px solid ${THEME.border}`,
          borderRadius: 6, marginBottom: 20, fontFamily: "monospace",
          wordBreak: "break-all",
        }}>
          {user?.email || user?.uid}
        </div>

        <button onClick={refreshProfile} style={{
          width: "100%", padding: "11px 14px", background: THEME.accent, color: "#fff",
          border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: "pointer", marginBottom: 8,
        }}>
          상태 새로고침
        </button>
        <button onClick={onLogout} style={{
          width: "100%", padding: "10px 14px", background: "transparent", color: THEME.textMuted,
          border: `1px solid ${THEME.border}`, borderRadius: 8, fontSize: 12, fontWeight: 500,
          cursor: "pointer",
        }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
