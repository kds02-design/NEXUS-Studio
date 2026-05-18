// 등급 업그레이드 요청 모달. general/pro 사용자만 호출.
// upgradeRequests/{auto} 컬렉션에 저장 — NEXUS Admin에서 검토.
import { useState } from "react";
import { THEME } from "../config/apps";
import { useAuth } from "../context/AuthContext";
import { submitUpgradeRequest, GRADES, GRADE_LABEL } from "../lib/grades";

const TARGETS = {
  general: [GRADES.pro, GRADES.expert],
  pro: [GRADES.expert],
};

export default function UpgradeRequestModal({ onClose }) {
  const { user, profile, grade } = useAuth();
  const targets = TARGETS[grade] || [];
  const [target, setTarget] = useState(targets[0] || GRADES.pro);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (busy) return;
    if (!reason.trim()) { setErr("요청 사유를 입력해주세요."); return; }
    setBusy(true); setErr("");
    try {
      await submitUpgradeRequest({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || profile?.displayName || "",
        currentGrade: grade,
        targetGrade: target,
        reason: reason.trim(),
      });
      setDone(true);
    } catch (e) {
      console.error("[Upgrade] submit failed", e);
      setErr("요청 전송 실패: " + (e.message || e));
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Noto Sans KR', sans-serif" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width:"100%", maxWidth:440, background:THEME.surface, border:`1px solid ${THEME.border}`, borderRadius:14, color:THEME.text, overflow:"hidden" }}>
        <div style={{ padding:"22px 24px 18px", borderBottom:`1px solid ${THEME.border}` }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:THEME.accent, textTransform:"uppercase", marginBottom:6 }}>등급 업그레이드 요청</div>
          <div style={{ fontSize:16, fontWeight:700 }}>현재 등급: <span style={{ color:THEME.accent }}>{GRADE_LABEL[grade]}</span></div>
        </div>

        {done ? (
          <div style={{ padding:"32px 24px", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>요청이 전송되었습니다</div>
            <div style={{ fontSize:12, color:THEME.textMuted, marginBottom:20 }}>관리자가 검토 후 등급을 조정합니다.</div>
            <button onClick={onClose} style={btn(THEME.accent, "#fff")}>닫기</button>
          </div>
        ) : (
          <>
            <div style={{ padding:"20px 24px" }}>
              <label style={lbl}>원하는 등급</label>
              <div style={{ display:"flex", gap:8, marginBottom:16 }}>
                {targets.map((t) => {
                  const active = target === t;
                  return (
                    <button key={t} onClick={() => setTarget(t)} style={{
                      flex:1, padding:"10px 12px", fontSize:13, fontWeight:600,
                      background: active ? `${THEME.accent}22` : "transparent",
                      border:`1px solid ${active ? THEME.accent : THEME.border}`,
                      color: active ? THEME.accent : THEME.textMuted,
                      borderRadius:6, cursor:"pointer",
                    }}>{GRADE_LABEL[t]}</button>
                  );
                })}
              </div>

              <label style={lbl}>요청 사유</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="업그레이드가 필요한 이유를 자세히 적어주세요."
                style={{ width:"100%", padding:"10px 12px", fontSize:13, background:THEME.bg, color:THEME.text, border:`1px solid ${THEME.border}`, borderRadius:6, outline:"none", resize:"vertical", fontFamily:"inherit", lineHeight:1.5, boxSizing:"border-box" }} />
              {err && <div style={{ fontSize:11, color:"#ff7575", marginTop:8 }}>{err}</div>}
            </div>
            <div style={{ padding:"14px 24px", background:THEME.bg, borderTop:`1px solid ${THEME.border}`, display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={onClose} disabled={busy} style={btn(THEME.border, THEME.text)}>취소</button>
              <button onClick={submit} disabled={busy || !reason.trim()} style={btn(THEME.accent, "#fff", busy || !reason.trim() ? 0.4 : 1)}>
                {busy ? "전송 중…" : "요청 보내기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const lbl = { display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:THEME.textMuted, marginBottom:8 };
const btn = (bg, fg, opacity=1) => ({
  background: bg, color: fg, border:`1px solid ${bg === THEME.border ? THEME.border : bg}`,
  borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:600, cursor: opacity === 1 ? "pointer" : "not-allowed",
  opacity, transition:"filter 0.12s",
});
