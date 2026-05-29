import { Plus, FileText, Search } from "lucide-react";
import { useTheme } from "../../../context/GlobalContext";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "../constants/competitorCriteria";

export default function RadarHeader({
  color, competitors, competitorFilter, setCompetitorFilter,
  categoryFilter, setCategoryFilter, onlyNew, setOnlyNew, search, setSearch,
  total, newCount, onRegister, onOpenReports,
}) {
  const T = useTheme();
  const sel = { background: T.bg, border: `1px solid ${T.border}`, color: T.text };
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: T.textDim }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="검색"
          className="pl-8 pr-3 py-1.5 rounded-lg text-xs w-40 focus:outline-none" style={sel} />
      </div>
      <select value={competitorFilter} onChange={(e) => setCompetitorFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-xs focus:outline-none" style={sel}>
        <option value="all">전체 경쟁사</option>
        {competitors.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg text-xs focus:outline-none" style={sel}>
        <option value="all">전체 유형</option>
        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
      </select>
      <button onClick={() => setOnlyNew(!onlyNew)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
        style={onlyNew ? { background: `${color}22`, color, border: `1px solid ${color}66` } : { background: T.bg, color: T.textMuted, border: `1px solid ${T.border}` }}>
        신규만 {newCount > 0 && `(${newCount})`}
      </button>
      <span className="text-[11px] ml-1" style={{ color: T.textDim }}>{total}건</span>

      <div className="ml-auto flex items-center gap-2">
        <button onClick={onOpenReports} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}` }}>
          <FileText className="w-3.5 h-3.5" style={{ color }} /> 리포트
        </button>
        <button onClick={onRegister} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: color }}>
          <Plus className="w-3.5 h-3.5" /> 등록
        </button>
      </div>
    </div>
  );
}
