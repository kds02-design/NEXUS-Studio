import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Shield, Download, FileJson, Settings } from "lucide-react";
import { ARC_CATEGORIES } from "../constants/categories";
import ArcFolderPanel from "./ArcFolderPanel";

export default function ArcSidebar({
  user, isAdmin,
  isSidebarCollapsed, _setSidebarCollapsed,
  handleSidebarClick,
  category, setCategory,
  folders, onCreateFolder, onRenameFolder, onDeleteFolder,
  onNewPrompt,
  isAdminMode, setIsAdminMode,
  onExport, onImport,
}) {
  const importInputRef = useRef(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onDocClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isSettingsOpen]);

  // 설정 팝오버 — aside의 overflow-hidden에 잘리지 않도록 portal로 body에 렌더링.
  const [popoverPos, setPopoverPos] = useState(null);
  useEffect(() => {
    if (!isSettingsOpen || !settingsRef.current) { setPopoverPos(null); return; }
    const compute = () => {
      const rect = settingsRef.current.getBoundingClientRect();
      // 사이드바 접힘/펼침 모두 버튼 위로 펼치되 사이드바와 같은 가로 위치(혹은 우측 옆) 유지.
      // ArcSidebar는 펼침/접힘 시 button 위치가 같으므로 일관되게 left: rect.left + 8.
      setPopoverPos({ left: rect.left + 8, bottom: window.innerHeight - rect.top + 8 });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [isSettingsOpen]);

  return (
    <aside
      onClick={handleSidebarClick}
      className={`hidden md:flex flex-col bg-white dark:bg-[#141414] mt-[60px] mb-3 ml-3 rounded-[16px] border border-slate-200 dark:border-zinc-800/80 shadow-2xl overflow-hidden transition-all duration-300 cursor-default ${isSidebarCollapsed ? 'w-16' : 'w-[170px]'}`}
      title={isSidebarCollapsed ? '클릭하면 사이드바가 펼쳐집니다' : undefined}
    >
      {/* 상단 내부 여백 — 외부 mt-[60px] 로 컨텐츠 라인과 정렬되므로 내부는 작은 패딩만 */}
      <div className={`flex items-center h-3 shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`} />
      <nav className="flex-1 overflow-y-auto arc-scrollbar pt-2 pb-0 flex flex-col gap-0.5">
        {ARC_CATEGORIES.map((cat, idx) => {
          if (cat.type === 'divider') return isSidebarCollapsed ? null : <div key={idx} className="h-px bg-slate-200 dark:bg-white/5 my-1 mx-3" />;
          // 로그인 필요한 카테고리(내 비공개)는 비로그인 시 숨김.
          if (cat.requiresUser && !user) return null;
          if (cat.type === 'folders') {
            if (!user) return null;
            return (
              <div key={idx} className="mt-1">
                <ArcFolderPanel
                  folders={folders}
                  category={category}
                  setCategory={setCategory}
                  isSidebarCollapsed={isSidebarCollapsed}
                  onCreateFolder={onCreateFolder}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                />
              </div>
            );
          }
          const active = category === cat.id;
          return (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`flex items-center h-10 w-full pr-3 transition-colors ${active ? 'text-slate-900 bg-black/5 dark:text-zinc-200 dark:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5'}`}>
              {/* 아이콘 컬럼: 접힘 상태에선 사이드바 폭(w-16) 그대로 중앙 정렬,
                  펼침 상태에선 절반(w-8)으로 줄여 아이콘-텍스트 간격을 좁힘. */}
              <div className={`flex justify-center shrink-0 ${isSidebarCollapsed ? 'w-16' : 'w-8 ml-2'}`}>{cat.icon}</div>
              {!isSidebarCollapsed && <span className={`text-xs truncate min-w-0 ${active ? 'font-bold' : ''}`}>{cat.name}</span>}
            </button>
          );
        })}
      </nav>
      {/* 새 프롬프트 등록 — 사이드바 nav 와 분리해 라운드 버튼으로 강조.
          펼침: pill(rounded-full) + 아이콘 + 텍스트. 접힘: 원형 버튼. */}
      <div className={`shrink-0 ${isSidebarCollapsed ? 'flex justify-center py-2' : 'px-3 py-2'}`}>
        <button onClick={(e) => { e.stopPropagation(); onNewPrompt?.(); }}
          title="새 프롬프트 등록"
          className={`flex items-center justify-center gap-1.5 rounded-full font-bold transition-colors bg-[#6C5CE7]/15 text-[#6C5CE7] hover:bg-[#6C5CE7] hover:text-white ${isSidebarCollapsed ? 'w-9 h-9' : 'w-full h-9 px-3 text-xs border border-[#6C5CE7]/30'}`}
        >
          <Plus size={isSidebarCollapsed ? 16 : 14} className="shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">새 프롬프트</span>}
        </button>
      </div>
      {/* 설정 버튼 — 로그인한 모든 사용자에게 노출. 내부 옵션은 항목별로 권한 가드.
          (이전엔 isAdmin gate 였으나 사용자가 본인 권한을 확인하지 못해 안 보였다는 보고 → user gate 로 완화) */}
      {user && (
        <div className="h-14 flex items-center justify-center relative" ref={settingsRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsSettingsOpen((v) => !v); }}
            className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'text-slate-900 bg-black/10 dark:text-white dark:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-500 dark:hover:text-white dark:hover:bg-white/5'}`}
            title="설정"
          >
            <Settings size={16} />
          </button>
          {isSettingsOpen && popoverPos && createPortal(
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", left: popoverPos.left, bottom: popoverPos.bottom, width: 208 }}
              className="bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 rounded-lg shadow-2xl py-1.5 z-[2000] animate-in slide-in-from-bottom-2 duration-150">
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsAdminMode(!isAdminMode); setIsSettingsOpen(false); }}
                    className={`flex items-center gap-3 w-full px-3 py-2 text-xs transition-colors ${isAdminMode ? 'text-purple-600 bg-purple-500/10 dark:text-purple-300' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5'}`}
                  >
                    <Shield size={14} className="shrink-0" /> 관리자 모드 {isAdminMode ? 'ON' : 'OFF'}
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-white/5 my-1" />
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onExport(); setIsSettingsOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
              >
                <Download size={14} className="shrink-0" /> 데이터 내보내기
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); importInputRef.current?.click(); }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-black/5 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
                >
                  <FileJson size={14} className="shrink-0" /> 데이터 가져오기
                </button>
              )}
              <input
                ref={importInputRef}
                type="file" accept=".json,application/json"
                className="hidden"
                onChange={(e) => { onImport(e); setIsSettingsOpen(false); }}
              />
            </div>,
            document.body
          )}
        </div>
      )}
    </aside>
  );
}
