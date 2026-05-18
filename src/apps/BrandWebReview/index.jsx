import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Inbox, Clock, CheckCircle2, XCircle, PauseCircle, ListChecks } from "lucide-react";
import { useGlobal } from "../../context/GlobalContext";

// 사이드바 메뉴 — Brand Web Review 전용
const REVIEW_MENUS = [
  { id: "all",        name: "전체",       icon: <ListChecks size={16}/> },
  { id: "in_review",  name: "검토중",     icon: <Clock size={16}/> },
  { id: "approved",   name: "컨펌 완료",  icon: <CheckCircle2 size={16}/> },
  { id: "rejected",   name: "반려",       icon: <XCircle size={16}/> },
  { id: "on_hold",    name: "보류",       icon: <PauseCircle size={16}/> },
];

export default function BrandWebReviewApp() {
  const { payload, clearPayload } = useGlobal();
  const [activeMenu, setActiveMenu] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // BannerCodex 패턴 — 빈 공간 클릭 시 사이드바 토글. 인터랙티브 요소(button 등)는 무시.
  const handleSidebarClick = useCallback((e) => {
    const isInteractive = e.target.closest("button, input, label, select, a, span");
    if (!isInteractive && window.innerWidth >= 768) setSidebarOpen((v) => !v);
  }, []);

  // Brand Web Library 등 외부에서 들어온 항목 — 임시로 모달/배지 형태로 보여주는 자리.
  // 실제 검토 워크플로우는 추후 구성.
  const incoming = useMemo(() => {
    if (payload?.target !== "brand-web-review") return null;
    return payload;
  }, [payload]);

  useEffect(() => {
    // 외부에서 받은 payload — 추후 실제 워크플로우 연결 지점
    if (incoming) {
      // no-op (시각화 연결 전)
    }
  }, [incoming]);

  return (
    <div className="flex h-full bg-[#0c0c0e] text-zinc-200 font-sans overflow-hidden" style={{ height: "calc(100vh - 52px)" }}>
      {/* 사이드바 — BannerCodex 패턴 (빈 공간 클릭 토글, 햄버거 없음, h-[60px] 상단 여백) */}
      <aside
        onClick={handleSidebarClick}
        className={`${sidebarOpen ? "w-[190px]" : "w-16"} shrink-0 border-r border-white/5 bg-[#111] flex flex-col transition-[width] duration-300 ease-in-out cursor-default`}
      >
        <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${sidebarOpen ? "px-4" : "justify-center"}`} />
        <nav className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5">
          {REVIEW_MENUS.map(m => {
            const active = activeMenu === m.id;
            return (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); setActiveMenu(m.id); }}
                title={!sidebarOpen ? m.name : undefined}
                className={`flex items-center gap-3 h-10 px-4 transition-colors text-left ${active ? "text-[#FD79A8] bg-[#FD79A8]/10 border-l-2 border-[#FD79A8]" : "text-zinc-500 hover:text-white hover:bg-white/5 border-l-2 border-transparent"}`}
              >
                <span className="shrink-0">{m.icon}</span>
                {sidebarOpen && <span className="text-xs font-medium">{m.name}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {/* 외부 앱에서 받은 payload 표시 (임시) */}
          {incoming && (
            <div className="max-w-3xl mx-auto mb-6 p-4 rounded-lg bg-[#FD79A8]/10 border border-[#FD79A8]/30 flex items-start gap-3">
              <Inbox className="w-5 h-5 text-[#FD79A8] shrink-0 mt-0.5"/>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#FD79A8] mb-1">
                  {incoming.source === "promotion-archive" ? "Brand Web Library" : incoming.source}에서 전달된 항목
                </div>
                <div className="text-[11px] text-zinc-300 truncate">
                  {incoming.prompt?.text || incoming.params?.title || "(제목 없음)"}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                  payload keys: {Object.keys(incoming.params || {}).join(", ") || "(none)"}
                </div>
              </div>
              <button onClick={clearPayload} className="text-zinc-500 hover:text-white text-xs px-2 py-1">
                ✕ 닫기
              </button>
            </div>
          )}

          {/* 플레이스홀더 */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border border-dashed border-white/10 bg-[#111118] p-12 text-center">
              <Archive className="w-10 h-10 text-zinc-600 mx-auto mb-4"/>
              <h2 className="text-base font-bold text-zinc-200 mb-2">컨펌 워크플로우 영역</h2>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                여기에 검토 카드 그리드, 버전 히스토리, 코멘트 패널 등이 추후 구성됩니다.<br/>
                Brand Web Library에서 항목을 보낸 뒤 이 화면에서 컨펌/반려/보류 처리를 진행합니다.
              </p>
              <div className="text-[10px] text-zinc-600 font-mono">
                현재 메뉴: {activeMenu}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
