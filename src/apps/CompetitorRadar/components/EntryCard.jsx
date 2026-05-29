import { Sparkles, Clock, Loader2 } from "lucide-react";
import { useTheme } from "../../../context/GlobalContext";
import { CATEGORY_LABELS } from "../constants/competitorCriteria";

const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }); }
  catch { return ""; }
};

export default function EntryCard({ entry, color, analyzing, onClick }) {
  const T = useTheme();
  const img = entry.preview || entry.full_image || entry.mobile_image;
  return (
    <button onClick={onClick}
      className="text-left rounded-xl overflow-hidden border transition-transform hover:-translate-y-0.5 group"
      style={{ background: T.card, borderColor: entry.isNew ? `${color}66` : T.border }}>
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: T.bg }}>
        {img
          ? <img src={img} alt={entry.title || entry.competitor} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: T.textDim }}>이미지 없음</div>}
        {entry.isNew && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: color }}>NEW</span>
        )}
        {analyzing
          ? <span className="absolute top-2 right-2 p-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}><Loader2 className="w-3 h-3 text-white animate-spin" /></span>
          : entry.isAnalyzed && <span className="absolute top-2 right-2 p-1 rounded-full" style={{ background: "rgba(0,0,0,0.6)" }}><Sparkles className="w-3 h-3" style={{ color }} /></span>}
        {entry.seenCount > 1 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono text-white" style={{ background: "rgba(0,0,0,0.6)" }}>×{entry.seenCount}</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}1a`, color }}>{entry.competitor}</span>
          <span className="text-[9px]" style={{ color: T.textDim }}>{CATEGORY_LABELS[entry.category] || entry.category}</span>
          <span className="text-[9px] ml-auto flex items-center gap-0.5" style={{ color: T.textDim }}><Clock className="w-2.5 h-2.5" />{fmtDate(entry.capturedAt)}</span>
        </div>
        <div className="text-sm font-bold truncate" style={{ color: T.text }}>{entry.title || "(분석 전)"}</div>
        {entry.styleTraits?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {entry.styleTraits.slice(0, 3).map((t, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: T.bg, color: T.textMuted }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
