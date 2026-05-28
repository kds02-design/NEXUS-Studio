import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, LayoutGrid, Heart, Layers, Zap, Star, Settings, ShieldCheck,
  Save, FileJson, FolderPlus, Folder, Upload,
  CheckSquare, Trash2, Pencil
} from 'lucide-react';
import CodexFolderSelector from './CodexFolderSelector';
import { gameNameMap } from '../constants/categories';

const renderGameItem = ({
  gameKey, banners, pinnedGames, activeCategory, isLightMode,
  togglePinGame, handleGameClick
}) => {
  const displayGameName = gameNameMap[gameKey] || gameKey;
  const gameBannerCount = banners.filter(b => b.game === displayGameName).length;
  const isActiveGame = activeCategory === displayGameName || (gameNameMap[activeCategory] === displayGameName);
  return (
    <button key={gameKey} onClick={(e) => { e.stopPropagation(); handleGameClick(gameKey); }}
      className={`w-full flex items-center justify-between py-1.5 pl-4 pr-3 gap-2 transition-all group ${isActiveGame ? 'bg-[#0eb9b3]/10 rounded-lg' : ''}`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span onClick={(e) => togglePinGame(displayGameName, e)} className="cursor-pointer flex items-center justify-center w-5 h-5 shrink-0 transition-colors">
          {pinnedGames.includes(displayGameName) ? (
            <Star className={`w-4 h-4 transition-colors ${isActiveGame ? 'text-[#0eb9b3] fill-[#0eb9b3]' : isLightMode ? 'text-slate-400 fill-slate-400 hover:text-slate-500' : 'text-zinc-500 fill-zinc-500 hover:text-zinc-400'}`} />
          ) : (
            <Star className={`w-4 h-4 ${isLightMode ? 'text-slate-300 hover:text-slate-400' : 'text-zinc-600 hover:text-zinc-500'}`} />
          )}
        </span>
        <span className={`capitalize text-[13px] font-medium leading-none transition-colors truncate ${isActiveGame ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-600 group-hover:text-slate-900' : 'text-zinc-400 group-hover:text-white'}`}>
          {displayGameName}
        </span>
      </div>
      {gameBannerCount > 0 && <span className={`text-[11px] font-bold shrink-0 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{gameBannerCount}</span>}
    </button>
  );
};

const CategoryButton = ({ icon: Icon, label, count, active, color = '[#0eb9b3]', isLightMode, isOpen, onClick, badge }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(e); }}
    className={`w-full flex items-center py-3 transition-all group ${isOpen ? 'pl-4 pr-3 gap-3 justify-start' : 'justify-center'} ${active ? `bg-${color}/10 text-${color}` : isLightMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
    <div className="flex items-center justify-center shrink-0 w-5 h-5 relative"><Icon className="w-[18px] h-[18px]" strokeWidth={1.5} /></div>
    <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between min-w-0 ${isOpen ? 'flex-1 opacity-100' : 'w-0 opacity-0'}`}>
      <span className="whitespace-nowrap truncate text-[13px] font-medium leading-none">{label}</span>
      {badge ?? (count > 0 && <span className={`text-[11px] font-bold leading-none shrink-0 ml-2 ${active ? `text-${color}` : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{count}</span>)}
    </div>
  </button>
);

const CodexSidebar = ({
  isSidebarOpen, setIsSidebarOpen, isDesktopSidebarOpen, _setIsDesktopSidebarOpen,
  isLightMode, isAdmin, banners, tempBanners, cartIds,
  activeCategory, handleGameClick, pinnedGames, togglePinGame,
  recentGames, availableGames, isAllGamesModalOpen, setIsAllGamesModalOpen,
  isSettingsOpen, setIsSettingsOpen, settingsRef,
  adminModeEnabled, toggleAdminMode,
  handleSaveLibrary, handleLoadLibrary, isSaving,
  handleFolderUpload, isUploading,
  lastFolderName, handlePickFolder, handleReopenLastFolder, handleForgetLastFolder,
  isProcessingFiles, handleFileUpload, skipDuplicates, setSkipDuplicates,
  handleOpenDuplicateManager, handleSidebarClick,
  folders = [], onCreateFolder, onRenameFolder, onDeleteFolder,
}) => {
  const renderItem = (gameKey) => renderGameItem({
    gameKey, banners, pinnedGames, activeCategory, isLightMode, togglePinGame, handleGameClick
  });

  // 설정 팝오버 — aside의 overflow-hidden에 잘리지 않도록 portal + position:fixed로 렌더링.
  // 사이드바가 열려있으면 버튼 위쪽으로, 접혀있으면 우측으로 펼친다.
  const [popoverPos, setPopoverPos] = useState(null);
  useEffect(() => {
    if (!isSettingsOpen || !settingsRef?.current) { setPopoverPos(null); return; }
    const compute = () => {
      const rect = settingsRef.current.getBoundingClientRect();
      if (isDesktopSidebarOpen) {
        setPopoverPos({ left: rect.left, bottom: window.innerHeight - rect.top + 12 });
      } else {
        setPopoverPos({ left: rect.right + 16, bottom: window.innerHeight - rect.bottom });
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [isSettingsOpen, isDesktopSidebarOpen, settingsRef]);

  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      <aside onClick={handleSidebarClick}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-[width] duration-300 ease-in-out cursor-default
          md:relative md:inset-auto md:mt-[60px] md:mb-3 md:ml-3 md:rounded-[16px] md:border md:shadow-2xl md:overflow-hidden
          ${isSidebarOpen ? 'translate-x-0 w-[190px]' : '-translate-x-full md:translate-x-0'}
          ${isDesktopSidebarOpen ? 'md:w-[190px]' : 'md:w-[52px]'}
          ${isLightMode ? 'bg-white border-r border-slate-200 md:border-slate-200 md:bg-white' : 'bg-[#111] border-r border-white/5 md:border-zinc-800/80 md:bg-[#141414]'}`}>
        {/* 모바일 사이드바 닫기 버튼만 유지 — 데스크톱 햄버거 토글 제거 (빈 공간 클릭으로 접기/펴기) */}
        <div className={`flex items-center h-[60px] md:h-3 shrink-0 transition-all duration-300 ${isDesktopSidebarOpen ? 'px-4' : 'justify-center'}`}>
          <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }}
            className={`md:hidden absolute right-4 ${isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-500 hover:text-white'}`}>
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative flex-1 flex flex-col h-full overflow-hidden">
          <nav className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-6">
            <div className="space-y-1 w-full">
              <CategoryButton icon={LayoutGrid} label="전체 보기" count={banners.length} active={activeCategory === 'all'} isLightMode={isLightMode} isOpen={isDesktopSidebarOpen} onClick={() => handleGameClick('all')} />
              <CategoryButton icon={Heart} label="좋아요" count={banners.filter(b => b.liked).length} active={activeCategory === 'favorites'} isLightMode={isLightMode} isOpen={isDesktopSidebarOpen} onClick={() => handleGameClick('favorites')} />
              {tempBanners.length > 0 && (
                <button onClick={(e) => { e.stopPropagation(); handleGameClick('temp'); }}
                  className={`w-full flex items-center py-3 mt-1 transition-all group ${isDesktopSidebarOpen ? 'pl-4 pr-3 gap-3 justify-start' : 'justify-center'} ${activeCategory === 'temp' ? 'bg-violet-500/10 text-violet-500' : isLightMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}>
                  <div className="flex items-center justify-center shrink-0 w-5 h-5 relative"><Zap className="w-[18px] h-[18px]" strokeWidth={1.5} /></div>
                  <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between min-w-0 ${isDesktopSidebarOpen ? 'flex-1 opacity-100' : 'w-0 opacity-0'}`}>
                    <span className="whitespace-nowrap truncate text-[13px] font-medium leading-none">임시 평가</span>
                    <span className="text-[10px] font-bold bg-violet-500 text-white px-1.5 py-0.5 rounded-full leading-none shrink-0 ml-2">{tempBanners.length}</span>
                  </div>
                </button>
              )}

              {isDesktopSidebarOpen && (
                <>
                  <FolderSection
                    folders={folders}
                    activeCategory={activeCategory}
                    isLightMode={isLightMode}
                    handleGameClick={handleGameClick}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                  />
                  <div className={`pt-2 mt-2 w-full mx-auto ${isLightMode ? 'border-t border-slate-200' : 'border-t border-white/5'}`}></div>
                  <div className="px-3 py-2 space-y-6">
                    <div>
                      <h4 className={`text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Pinned</h4>
                      <div className="space-y-1">
                        {pinnedGames.length > 0 ? pinnedGames.map(g => renderItem(g)) : (
                          <div className={`text-[10px] ml-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>게임 옆의 별을 눌러 고정하세요</div>
                        )}
                      </div>
                    </div>
                    {recentGames.length > 0 && (
                      <div>
                        <h4 className={`text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Recent</h4>
                        <div className="space-y-1">{recentGames.map(g => renderItem(g))}</div>
                      </div>
                    )}
                    <div>
                      <h4 className={`text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>All Games</h4>
                      <button onClick={(e) => { e.stopPropagation(); setIsAllGamesModalOpen(true); }}
                        className={`w-full flex items-center py-2 px-1 text-[13px] font-medium transition-colors ${isLightMode ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white'}`}>
                        전체 게임 보기
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>

          {isAllGamesModalOpen && (
            <div className={`absolute inset-0 z-20 flex flex-col animate-in fade-in slide-in-from-bottom-2 ${isLightMode ? 'bg-white' : 'bg-[#111]'}`}>
              <div className={`flex items-center justify-between p-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
                <h3 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>전체 게임</h3>
                <button onClick={(e) => { e.stopPropagation(); setIsAllGamesModalOpen(false); }}
                  className={`p-1.5 rounded-lg transition-colors ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-zinc-800 text-zinc-400'}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {availableGames.length > 0
                  ? availableGames.map(g => renderItem(g))
                  : <div className="text-xs text-center py-8 text-zinc-500">등록된 게임이 없습니다.</div>}
              </div>
            </div>
          )}
        </div>

        <div className={`w-full pt-4 pb-6 flex shrink-0 transition-all duration-300 border-t ${isDesktopSidebarOpen ? 'flex-row items-center justify-center gap-6' : 'flex-col items-center gap-6'} ${isLightMode ? 'bg-white md:bg-transparent border-slate-200 md:border-slate-200/60' : 'bg-[#111] md:bg-transparent border-white/5 md:border-zinc-800/60'}`}>
          <div className="relative" ref={settingsRef}>
            <button onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
              className={`p-1.5 rounded-lg transition-colors ${isSettingsOpen ? (isLightMode ? 'bg-slate-100 text-slate-900' : 'bg-zinc-800 text-white') : (isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800')}`}>
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
            {isSettingsOpen && popoverPos && createPortal(
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'fixed', left: popoverPos.left, bottom: popoverPos.bottom, width: 224 }}
                className={`max-h-[80vh] overflow-y-auto custom-scrollbar rounded-xl shadow-xl p-2 z-[2000] animate-in slide-in-from-bottom-2 duration-200 border ${isLightMode ? 'bg-white border-slate-200' : 'bg-[#1e1e1e] border-white/5'}`}>
                <div className="flex flex-col gap-1">
                  {!isAdmin && <div className={`px-3 py-3 text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-500'} text-center`}>설정 항목이 없습니다.</div>}
                  {isAdmin && (
                    <>
                      {/* 관리 모드 토글 — ON 시 체크박스/편집 등 admin UI 노출. localStorage 에 영속. */}
                      <button onClick={(e) => { e.stopPropagation(); toggleAdminMode(); }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <div className="flex items-center gap-3">
                          <ShieldCheck className={`w-4 h-4 shrink-0 ${adminModeEnabled ? 'text-[#0eb9b3]' : ''}`} />
                          <span className={adminModeEnabled ? 'text-[#0eb9b3] font-bold' : ''}>관리 모드</span>
                        </div>
                        {/* 토글 스위치 */}
                        <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${adminModeEnabled ? 'bg-[#0eb9b3]' : (isLightMode ? 'bg-slate-300' : 'bg-zinc-700')}`}>
                          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${adminModeEnabled ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                      </button>
                      <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                      <button onClick={(e) => { e.stopPropagation(); handleSaveLibrary(); }} disabled={isSaving} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <Save className="w-4 h-4 shrink-0" /> <span>데이터 내보내기</span>
                      </button>
                      <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <FileJson className="w-4 h-4 shrink-0" /> <span>데이터 가져오기</span>
                        <input type="file" accept=".json" className="hidden" onChange={handleLoadLibrary} />
                      </label>
                      <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                      <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <FolderPlus className="w-4 h-4 shrink-0" /> <span>폴더 추가</span>
                        <input type="file" webkitdirectory="true" directory="" multiple className="hidden" onChange={handleFolderUpload} disabled={isUploading} />
                      </label>
                      <CodexFolderSelector isLightMode={isLightMode} lastFolderName={lastFolderName}
                        onPickFolder={handlePickFolder} onReopenLast={handleReopenLastFolder} onForgetLast={handleForgetLastFolder}
                        disabled={isUploading || isProcessingFiles} />
                      <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <Upload className="w-4 h-4 shrink-0" /> <span>파일 추가</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                      </label>
                      <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                      <button onClick={(e) => { e.stopPropagation(); setSkipDuplicates(!skipDuplicates); }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <div className="flex items-center gap-3"><CheckSquare className={`w-4 h-4 shrink-0 ${skipDuplicates ? 'text-[#0eb9b3]' : ''}`} /><span className={skipDuplicates ? 'text-[#0eb9b3] font-bold' : ''}>중복 방지</span></div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenDuplicateManager(); }} disabled={isProcessingFiles}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-500/10 text-red-500'}`}>
                        <Trash2 className="w-4 h-4 shrink-0" /> <span>중복 데이터 정리</span>
                      </button>
                    </>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

// 개인 폴더 섹션 — 사이드바 안에 펼쳐지는 폴더 목록.
// 폴더 클릭 → 그 폴더 멤버만 필터링 (activeCategory='folder:<id>').
// hover 시 이름변경/삭제 아이콘 노출.
function FolderSection({ folders, activeCategory, isLightMode, handleGameClick, onCreateFolder, onRenameFolder, onDeleteFolder }) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setCreating(false); return; }
    await onCreateFolder?.(name);
    setNewName('');
    setCreating(false);
  };

  const startRename = (f) => { setEditingId(f.id); setEditingName(f.name); };
  const commitRename = async () => {
    if (editingId && editingName.trim()) await onRenameFolder?.(editingId, editingName.trim());
    setEditingId(null); setEditingName('');
  };

  return (
    <div className={`pt-2 mt-2 w-full mx-auto ${isLightMode ? 'border-t border-slate-200' : 'border-t border-white/5'} px-3 py-2`}>
      <div className="flex items-center justify-between mb-2 ml-1">
        <h4 className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>My Folders</h4>
        <button
          onClick={() => setCreating(true)}
          title="새 폴더"
          className={`p-1 rounded hover:bg-white/5 ${isLightMode ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-500 hover:text-zinc-300'}`}
        ><FolderPlus size={12} /></button>
      </div>
      {creating && (
        <div className="flex items-center gap-1 mb-2">
          <input
            type="text" value={newName} autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
            placeholder="폴더 이름"
            className={`flex-1 text-[11px] px-2 py-1 rounded border outline-none ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-700 text-white'}`}
          />
          <button onClick={handleCreate} className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">+</button>
        </div>
      )}
      <div className="space-y-0.5">
        {folders.length === 0 && !creating && (
          <div className={`text-[10px] ml-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>아직 폴더가 없어요</div>
        )}
        {folders.map(f => {
          const active = activeCategory === `folder:${f.id}`;
          const isEditing = editingId === f.id;
          return (
            <div key={f.id} className="group flex items-center gap-1">
              {isEditing ? (
                <>
                  <input
                    type="text" value={editingName} autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditingId(null); setEditingName(''); } }}
                    onBlur={commitRename}
                    className={`flex-1 text-[11px] px-2 py-1 rounded border outline-none ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-700 text-white'}`}
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleGameClick(`folder:${f.id}`)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Folder size={12} className="shrink-0" />
                    <span className="flex-1 truncate text-left">{f.name}</span>
                    <span className={`text-[9px] font-mono shrink-0 ${active ? 'text-emerald-300' : 'text-zinc-500'}`}>{(f.bannerIds || []).length}</span>
                  </button>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <button onClick={() => startRename(f)} title="이름 변경" className="p-1 text-zinc-500 hover:text-zinc-200"><Pencil size={10} /></button>
                    <button onClick={() => onDeleteFolder?.(f.id)} title="폴더 삭제" className="p-1 text-zinc-500 hover:text-red-300"><Trash2 size={10} /></button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CodexSidebar;
