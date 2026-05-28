import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/GlobalContext";

const NCSOFT_RE = /(@ncsoft\.com$)|(^|[._-])ncsoft([._-]|@)/i;

export default function PendingScreen() {
  const T = useTheme();
  const { user, status, signOut, refreshProfile, resendVerificationEmail, refreshEmailVerification } = useAuth();
  const rejected = status === "rejected";
  // 이메일 가입자(emailVerified=false) + ncsoft 토큰 보유자 → 검증 흐름 노출.
  // Google OAuth 는 emailVerified=true 로 들어오므로 이 분기에 안 걸림.
  const needsVerify = !!user && user.emailVerified === false && NCSOFT_RE.test(String(user.email || ""));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const onLogout = async () => { try { await signOut(); } catch {} };

  const onResend = async () => {
    setBusy(true); setFeedback("");
    try {
      await resendVerificationEmail();
      setFeedback("인증 메일을 다시 보냈습니다. 메일함을 확인하세요.");
    } catch (e) {
      setFeedback(`재발송 실패: ${e.message || e}`);
    } finally { setBusy(false); }
  };

  const onCheck = async () => {
    setBusy(true); setFeedback("");
    try {
      const ok = await refreshEmailVerification();
      if (ok) {
        await refreshProfile();
        setFeedback("인증 확인 완료. 잠시 후 자동 진입합니다.");
      } else {
        setFeedback("아직 인증되지 않았습니다. 메일의 링크를 먼저 클릭해주세요.");
      }
    } catch (e) {
      setFeedback(`확인 실패: ${e.message || e}`);
    } finally { setBusy(false); }
  };

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
          background: rejected ? "rgba(255,117,117,0.12)"
            : needsVerify ? "rgba(253,203,110,0.18)"
            : "rgba(108,92,231,0.18)",
          border: `1px solid ${rejected ? "rgba(255,117,117,0.4)"
            : needsVerify ? "#FDCB6E66"
            : T.accent + "55"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, color: rejected ? "#ff7575" : needsVerify ? "#FDCB6E" : T.accent,
        }}>
          {rejected ? "✕" : needsVerify ? "✉" : "⏳"}
        </div>

        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.18em",
          color: rejected ? "#ff7575" : needsVerify ? "#FDCB6E" : T.accent,
          textTransform: "uppercase", marginBottom: 8,
        }}>
          {rejected ? "Access Denied" : needsVerify ? "Verify Your Email" : "Approval Pending"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {rejected ? "접근이 거절되었습니다"
            : needsVerify ? "이메일 인증이 필요해요"
            : "승인 대기 중입니다"}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6, marginBottom: 22 }}>
          {rejected ? "관리자가 접근을 거절했습니다. 문의가 필요하면 다른 계정으로 시도해주세요."
            : needsVerify ? <>가입하신 메일함의 인증 링크를 클릭한 뒤 아래 <b>인증 확인</b> 버튼을 눌러주세요.<br/>인증이 완료되면 자동으로 Pro 등급이 부여됩니다.</>
            : <>외부 계정은 관리자 승인 후 사용할 수 있어요.<br/>승인되면 다시 로그인하거나 새로고침해주세요.</>}
        </div>

        <div style={{
          fontSize: 11, color: T.textDim, padding: "9px 12px",
          background: T.bg, border: `1px solid ${T.border}`,
          borderRadius: 6, marginBottom: 16, fontFamily: "monospace",
          wordBreak: "break-all",
        }}>
          {user?.email || user?.uid}
        </div>

        {feedback && (
          <div style={{
            fontSize: 11, color: T.text,
            padding: "8px 12px", marginBottom: 14,
            background: "rgba(108,92,231,0.08)",
            border: `1px solid ${T.accent}33`,
            borderRadius: 6, lineHeight: 1.5,
          }}>
            {feedback}
          </div>
        )}

        {needsVerify ? (
          <>
            <button onClick={onCheck} disabled={busy} style={{
              width: "100%", padding: "11px 14px", background: T.accent, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: busy ? "wait" : "pointer", marginBottom: 8, opacity: busy ? 0.6 : 1,
            }}>
              인증 확인
            </button>
            <button onClick={onResend} disabled={busy} style={{
              width: "100%", padding: "10px 14px", background: "transparent", color: T.text,
              border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: busy ? "wait" : "pointer", marginBottom: 8, opacity: busy ? 0.6 : 1,
            }}>
              인증 메일 재발송
            </button>
          </>
        ) : (
          <button onClick={refreshProfile} style={{
            width: "100%", padding: "11px 14px", background: T.accent, color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", marginBottom: 8,
          }}>
            상태 새로고침
          </button>
        )}
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
