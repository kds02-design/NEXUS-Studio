// Command Palette — Topbar 햄버거 클릭 시 오픈되는 앱 런처.
// 섹션별 카드 그리드 + 검색 입력 + 키보드 탐색(↑↓← → + Enter) + ESC 닫기.
// 관리자(isAdmin)는 `disabled: true` 앱도 카드로 노출되고 클릭하여 진입 가능.
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_REGISTRY, APP_MAP } from "../config/apps";
import { useGlobal, useTheme } from "../context/GlobalContext";
import { useAuth } from "../context/AuthContext";
import { useAppVisibility, isAppHidden } from "../lib/appVisibility";
import { Lock, Search, X, Home } from "lucide-react";

const matches = (app, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    String(app.sub || "").toLowerCase().includes(needle) ||
    String(app.label || "").toLowerCase().includes(needle)
  );
};

const GROUP_ORDER = ["explore", "generate", "production", "admin"];
const GROUP_LABELS = {
  explore: "허브 / 평가",
  generate: "프롬프트 생성",
  production: "비주얼 생성",
  admin: "Admin",
};

// 첫 글자 약자 — sub 가 "Render Matrix" 면 "Rm".
function cardAbbr(sub) {
  const parts = String(sub || "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase());
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function PaletteCard({ app, selected, isCurrent, locked, adminUnlocked, T, isLight, onClick, onHover }) {
  return (
    <div
      onClick={(e) => { if (!locked) onClick(e); }}
      onMouseEnter={() => { if (!locked) onHover?.(); }}
      role="button"
      tabIndex={-1}
      title={
        locked ? "준비 중인 앱입니다"
        : adminUnlocked ? "관리자 권한으로 활성화됨 (Ctrl/⌘+클릭 → 새 창)"
        : "Ctrl/⌘+클릭 → 새 창에서 열기"
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: isCurrent
          ? `${app.color}14`
          : selected
            ? T.hoverBg
            : T.surface,
        border: isCurrent
          ? `1px solid ${app.color}55`
          : locked
            ? `1px dashed ${isLight ? "rgba(0,0,0,0.08)" : "rgba(122,122,154,0.25)"}`
            : `1px solid ${T.border}`,
        borderRadius: 10,
        cursor: locked ? "not-allowed" : "pointer",
        opacity: locked ? 0.55 : adminUnlocked ? 0.85 : 1,
        filter: locked ? "grayscale(0.7)" : "none",
        transition: "all 0.15s",
        minHeight: 64,
        transform: selected && !locked && !isCurrent ? "translateY(-1px)" : "none",
        boxShadow: selected && !locked && !isCurrent ? `0 4px 14px ${isLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.35)"}` : "none",
      }}
    >
      {/* 아이콘 배지 */}
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: locked ? T.hoverBg : `${app.color}1f`,
        border: `1px solid ${locked ? T.border : `${app.color}40`}`,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700, letterSpacing: "0.01em", lineHeight: 1,
          color: locked ? T.textMuted : app.color,
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>{app.abbr || cardAbbr(app.sub)}</span>
      </div>

      {/* 텍스트 영역 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, lineHeight: 1.2,
          color: isCurrent ? app.color : (locked ? T.textMuted : T.text),
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{app.sub}</div>
        <div style={{
          fontSize: 10, color: T.textMuted, marginTop: 3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{app.label}</div>
      </div>

      {/* 상태 뱃지 */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        {isCurrent ? (
          <span style={{ fontSize: 9, letterSpacing: "0.1em", color: app.color, textTransform: "uppercase", background: `${app.color}1A`, border: `1px solid ${app.color}55`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>NOW</span>
        ) : locked ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, letterSpacing: "0.1em", color: T.textMuted, textTransform: "uppercase", background: T.hoverBg, border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
            <Lock size={9} strokeWidth={2.5} /> 준비 중
          </span>
        ) : adminUnlocked ? (
          <span style={{ fontSize: 9, letterSpacing: "0.1em", color: T.accent, textTransform: "uppercase", background: `${T.accent}14`, border: `1px solid ${T.accent}55`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>ADMIN</span>
        ) : app.beta ? (
          <span style={{ fontSize: 9, letterSpacing: "0.1em", color: T.textMuted, textTransform: "uppercase", background: "transparent", border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>BETA</span>
        ) : null}
      </div>
    </div>
  );
}

export default function CommandPalette({ open, onClose }) {
  const { setCurrentApp, currentApp, isLight } = useGlobal();
  const T = useTheme();
  const { isAdmin } = useAuth();
  const overrides = useAppVisibility();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const inputRef = useRef(null);

  // 섹션별 노출 앱 — 관리자는 disabled 도 포함, 숨김 처리(adminOnly + 오버라이드)는 비관리자에게 숨김.
  const sections = useMemo(() => {
    const out = [];
    for (const groupKey of GROUP_ORDER) {
      const apps = APP_REGISTRY.filter(
        (a) =>
          a.group === groupKey
          && (!isAppHidden(a, overrides) || isAdmin)
          && (!a.disabled || isAdmin)
          && matches(a, query)
      );
      if (apps.length === 0) continue;
      out.push({ key: groupKey, label: GROUP_LABELS[groupKey], apps });
    }
    return out;
  }, [query, isAdmin, overrides]);

  // 평탄화된 클릭 가능 카드 id 리스트 — 키보드 탐색용.
  const flatIds = useMemo(() => {
    const ids = [];
    for (const s of sections) for (const a of s.apps) ids.push(a.id);
    return ids;
  }, [sections]);

  // 검색어 변경 시 첫 카드 선택. 검색 결과 비면 null.
  useEffect(() => {
    setSelectedId(flatIds[0] || null);
  }, [flatIds]);

  // 오픈 시 검색 초기화 + 포커스.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // 백드롭 클릭 + ESC 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activateApp = (app, e) => {
    if (!app) return;
    const newWin = !!(e && (e.ctrlKey || e.metaKey));
    if (newWin) {
      window.open(`/${app.id}`, "_blank", "noopener,noreferrer");
      onClose?.();
      return;
    }
    setCurrentApp(app.id);
    onClose?.();
  };

  const goHome = (e) => {
    const newWin = !!(e && (e.ctrlKey || e.metaKey));
    if (newWin) {
      window.open("/", "_blank", "noopener,noreferrer");
      onClose?.();
      return;
    }
    setCurrentApp(null);
    onClose?.();
  };

  // 키보드 탐색: 그리드 인덱스 → row/col 전환을 단순화 (좌우=±1, 상하=±cols).
  // 카드 그리드는 auto-fit minmax(220px) 라 컬럼 수가 가변 — DOM 기반 위치 계산으로 가까운 카드 찾기.
  const moveSelection = (dir) => {
    if (!flatIds.length) return;
    const curIdx = flatIds.indexOf(selectedId);
    if (curIdx === -1) { setSelectedId(flatIds[0]); return; }
    // 단순화: 좌우는 평탄 인덱스 ±1. 상하는 한 컬럼이 그리드의 한 행 길이라고 가정 (보통 3~4).
    // 더 정교한 위치 기반 탐색은 추후 — 키보드 사용자는 보통 검색 + 좌우/Enter 만으로 충분.
    if (dir === "left")  setSelectedId(flatIds[Math.max(0, curIdx - 1)]);
    if (dir === "right") setSelectedId(flatIds[Math.min(flatIds.length - 1, curIdx + 1)]);
    if (dir === "up")    setSelectedId(flatIds[Math.max(0, curIdx - 3)]);
    if (dir === "down")  setSelectedId(flatIds[Math.min(flatIds.length - 1, curIdx + 3)]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose?.(); return; }
    if (e.key === "ArrowLeft")  { e.preventDefault(); moveSelection("left"); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); moveSelection("right"); return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); moveSelection("up"); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); moveSelection("down"); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const app = APP_MAP[selectedId];
      if (app) activateApp(app, e);
    }
  };

  return (
    <>
      {/* 백드롭 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50000,
          background: isLight ? "rgba(0,0,0,0.25)" : "rgba(5,5,12,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          animation: "cp-fade 0.18s ease-out",
        }}
      />
      {/* 본체 */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(960px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 80px)",
          zIndex: 50001,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          boxShadow: isLight ? "0 24px 60px rgba(0,0,0,0.15)" : "0 24px 60px rgba(0,0,0,0.55)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
          fontFamily: "'Noto Sans KR', sans-serif",
          animation: "cp-pop 0.18s ease-out",
        }}
      >
        <style>{`
          @keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes cp-pop { from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
          .cp-scroll::-webkit-scrollbar { width: 6px; }
          .cp-scroll::-webkit-scrollbar-track { background: transparent; }
          .cp-scroll::-webkit-scrollbar-thumb { background: rgba(122,122,154,0.25); border-radius: 4px; }
        `}</style>

        {/* 헤더 — 검색 입력 + 닫기 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <Search size={16} style={{ color: T.textMuted, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="앱 이름으로 검색…"
            style={{
              flex: 1, background: "transparent", border: 0, outline: "none",
              color: T.text, fontSize: 14,
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          />
          <span style={{ fontSize: 10, color: T.textDim, letterSpacing: "0.08em", border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4 }}>ESC</span>
          <button
            type="button"
            onClick={onClose}
            title="닫기"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, border: 0, borderRadius: 6,
              background: "transparent", color: T.textMuted, cursor: "pointer",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.hoverBg; e.currentTarget.style.color = T.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 홈 행 — 인덱스 복귀 */}
        <button
          onClick={goHome}
          title="홈으로 (Ctrl/⌘+클릭 → 새 창)"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 18px",
            background: currentApp === null ? `${T.accent}10` : "transparent",
            border: 0, borderBottom: `1px solid ${T.border}`,
            color: currentApp === null ? T.accent : T.text,
            fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
            fontFamily: "inherit", transition: "background 0.12s",
          }}
          onMouseEnter={(e) => { if (currentApp !== null) e.currentTarget.style.background = T.hoverBg; }}
          onMouseLeave={(e) => { if (currentApp !== null) e.currentTarget.style.background = "transparent"; }}
        >
          <Home size={15} />
          <span style={{ flex: 1 }}>홈으로 (인덱스)</span>
          {currentApp === null && (
            <span style={{ fontSize: 9, color: T.accent, letterSpacing: "0.1em", fontWeight: 700 }}>NOW</span>
          )}
        </button>

        {/* 본문 — 섹션별 카드 그리드 */}
        <div className="cp-scroll" style={{ flex: 1, overflowY: "auto", padding: "18px 20px 22px" }}>
          {sections.length === 0 && (
            <div style={{ padding: "40px 18px", textAlign: "center", color: T.textMuted, fontSize: 12 }}>
              일치하는 앱이 없어요.
            </div>
          )}
          {sections.map((s) => (
            <div key={s.key} style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
                color: T.textDim, textTransform: "uppercase",
                padding: "0 2px 10px",
                borderBottom: `1px solid ${T.border}`,
                marginBottom: 12,
              }}>
                {s.label} <span style={{ color: T.textDim, marginLeft: 6, fontWeight: 500, letterSpacing: 0 }}>· {s.apps.length}</span>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}>
                {s.apps.map((app) => {
                  const isCurrent = currentApp === app.id;
                  const adminUnlocked = !!app.disabled && isAdmin;
                  // locked: 관리자도 disabled 면 unlock 표시만 해두고 클릭은 허용 (locked=false).
                  // 즉 비관리자에게만 정말로 잠금 처리됨.
                  const locked = !!app.disabled && !isAdmin;
                  return (
                    <PaletteCard
                      key={app.id}
                      app={app}
                      selected={selectedId === app.id}
                      isCurrent={isCurrent}
                      locked={locked}
                      adminUnlocked={adminUnlocked}
                      T={T} isLight={isLight}
                      onClick={(e) => activateApp(app, e)}
                      onHover={() => setSelectedId(app.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 — 키보드 힌트 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14,
          padding: "10px 18px",
          borderTop: `1px solid ${T.border}`,
          fontSize: 10, color: T.textDim,
          background: T.surface,
        }}>
          <span><kbd style={kbdStyle(T)}>↑↓←→</kbd> 이동</span>
          <span><kbd style={kbdStyle(T)}>Enter</kbd> 열기</span>
          <span><kbd style={kbdStyle(T)}>⌘+클릭</kbd> 새 창</span>
          <span><kbd style={kbdStyle(T)}>ESC</kbd> 닫기</span>
        </div>
      </div>
    </>
  );
}

function kbdStyle(T) {
  return {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 10, color: T.textMuted,
    background: T.hoverBg,
    border: `1px solid ${T.border}`,
    padding: "1px 5px",
    borderRadius: 4,
    marginRight: 4,
  };
}
