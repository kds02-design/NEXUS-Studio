// 햄버거 아이콘 클릭 시 좌측에서 슬라이드. 그룹별 앱 목록 + 인덱스로 돌아가기.
import { useEffect, useRef } from "react";
import { APP_REGISTRY, THEME } from "../config/apps";
import { useGlobal } from "../context/GlobalContext";
import { useAuth } from "../context/AuthContext";
import { useAppVisibility, isAppHidden } from "../lib/appVisibility";

const GROUPS = [
  { key: "explore",    label: "허브 / 평가" },
  { key: "generate",   label: "프롬프트 생성" },
  { key: "production", label: "비주얼 생성" },
  { key: "admin",      label: "관리자" },
];

export default function AppNavPopover({ open, onClose }) {
  const { currentApp, setCurrentApp } = useGlobal();
  const { isAdmin } = useAuth();
  const overrides = useAppVisibility();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Ctrl/Cmd+클릭 → 같은 앱을 새 창에서 오픈 (popover는 닫음). 일반 클릭은 기존 동작.
  const goApp = (e, id) => {
    if (e?.ctrlKey || e?.metaKey) { window.open(`/${id}`, "_blank", "noopener,noreferrer"); onClose?.(); return; }
    setCurrentApp(id); onClose?.();
  };
  const goIndex = (e) => {
    if (e?.ctrlKey || e?.metaKey) { window.open("/", "_blank", "noopener,noreferrer"); onClose?.(); return; }
    setCurrentApp(null); onClose?.();
  };

  return (
    <>
      {/* 백드롭 */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 50000,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
          animation: "fadeIn 0.15s ease-out",
        }}
      />
      {/* 좌측 슬라이드 패널 */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 300,
          background: THEME.surface,
          borderRight: `1px solid ${THEME.border}`,
          zIndex: 50001,
          display: "flex", flexDirection: "column",
          fontFamily: "'Noto Sans KR', sans-serif",
          boxShadow: "8px 0 28px rgba(0,0,0,0.5)",
          animation: "slideInLeft 0.18s ease-out",
        }}
      >
        <style>{`
          @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        {/* 헤더 */}
        <div style={{ height: 52, display:"flex", alignItems:"center", padding:"0 18px", borderBottom:`1px solid ${THEME.border}` }}>
          <span style={{ fontFamily:"'Teko', sans-serif", fontSize:20, color:"#fff", letterSpacing:"0.4px" }}>앱 전환</span>
          <div style={{ flex:1 }} />
          <button onClick={onClose} title="닫기"
            style={{ background:"none", border:0, color:THEME.textMuted, fontSize:18, cursor:"pointer", padding:4 }}
          >✕</button>
        </div>

        {/* 인덱스로 돌아가기 */}
        <button
          onClick={goIndex}
          title="홈으로 (Ctrl/⌘+클릭 → 새 창)"
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"12px 18px",
            background: currentApp === null ? `${THEME.accent}1A` : "transparent",
            border: 0, borderBottom: `1px solid ${THEME.border}`,
            color: currentApp === null ? THEME.accent : THEME.text,
            fontSize:13, fontWeight:600, cursor:"pointer", textAlign:"left",
            fontFamily:"inherit", transition:"background 0.12s",
          }}
          onMouseEnter={(e) => { if (currentApp !== null) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { if (currentApp !== null) e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ fontSize:18 }}>🏠</span>
          <span style={{ flex:1 }}>인덱스로 돌아가기</span>
          {currentApp === null && <span style={{ fontSize:9, color:THEME.accent, letterSpacing:"0.1em" }}>NOW</span>}
        </button>

        {/* 그룹별 앱 목록 — 관리자는 disabled 앱도 admin-unlocked 로 표시 */}
        <div style={{ flex:1, overflowY:"auto", padding:"4px 0" }}>
          {GROUPS.map((g) => {
            const apps = APP_REGISTRY.filter((a) =>
              a.group === g.key
              && (!isAppHidden(a, overrides) || isAdmin)
              && (!a.disabled || isAdmin)
            );
            if (!apps.length) return null;
            return (
              <div key={g.key} style={{ marginTop: 8 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:THEME.textDim, textTransform:"uppercase", padding:"8px 18px 4px" }}>
                  ─ {g.label} ─
                </div>
                {apps.map((a) => {
                  const active = currentApp === a.id;
                  const adminUnlocked = !!a.disabled && isAdmin;
                  return (
                    <button key={a.id}
                      onClick={(e) => goApp(e, a.id)}
                      title={adminUnlocked ? "관리자 권한으로 활성화됨 (Ctrl/⌘+클릭 → 새 창)" : "Ctrl/⌘+클릭 → 새 창"}
                      style={{
                        display:"flex", alignItems:"center", gap:12, width:"100%",
                        padding:"10px 18px", border:0, cursor:"pointer", textAlign:"left",
                        background: active ? `${a.color}1A` : "transparent",
                        color: active ? a.color : THEME.text,
                        opacity: adminUnlocked && !active ? 0.7 : 1,
                        fontSize:13, fontWeight: active ? 700 : 500,
                        fontFamily:"inherit", transition:"background 0.12s, opacity 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize:18, color:a.color, width:22, textAlign:"center", flexShrink:0 }}>{a.icon}</span>
                      <span style={{ flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.sub}</span>
                      {active && <span style={{ fontSize:9, color:a.color, letterSpacing:"0.1em" }}>NOW</span>}
                      {!active && adminUnlocked && (
                        <span style={{ fontSize:8, color:THEME.accent, letterSpacing:"0.12em", fontWeight:700, border:`1px solid ${THEME.accent}55`, padding:"2px 5px", borderRadius:4 }}>ADMIN</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
