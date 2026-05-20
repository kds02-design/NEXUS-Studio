import { useState, useMemo } from 'react';
import {
  Search, Sparkles, Loader2, X, Menu, ArrowLeft, Layers, ArrowRight, CheckSquare,
  Filter as FilterIcon, ArrowUpDown, Maximize2, Layout, Check, ChevronUp, ChevronDown, Pin,
} from 'lucide-react';

const ACCENT = '#d8b17e';

// 필터 그룹 — label + flex-wrap pills.
const FilterGroup = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
    <div className="flex flex-wrap gap-1.5 items-center">{children}</div>
  </div>
);

// 필터 pill — active 면 gold, 아니면 zinc.
const FilterButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
      active
        ? `bg-[${ACCENT}]/20 text-[${ACCENT}] border-[${ACCENT}]/40`
        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
    }`}
    style={active ? { background: `${ACCENT}33`, color: ACCENT, borderColor: `${ACCENT}66` } : undefined}
  >
    {children}
  </button>
);

// 게임/IP picker — 검색 입력 + 스크롤 가능한 chip 그리드.
// 핀 고정된 게임은 상단으로, 나머지는 알파벳 순. 검색은 substring (대소문자 무시).
const GamePicker = ({ value, onChange, options, pinnedGames = [] }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = options.filter(g => !ql || g.toLowerCase().includes(ql));
    // 핀 고정 우선 정렬 (pinned 먼저, 나머지 그대로)
    return list.sort((a, b) => {
      const ap = pinnedGames.includes(a) ? 0 : 1;
      const bp = pinnedGames.includes(b) ? 0 : 1;
      return ap - bp;
    });
  }, [options, q, pinnedGames]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" strokeWidth={2} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="게임명 검색..."
          className="w-full pl-8 pr-7 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <button
        onClick={() => onChange('all')}
        className={`w-full px-2.5 py-1.5 text-[11px] font-bold rounded-md border transition-all flex items-center justify-between ${
          value === 'all' ? '' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
        }`}
        style={value === 'all' ? { background: `${ACCENT}33`, color: ACCENT, borderColor: `${ACCENT}66` } : undefined}
      >
        <span>전체</span>
        {value === 'all' && <Check className="w-3 h-3" />}
      </button>
      <div className="max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-[10px] text-zinc-600 italic text-center py-3 border border-dashed border-zinc-800 rounded-md">
            "{q}" 일치 없음
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map(g => {
              const active = value === g;
              const pinned = pinnedGames.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => onChange(g)}
                  className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-all flex items-center justify-between gap-1 truncate ${
                    active ? '' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                  }`}
                  style={active ? { background: `${ACCENT}33`, color: ACCENT, borderColor: `${ACCENT}66` } : undefined}
                  title={g}
                >
                  <span className="flex items-center gap-1 min-w-0">
                    {pinned && <Pin className="w-2.5 h-2.5 shrink-0" />}
                    <span className="truncate">{g}</span>
                  </span>
                  {active && <Check className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

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
  isAdvancedFilterOpen, setIsAdvancedFilterOpen,
  topTags = [], availableGames = [], pinnedGames = [],
  // sort
  isSortMenuOpen, setIsSortMenuOpen, sortOrder, setSortOrder, sortRef,
  // grid
  isLargeGrid, setIsLargeGrid,
}) => {
  const f = activeFilters || {};
  const filterCount =
    (f.assetType && f.assetType !== 'all' ? 1 : 0) +
    (f.year && f.year !== 'all' ? 1 : 0) +
    (f.quality && f.quality !== 'all' ? 1 : 0) +
    (f.tag && f.tag !== 'all' ? 1 : 0) +
    (f.game && f.game !== 'all' ? 1 : 0) +
    (f.ocr && f.ocr !== 'all' ? 1 : 0);
  const resetFilters = () => setActiveFilters({
    assetType: 'all', year: 'all', customStart: '', customEnd: '',
    quality: 'all', tag: 'all', game: 'all', ocr: 'all',
  });
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
                <div className="absolute right-0 top-9 w-[340px] md:w-[380px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="text-sm font-bold text-white">필터</h4>
                    <button
                      onClick={resetFilters}
                      className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >초기화</button>
                  </div>
                  <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">

                    {/* 캠페인 목적 (에셋 타입) */}
                    <FilterGroup label="캠페인 목적 (에셋 타입)">
                      {[
                        { label: '전체', value: 'all' },
                        { label: '브랜드웹', value: '브랜드웹' },
                        { label: '프로모션', value: '프로모션' },
                        { label: '배너', value: '배너' },
                      ].map(opt => (
                        <FilterButton
                          key={opt.value}
                          active={f.assetType === opt.value}
                          onClick={() => setActiveFilters(p => ({ ...p, assetType: opt.value }))}
                        >{opt.label}</FilterButton>
                      ))}
                    </FilterGroup>

                    {/* 제작 년도 */}
                    <FilterGroup label="제작 년도">
                      {['all', '2026', '2025', '2024'].map(y => (
                        <FilterButton
                          key={y}
                          active={f.year === y}
                          onClick={() => setActiveFilters(p => ({ ...p, year: y }))}
                        >{y === 'all' ? '전체' : y}</FilterButton>
                      ))}
                      <FilterButton
                        active={f.year === 'custom'}
                        onClick={() => setActiveFilters(p => ({ ...p, year: 'custom' }))}
                      >직접 선택</FilterButton>
                      {f.year === 'custom' && (
                        <div className="flex gap-2 mt-2 w-full animate-in slide-in-from-top-1">
                          <input
                            type="date"
                            value={f.customStart || ''}
                            onChange={(e) => setActiveFilters(p => ({ ...p, customStart: e.target.value }))}
                            className="flex-1 text-[10px] px-2 py-1.5 rounded border border-zinc-700 bg-zinc-900 text-white outline-none focus:border-zinc-500 [color-scheme:dark]"
                          />
                          <input
                            type="date"
                            value={f.customEnd || ''}
                            onChange={(e) => setActiveFilters(p => ({ ...p, customEnd: e.target.value }))}
                            className="flex-1 text-[10px] px-2 py-1.5 rounded border border-zinc-700 bg-zinc-900 text-white outline-none focus:border-zinc-500 [color-scheme:dark]"
                          />
                        </div>
                      )}
                    </FilterGroup>

                    {/* 디자인 품질 5-tier */}
                    <FilterGroup label="디자인 품질">
                      {[
                        { label: '전체', value: 'all' },
                        { label: '대표 사례 (8.7 이상)', value: '8.7_up' },
                        { label: '우수 (8.2~8.6)', value: '8.2_8.6' },
                        { label: '양호 (7.5~7.9)', value: '7.5_7.9' },
                        { label: '개선 필요 (7.5 미만)', value: '7.5_down' },
                      ].map(opt => (
                        <FilterButton
                          key={opt.value}
                          active={f.quality === opt.value}
                          onClick={() => setActiveFilters(p => ({ ...p, quality: opt.value }))}
                        >{opt.label}</FilterButton>
                      ))}
                    </FilterGroup>

                    {/* 스타일 태그 Top 5 */}
                    {topTags.length > 0 && (
                      <FilterGroup label="스타일 태그 (Top 5)">
                        <FilterButton
                          active={f.tag === 'all'}
                          onClick={() => setActiveFilters(p => ({ ...p, tag: 'all' }))}
                        >전체</FilterButton>
                        {topTags.map(tag => (
                          <FilterButton
                            key={tag}
                            active={f.tag === tag}
                            onClick={() => setActiveFilters(p => ({ ...p, tag }))}
                          >#{tag}</FilterButton>
                        ))}
                      </FilterGroup>
                    )}

                    {/* 고급 필터 — 게임/IP picker + AI 상태(관리자) */}
                    <div className="pt-4 border-t border-zinc-800">
                      <button
                        onClick={() => setIsAdvancedFilterOpen?.(!isAdvancedFilterOpen)}
                        className="flex items-center justify-between w-full text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <span>고급 필터</span>
                        {isAdvancedFilterOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {isAdvancedFilterOpen && (
                        <div className="pt-5 space-y-5 animate-in slide-in-from-top-2">
                          {/* 게임/IP — 새 picker UI */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">게임 / IP</label>
                            <GamePicker
                              value={f.game}
                              onChange={(g) => setActiveFilters(p => ({ ...p, game: g }))}
                              options={availableGames}
                              pinnedGames={pinnedGames}
                            />
                          </div>

                          {/* AI 분석 상태 — 관리자 전용 */}
                          {isAdminMode && (
                            <FilterGroup label="AI 분석 상태">
                              {[
                                { label: '전체', value: 'all' },
                                { label: '완료', value: 'done' },
                                { label: '대기', value: 'pending' },
                              ].map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => setActiveFilters(p => ({ ...p, ocr: opt.value }))}
                                  className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-all ${
                                    f.ocr === opt.value
                                      ? 'bg-violet-500/20 text-violet-400 border-violet-500/40'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                                  }`}
                                >{opt.label}</button>
                              ))}
                            </FilterGroup>
                          )}
                        </div>
                      )}
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
