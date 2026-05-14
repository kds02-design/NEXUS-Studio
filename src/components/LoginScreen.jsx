import { useState } from "react";
import { THEME } from "../config/apps";
import { useAuth } from "../context/AuthContext";
import { REDEEM_ERROR_MESSAGES } from "../lib/grades";

const errorMessages = {
  "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
  "auth/user-not-found": "등록되지 않은 계정입니다.",
  "auth/wrong-password": "비밀번호가 일치하지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/email-already-in-use": "이미 가입된 이메일입니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/popup-closed-by-user": "Google 로그인이 취소되었습니다.",
  "auth/popup-blocked": "팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.",
  "auth/operation-not-allowed": "Firebase Console에서 해당 로그인 방식을 활성화해주세요.",
};

const friendly = (err) => {
  if (err?.code && errorMessages[err.code]) return errorMessages[err.code];
  if (err?.message && REDEEM_ERROR_MESSAGES[err.message]) return REDEEM_ERROR_MESSAGES[err.message];
  return err?.message || "알 수 없는 오류가 발생했습니다.";
};

export default function LoginScreen() {
  const { signInEmail, signUpEmail, signInGoogle, setPendingInviteCode } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const applyInvite = () => {
    const code = inviteCode.trim();
    setPendingInviteCode(code || null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      applyInvite();
      if (mode === "signin") await signInEmail(email, password);
      else await signUpEmail(email, password);
    } catch (err) {
      console.error("[Login] email auth failed", err);
      setError(friendly(err));
    } finally { setBusy(false); }
  };

  const onGoogle = async () => {
    setError(""); setBusy(true);
    try {
      applyInvite();
      await signInGoogle();
    }
    catch (err) {
      console.error("[Login] google auth failed", err);
      setError(friendly(err));
    } finally { setBusy(false); }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 13,
    background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: 8,
    color: THEME.text, outline: "none", transition: "border-color 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh", background: THEME.bg, color: THEME.text,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: THEME.surface,
        border: `1px solid ${THEME.border}`, borderRadius: 14, padding: "36px 32px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: THEME.accent, textTransform: "uppercase", marginBottom: 6 }}>
            NEXUS Studio
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: THEME.text }}>
            {mode === "signin" ? "로그인" : "회원가입"}
          </div>
          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 6 }}>
            {mode === "signin" ? "계정이 있으신가요?" : "새 계정을 만듭니다"}
          </div>
        </div>

        <button
          type="button" onClick={onGoogle} disabled={busy}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "11px 14px", marginBottom: 18, background: "#fff", color: "#333",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 계속하기
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 18px" }}>
          <div style={{ flex: 1, height: 1, background: THEME.border }}/>
          <span style={{ fontSize: 10, color: THEME.textDim, letterSpacing: "0.1em" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: THEME.border }}/>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: THEME.textMuted, marginBottom: 6, letterSpacing: "0.04em" }}>이메일</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" disabled={busy} autoComplete="email"
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = THEME.accent}
              onBlur={(e) => e.target.style.borderColor = THEME.border}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, color: THEME.textMuted, marginBottom: 6, letterSpacing: "0.04em" }}>비밀번호</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상" disabled={busy}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = THEME.accent}
              onBlur={(e) => e.target.style.borderColor = THEME.border}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: THEME.textMuted, marginBottom: 6, letterSpacing: "0.04em" }}>
              <span>초대 코드 <span style={{ color: THEME.textDim, marginLeft: 4 }}>(선택)</span></span>
              <span style={{ fontSize: 10, color: THEME.textDim }}>Expert 등급 잠금 해제</span>
            </label>
            <input
              type="text" value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="EXPERT-XXXX" disabled={busy} autoComplete="off"
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono','Menlo',monospace", letterSpacing: "0.08em" }}
              onFocus={(e) => e.target.style.borderColor = THEME.accent}
              onBlur={(e) => e.target.style.borderColor = THEME.border}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: "#ff7575", background: "rgba(255,117,117,0.08)",
              border: "1px solid rgba(255,117,117,0.2)", padding: "9px 12px",
              borderRadius: 6, marginBottom: 14,
            }}>{error}</div>
          )}

          <button
            type="submit" disabled={busy}
            style={{
              width: "100%", padding: "12px 14px", background: THEME.accent, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
            }}
          >
            {busy ? "처리 중..." : (mode === "signin" ? "로그인" : "회원가입")}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: THEME.textMuted }}>
          {mode === "signin" ? "계정이 없으신가요? " : "이미 계정이 있나요? "}
          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            style={{ background: "none", border: "none", color: THEME.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
          >
            {mode === "signin" ? "회원가입" : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
