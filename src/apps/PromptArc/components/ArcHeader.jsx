import { useEffect, useRef } from "react";
import {
  Search, X, Grid, Layout, Maximize2, ArrowUpDown, Check,
  Filter as FilterIcon,
} from "lucide-react";
import { STYLE_FILTERS, THEME_FILTERS } from "../constants/categories";

export default function ArcHeader({
  searchTerm, setSearchTerm,
  viewMode, setViewMode,
  filters, setFilters,
  sortOption, setSortOption,
  filterPopoverOpen, setFilterPopoverOpen,
  sortPopoverOpen, setSortPopoverOpen,
  isAdmin, totalCount,
}) {
  const filterPopoverRef = useRef(null);
  const sortPopoverRef = useRef(null);
  const filterCount = (filters.style ? 1 : 0) + (filters.theme ? 1 : 0) + (filters.unanalyzed ? 1 : 0);
  const sortLabel = { latest: '최신순', oldest: '오래된 순', popular: '조회순', top_rated: '인기순' }[sortOption] || '정렬';

  // 팝오버 외부 스크롤 시 자동 닫기
  useEffect(() => {
    if (!filterPopoverOpen && !sortPopoverOpen) return;
    const onScroll = (e) => {
      if (filterPopoverOpen && filterPopoverRef.current?.contains(e.target)) return;
      if (sortPopoverOpen && sortPopoverRef.current?.contains(e.target)) return;
      if (filterPopoverOpen) setFilterPopoverOpen(false);
      if (sortPopoverOpen) setSortPopoverOpen(false);
    };
    window.addEventListener('wheel', onScroll, { capture: true, passive: true });
    window.addEventListener('touchmove', onScroll, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('wheel', onScroll, { capture: true });
      window.removeEventListener('touchmove', onScroll, { capture: true });
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [filterPopoverOpen, sortPopoverOpen, setFilterPopoverOpen, setSortPopoverOpen]);

  return (
    <header className="h-14 border-b border-white/5 bg-[#050505]/90 flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 relative max-w-sm ml-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="검색..."
          className="w-full bg-[#121212] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white outline-none focus:border-[#C8A969]/50 placeholder:text-zinc-600" />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500"><X size={12} /></button>}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white/5 rounded-lg p-0.5">
          <button onClick={() => setViewMode('small')} className={`p-1.5 rounded transition-colors ${viewMode === 'small' ? 'bg-[#1A1A1A] text-[#C8A969]' : 'text-zinc-500'}`}><Grid size={13} /></button>
          <button onClick={() => setViewMode('normal')} className={`p-1.5 rounded transition-colors ${viewMode === 'normal' ? 'bg-[#1A1A1A] text-[#C8A969]' : 'text-zinc-500'}`}><Layout size={13} /></button>
          <button onClick={() => setViewMode('large')} className={`p-1.5 rounded transition-colors ${viewMode === 'large' ? 'bg-[#1A1A1A] text-[#C8A969]' : 'text-zinc-500'}`}><Maximize2 size={13} /></button>
        </div>
        <div className="relative">
          <button
            onClick={() => { setFilterPopoverOpen(!filterPopoverOpen); setSortPopoverOpen(false); }}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${filterCount > 0 ? 'text-[#C8A969] bg-[#C8A969]/10 hover:bg-[#C8A969]/15' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            title="필터"
          >
            <FilterIcon size={12} /> 필터
            <span
              aria-hidden={filterCount === 0}
              className={`ml-0.5 px-1.5 py-0.5 rounded bg-[#C8A969]/20 text-[#C8A969] text-[9px] font-bold leading-none inline-block text-center ${filterCount > 0 ? '' : 'invisible'}`}
              style={{ minWidth: 14 }}
            >{filterCount > 0 ? filterCount : 0}</span>
          </button>
          {filterPopoverOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setFilterPopoverOpen(false)} />
              <div ref={filterPopoverRef} className="nx-popover-panel absolute top-9 right-0 w-56 z-50 py-1">
                <div className="flex items-center justify-between px-4 pt-2 pb-1">
                  <span className="nx-popover-section-label" style={{ padding: 0 }}>스타일</span>
                  {filterCount > 0 && (
                    <button
                      onClick={() => setFilters({ style: null, theme: null, unanalyzed: false })}
                      className="text-[10px] text-zinc-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                    >초기화</button>
                  )}
                </div>
                {STYLE_FILTERS.map(f => (
                  <button key={f.id}
                    onClick={() => setFilters(prev => ({ ...prev, style: prev.style === f.id ? null : f.id }))}
                    className={`nx-popover-item ${filters.style === f.id ? 'is-active' : ''}`}
                  >
                    <span>{f.label}</span>{filters.style === f.id && <Check size={12} />}
                  </button>
                ))}
                <div className="nx-popover-divider" />
                <div className="nx-popover-section-label">테마</div>
                {THEME_FILTERS.map(f => (
                  <button key={f.id}
                    onClick={() => setFilters(prev => ({ ...prev, theme: prev.theme === f.id ? null : f.id }))}
                    className={`nx-popover-item ${filters.theme === f.id ? 'is-active' : ''}`}
                  >
                    <span>{f.label}</span>{filters.theme === f.id && <Check size={12} />}
                  </button>
                ))}
                {isAdmin && (
                  <>
                    <div className="nx-popover-divider" />
                    <div className="nx-popover-section-label" style={{ color: '#a78bfa' }}>관리자</div>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, unanalyzed: !prev.unanalyzed }))}
                      className={`nx-popover-item ${filters.unanalyzed ? 'is-active' : ''}`}
                      style={filters.unanalyzed ? { color: '#c4b5fd' } : undefined}
                    >
                      <span>미분석</span>{filters.unanalyzed && <Check size={12} />}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button onClick={() => { setSortPopoverOpen(!sortPopoverOpen); setFilterPopoverOpen(false); }} className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg">
            <ArrowUpDown size={12} /> {sortLabel}
          </button>
          {sortPopoverOpen && (
            <div ref={sortPopoverRef} className="nx-popover-panel absolute top-9 right-0 w-36 z-50 py-1">
              {['latest', 'oldest', 'popular', 'top_rated'].map(s => (
                <button key={s} onClick={() => { setSortOption(s); setSortPopoverOpen(false); }}
                  className={`nx-popover-item ${sortOption === s ? 'is-active' : ''}`}>
                  <span>{({ latest: '최신순', oldest: '오래된 순', popular: '조회순', top_rated: '인기순' })[s]}</span>
                  {sortOption === s && <Check size={12} />}
                </button>
              ))}
              <div className="fixed inset-0 -z-10" onClick={() => setSortPopoverOpen(false)} />
            </div>
          )}
        </div>
        <span className="text-xs font-mono text-[#C8A969] font-bold">{totalCount}</span>
      </div>
    </header>
  );
}
