import { CATEGORIES } from "../constants/categories";

// 좌측 사이드바: 카테고리 필터 + 각 카테고리 텀 개수 표시.
// counts 는 useLexicon 같은 외부 훅이 아니라 부모에서 미리 계산해 전달.
export default function LexiconSidebar({ activeCategory, setActiveCategory, counts, totalCount }) {
  return (
    <aside className="w-[200px] shrink-0 bg-[#121214] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
      <div className="p-5 border-b border-zinc-800">
        <h1 className="text-lg font-bold text-white tracking-wide" style={{ fontFamily: "'Noto Sans KR', sans-serif", letterSpacing: "0.5px" }}>
          Design Lexicon
        </h1>
        <p className="text-[10px] text-zinc-500 mt-1">디자인 방법론 사전 (Beta)</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {CATEGORIES.map(c => {
          const active = c.id === activeCategory;
          const count = c.id === "all" ? totalCount : (counts[c.id] || 0);
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-[12px] font-medium truncate">{c.ko}</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-2">{count}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-800 text-[10px] text-zinc-600 leading-relaxed">
        용어를 클릭하면 상세 이론과 예시를 확인할 수 있어요.
      </div>
    </aside>
  );
}
