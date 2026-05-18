import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, LayoutGrid, Heart, Layers, Zap, Star, Settings, BrainCircuit, Sparkles,
  Save, FileJson, FileText, Image as ImageIcon, FolderPlus, Upload,
  CheckSquare, Trash2
} from 'lucide-react';
import CodexFolderSelector from './CodexFolderSelector';
import { gameNameMap, DEFAULT_AI_PROMPT } from '../constants/categories';

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
  geminiApiKey, setGeminiApiKey, openAiApiKey, setOpenAiApiKey,
  handleSaveLibrary, handleLoadLibrary, isSaving,
  setEditingPromptText, setIsPromptManagerOpen, customAiPrompt,
  setIsLogoManagerOpen, handleFolderUpload, isUploading,
  lastFolderName, handlePickFolder, handleReopenLastFolder, handleForgetLastFolder,
  isProcessingFiles, handleFileUpload, skipDuplicates, setSkipDuplicates,
  handleOpenDuplicateManager, handleSidebarClick,
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
          md:relative md:inset-auto md:my-3 md:ml-3 md:rounded-[16px] md:border md:shadow-2xl md:overflow-hidden
          ${isSidebarOpen ? 'translate-x-0 w-[190px]' : '-translate-x-full md:translate-x-0'}
          ${isDesktopSidebarOpen ? 'md:w-[190px]' : 'md:w-[52px]'}
          ${isLightMode ? 'bg-white border-r border-slate-200 md:border-slate-200 md:bg-white' : 'bg-[#111] border-r border-white/5 md:border-zinc-800/80 md:bg-[#141414]'}`}>
        {/* 모바일 사이드바 닫기 버튼만 유지 — 데스크톱 햄버거 토글 제거 (빈 공간 클릭으로 접기/펴기) */}
        <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${isDesktopSidebarOpen ? 'px-4' : 'justify-center'}`}>
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
              <CategoryButton icon={Layers} label="담기" count={cartIds.length} active={activeCategory === 'cart'} isLightMode={isLightMode} isOpen={isDesktopSidebarOpen} onClick={() => handleGameClick('cart')} />
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
                      <div className="px-2 pb-2">
                        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-zinc-500'} flex items-center gap-1`}><BrainCircuit className="w-3 h-3" /> Gemini API Key</label>
                        <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} placeholder="Gemini API Key 입력"
                          className={`w-full border rounded-md px-2 py-1.5 text-xs mb-1.5 focus:border-[#0eb9b3] focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500'}`} />
                        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 mt-3 ${isLightMode ? 'text-violet-500' : 'text-violet-400'} flex items-center gap-1`}><Sparkles className="w-3 h-3" /> OpenAI API Key <span className="text-[8px] font-normal opacity-70">(Cross-Check)</span></label>
                        <input type="password" value={openAiApiKey} onChange={(e) => setOpenAiApiKey(e.target.value)} placeholder="ChatGPT (선택사항)"
                          className={`w-full border rounded-md px-2 py-1.5 text-xs focus:border-violet-500 focus:outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600'}`} />
                        <p className={`text-[9px] mt-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>입력 시 두 AI의 평가 평균값을 사용합니다.</p>
                      </div>
                      <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                      <button onClick={(e) => { e.stopPropagation(); handleSaveLibrary(); }} disabled={isSaving} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <Save className="w-4 h-4 shrink-0" /> <span>데이터 내보내기</span>
                      </button>
                      <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <FileJson className="w-4 h-4 shrink-0" /> <span>데이터 가져오기</span>
                        <input type="file" accept=".json" className="hidden" onChange={handleLoadLibrary} />
                      </label>
                      <div className={`h-px w-full my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}></div>
                      <button onClick={(e) => { e.stopPropagation(); setEditingPromptText(customAiPrompt || DEFAULT_AI_PROMPT); setIsPromptManagerOpen(true); setIsSettingsOpen(false); }}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'text-[#0eb9b3] hover:bg-slate-100' : 'text-[#0eb9b3] hover:bg-white/5'}`}>
                        <FileText className="w-4 h-4 shrink-0" /> <span className="font-bold">AI 평가 프롬프트 관리</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setIsLogoManagerOpen(true); setIsSettingsOpen(false); }}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left ${isLightMode ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}>
                        <ImageIcon className="w-4 h-4 shrink-0" /> <span>로고 관리</span>
                      </button>
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

export default CodexSidebar;
