import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, PenTool, Shield, Download, FileJson, Settings } from "lucide-react";
import { ARC_CATEGORIES } from "../constants/categories";
import ArcFolderPanel from "./ArcFolderPanel";

export default function ArcSidebar({
  user, isAdmin,
  isSidebarCollapsed, _setSidebarCollapsed,
  handleSidebarClick,
  category, setCategory,
  folders, onCreateFolder, onRenameFolder, onDeleteFolder,
  onNewPrompt, onOpenQuickDrawer,
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
      className={`hidden md:flex flex-col bg-[#141414] my-3 ml-3 rounded-[16px] border border-zinc-800/80 shadow-2xl overflow-hidden transition-all duration-300 cursor-default ${isSidebarCollapsed ? 'w-16' : 'w-[170px]'}`}
      title={isSidebarCollapsed ? '클릭하면 사이드바가 펼쳐집니다' : undefined}
    >
      {/* BannerCodex와 동일한 상단 여백 (h-[60px]) — 햄버거 없이 빈 공간 */}
      <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`} />
      <nav className="flex-1 overflow-y-auto arc-scrollbar py-2 flex flex-col gap-0.5">
        {ARC_CATEGORIES.map((cat, idx) => {
          if (cat.type === 'divider') return isSidebarCollapsed ? null : <div key={idx} className="h-px bg-white/5 my-1 mx-3" />;
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
              className={`flex items-center h-10 w-full pr-3 transition-colors ${active ? 'text-zinc-200 bg-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
              <div className="w-16 flex justify-center shrink-0">{cat.icon}</div>
              {!isSidebarCollapsed && <span className={`text-xs truncate min-w-0 ${active ? 'font-bold' : ''}`}>{cat.name}</span>}
            </button>
          );
        })}
        {!isSidebarCollapsed && <div className="h-px bg-white/5 my-1 mx-3" />}
        <button onClick={onNewPrompt} className="flex items-center h-10 w-full pr-3 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
          <div className="w-16 flex justify-center shrink-0"><Plus size={18} /></div>
          {!isSidebarCollapsed && <span className="text-xs truncate min-w-0">새 프롬프트</span>}
        </button>
        <button onClick={onOpenQuickDrawer} className="flex items-center h-10 w-full pr-3 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
          <div className="w-16 flex justify-center shrink-0"><PenTool size={16} /></div>
          {!isSidebarCollapsed && <span className="text-xs truncate min-w-0">아이디어 튜닝룸</span>}
        </button>
      </nav>
      {isAdmin && (
        <div className="h-14 flex items-center justify-center relative" ref={settingsRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsSettingsOpen((v) => !v); }}
            className={`p-2 rounded-lg transition-colors ${isSettingsOpen ? 'text-white bg-white/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            title="관리자 설정"
          >
            <Settings size={16} />
          </button>
          {isSettingsOpen && popoverPos && createPortal(
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "fixed", left: popoverPos.left, bottom: popoverPos.bottom, width: 208 }}
              className="bg-[#1A1A1A] border border-white/10 rounded-lg shadow-2xl py-1.5 z-[2000] animate-in slide-in-from-bottom-2 duration-150">
              <button
                onClick={(e) => { e.stopPropagation(); setIsAdminMode(!isAdminMode); setIsSettingsOpen(false); }}
                className={`flex items-center gap-3 w-full px-3 py-2 text-xs transition-colors ${isAdminMode ? 'text-purple-300 bg-purple-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                <Shield size={14} className="shrink-0" /> 관리자 모드 {isAdminMode ? 'ON' : 'OFF'}
              </button>
              <div className="h-px bg-white/5 my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onExport(); setIsSettingsOpen(false); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Download size={14} className="shrink-0" /> 데이터 내보내기
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); importInputRef.current?.click(); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <FileJson size={14} className="shrink-0" /> 데이터 가져오기
              </button>
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
