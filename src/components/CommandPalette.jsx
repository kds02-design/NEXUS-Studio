// Command Palette — Topbar 로고 클릭 시 오픈되는 앱 런처.
// 검색 입력 + 키보드 탐색(↑↓ + Enter) + ESC/배경 클릭 닫기.
// 최상단에는 항상 "← 홈으로" 항목이 고정되어 인덱스로 돌아갈 수 있다.
// 앱 목록은 group(허브/탐색·평가/프롬프트 생성/Admin) 별로 묶어서 표시하고,
// 현재 앱(currentApp)만 app.color 로 하이라이트한다. 그 외에는 흰색 단일 컬러.
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_REGISTRY } from "../config/apps";
import { useGlobal, useTheme } from "../context/GlobalContext";
import { useAuth } from "../context/AuthContext";

// 검색 매칭: app.sub 또는 app.label 에 대소문자 무시 부분일치.
const matches = (app, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    String(app.sub || "").toLowerCase().includes(needle) ||
    String(app.label || "").toLowerCase().includes(needle)
  );
};

// 표시 순서 + 한글 라벨. AppCardGrid(Shell.jsx) 의 그룹 순서와 동일하게 맞춤.
const GROUP_ORDER = ["explore", "generate", "production", "admin"];
const GROUP_LABELS = {
  explore: "허브 / 평가",
  generate: "프롬프트 생성",
  production: "비주얼 생성",
  admin: "Admin",
};

export default function CommandPalette({ open, onClose }) {
  const { setCurrentApp, currentApp, isLight } = useGlobal();
  const T = useTheme();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 표시 항목 빌드: [home, ...(group_header + apps)*].
  // - home: 항상 0번 (이미 인덱스인 경우 dim 처리)
  // - group_header: 키보드 탐색에서 skip, 시각적 구분만
  // - app: kind='app' + ...앱데이터
  const items = useMemo(() => {
    const homeItem = {
      kind: "home",
      id: "__home__",
      label: "홈으로",
      sub: "← 홈으로",
      desc: "인덱스로 돌아가기",
      disabled: !currentApp,
    };
    const out = [homeItem];
    for (const groupKey of GROUP_ORDER) {
      const groupApps = APP_REGISTRY.filter(
        a => a.group === groupKey && (!a.adminOnly || isAdmin) && matches(a, query)
      );
      if (groupApps.length === 0) continue;
      out.push({ kind: "group_header", id: `__h_${groupKey}__`, label: GROUP_LABELS[groupKey] });
      for (const app of groupApps) out.push({ kind: "app", ...app });
    }
    return out;
  }, [query, isAdmin, currentApp]);

  // 키보드 탐색 헬퍼: group_header 와 비활성(준비 중) 항목은 건너뛴다.
  const isSelectable = (idx) => {
    if (idx < 0 || idx >= items.length) return false;
    const it = items[idx];
    if (it.kind === "group_header") return false;
    if (it.disabled) return false;
    return true;
  };
  const findSelectable = (from, dir) => {
    let next = from;
    while (next >= 0 && next < items.length && !isSelectable(next)) next += dir;
    return (next >= 0 && next < items.length) ? next : from;
  };

  // 오픈/검색어 변경 시 첫 선택지로 리셋 + 입력 포커스.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // 검색 변경 시 첫 selectable 으로 이동.
  useEffect(() => {
    setSelectedIndex(findSelectable(0, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // 선택된 항목으로 자동 스크롤.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-cp-idx="${selectedIndex}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  if (!open) return null;

  // Ctrl/Cmd+Enter (또는 Ctrl/Cmd+클릭) → 새 창에서 오픈. 일반 활성화는 기존 동작.
  const activate = (item, e) => {
    if (!item || item.kind === "group_header") return;
    const newWin = !!(e && (e.ctrlKey || e.metaKey));
    if (item.kind === "home") {
      if (item.disabled) return;
      if (newWin) { window.open("/", "_blank", "noopener,noreferrer"); onClose?.(); return; }
      setCurrentApp(null);
      onClose?.();
      return;
    }
    if (item.disabled) return;
    if (newWin) { window.open(`/${item.id}`, "_blank", "noopener,noreferrer"); onClose?.(); return; }
    setCurrentApp(item.id);
    onClose?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose?.(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(curr => {
        const next = findSelectable(curr + 1, 1);
        return next !== curr ? next : curr;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(curr => {
        const next = findSelectable(curr - 1, -1);
        return next !== curr ? next : curr;
      });
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); activate(items[selectedIndex], e); return; }
  };

  // 검색 결과가 비어 있는지 (홈 외 앱이 한 개도 없는 경우).
  const hasApps = items.some(it => it.kind === "app");

  return (
    <>
      {/* 백드롭 — 라이트에서는 약한 검정, 다크에서는 진한 검정 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50000,
          background: isLight ? "rgba(0, 0, 0, 0.25)" : "rgba(5, 5, 12, 0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />
      {/* 팔레트 본체 */}
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        style={{
          position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: "min(620px, calc(100vw - 32px))",
          zIndex: 50001,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          boxShadow: isLight ? "0 24px 60px rgba(0,0,0,0.15)" : "0 24px 60px rgba(0,0,0,0.55)",
          overflow: "hidden",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        {/* 검색 입력 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ color: T.textMuted, fontSize: 14 }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="앱 이름으로 검색..."
            style={{
              flex: 1, background: "transparent", border: 0, outline: "none",
              color: T.text, fontSize: 14,
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          />
          <span style={{ fontSize: 10, color: T.textDim, letterSpacing: "0.08em", border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4 }}>ESC</span>
        </div>

        {/* 항목 목록 */}
        <div ref={listRef} style={{ maxHeight: 400, overflowY: "auto", paddingBottom: 8 }}>
          {!hasApps && query.trim() ? (
            <div style={{ padding: "24px 18px", textAlign: "center", color: T.textMuted, fontSize: 12 }}>
              일치하는 앱이 없어요.
            </div>
          ) : items.map((item, idx) => {
            // 그룹 헤더 — 키보드 nav skip, 시각적 라벨만.
            if (item.kind === "group_header") {
              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 18px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textDim,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </div>
              );
            }

            const selected = idx === selectedIndex;
            const dim = !!item.disabled;
            const isCurrent = item.kind === "app" && currentApp === item.id;
            // 텍스트 색: 현재 앱만 app.color, 나머지는 테마 텍스트.
            const titleColor = isCurrent ? item.color : T.text;

            return (
              <div
                key={item.id}
                data-cp-idx={idx}
                onMouseEnter={() => { if (!dim) setSelectedIndex(idx); }}
                onClick={(e) => activate(item, e)}
                title="Ctrl/⌘+클릭 → 새 창에서 열기"
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  height: 40, minHeight: 40, maxHeight: 40,
                  padding: "0 18px",
                  cursor: dim ? "not-allowed" : "pointer",
                  background: selected && !dim ? T.hoverBg : "transparent",
                  borderLeft: `2px solid ${selected && !dim ? (isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)") : "transparent"}`,
                  opacity: dim ? 0.4 : 1,
                  transition: "background 0.08s",
                }}
              >
                {/* 타이틀 영역 — 아이콘/컬러 박스 제거, 텍스트만 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: titleColor, lineHeight: 1.2 }}>
                    {item.sub}
                  </div>
                  {item.kind === "home" && (
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{item.desc}</div>
                  )}
                </div>
                {/* 우측 상태 뱃지 */}
                {isCurrent && (
                  <span style={{ fontSize: 9, letterSpacing: "0.1em", color: item.color, textTransform: "uppercase", background: `${item.color}1A`, border: `1px solid ${item.color}55`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                    현재
                  </span>
                )}
                {dim && item.kind === "app" && (
                  <span style={{ fontSize: 9, letterSpacing: "0.1em", color: T.textMuted, textTransform: "uppercase", background: T.hoverBg, border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                    준비 중
                  </span>
                )}
                {selected && !dim && !isCurrent && (
                  <span style={{ fontSize: 10, color: T.textDim, letterSpacing: "0.08em", border: `1px solid ${T.border}`, padding: "2px 6px", borderRadius: 4 }}>↵</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
