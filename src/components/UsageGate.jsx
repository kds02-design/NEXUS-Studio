import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/GlobalContext";
import { GRADE_LABEL, REDEEM_ERROR_MESSAGES } from "../lib/grades";

const gradeColor = {
  general: "#7A7A9A",
  pro: "#74B9FF",
  expert: "#FDCB6E",
};

export function GradeBadge({ compact = false }) {
  const T = useTheme();
  const { grade, usageToday, dailyLimit } = useAuth();
  const color = gradeColor[grade] || T.accent;
  const limitText = dailyLimit === Infinity ? "∞" : dailyLimit;
  return (
    <div title={`등급: ${GRADE_LABEL[grade]} · 오늘 사용 ${usageToday}/${limitText}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: compact ? "2px 7px" : "3px 9px",
        background: `${color}1A`, border: `1px solid ${color}55`, borderRadius: 999,
        fontSize: compact ? 9 : 10, fontWeight: 700, color, letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }}/>
      {GRADE_LABEL[grade]}
      {!compact && (
        <span style={{ color: T.textMuted, fontWeight: 500, letterSpacing: 0 }}>
          {usageToday}/{limitText}
        </span>
      )}
    </div>
  );
}

export function LimitReachedModal({ onClose }) {
  const T = useTheme();
  const { grade, dailyLimit, applyInviteCode } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const limitText = dailyLimit === Infinity ? "무제한" : `${dailyLimit}회`;

  const onRedeem = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await applyInviteCode(code);
      setDone(true);
    } catch (e2) {
      setErr(REDEEM_ERROR_MESSAGES[e2.message] || e2.message);
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: 14, padding: "28px 28px 24px",
        color: T.text,
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", color: T.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
          Daily Limit
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {done ? "Expert 등급으로 업그레이드됐어요" : "오늘 사용 한도에 도달했어요"}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6, marginBottom: 18 }}>
          {done
            ? "이제 모든 기능을 무제한으로 사용할 수 있어요."
            : <>현재 등급은 <b style={{ color: gradeColor[grade] }}>{GRADE_LABEL[grade]}</b> ({limitText}/일)입니다. 초대 코드가 있다면 입력해 Expert로 업그레이드할 수 있어요.</>}
        </div>

        {!done && (
          <form onSubmit={onRedeem}>
            <input
              type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="초대 코드" autoComplete="off" disabled={busy}
              style={{
                width: "100%", boxSizing: "border-box", padding: "11px 13px", fontSize: 13,
                background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
                color: T.text, outline: "none", marginBottom: 10,
                fontFamily: "'JetBrains Mono','Menlo',monospace", letterSpacing: "0.08em",
              }}/>
            {err && (
              <div style={{
                fontSize: 12, color: "#ff7575", background: "rgba(255,117,117,0.08)",
                border: "1px solid rgba(255,117,117,0.2)", padding: "8px 11px",
                borderRadius: 6, marginBottom: 10,
              }}>{err}</div>
            )}
            <button type="submit" disabled={busy || !code.trim()} style={{
              width: "100%", padding: "11px 14px", background: T.accent, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: busy ? "not-allowed" : "pointer", opacity: (busy || !code.trim()) ? 0.5 : 1,
              marginBottom: 8,
            }}>
              {busy ? "확인 중..." : "초대 코드 적용"}
            </button>
          </form>
        )}

        <button type="button" onClick={onClose} style={{
          width: "100%", padding: "10px 14px", background: "transparent", color: T.textMuted,
          border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 500,
          cursor: "pointer",
        }}>
          {done ? "계속하기" : "닫기"}
        </button>
      </div>
    </div>
  );
}

export function StyleLock({ locked, children, label = "Pro+", onClickLocked }) {
  if (!locked) return children;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClickLocked?.(); }}
      style={{ position: "relative", cursor: "not-allowed", display: "inline-block", width: "100%" }}
    >
      <div style={{ pointerEvents: "none", opacity: 0.4, filter: "grayscale(0.6)" }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(10,10,15,0.55)", borderRadius: 6,
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 999,
          background: "rgba(108,92,231,0.18)", border: "1px solid rgba(108,92,231,0.55)",
          color: "#A29BFE", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          🔒 {label}
        </span>
      </div>
    </div>
  );
}

/**
 * Hook that returns { ensureCanGenerate, modal } —
 * call ensureCanGenerate() before any generation; render {modal} once near root.
 */
export function useUsageGate() {
  const { tryConsumeUsage } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const ensureCanGenerate = async () => {
    const r = await tryConsumeUsage();
    if (!r.ok && r.reason === "LIMIT_EXCEEDED") {
      setModalOpen(true);
      return false;
    }
    if (!r.ok) {
      console.warn("[UsageGate] consume failed:", r.reason);
      return false;
    }
    return true;
  };

  const modal = modalOpen ? <LimitReachedModal onClose={() => setModalOpen(false)} /> : null;
  return { ensureCanGenerate, modal };
}
