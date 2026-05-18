import { useState, useEffect, useRef } from 'react';
import { Image as Loader2, ArrowUp } from 'lucide-react';

const getColumns = (width, gridSize) => {
  if (gridSize === 'small') {
    if (width >= 1536) return 7;
    if (width >= 1280) return 6;
    if (width >= 1024) return 5;
    if (width >= 768) return 4;
    if (width >= 640) return 3;
    return 2;
  }
  if (gridSize === 'large') {
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
  }
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 640) return 2;
  return 1;
};

const CodexGrid = ({ items, renderItem, gridSize, isLoading, isLightMode, onScrollChange, resetTrigger }) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [resetTrigger]);

  const handleScroll = (e) => {
    const top = e.currentTarget.scrollTop;
    setScrollTop(top);
    if (top > 10) onScrollChange?.(true);
    else onScrollChange?.(false);
  };

  const scrollToTop = () => {
    if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns = getColumns(containerSize.width, gridSize);
  const gap = containerSize.width >= 768 ? 12 : 8;
  const padding = containerSize.width >= 768 ? 32 : 16;
  const effectiveWidth = containerSize.width - (padding * 2);
  const cardWidth = Math.max(0, Math.floor((effectiveWidth - (columns - 1) * gap) / columns));
  const cardHeight = cardWidth * (750 / 1180);
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * cardHeight + Math.max(0, totalRows - 1) * gap + (padding * 2);
  const buffer = 3;
  const rowHeightWithGap = cardHeight + gap;
  const effectiveScrollTop = Math.max(0, scrollTop - padding);
  const startRow = Math.max(0, Math.floor(effectiveScrollTop / rowHeightWithGap) - buffer);
  const endRow = Math.min(totalRows, Math.ceil((effectiveScrollTop + containerSize.height) / rowHeightWithGap) + buffer);

  const visibleItems = [];
  if (cardWidth > 0) {
    for (let r = startRow; r < endRow; r++) {
      for (let c = 0; c < columns; c++) {
        const index = r * columns + c;
        if (index < items.length) {
          visibleItems.push({
            index, item: items[index],
            top: r * rowHeightWithGap + padding,
            left: c * (cardWidth + gap) + padding,
            width: cardWidth, height: cardHeight
          });
        }
      }
    }
  }

  return (
    <div ref={containerRef}
      className={`flex-1 overflow-y-auto relative custom-scrollbar ${isLightMode ? 'bg-[#f8f9fa]' : 'bg-[#0c0c0e]'}`}
      onScroll={handleScroll}>
      <div style={{ height: Math.max(0, totalHeight), position: 'relative', width: '100%' }}>
        {visibleItems.map(({ item, top, left, width, height }) => (
          <div key={item.id} style={{ position: 'absolute', top, left, width, height }}>{renderItem(item)}</div>
        ))}
      </div>
      <button onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-[100] px-4 py-3 rounded-full shadow-2xl border transition-all duration-300 flex items-center justify-center ${scrollTop > 400 ? 'opacity-100 translate-y-0 pointer-events-auto hover:scale-110' : 'opacity-0 translate-y-10 pointer-events-none'} ${isLightMode ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-[#1c1c1e] text-zinc-300 border-zinc-700 hover:bg-zinc-800'}`}
        title="위로 가기">
        <ArrowUp className="w-4 h-4" />
        <span className="text-xs font-bold ml-1.5 uppercase tracking-wider">Top</span>
      </button>
      {isLoading && items.length === 0 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center py-4">
          <div className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border backdrop-blur-sm ${isLightMode ? 'bg-white/80 border-slate-200 text-slate-500' : 'bg-zinc-900/80 border-zinc-800 text-zinc-500'}`}>
            <Loader2 className="w-4 h-4 animate-spin text-[#0eb9b3]" />
            <span>데이터 불러오는 중...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodexGrid;
