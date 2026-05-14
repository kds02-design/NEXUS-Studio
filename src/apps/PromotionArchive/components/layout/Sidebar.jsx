import React from 'react';
import {
  Menu, X, LayoutGrid, Heart, BarChart2, Layers, Star, ChevronRight,
  Settings, FolderPlus, Upload, Save, FileJson,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

const ACCENT = '#d8b17e';

const Sidebar = ({
  isSidebarOpen, setIsSidebarOpen,
  isDesktopSidebarOpen, setIsDesktopSidebarOpen,
  activeCategory, handleGameClick,
  isCollectionMode, setIsCollectionMode,
  collectionIds, availableGames,
  pinnedGames, togglePinGame, recentGames,
  isAllGamesModalOpen, setIsAllGamesModalOpen,
  expandedGames, setExpandedGames,
  activeYear, handleYearClick,
  isSettingsOpen, setIsSettingsOpen, settingsRef,
  handleFolderUpload, handleFileUpload, handleSaveLibrary, handleLoadLibrary,
  banners,
}) => {
  const { isAdmin } = useAuth();

  const getYearsForGame = (gameKey) => {
    if (!banners) return [];
    const years = [...new Set(banners.filter(b => b.game === gameKey).map(b => b.year))]
      .filter(Boolean)
      .sort((a, b) => Number(b) - Number(a));
    return years;
  };

  const onFolderSelected = (e) => { setIsSettingsOpen(false); handleFolderUpload(e); };
  const onFileSelected = (e) => { setIsSettingsOpen(false); handleFileUpload(e); };
  const onLoadSelected = (e) => { setIsSettingsOpen(false); handleLoadLibrary(e); };

  const favoritesCount = banners?.filter(b => b.liked === 1).length || 0;
  const totalCount = banners?.length || 0;

  const renderGameItem = (gameKey) => {
    const count = banners?.filter(b => b.game === gameKey).length || 0;
    const years = getYearsForGame(gameKey);
    const isActiveGame = activeCategory === gameKey;
    const isExpanded = expandedGames?.includes(gameKey);
    const isPinned = pinnedGames?.includes(gameKey);

    return (
      <div key={gameKey} className="w-full">
        <button
          onClick={(e) => { e.stopPropagation(); handleGameClick(gameKey); }}
          className={`w-full flex items-center justify-between py-1.5 px-2 transition-all group ${isActiveGame && !activeYear ? 'bg-[#d8b17e]/10 rounded-lg' : ''}`}
        >
          <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
            <span
              onClick={(e) => { e.stopPropagation(); togglePinGame(gameKey); }}
              className="cursor-pointer flex items-center justify-center w-5 h-5 transition-colors shrink-0"
            >
              {isPinned ? (
                <Star className={`w-4 h-4 transition-colors ${isActiveGame ? 'text-[#d8b17e] fill-[#d8b17e]' : 'text-zinc-500 fill-zinc-500 hover:text-zinc-400'}`} />
              ) : (
                <Star className="w-4 h-4 text-zinc-600 hover:text-zinc-500" />
              )}
            </span>
            <span className={`capitalize text-[13px] font-medium leading-none transition-colors truncate ${isActiveGame ? 'text-[#d8b17e] font-bold' : 'text-zinc-400 group-hover:text-white'}`}>
              {gameKey}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {count > 0 && (
              <span className={`text-[11px] font-bold mr-1 ${isActiveGame ? 'text-[#d8b17e]' : 'text-zinc-500'}`}>
                {count}
              </span>
            )}
            {years.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGames(prev =>
                    prev.includes(gameKey) ? prev.filter(g => g !== gameKey) : [...prev, gameKey]
                  );
                }}
                className="cursor-pointer p-0.5 text-zinc-500 hover:text-zinc-300"
              >
                <ChevronRight size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </span>
            )}
          </div>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded && years.length > 0 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          {years.map(year => (
            <button
              key={year}
              onClick={(e) => { e.stopPropagation(); handleYearClick(gameKey, year); }}
              className={`w-full flex items-center py-1.5 text-[11px] pl-12 transition-colors ${
                activeCategory === gameKey && String(activeYear) === String(year)
                  ? 'text-[#d8b17e] bg-[#d8b17e]/10'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-[width] duration-300 ease-in-out cursor-default md:relative bg-[#111] border-r border-white/5
          ${isSidebarOpen ? 'translate-x-0 w-[190px]' : '-translate-x-full md:translate-x-0'}
          ${isDesktopSidebarOpen ? 'md:w-[190px]' : 'md:w-20'}
        `}
      >
        <div className={`flex items-center h-[60px] shrink-0 transition-all duration-300 ${isDesktopSidebarOpen ? 'pl-[18px] pr-4' : 'justify-center'}`}>
          <div className="flex justify-center shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setIsDesktopSidebarOpen(!isDesktopSidebarOpen); }}
              className="transition-colors p-1.5 -ml-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              title={isDesktopSidebarOpen ? '메뉴 접기' : '메뉴 펼치기'}
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden absolute right-4 text-zinc-500 hover:text-white"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="relative flex-1 flex flex-col h-full overflow-hidden">
          <nav className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-6">
            <div className="space-y-1 w-full">
              <NavRow
                icon={<LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                label="전체 보기"
                count={totalCount}
                isActive={activeCategory === 'all' && !isCollectionMode}
                isOpen={isDesktopSidebarOpen}
                onClick={() => handleGameClick('all')}
              />
              <NavRow
                icon={<Heart className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                label="즐겨찾기"
                count={favoritesCount}
                isActive={activeCategory === 'favorites' && !isCollectionMode}
                isOpen={isDesktopSidebarOpen}
                onClick={() => handleGameClick('favorites')}
              />
              <NavRow
                icon={<BarChart2 className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                label="분석"
                isActive={activeCategory === 'analysis' && !isCollectionMode}
                isOpen={isDesktopSidebarOpen}
                onClick={() => handleGameClick('analysis')}
              />
              <NavRow
                icon={<Layers className="w-[18px] h-[18px]" strokeWidth={1.5} />}
                label="모아보기"
                count={collectionIds?.length || 0}
                isActive={isCollectionMode}
                isOpen={isDesktopSidebarOpen}
                onClick={() => setIsCollectionMode(true)}
              />

              {isDesktopSidebarOpen && (
                <>
                  <div className="pt-2 mt-2 w-full mx-auto border-t border-white/5" />
                  <div className="px-3 py-2 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider text-zinc-500">Pinned</h4>
                      <div className="space-y-1">
                        {pinnedGames?.length > 0 ? (
                          pinnedGames.map(game => renderGameItem(game))
                        ) : (
                          <div className="text-[10px] ml-1 text-zinc-600">게임 옆의 별을 눌러 고정하세요</div>
                        )}
                      </div>
                    </div>

                    {recentGames?.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider text-zinc-500">Recent</h4>
                        <div className="space-y-1">
                          {recentGames.map(game => renderGameItem(game))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-[10px] font-bold mb-2 ml-1 uppercase tracking-wider text-zinc-500">All Games</h4>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsAllGamesModalOpen(true); }}
                        className="w-full flex items-center py-2 px-1 text-[13px] font-medium transition-colors text-zinc-400 hover:text-white"
                      >
                        전체 게임 보기
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>

          {isAllGamesModalOpen && (
            <div className="absolute inset-0 z-20 flex flex-col animate-in fade-in slide-in-from-bottom-2 bg-[#111]">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-sm font-bold text-white">전체 게임</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsAllGamesModalOpen(false); }}
                  className="p-1.5 rounded-lg transition-colors hover:bg-zinc-800 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {availableGames?.length > 0 ? (
                  availableGames.map(game => renderGameItem(game))
                ) : (
                  <div className="text-xs text-center py-8 text-zinc-500">등록된 게임이 없습니다.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={settingsRef} className="w-full pt-4 pb-10 flex transition-all duration-300 flex-col items-center gap-6 bg-[#111] relative">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
              className={`p-1.5 rounded-lg transition-colors ${isSettingsOpen ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              title="설정 및 데이터"
            >
              <Settings className="w-4 h-4" strokeWidth={1.5} />
            </button>
            {isSettingsOpen && (
              <div className={`absolute bottom-full mb-3 w-56 rounded-xl shadow-xl p-2 z-[100] animate-in slide-in-from-bottom-2 duration-200 border bg-[#1e1e1e] border-white/5 ${isDesktopSidebarOpen ? 'left-0' : 'left-full ml-4'}`}>
                {!isAdmin && (
                  <div className="px-3 py-3 text-xs text-zinc-500 text-center">설정 항목이 없습니다.</div>
                )}
                {isAdmin && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data Management</div>
                    <SettingsMenu label="폴더 추가" icon={<FolderPlus className="w-4 h-4 shrink-0" />} onChange={onFolderSelected} directory />
                    <SettingsMenu label="파일 추가" icon={<Upload className="w-4 h-4 shrink-0" />} onChange={onFileSelected} />
                    <div className="h-px w-full my-1 bg-white/5" />
                    <button
                      onClick={() => { setIsSettingsOpen(false); handleSaveLibrary(); }}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left hover:bg-white/5 text-zinc-400 hover:text-white"
                    >
                      <Save className="w-4 h-4 shrink-0" /> <span>백업 저장</span>
                    </button>
                    <SettingsMenu label="데이터 복원" icon={<FileJson className="w-4 h-4 shrink-0" />} onChange={onLoadSelected} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

const NavRow = ({ icon, label, count, isActive, isOpen, onClick }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-full flex items-center py-3 transition-all group ${isOpen ? 'pl-5 pr-4 justify-start' : 'justify-center'} ${
      isActive ? `bg-[${ACCENT}]/10 text-[${ACCENT}]` : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
    }`}
    style={isActive ? { backgroundColor: `${ACCENT}1a`, color: ACCENT } : undefined}
  >
    <div className="flex items-center justify-center shrink-0 w-5 h-5">{icon}</div>
    <div className={`overflow-hidden transition-all duration-300 flex items-center justify-between ${isOpen ? 'w-full opacity-100 ml-3' : 'w-0 opacity-0 ml-0'}`}>
      <span className="whitespace-nowrap text-[13px] font-medium leading-none">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span
          className="text-[11px] font-bold leading-none text-zinc-500"
          style={isActive ? { color: ACCENT } : undefined}
        >
          {count}
        </span>
      )}
    </div>
  </button>
);

const SettingsMenu = ({ label, icon, onChange, directory }) => (
  <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-xs w-full text-left hover:bg-white/5 text-zinc-400 hover:text-white">
    {icon} <span>{label}</span>
    <input
      type="file"
      className="hidden"
      accept={directory ? '' : '.json,image/*'}
      onChange={onChange}
      {...(directory ? { webkitdirectory: '', directory: '' } : {})}
    />
  </label>
);

export default Sidebar;
