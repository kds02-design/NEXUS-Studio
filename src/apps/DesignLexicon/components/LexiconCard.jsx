import { CATEGORY_MAP } from "../constants/categories";

// 단일 텀 카드 — 영문/한글/요약/카테고리 라벨.
// 클릭 시 onSelect(term) 호출 → 부모가 상세 모달 오픈.
export default function LexiconCard({ term, onSelect }) {
  const cat = CATEGORY_MAP[term.category];
  const color = cat?.color || "#55EFC4";
  return (
    <button
      onClick={() => onSelect(term)}
      className="text-left bg-[#18181B] border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-all hover:bg-zinc-900/60 group"
      style={{ minHeight: 120 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase"
          style={{ background: `${color}1A`, border: `1px solid ${color}55`, color }}
        >
          {cat?.label || "Lexicon"}
        </span>
      </div>
      <div className="text-[14px] font-bold text-white leading-tight" style={{ fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: "0.3px" }}>
        {term.term}
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{term.ko}</div>
      <div className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed line-clamp-3">
        {term.summary}
      </div>
      {term.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {term.tags.slice(0, 4).map((t, i) => (
            <span key={i} className="text-[9px] text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800/60">
              #{t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
