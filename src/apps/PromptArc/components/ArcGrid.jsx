import { useEffect, useMemo, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import ArcCard from "./ArcCard";

export default function ArcGrid({
  prompts, filteredPrompts, visibleCount, setVisibleCount,
  colCount, isAdminMode, selectedItems, onToggleSelect,
  onView, onDelete, onEdit, onNewPrompt,
  currentUid, isAdmin,
}) {
  const lastAutoLoadRef = useRef(0);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (visibleCount >= filteredPrompts.length) return;
    if (!observerTarget.current) return;
    const ob = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      const now = Date.now();
      if (now - lastAutoLoadRef.current < 250) return;
      lastAutoLoadRef.current = now;
      setVisibleCount(p => Math.min(p + 50, filteredPrompts.length));
    }, { threshold: 0, rootMargin: '400px' });
    ob.observe(observerTarget.current);
    return () => ob.disconnect();
  }, [visibleCount, filteredPrompts.length, setVisibleCount]);

  const visiblePrompts = filteredPrompts.slice(0, visibleCount);
  const masonryColumns = useMemo(() => {
    const cols = Array.from({ length: colCount }, () => []);
    visiblePrompts.forEach((p, i) => cols[i % colCount].push(p));
    return cols;
  }, [visiblePrompts, colCount]);

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-white/10 flex items-center justify-center">
          <Plus size={24} className="text-slate-400 dark:text-zinc-600" />
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-500">아직 저장된 프롬프트가 없어요</p>
        <div className="flex gap-3">
          <button onClick={onNewPrompt} className="px-4 py-2 bg-[#C8A969] text-black rounded-lg text-xs font-bold">새 프롬프트 추가</button>
          <button onClick={() => {}} className="px-4 py-2 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 rounded-lg text-xs">이미지 드래그 & 드롭</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 items-start">
        {masonryColumns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-3 flex-1 min-w-0">
            {col.map(p => (
              <ArcCard key={p.id} prompt={p} isAdminMode={isAdminMode} isSelected={selectedItems.has(p.id)}
                onClick={() => onView(p)}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggleSelect={onToggleSelect}
                currentUid={currentUid}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ))}
      </div>
      {visibleCount < filteredPrompts.length && (
        <div ref={observerTarget} className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400 dark:text-zinc-600" size={20} /></div>
      )}
    </>
  );
}
