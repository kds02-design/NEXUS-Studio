import { useState } from "react";
import { Link2, X, Check } from "lucide-react";
import { PromptImage } from "./ArcCard";
import { inferRelatedType } from "../constants/categories";

const TYPE_BADGE_COLOR = {
  '2D': 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  '3D/렌더링': 'bg-violet-500/15 border-violet-500/30 text-violet-300',
  '모션': 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  '기타': 'bg-zinc-500/15 border-zinc-500/30 text-zinc-300',
};

// Save 후 자동 AI 추천 결과를 보여주고 [연결하기/나중에] 선택을 받는다.
// 사용자가 일부만 선택해 연결할 수도 있도록 체크박스 토글로 동작.
export default function ArcSuggestModal({ isOpen, candidates, onConnect, onDismiss, isLinking }) {
  const [picked, setPicked] = useState(() => new Set(candidates.map(c => c.id)));
  if (!isOpen) return null;

  const toggle = (id) => {
    const s = new Set(picked);
    s.has(id) ? s.delete(id) : s.add(id);
    setPicked(s);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onDismiss}>
      <div className="w-full max-w-xl bg-[#111] rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C8A969]/15 flex items-center justify-center"><Link2 size={18} className="text-[#C8A969]" /></div>
            <div>
              <div className="text-sm font-bold text-zinc-100">연관 아이템이 발견됐어요</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">선택 항목과 양방향으로 연결됩니다.</div>
            </div>
          </div>
          <button onClick={onDismiss} className="p-2 text-zinc-500 hover:text-white rounded-full hover:bg-white/5"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto arc-scrollbar">
          {candidates.map(c => {
            const isPicked = picked.has(c.id);
            const thumb = c.thumbnail || c.images?.[0];
            const type = c.type || inferRelatedType(c);
            return (
              <button key={c.id} onClick={() => toggle(c.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-colors text-left ${isPicked ? 'border-[#C8A969]/50 bg-[#C8A969]/5' : 'border-white/5 hover:border-white/10 hover:bg-white/5'}`}>
                <span className={`w-5 h-5 inline-flex items-center justify-center rounded border ${isPicked ? 'border-[#C8A969] bg-[#C8A969]/20' : 'border-white/20'}`}>
                  {isPicked && <Check size={12} className="text-[#C8A969]" />}
                </span>
                <PromptImage src={thumb} alt={c.title} className="w-12 h-12 rounded-lg object-cover bg-zinc-900 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-zinc-200 truncate">{c.title || 'Untitled'}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${TYPE_BADGE_COLOR[type] || TYPE_BADGE_COLOR['기타']}`}>{type}</span>
                    {(c.tags || []).slice(0, 3).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 text-[9px] text-zinc-500 border border-white/5 rounded">#{t}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
          {candidates.length === 0 && (
            <div className="py-6 text-center text-[12px] text-zinc-500">추천된 후보가 없어요.</div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500">선택됨 <span className="text-[#C8A969] font-bold">{picked.size}</span> / {candidates.length}</div>
          <div className="flex gap-2">
            <button onClick={onDismiss} disabled={isLinking}
              className="px-4 py-2 rounded-lg text-[12px] font-bold border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-50">나중에</button>
            <button onClick={() => onConnect([...picked])} disabled={isLinking || picked.size === 0}
              className="px-4 py-2 rounded-lg text-[12px] font-bold bg-[#C8A969] text-black hover:bg-[#d8b97c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
              <Link2 size={13} /> {isLinking ? '연결 중...' : `${picked.size}개 연결`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
