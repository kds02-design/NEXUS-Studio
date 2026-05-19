import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, ArrowUp } from "lucide-react";
import { APP_MAP } from "../../config/apps";
import { useGlobal } from "../../context/GlobalContext";
import { useAuth } from "../../context/AuthContext";
import { processMultipleFiles } from "./services/cloudinary";
import { suggestRelatedPrompts } from "./services/gemini";
import { usePrompts } from "./hooks/usePrompts";
import { useFolders } from "./hooks/useFolders";
import { useFilter } from "./hooks/useFilter";
import { useImportExport } from "./hooks/useImportExport";
import { useResponsiveColumns } from "./hooks/useResponsiveColumns";
import { inferRelatedType } from "./constants/categories";
import ArcSidebar from "./components/ArcSidebar";
import ArcHeader from "./components/ArcHeader";
import ArcGrid from "./components/ArcGrid";
import ArcEditModal from "./components/ArcEditModal";
import ArcDetailModal from "./components/ArcDetailModal";
import ArcQuickDrawer from "./components/ArcQuickDrawer";
import ArcConfirmDialog from "./components/ArcConfirmDialog";
import ArcToast from "./components/ArcToast";
import ArcSuggestModal from "./components/ArcSuggestModal";

const NEW_PROMPT = (over = {}) => ({
  title: '', tags: ['기타'], description: '', content: '', images: [],
  stepPrompts: [], stepLabels: [], stepTags: [], stepKeywords: [], stepDescriptions: [],
  aiKeywords: '', optimizedModel: '나노바나나2', thumbnail: '',
  isPinned: false, isLive: false, views: 0, likeCount: 0, likedBy: [],
  analysisStatus: 'completed', ...over,
});
const fromImages = (res) => NEW_PROMPT({
  images: res,
  stepPrompts: res.map(() => ''), stepLabels: res.map(() => ''),
  stepTags: res.map(() => ['기타']), stepKeywords: res.map(() => ''), stepDescriptions: res.map(() => ''),
});

export default function PromptArcApp() {
  const { navigate, payload, clearPayload, theme: globalTheme } = useGlobal();
  const { user, isAdmin } = useAuth();
  const isDarkMode = globalTheme === 'dark';

  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('latest');
  const [viewMode, setViewMode] = useState('normal');
  const colCount = useResponsiveColumns(viewMode);
  const [filters, setFilters] = useState({ style: null, theme: null, unanalyzed: false });
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { const v = localStorage.getItem('promptArc:sidebarCollapsed'); return v === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('promptArc:sidebarCollapsed', isSidebarCollapsed ? '1' : '0'); } catch {}
  }, [isSidebarCollapsed]);
  const handleSidebarClick = useCallback((e) => {
    const isInteractive = e.target.closest('button, input, label, select, a, span');
    if (!isInteractive && window.innerWidth >= 768) setSidebarCollapsed((prev) => !prev);
  }, []);
  const [toast, setToast] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [viewPrompt, setViewPrompt] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isQuickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const dragCounter = useRef(0);
  const mainScrollRef = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: String(msg), type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const {
    prompts, favoriteIds, likedIds,
    savePrompt, deletePrompt, deletePromptBatch,
    toggleLike, togglePin, toggleLive, toggleFavorite,
    linkRelated, linkRelatedMany, unlinkRelated,
  } = usePrompts({ user, showToast });

  const [suggestState, setSuggestState] = useState({ isOpen: false, sourceId: null, candidates: [] });
  const [isLinking, setIsLinking] = useState(false);
  const { folders, createFolder, renameFolder, deleteFolder, toggleFolderItem } =
    useFolders({ user, showToast, setCategory, category });
  const filteredPrompts = useFilter({ prompts, searchTerm, category, sortOption, favoriteIds, folders, filters });
  const { exportData, importData } = useImportExport({ user, prompts, showToast, setVisibleCount });

  // 다른 앱에서 payload 로 프롬프트가 전달되면 신규 등록 모달 오픈.
  // 대시보드의 최근 프롬프트 카드에서 들어오면 viewPromptId 로 상세보기 오픈.
  useEffect(() => {
    if (!payload.source || payload.target !== 'prompt-arc') return;
    // Case 1: 대시보드/외부에서 viewPromptId 로 상세보기 요청
    const viewId = payload.params?.viewPromptId;
    if (viewId) {
      const target = prompts.find((p) => p.id === viewId);
      if (target) {
        setViewPrompt(target);
        clearPayload();
      }
      return;
    }
    // Case 2: 외부 앱에서 프롬프트 텍스트 전달 → 신규 등록 모달
    if (payload.prompt?.text) {
      setEditingPrompt(NEW_PROMPT({
        content: payload.prompt.text,
        stepPrompts: [payload.prompt.text],
        stepLabels: [''], stepTags: [['기타']], stepKeywords: [''], stepDescriptions: [''],
      }));
      setEditModalOpen(true);
      clearPayload();
      showToast(`${APP_MAP[payload.source]?.label}에서 프롬프트가 전달됐어요`);
    }
  }, [payload, prompts, clearPayload, showToast]);

  const handleNewPrompt = () => { setEditingPrompt(NEW_PROMPT()); setEditModalOpen(true); };

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      const { id, isUpdate, savedRecord } = await savePrompt(editingPrompt, data);
      showToast(isUpdate ? '수정되었습니다.' : '저장되었습니다.');
      setEditModalOpen(false); setEditingPrompt(null);
      // 신규 등록 시에만 자동 추천. 수정은 사용자가 의도하지 않은 흐름이라 건너뜀.
      if (!isUpdate) triggerAutoSuggest(id, savedRecord);
    } catch (e) {
      console.error('[PromptArc] save failed', e);
      showToast(`저장 실패: ${e.message || e}`, 'error');
    } finally { setIsSaving(false); }
  };

  const triggerAutoSuggest = useCallback(async (sourceId, savedRecord) => {
    try {
      const target = savedRecord || prompts.find(p => p.id === sourceId);
      if (!target) return;
      const targetType = target.type || inferRelatedType(target);
      // 비용 최적화: 같은 type 우선, 부족하면 최근 100개로 폴백.
      const sameType = prompts.filter(p => p.id !== sourceId && (p.type || inferRelatedType(p)) === targetType);
      const recent = prompts
        .filter(p => p.id !== sourceId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 100);
      const candidatesPool = sameType.length >= 8 ? sameType : Array.from(new Set([...sameType, ...recent]));
      if (candidatesPool.length === 0) return;
      const ids = await suggestRelatedPrompts({ target, candidates: candidatesPool, max: 3 });
      const candidates = ids.map(id => prompts.find(p => p.id === id)).filter(Boolean);
      if (candidates.length === 0) return;
      showToast(`연관 아이템이 ${candidates.length}개 발견됐어요`);
      setSuggestState({ isOpen: true, sourceId, candidates });
    } catch (e) {
      console.warn('[PromptArc] auto suggest failed (non-fatal)', e);
    }
  }, [prompts, showToast]);

  const handleConnectSuggested = async (targetIds) => {
    if (!suggestState.sourceId) return;
    setIsLinking(true);
    try {
      await linkRelatedMany(suggestState.sourceId, targetIds);
      showToast(`${targetIds.length}개 연결됐어요.`);
      setSuggestState({ isOpen: false, sourceId: null, candidates: [] });
    } catch (e) {
      console.error('[PromptArc] link related failed', e);
      showToast(`연결 실패: ${e.message || e}`, 'error');
    } finally { setIsLinking(false); }
  };

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteConfirm.id === 'BATCH') {
        const ids = Array.from(selectedItems);
        await deletePromptBatch(ids);
        showToast(`${ids.length}개 삭제됐어요.`);
        setSelectedItems(new Set());
      } else {
        await deletePrompt(deleteConfirm.id);
        showToast('삭제되었습니다.');
        if (viewPrompt?.id === deleteConfirm.id) setViewPrompt(null);
      }
    } catch (e) {
      console.error('[PromptArc] delete failed', e);
      showToast(`삭제 실패: ${e.message || e}`, 'error');
    } finally { setDeleteConfirm({ isOpen: false, id: null }); setIsDeleting(false); }
  };

  // ArcDetailModal 에서 buildPayload() 로 타겟별 모양에 맞춰 만든 payload 를 그대로 navigate 한다.
  // 호출부가 timestamp 를 빼먹어도 여기서 한 번 더 보강.
  const handleSendToApp = (targetId, payload) => {
    navigate(targetId, {
      ...(payload || {}),
      source: payload?.source || 'prompt-arc',
      target: targetId,
      timestamp: payload?.timestamp || Date.now(),
    });
    showToast(`${APP_MAP[targetId]?.label}로 전달 중...`);
  };

  const onPasteOrDropImages = (filesIter) => {
    if (isEditModalOpen || isQuickDrawerOpen) return;
    processMultipleFiles(filesIter, 0, (res) => {
      setEditingPrompt(fromImages(res));
      setEditModalOpen(true);
    }, showToast);
  };

  const handleGlobalPaste = useCallback((e) => {
    const items = Array.from(e.clipboardData.items).filter(i => i.type.includes('image'));
    if (items.length === 0) return;
    onPasteOrDropImages(items.map(i => i.getAsFile()));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditModalOpen, isQuickDrawerOpen, showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); dragCounter.current = 0; setIsDragging(false);
    onPasteOrDropImages(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditModalOpen, isQuickDrawerOpen, showToast]);

  const toggleSelectItem = (id) => {
    const s = new Set(selectedItems);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItems(s);
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex h-full bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-[#EAEAEA] font-sans overflow-hidden relative"
        onPaste={handleGlobalPaste}
        onDragEnter={e => { e.preventDefault(); dragCounter.current += 1; setIsDragging(true); }}
        onDragLeave={e => { e.preventDefault(); dragCounter.current -= 1; if (dragCounter.current === 0) setIsDragging(false); }}
        onDragOver={e => e.preventDefault()} onDrop={handleDrop}
        style={{ height: "calc(100vh - 52px)" }}
      >
        <style>{`.arc-wrap{font-family:'Noto Sans KR',sans-serif}.arc-scrollbar::-webkit-scrollbar{width:4px;height:4px}.arc-scrollbar::-webkit-scrollbar-thumb{background:#333;border-radius:4px}.arc-scrollbar::-webkit-scrollbar-track{background:transparent}`}</style>

        {isDragging && (
          <div className="fixed inset-0 z-[100] bg-[#C8A969]/10 backdrop-blur-sm border-[6px] border-dashed border-[#C8A969] flex flex-col items-center justify-center pointer-events-none m-4 rounded-xl">
            <Upload size={64} className="text-[#C8A969] mb-6 animate-bounce" />
            <h2 className="text-3xl font-black text-white">이미지를 드롭해서 바로 등록</h2>
          </div>
        )}

        <ArcSidebar
          user={user} isAdmin={isAdmin}
          isSidebarCollapsed={isSidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
          handleSidebarClick={handleSidebarClick}
          category={category} setCategory={setCategory}
          folders={folders}
          onCreateFolder={createFolder} onRenameFolder={renameFolder} onDeleteFolder={deleteFolder}
          onNewPrompt={handleNewPrompt} onOpenQuickDrawer={() => setQuickDrawerOpen(true)}
          isAdminMode={isAdminMode} setIsAdminMode={setIsAdminMode}
          onExport={exportData} onImport={importData}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <ArcHeader
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            viewMode={viewMode} setViewMode={setViewMode}
            filters={filters} setFilters={setFilters}
            sortOption={sortOption} setSortOption={setSortOption}
            filterPopoverOpen={filterPopoverOpen} setFilterPopoverOpen={setFilterPopoverOpen}
            sortPopoverOpen={sortPopoverOpen} setSortPopoverOpen={setSortPopoverOpen}
            isAdmin={isAdmin} totalCount={filteredPrompts.length}
          />
          <main ref={mainScrollRef} onScroll={e => setShowTopBtn(e.target.scrollTop > 300)}
            className="flex-1 overflow-y-auto arc-scrollbar px-6 pt-4 pb-8">
            <ArcGrid
              prompts={prompts} filteredPrompts={filteredPrompts}
              visibleCount={visibleCount} setVisibleCount={setVisibleCount}
              colCount={colCount}
              isAdminMode={isAdminMode} selectedItems={selectedItems} onToggleSelect={toggleSelectItem}
              onView={setViewPrompt}
              onDelete={(id) => setDeleteConfirm({ isOpen: true, id })}
              onNewPrompt={handleNewPrompt}
            />
          </main>
        </div>

        {isEditModalOpen && (
          <ArcEditModal initialData={editingPrompt} onSave={handleSave}
            onClose={() => { setEditModalOpen(false); setEditingPrompt(null); }}
            showToast={showToast} isSaving={isSaving} />
        )}
        {viewPrompt && (
          <ArcDetailModal
            prompt={prompts.find(p => p.id === viewPrompt.id) || viewPrompt}
            onClose={() => setViewPrompt(null)}
            onEdit={stepIdx => {
              const p = prompts.find(q => q.id === viewPrompt.id) || viewPrompt;
              setEditingPrompt({ ...p, initialStep: stepIdx });
              setViewPrompt(null); setEditModalOpen(true);
            }}
            onDelete={id => setDeleteConfirm({ isOpen: true, id })}
            onLike={toggleLike} onPin={togglePin} onLive={toggleLive} onFavorite={toggleFavorite}
            isLiked={likedIds.has(viewPrompt.id)}
            isFavorite={favoriteIds.has(viewPrompt.id)}
            onSendToApp={handleSendToApp}
            folders={folders}
            onToggleFolderItem={toggleFolderItem}
            onCreateFolder={createFolder}
            showToast={showToast} currentUserId={user?.uid || 'anonymous'}
            isAdmin={isAdmin}
            allPrompts={prompts}
            onLinkRelated={linkRelated}
            onUnlinkRelated={unlinkRelated}
            onOpenRelated={(rel) => setViewPrompt(rel)}
          />
        )}
        <ArcSuggestModal
          isOpen={suggestState.isOpen}
          candidates={suggestState.candidates}
          isLinking={isLinking}
          onConnect={handleConnectSuggested}
          onDismiss={() => setSuggestState({ isOpen: false, sourceId: null, candidates: [] })}
        />
        <ArcQuickDrawer isOpen={isQuickDrawerOpen} onClose={() => setQuickDrawerOpen(false)} />
        <ArcConfirmDialog
          isOpen={deleteConfirm.isOpen}
          batchCount={deleteConfirm.id === 'BATCH' ? selectedItems.size : null}
          isDeleting={isDeleting}
          onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
          onConfirm={performDelete}
        />
        <ArcToast toast={toast} />
        {showTopBtn && (
          <button onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-8 right-8 z-[60] p-3 bg-[#1A1A1A] text-zinc-400 hover:bg-[#C8A969] hover:text-black rounded-full shadow-2xl border border-white/10 transition-all">
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
