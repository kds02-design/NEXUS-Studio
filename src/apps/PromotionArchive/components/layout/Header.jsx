import {
  Search, Sparkles, Loader2, X, Menu, ArrowLeft, Layers, ArrowRight, CheckSquare,
  Filter as FilterIcon, ArrowUpDown, Maximize2, Layout, Check,
} from 'lucide-react';

const Header = ({
  setIsSidebarOpen,
  // search
  isAiSearchMode, setIsAiSearchMode, isAiQuerying,
  searchQuery, setSearchQuery, handleAiSearch, setAiSearchKeywords,
  aiSearchKeywords,
  // context
  isCollectionMode, setIsCollectionMode, activeCategory,
  filteredBanners, banners,
  // admin selection
  isAdminMode = false, selectedIds = [], handleSelectAll,
  // filters
  isFilterOpen, setIsFilterOpen, activeFilters, setActiveFilters, availableYears, filterRef,
  // sort
  isSortMenuOpen, setIsSortMenuOpen, sortOrder, setSortOrder, sortRef,
  // grid
  isLargeGrid, setIsLargeGrid,
}) => {
  const filterCount =
    (activeFilters?.score && activeFilters.score !== 'all' ? 1 : 0) +
    (activeFilters?.year && activeFilters.year !== 'all' ? 1 : 0) +
    (activeFilters?.status && activeFilters.status !== 'all' ? 1 : 0);
  const sortLabel = {
    latest: '최신순', oldest: '오래된순', score_desc: '점수 높은순', score_asc: '점수 낮은순',
  }[sortOrder] || '정렬';

  const titleText = isCollectionMode
    ? '모아보기'
    : isAiSearchMode
      ? 'AI 스마트 검색'
      : searchQuery
        ? `'${searchQuery}'`
        : (activeCategory === 'all' ? '전체 목록' : activeCategory);

  return (
    <header className="h-14 bg-[#0c0c0e]/90 backdrop-blur-sm border-b border-white/5 flex flex-nowrap items-center px-4 md:px-6 gap-3 shrink-0 sticky top-0 z-40 whitespace-nowrap">
      {/* 좌측: 모바일 메뉴 + 타이틀 */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden text-zinc-400 hover:text-white transition-colors shrink-0"
        >
          <Menu className="w-6 h-6" strokeWidth={1.5} />
        </button>
        {isCollectionMode && (
          <button
            onClick={() => setIsCollectionMode(false)}
            className="p-1 hover:bg-zinc-800 rounded-full transition-colors shrink-0"
            title="뒤로"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        )}
        <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2 min-w-0 truncate">
          {isCollectionMode && <Layers className="w-4 h-4 text-[#d8b17e] shrink-0" />}
          {isAiSearchMode && <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />}
          <span className="truncate">{titleText}</span>
        </h2>
        {/* AI 검색 키워드 뱃지 */}
        {isAiSearchMode && aiSearchKeywords?.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 ml-1 shrink-0">
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            {aiSearchKeywords.map((k, i) => (
              <span key={i} className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                {k}
              </span>
            ))}
          </div>
        )}
        {isAdminMode && !isCollectionMode && (
          <button
            onClick={handleSelectAll}
            className={`hidden md:flex items-center gap-1.5 px-2 py-1 ml-1 rounded-md text-[11px] font-medium border transition-all shrink-0 ${
              filteredBanners?.length > 0 && selectedIds.length >= filteredBanners.length
                ? 'text-[#d8b17e] bg-[#d8b17e]/10 border-[#d8b17e]'
                : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <CheckSquare className="w-3 h-3" /> 전체 선택
          </button>
        )}
      </div>

      {/* 우측: 검색 + 컨트롤 (모두 한 줄, ml-auto로 우측 정렬) */}
      <div className="flex flex-nowrap items-center gap-2 ml-auto shrink-0">
        {/* 검색 */}
        <div className="relative group w-[180px] md:w-[220px] lg:w-[260px] shrink-0">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10 ${isAiSearchMode ? 'text-violet-400' : 'text-zinc-500'}`}>
            {isAiQuerying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isAiSearchMode ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : (
              <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
          </div>
          <input
            type="text"
            placeholder={isAiSearchMode ? 'AI 검색...' : '검색...'}
            className={`w-full pl-9 pr-16 py-1.5 bg-[#121212] border rounded-lg text-white text-xs transition-all placeholder:text-zinc-600 focus:outline-none ${
              isAiSearchMode
                ? 'border-violet-500/50 focus:border-violet-500'
                : 'border-white/10 focus:border-[#d8b17e]/50'
            }`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && isAiSearchMode) handleAiSearch(); }}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setAiSearchKeywords([]); }}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => { setIsAiSearchMode(!isAiSearchMode); setAiSearchKeywords([]); }}
              className={`p-1 rounded transition-all ${isAiSearchMode ? 'bg-violet-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              title={isAiSearchMode ? 'AI 검색 끄기' : 'AI 검색 켜기'}
            >
              <Sparkles className="w-3 h-3" />
            </button>
          </div>
        </div>

        {!isCollectionMode && (
          <>
            {/* 그리드 토글 그룹 */}
            <div className="hidden md:flex items-center bg-white/5 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setIsLargeGrid(false)}
                className={`p-1.5 rounded transition-colors ${!isLargeGrid ? 'bg-[#1A1A1A] text-[#d8b17e]' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="기본 보기"
              >
                <Layout className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsLargeGrid(true)}
                className={`p-1.5 rounded transition-colors ${isLargeGrid ? 'bg-[#1A1A1A] text-[#d8b17e]' : 'text-zinc-500 hover:text-zinc-300'}`}
                title="크게 보기"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 필터 */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  filterCount > 0
                    ? 'text-[#d8b17e] bg-[#d8b17e]/10 hover:bg-[#d8b17e]/15'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="필터"
              >
                <FilterIcon className="w-3 h-3" /> <span className="hidden md:inline">필터</span>
                <span
                  aria-hidden={filterCount === 0}
                  className={`ml-0.5 px-1.5 py-0.5 rounded bg-[#d8b17e]/20 text-[#d8b17e] text-[9px] font-bold leading-none inline-block text-center ${filterCount > 0 ? '' : 'invisible'}`}
                  style={{ minWidth: 14 }}
                >{filterCount > 0 ? filterCount : 0}</span>
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-9 w-64 bg-[#1e1e20] border border-zinc-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">Design Score</div>
                      <div className="grid grid-cols-3 gap-2">
                        {['all', 'high', 'medium'].map(score => (
                          <button
                            key={score}
                            onClick={() => setActiveFilters(prev => ({ ...prev, score }))}
                            className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                              activeFilters.score === score
                                ? 'bg-[#d8b17e]/20 border-[#d8b17e] text-[#d8b17e]'
                                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                          >
                            {score === 'all' ? '전체' : score === 'high' ? '8.0↑' : '8.0↓'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-wider">Year</div>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => setActiveFilters(prev => ({ ...prev, year: 'all' }))}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                            activeFilters.year === 'all' ? 'bg-[#d8b17e]/20 border-[#d8b17e] text-[#d8b17e]' : 'border-zinc-700 text-zinc-400'
                          }`}
                        >ALL</button>
                        {availableYears?.map(year => (
                          <button
                            key={year}
                            onClick={() => setActiveFilters(prev => ({ ...prev, year: String(year) }))}
                            className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                              activeFilters.year === String(year) ? 'bg-[#d8b17e]/20 border-[#d8b17e] text-[#d8b17e]' : 'border-zinc-700 text-zinc-400'
                            }`}
                          >{String(year).slice(2)}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 정렬 */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  isSortMenuOpen ? 'text-[#d8b17e] bg-[#d8b17e]/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ArrowUpDown className="w-3 h-3" /> <span className="hidden md:inline">{sortLabel}</span>
              </button>
              {isSortMenuOpen && (
                <div className="absolute right-0 top-9 w-40 bg-[#1e1e20] border border-zinc-700 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {[
                    { id: 'latest', label: '최신순' },
                    { id: 'oldest', label: '오래된순' },
                    { id: 'score_desc', label: '점수 높은순' },
                    { id: 'score_asc', label: '점수 낮은순' },
                  ].map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setSortOrder(option.id); setIsSortMenuOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {option.label}
                      {sortOrder === option.id && <Check className="w-3 h-3 text-[#d8b17e]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 카운트 */}
        <span className="text-xs font-mono text-[#d8b17e] font-bold ml-1 shrink-0">
          {filteredBanners?.length ?? 0}
          {filteredBanners && banners && filteredBanners.length !== banners.length && (
            <span className="text-zinc-600 font-normal">/{banners.length}</span>
          )}
        </span>
      </div>
    </header>
  );
};

export default Header;
