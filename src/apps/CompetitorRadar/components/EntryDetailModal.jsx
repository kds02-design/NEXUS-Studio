import { X, Sparkles, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useTheme } from "../../../context/GlobalContext";
import { CATEGORY_LABELS } from "../constants/competitorCriteria";

function Field({ label, children, T }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: T.textMuted }}>{label}</div>
      <div className="text-[13px] leading-relaxed" style={{ color: T.text }}>{children}</div>
    </div>
  );
}

export default function EntryDetailModal({ entry, color, analyzing, onClose, onReanalyze, onDelete }) {
  const T = useTheme();
  if (!entry) return null;
  const img = entry.full_image || entry.preview || entry.mobile_image;
  const date = entry.promoDate?.fullDate || [entry.promoDate?.year, entry.promoDate?.month].filter(Boolean).join(".");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
        style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded shrink-0" style={{ background: `${color}1a`, color }}>{entry.competitor}</span>
            <span className="text-sm font-bold truncate">{entry.title || "(분석 전)"}</span>
            <span className="text-[10px] shrink-0" style={{ color: T.textDim }}>{CATEGORY_LABELS[entry.category] || entry.category}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {entry.sourceUrl && (
              <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-full" style={{ background: T.hoverBg }} title="원본 열기"><ExternalLink className="w-3.5 h-3.5" /></a>
            )}
            <button onClick={() => onReanalyze(entry)} disabled={analyzing} className="p-1.5 rounded-full" style={{ background: T.hoverBg }} title="재분석">
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" style={{ color }} />}
            </button>
            <button onClick={() => onDelete(entry)} className="p-1.5 rounded-full" style={{ background: T.hoverBg }} title="삭제"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: T.hoverBg }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-0 overflow-hidden flex-1">
          <div className="md:w-1/2 overflow-y-auto custom-scrollbar shrink-0" style={{ background: T.bg, maxHeight: "100%" }}>
            {img ? <img src={img} alt={entry.title} className="w-full" /> : <div className="p-10 text-center text-sm" style={{ color: T.textDim }}>이미지 없음</div>}
          </div>
          <div className="md:w-1/2 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {!entry.isAnalyzed ? (
              <div className="text-sm" style={{ color: T.textMuted }}>아직 분석되지 않았습니다. 우측 상단 <Sparkles className="w-3.5 h-3.5 inline" style={{ color }} /> 으로 분석을 실행하세요.</div>
            ) : (
              <>
                {entry.summary && <Field label="요약" T={T}>{entry.summary}</Field>}
                {entry.styleTraits?.length > 0 && (
                  <Field label="스타일·모티프" T={T}>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.styleTraits.map((t, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{t}</span>)}
                    </div>
                  </Field>
                )}
                {entry.colorPalette?.length > 0 && (
                  <Field label="컬러" T={T}>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.colorPalette.map((c, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ background: T.bg, color: T.textMuted }}>{c}</span>)}
                    </div>
                  </Field>
                )}
                {entry.layoutPattern && <Field label="레이아웃" T={T}>{entry.layoutPattern}</Field>}
                {entry.copyTone && <Field label="카피 톤" T={T}>{entry.copyTone}</Field>}
                {date && <Field label="기간" T={T}>{date}</Field>}
                {entry.tags?.length > 0 && (
                  <Field label="태그" T={T}>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags.map((t, i) => <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ background: T.bg, color: T.textMuted }}>#{t}</span>)}
                    </div>
                  </Field>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
