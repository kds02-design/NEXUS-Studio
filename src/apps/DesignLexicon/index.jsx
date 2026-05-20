// Design Lexicon MVP — 디자인 방법론 사전.
// 카테고리 사이드바 + 상단 검색 + 카드 그리드 + 상세 모달.
// 데이터는 정적 시드(constants/seed.js) 사용. 추후 Firestore lexicon 컬렉션으로 이관 예정.
// Prompt Arche 태그 → 렉시콘 팝업 통합은 다음 단계.
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import LexiconSidebar from "./components/LexiconSidebar";
import LexiconCard from "./components/LexiconCard";
import LexiconDetail from "./components/LexiconDetail";
import { LEXICON } from "./constants/seed";

const matches = (t, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    t.term.toLowerCase().includes(needle) ||
    t.ko.includes(q) ||
    (t.tags || []).some(tag => tag.toLowerCase().includes(needle))
  );
};

export default function DesignLexiconApp() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => {
    const acc = {};
    for (const t of LEXICON) acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, []);

  const filtered = useMemo(() => {
    return LEXICON
      .filter(t => activeCategory === "all" || t.category === activeCategory)
      .filter(t => matches(t, query));
  }, [activeCategory, query]);

  return (
    <div className="flex flex-col h-screen bg-[#09090B] text-zinc-100 p-5 overflow-hidden" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <style>{`
        .arc-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .arc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .arc-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <main className="flex-1 flex gap-5 overflow-hidden">
        <LexiconSidebar
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          counts={counts}
          totalCount={LEXICON.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden bg-[#121214] border border-zinc-800 rounded-2xl">
          {/* Search */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
            <Search size={14} className="text-zinc-500" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="용어·한글명·태그 검색..."
              className="flex-1 bg-transparent border-0 outline-none text-zinc-200 text-sm placeholder:text-zinc-600"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-zinc-500 hover:text-zinc-300" title="지우기">
                <X size={14} />
              </button>
            )}
            <span className="text-[11px] font-mono text-emerald-400 font-bold">{filtered.length}</span>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5 arc-scrollbar">
            {filtered.length === 0 ? (
              <div className="text-center text-zinc-500 text-sm py-16">
                일치하는 용어가 없어요.
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
                {filtered.map(term => (
                  <LexiconCard key={term.id} term={term} onSelect={setSelected} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <LexiconDetail term={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
