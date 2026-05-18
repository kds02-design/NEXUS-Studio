// 초대 코드 입력 모달. general 사용자만 호출.
// 유효한 코드면 expert로 자동 업그레이드 (lib/grades.redeemInviteCode → applyInviteCode).
import { useState } from "react";
import { THEME } from "../config/apps";
import { useAuth } from "../context/AuthContext";

const ERR_MSG = {
  EMPTY_CODE: "코드를 입력해주세요.",
  INVALID_CODE: "유효하지 않은 초대 코드입니다.",
  CODE_INACTIVE: "비활성화된 코드입니다.",
  CODE_EXPIRED: "만료된 코드입니다.",
  CODE_EXHAUSTED: "사용 횟수가 초과된 코드입니다.",
};

export default function InviteCodeModal({ onClose }) {
  const { applyInviteCode } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (busy) return;
    const trimmed = code.trim();
    if (!trimmed) { setErr("코드를 입력해주세요."); return; }
    setBusy(true); setErr("");
    try {
      await applyInviteCode(trimmed);
      setDone(true);
    } catch (e) {
      setErr(ERR_MSG[e.message] || `오류: ${e.message || e}`);
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"100%", maxWidth:380, background:THEME.surface, border:`1px solid ${THEME.border}`, borderRadius:14, color:THEME.text, overflow:"hidden" }}>
        <div style={{ padding:"22px 24px 18px", borderBottom:`1px solid ${THEME.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:THEME.accent, textTransform:"uppercase", marginBottom:6 }}>초대 코드</div>
          <div style={{ fontSize:15, fontWeight:700 }}>Expert 등급 코드 입력</div>
          <div style={{ fontSize:11, color:THEME.textMuted, marginTop:6 }}>유효한 코드면 즉시 Expert로 업그레이드됩니다.</div>
        </div>

        {done ? (
          <div style={{ padding:"32px 24px", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Expert 등급 적용됨</div>
            <div style={{ fontSize:12, color:THEME.textMuted, marginBottom:20 }}>이제 무제한으로 사용할 수 있습니다.</div>
            <button onClick={onClose} style={btn(THEME.accent, "#fff")}>닫기</button>
          </div>
        ) : (
          <>
            <div style={{ padding:"20px 24px" }}>
              <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="예: NEXUS2026" autoFocus
                style={{ width:"100%", padding:"12px 14px", fontSize:14, background:THEME.bg, color:THEME.text, border:`1px solid ${THEME.border}`, borderRadius:6, outline:"none", fontFamily:"'JetBrains Mono', monospace", letterSpacing:"0.08em", textTransform:"uppercase", boxSizing:"border-box" }} />
              {err && <div style={{ fontSize:11, color:"#ff7575", marginTop:8 }}>{err}</div>}
            </div>
            <div style={{ padding:"14px 24px", background:THEME.bg, borderTop:`1px solid ${THEME.border}`, display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={onClose} disabled={busy} style={btn(THEME.border, THEME.text)}>취소</button>
              <button onClick={submit} disabled={busy || !code.trim()} style={btn(THEME.accent, "#fff", busy || !code.trim() ? 0.4 : 1)}>
                {busy ? "확인 중…" : "적용"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const btn = (bg, fg, opacity=1) => ({
  background: bg, color: fg, border:`1px solid ${bg === "#1E1E2E" ? "#1E1E2E" : bg}`,
  borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:600, cursor: opacity === 1 ? "pointer" : "not-allowed",
  opacity, transition:"filter 0.12s",
});
