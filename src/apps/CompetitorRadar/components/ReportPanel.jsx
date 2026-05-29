import { useMemo, useState } from "react";
import { X, FileText, Loader2, Trash2 } from "lucide-react";
import { useTheme } from "../../../context/GlobalContext";

const MODES = [
  { id: "new", label: "신규만" },
  { id: "7d", label: "최근 7일" },
  { id: "30d", label: "최근 30일" },
  { id: "all", label: "전체" },
];

const withinDays = (iso, days) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !isNaN(t) && (Date.now() - t) <= days * 86400000;
};

export default function ReportPanel({ reports, entries, color, generating, onGenerate, onClose, onDeleteReport }) {
  const T = useTheme();
  const [mode, setMode] = useState("7d");
  const [openId, setOpenId] = useState(reports[0]?.id || null);

  const candidates = useMemo(() => {
    if (mode === "new") return entries.filter(e => e.isNew && e.isAnalyzed);
    if (mode === "7d") return entries.filter(e => e.isAnalyzed && withinDays(e.capturedAt, 7));
    if (mode === "30d") return entries.filter(e => e.isAnalyzed && withinDays(e.capturedAt, 30));
    return entries.filter(e => e.isAnalyzed);
  }, [entries, mode]);

  const openReport = reports.find(r => r.id === openId) || reports[0];

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-xl h-full overflow-y-auto custom-scrollbar p-6"
        style={{ background: T.surface, borderLeft: `1px solid ${T.border}`, color: T.text }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-base font-bold"><FileText className="w-4 h-4" style={{ color }} /> 트렌드 리포트</div>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: T.hoverBg }}><X className="w-4 h-4" /></button>
        </div>

        <div className="rounded-xl p-4 mb-5" style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.textMuted }}>새 리포트 생성</div>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors"
                style={mode === m.id ? { background: `${color}22`, color, border: `1px solid ${color}66` } : { background: T.bg, color: T.textMuted, border: `1px solid ${T.border}` }}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => onGenerate(candidates, MODES.find(m => m.id === mode)?.label)} disabled={generating || candidates.length === 0}
            className="w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: color, color: "#fff", opacity: (generating || candidates.length === 0) ? 0.4 : 1 }}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중…</> : `분석된 ${candidates.length}건으로 리포트 생성`}
          </button>
          {candidates.length === 0 && <p className="text-[10px] mt-2" style={{ color: T.textDim }}>해당 기간에 분석 완료된 항목이 없습니다.</p>}
        </div>

        {reports.length > 0 && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {reports.slice(0, 8).map(r => (
              <button key={r.id} onClick={() => setOpenId(r.id)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors"
                style={openReport?.id === r.id ? { background: `${color}22`, color } : { background: T.bg, color: T.textMuted }}>
                {new Date(r.generatedAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
              </button>
            ))}
          </div>
        )}

        {openReport ? (
          <div className="rounded-xl p-4" style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px]" style={{ color: T.textDim }}>{new Date(openReport.generatedAt).toLocaleString("ko-KR")} · {openReport.entryIds?.length || 0}건</span>
              <button onClick={() => onDeleteReport(openReport.id)} className="p-1 rounded" style={{ background: T.hoverBg }}><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
            <pre className="text-[12px] whitespace-pre-wrap leading-relaxed font-sans" style={{ color: T.text }}>{openReport.markdown}</pre>
          </div>
        ) : (
          <div className="text-center text-sm py-10" style={{ color: T.textDim }}>아직 생성된 리포트가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
