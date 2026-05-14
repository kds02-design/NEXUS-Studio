import React from 'react';
import { 
  ArrowLeft, Layers, Filter, ArrowUpDown, Maximize2, ZoomIn, 
  CheckSquare, Sparkles, ArrowRight, Check 
} from 'lucide-react';

const PromotionFilterBar = ({
  isCollectionMode, setIsCollectionMode,
  activeCategory, isAiSearchMode, searchQuery, aiSearchKeywords,
  filteredBanners, banners, selectedIds, handleSelectAll,
  isFilterOpen, setIsFilterOpen, activeFilters, setActiveFilters, availableYears,
  isSortMenuOpen, setIsSortMenuOpen, sortOrder, setSortOrder,
  isLargeGrid, setIsLargeGrid, filterRef, sortRef
}) => {
  return (
    // ✨ 수정됨: px-4 md:px-8 제거 (부모 패딩과 라인 맞춤)
    <div className="sticky top-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-sm py-4 mb-2 flex items-center justify-between border-b border-white/5">
      
      {/* 왼쪽: 타이틀 및 선택 정보 */}
      <div className="flex items-center gap-2 md:gap-4">
        {isCollectionMode ? (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCollectionMode(false)} 
              className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#d8b17e]" /> 모아보기 
              <span className="text-zinc-500 text-sm font-normal">({filteredBanners.length})</span>
            </h2>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-white truncate max-w-[200px]">
                {isAiSearchMode ? (
                  <span className="flex items-center gap-2 text-violet-400">
                    <Sparkles className="w-4 h-4" /> AI 스마트 검색
                  </span>
                ) : searchQuery ? (
                  `'${searchQuery}'`
                ) : (
                  activeCategory === 'all' ? '전체 목록' : activeCategory
                )}
              </h2>
              {/* AI 검색 키워드 뱃지 */}
              {isAiSearchMode && aiSearchKeywords.length > 0 && (
                <div className="hidden md:flex items-center gap-1.5 ml-2">
                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                  {aiSearchKeywords.map((k, i) => (
                    <span key={i} className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={handleSelectAll} 
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filteredBanners.length > 0 && selectedIds.length >= filteredBanners.length 
                  ? 'text-[#d8b17e] bg-[#d8b17e]/10 border-[#d8b17e]' 
                  : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" /> 전체 선택
            </button>
          </>
        )}
      </div>

      {/* 오른쪽: 필터, 정렬, 그리드 제어 */}
      <div className="flex items-center gap-3">
        {!isCollectionMode && (
          <>
            {/* 필터 버튼 및 드롭다운 */}
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className={`p-2 rounded-lg transition-colors ${
                  isFilterOpen || activeFilters.score !== 'all' || activeFilters.year !== 'all' || activeFilters.status !== 'all'
                    ? 'text-[#d8b17e] bg-[#d8b17e]/10' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#1e1e20] border border-zinc-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="space-y-4">
                        {/* 디자인 점수 필터 */}
                        <div>
                            <div className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Design Score</div>
                            <div className="grid grid-cols-3 gap-2">
                                {['all', 'high', 'medium'].map(score => (
                                    <button
                                        key={score}
                                        onClick={() => setActiveFilters(prev => ({...prev, score}))}
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
                        {/* 연도 필터 */}
                        <div>
                             <div className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">Year</div>
                             <div className="grid grid-cols-4 gap-2">
                                 <button
                                     onClick={() => setActiveFilters(prev => ({...prev, year: 'all'}))}
                                     className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                                         activeFilters.year === 'all' ? 'bg-[#d8b17e]/20 border-[#d8b17e] text-[#d8b17e]' : 'border-zinc-700 text-zinc-400'
                                     }`}
                                  >
                                     ALL
                                  </button>
                                  {availableYears.map(year => (
                                      <button
                                          key={year}
                                          onClick={() => setActiveFilters(prev => ({...prev, year: String(year)}))}
                                          className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                                              activeFilters.year === String(year) ? 'bg-[#d8b17e]/20 border-[#d8b17e] text-[#d8b17e]' : 'border-zinc-700 text-zinc-400'
                                          }`}
                                      >
                                          {String(year).slice(2)}
                                      </button>
                                  ))}
                             </div>
                        </div>
                    </div>
                </div>
              )}
            </div>

            {/* 정렬 버튼 및 드롭다운 */}
            <div className="relative" ref={sortRef}>
              <button 
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} 
                className={`p-2 rounded-lg transition-colors ${isSortMenuOpen ? 'text-[#d8b17e] bg-[#d8b17e]/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
              
              {isSortMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1e1e20] border border-zinc-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                      {[
                          { id: 'latest', label: '최신순' },
                          { id: 'oldest', label: '오래된순' },
                          { id: 'score_desc', label: '점수 높은순' },
                          { id: 'score_asc', label: '점수 낮은순' }
                      ].map(option => (
                          <button
                              key={option.id}
                              onClick={() => { setSortOrder(option.id); setIsSortMenuOpen(false); }}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors"
                          >
                              {option.label}
                              {sortOrder === option.id && <Check className="w-4 h-4 text-[#d8b17e]" />}
                          </button>
                      ))}
                  </div>
              )}
            </div>
          </>
        )}

        {/* 그리드 크기 조절 */}
        <button 
          onClick={() => setIsLargeGrid(!isLargeGrid)} 
          className={`p-2 rounded-lg transition-colors ${isLargeGrid ? 'text-[#d8b17e] bg-[#d8b17e]/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
          title={isLargeGrid ? "기본 보기" : "크게 보기"}
        >
          {isLargeGrid ? <ZoomIn className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* 개수 표시 */}
        <div className="flex items-center gap-1 ml-2 text-sm font-bold">
          <span className="text-[#d8b17e]">{filteredBanners.length}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500">{banners.length}</span>
        </div>
      </div>
    </div>
  );
};

export default PromotionFilterBar;