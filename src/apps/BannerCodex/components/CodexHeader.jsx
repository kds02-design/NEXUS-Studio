import {
  Menu, Search, Bot, Loader2, X, Sparkles, CheckSquare, MinusSquare, Filter,
  ChevronUp, ChevronDown, Grip, LayoutGrid, Maximize2, ArrowUpDown,
} from 'lucide-react';
import { gameNameMap } from '../constants/categories';

const FilterMenu = ({ filterMenuRef, filters, setFilters, isLightMode, isAdminMode, topTags, availableGames, isAdvancedFilterOpen, setIsAdvancedFilterOpen }) => (
  <div ref={filterMenuRef}
    className={`absolute right-0 top-9 mt-2 w-[340px] md:w-[400px] border rounded-xl shadow-2xl z-[100] flex flex-col p-5 animate-in fade-in slide-in-from-top-2 duration-200 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
    <div className="flex items-center justify-between mb-5">
      <h4 className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>필터</h4>
      <button onClick={() => setFilters({ assetType: 'all', year: 'all', customStart: '', customEnd: '', quality: 'all', tag: 'all', game: 'all', creator: 'all', ocr: 'all' })}
        className={`text-[11px] px-2 py-1 rounded border transition-colors ${isLightMode ? 'border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>초기화</button>
    </div>
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <FilterGroup label="캠페인 목적 (에셋 타입)" isLightMode={isLightMode}>
        {[{ label: '전체', value: 'all' }, { label: '브랜드웹', value: '브랜드웹' }, { label: '프로모션', value: '프로모션' }, { label: '배너', value: '배너' }].map(opt => (
          <FilterButton key={opt.value} active={filters.assetType === opt.value} isLightMode={isLightMode} onClick={() => setFilters(p => ({ ...p, assetType: opt.value }))}>{opt.label}</FilterButton>
        ))}
      </FilterGroup>
      <FilterGroup label="제작 년도" isLightMode={isLightMode}>
        {['all', '2026', '2025', '2024'].map(y => (
          <FilterButton key={y} active={filters.year === y} isLightMode={isLightMode} onClick={() => setFilters(p => ({ ...p, year: y }))}>{y === 'all' ? '전체' : y}</FilterButton>
        ))}
        <FilterButton active={filters.year === 'custom'} isLightMode={isLightMode} onClick={() => setFilters(p => ({ ...p, year: 'custom' }))}>직접 선택</FilterButton>
        {filters.year === 'custom' && (
          <div className="flex gap-2 mt-2 w-full animate-in slide-in-from-top-1">
            <input type="date" value={filters.customStart} onChange={(e) => setFilters(p => ({ ...p, customStart: e.target.value }))} className={`flex-1 text-[10px] px-2 py-1.5 rounded border focus:border-[#0eb9b3] outline-none ${isLightMode ? 'bg-white text-slate-900 border-slate-300' : 'bg-zinc-900 text-white border-zinc-700 [color-scheme:dark]'}`} />
            <input type="date" value={filters.customEnd} onChange={(e) => setFilters(p => ({ ...p, customEnd: e.target.value }))} className={`flex-1 text-[10px] px-2 py-1.5 rounded border focus:border-[#0eb9b3] outline-none ${isLightMode ? 'bg-white text-slate-900 border-slate-300' : 'bg-zinc-900 text-white border-zinc-700 [color-scheme:dark]'}`} />
          </div>
        )}
      </FilterGroup>
      <FilterGroup label="디자인 품질" isLightMode={isLightMode}>
        {[{ label: '전체', value: 'all' }, { label: '대표 사례 (8.7 이상)', value: '8.7_up' }, { label: '우수 (8.2~8.6)', value: '8.2_8.6' }, { label: '양호 (7.5~7.9)', value: '7.5_7.9' }, { label: '개선 필요 (7.5 미만)', value: '7.5_down' }].map(opt => (
          <FilterButton key={opt.value} active={filters.quality === opt.value} isLightMode={isLightMode} onClick={() => setFilters(p => ({ ...p, quality: opt.value }))}>{opt.label}</FilterButton>
        ))}
      </FilterGroup>
      <FilterGroup label="스타일 태그 (Top 5)" isLightMode={isLightMode}>
        <FilterButton active={filters.tag === 'all'} isLightMode={isLightMode} onClick={() => setFilters(p => ({ ...p, tag: 'all' }))}>전체</FilterButton>
        {topTags.map(tag => <FilterButton key={tag} active={filters.tag === tag} isLightMode={isLightMode} onClick={() => setFilters(p => ({ ...p, tag }))}>#{tag}</FilterButton>)}
      </FilterGroup>
      <div className={`pt-4 border-t ${isLightMode ? 'border-slate-200' : 'border-zinc-800'}`}>
        <button onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
          className={`flex items-center justify-between w-full text-[11px] font-bold uppercase tracking-wider transition-colors ${isLightMode ? 'text-slate-500 hover:text-slate-800' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <span>고급 필터</span>{isAdvancedFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isAdvancedFilterOpen && (
          <div className="pt-5 space-y-5 animate-in slide-in-from-top-2">
            <div className="space-y-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>게임 / IP</label>
              <select value={filters.game} onChange={(e) => setFilters(p => ({ ...p, game: e.target.value }))}
                className={`w-full text-xs border rounded-lg px-2.5 py-2 pr-8 focus:border-[#0eb9b3] focus:outline-none appearance-none ${isLightMode ? 'bg-slate-50 text-slate-900 border-slate-200' : 'bg-zinc-900 text-white border-zinc-700'}`}>
                <option value="all">전체</option>
                {availableGames.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {isAdminMode && (
              <FilterGroup label="AI 분석 상태" isLightMode={isLightMode}>
                {[{ label: '전체', value: 'all' }, { label: '완료', value: 'done' }, { label: '대기', value: 'pending' }].map(opt => (
                  <button key={opt.value} onClick={() => setFilters(p => ({ ...p, ocr: opt.value }))}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${filters.ocr === opt.value ? 'bg-violet-500/20 text-violet-400 border-violet-500/40' : isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}>{opt.label}</button>
                ))}
              </FilterGroup>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

const FilterGroup = ({ label, isLightMode, children }) => (
  <div className="space-y-2">
    <label className={`text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>{label}</label>
    <div className="flex flex-wrap gap-1.5 items-center">{children}</div>
  </div>
);

const FilterButton = ({ active, isLightMode, onClick, children }) => (
  <button onClick={onClick}
    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${active ? 'bg-[#0eb9b3]/20 text-[#39d4ce] border-[#0eb9b3]/40' : isLightMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'}`}>
    {children}
  </button>
);

const CodexHeader = ({
  user: _user, isLightMode, isAdminMode, isAiSearchMode, setIsAiSearchMode,
  searchQuery, setSearchQuery, isSearching, handleSearch,
  setIsSidebarOpen, activeCategory, setAiSearchIds,
  isScrolled: _isScrolled, isAllSelected, handleSelectAll,
  filters, setFilters, isFilterMenuOpen, setIsFilterMenuOpen, filterMenuRef,
  isAdvancedFilterOpen, setIsAdvancedFilterOpen, topTags, availableGames,
  gridSize, setGridSize, sortOrder, setSortOrder, isSortMenuOpen, setIsSortMenuOpen,
  filteredBannersCount, isChildContextActive: _isChildContextActive,
}) => {
  const getCategoryDisplayName = () => {
    if (activeCategory === 'all') return '전체 보기';
    if (activeCategory === 'favorites') return '좋아요';
    if (activeCategory === 'cart') return '담기';
    if (activeCategory === 'temp') return '임시 평가 폴더';
    return gameNameMap[activeCategory] || activeCategory;
  };

  const filterCount =
    (filters.quality !== 'all' ? 1 : 0) + (filters.year !== 'all' ? 1 : 0) + (filters.ocr !== 'all' ? 1 : 0) +
    (filters.assetType !== 'all' ? 1 : 0) + (filters.tag !== 'all' ? 1 : 0) + (filters.game !== 'all' ? 1 : 0);
  const sortLabel = { newest: '최신순', oldest: '오래된순', popular: '인기순', score: '평가순', name: '이름순' }[sortOrder] || '정렬';

  return (
    <header className={`h-14 flex flex-nowrap items-center px-4 md:px-8 gap-3 z-40 shrink-0 sticky top-0 backdrop-blur-sm whitespace-nowrap transition-colors duration-300 ${isLightMode ? 'bg-white/90 border-b border-slate-200' : 'bg-[#0c0c0e]/90 border-b border-white/5'}`}>
      {/* 좌측: 모바일 메뉴 + 타이틀 + 전체 선택 */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
        <button onClick={() => setIsSidebarOpen(true)} className={`md:hidden shrink-0 ${isLightMode ? 'text-slate-400 hover:text-slate-900' : 'text-zinc-400 hover:text-white'}`}>
          <Menu className="w-6 h-6" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm md:text-base font-bold flex items-center gap-2 min-w-0 truncate">
          <span className={`truncate ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{getCategoryDisplayName()}</span>
          {searchQuery && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold shrink-0 ${isAiSearchMode ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-[#0eb9b3]/15 border-[#0eb9b3]/40 text-[#39d4ce]'}`}>
              {isAiSearchMode && <Sparkles className="w-3 h-3" />}
              <span className="truncate max-w-[140px]">{isAiSearchMode ? `AI: ${searchQuery}` : `#${searchQuery}`}</span>
              <button onClick={() => { setSearchQuery(''); setAiSearchIds(null); }} className="hover:text-white"><X className="w-3 h-3" /></button>
            </div>
          )}
        </h2>
        {isAdminMode && (
          <button onClick={handleSelectAll}
            className={`hidden md:flex items-center gap-1.5 px-2 py-1 ml-1 rounded-md text-[11px] font-medium border transition-colors shrink-0 ${
              isAllSelected
                ? (isLightMode ? 'text-white bg-slate-700 border-slate-600' : 'text-white bg-zinc-700 border-zinc-600')
                : (isLightMode ? 'text-slate-500 border-slate-300 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 border-zinc-700 hover:text-white hover:bg-white/5')
            }`}>
            {isAllSelected ? <MinusSquare className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
            <span className="whitespace-nowrap">{isAllSelected ? '선택 해제' : '전체 선택'}</span>
          </button>
        )}
      </div>

      {/* 우측: 검색 + 컨트롤 (한 줄) */}
      <div className="flex flex-nowrap items-center gap-2 ml-auto shrink-0">
        {/* 검색 */}
        <div className="relative w-[180px] md:w-[220px] lg:w-[260px] shrink-0">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10 ${isAiSearchMode ? 'text-violet-400' : isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" /> : isAiSearchMode ? <Bot className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" strokeWidth={1.5} />}
          </div>
          <input type="search" name="bannerSearch" autoComplete="off" data-1p-ignore data-lpignore="true" placeholder={isAiSearchMode ? 'AI에게 물어보세요...' : '검색...'}
            className={`w-full pl-9 pr-14 py-1.5 border rounded-lg focus:outline-none text-xs transition-colors ${isLightMode ? 'bg-white text-slate-900 placeholder:text-slate-400' : 'bg-[#121212] text-white placeholder:text-zinc-600'} ${isAiSearchMode ? 'border-violet-500/50 focus:border-violet-500' : isLightMode ? 'border-slate-300 focus:border-[#0eb9b3]' : 'border-white/10 focus:border-[#0eb9b3]/50'}`}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} disabled={isSearching} />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
            {searchQuery && !isSearching && (
              <button onClick={() => { setSearchQuery(''); setAiSearchIds(null); }} className={`p-1 rounded transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-white'}`}>
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            )}
            <button onClick={() => setIsAiSearchMode(!isAiSearchMode)}
              className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all ${isAiSearchMode ? 'bg-violet-500 text-white' : isLightMode ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
              title="AI 의미 검색">AI</button>
          </div>
        </div>

        {/* 그리드 토글 그룹 (3-way) */}
        <div className={`hidden md:flex items-center rounded-lg p-0.5 shrink-0 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`}>
          <button onClick={() => setGridSize('small')} title="작게"
            className={`p-1.5 rounded transition-colors ${gridSize === 'small' ? (isLightMode ? 'bg-white text-[#0eb9b3] shadow-sm' : 'bg-[#1A1A1A] text-[#0eb9b3]') : (isLightMode ? 'text-slate-400' : 'text-zinc-500')}`}>
            <Grip className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setGridSize('medium')} title="보통"
            className={`p-1.5 rounded transition-colors ${gridSize === 'medium' ? (isLightMode ? 'bg-white text-[#0eb9b3] shadow-sm' : 'bg-[#1A1A1A] text-[#0eb9b3]') : (isLightMode ? 'text-slate-400' : 'text-zinc-500')}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setGridSize('large')} title="크게"
            className={`p-1.5 rounded transition-colors ${gridSize === 'large' ? (isLightMode ? 'bg-white text-[#0eb9b3] shadow-sm' : 'bg-[#1A1A1A] text-[#0eb9b3]') : (isLightMode ? 'text-slate-400' : 'text-zinc-500')}`}>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 필터 */}
        <div className="relative shrink-0">
          <button onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
              filterCount > 0
                ? 'text-[#0eb9b3] bg-[#0eb9b3]/10 hover:bg-[#0eb9b3]/15'
                : (isLightMode ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-white/5')
            }`}
            title="필터">
            <Filter className="w-3 h-3" /> <span className="hidden md:inline">필터</span>
            <span
              aria-hidden={filterCount === 0}
              className={`ml-0.5 px-1.5 py-0.5 rounded bg-[#0eb9b3]/20 text-[#0eb9b3] text-[9px] font-bold leading-none inline-block text-center ${filterCount > 0 ? '' : 'invisible'}`}
              style={{ minWidth: 14 }}
            >{filterCount > 0 ? filterCount : 0}</span>
          </button>
          {isFilterMenuOpen && (
            <FilterMenu filterMenuRef={filterMenuRef} filters={filters} setFilters={setFilters}
              isLightMode={isLightMode} isAdminMode={isAdminMode} topTags={topTags} availableGames={availableGames}
              isAdvancedFilterOpen={isAdvancedFilterOpen} setIsAdvancedFilterOpen={setIsAdvancedFilterOpen} />
          )}
        </div>

        {/* 정렬 */}
        <div className="relative shrink-0">
          <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
              isSortMenuOpen
                ? 'text-[#0eb9b3] bg-[#0eb9b3]/10'
                : (isLightMode ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-white/5')
            }`}
            title="정렬">
            <ArrowUpDown className="w-3 h-3" /> <span className="hidden md:inline">{sortLabel}</span>
          </button>
          {isSortMenuOpen && (
            <div className={`absolute right-0 top-9 w-32 border rounded-xl shadow-xl z-[100] flex flex-col p-1 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
              {[['newest', '최신순'], ['oldest', '오래된순'], ['popular', '인기순'], ['score', '평가순'], ['name', '이름순']].map(([key, label]) => (
                <button key={key} onClick={() => { setSortOrder(key); setIsSortMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-white/5'} ${sortOrder === key ? 'text-[#0eb9b3] font-bold' : isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {/* 카운트 — 자릿수 변동에도 폭 고정 (tabular-nums + min-w). */}
        <span className="text-xs font-mono font-bold ml-1 text-[#0eb9b3] shrink-0 tabular-nums inline-block text-right" style={{ minWidth: 36 }}>{filteredBannersCount}</span>
      </div>
    </header>
  );
};

export default CodexHeader;
