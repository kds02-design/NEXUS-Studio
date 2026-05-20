import { CheckCircle } from "lucide-react";

// 단일 프리셋 카드 — RenderMatrix MatrixStyleCard 와 동일 디자인.
// active + isPresetModified 조합으로 ✅ 적용 중 / 'AMBER 수정됨' 표시.
export default function MatrixStyleCard({ preset, active, isPresetModified, onApply }) {
  const stateClass = active
    ? (isPresetModified
        ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
        : 'bg-emerald-950/20 border-emerald-500/40 shadow-sm')
    : 'bg-[#1A1A1E] hover:bg-zinc-800 border-zinc-800 hover:border-zinc-600 text-zinc-300';
  const titleClass = active
    ? (isPresetModified ? 'text-amber-400' : 'text-emerald-400')
    : 'text-white group-hover:text-emerald-400';
  return (
    <button onClick={() => onApply(preset)} className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group flex flex-col gap-0.5 ${stateClass}`}>
      <div className="flex items-center justify-between w-full">
        <span className={`text-[11px] font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${titleClass}`}>
          {active && !isPresetModified && <CheckCircle className="w-3.5 h-3.5" />}
          {preset.label}
        </span>
        {active && isPresetModified && (
          <span className="px-1.5 py-0.5 text-[8px] bg-amber-500/20 text-amber-400 rounded font-black border border-amber-500/30">수정됨</span>
        )}
      </div>
      <span className="text-[9px] text-zinc-500 truncate leading-snug w-full">
        {preset.description || "해당 모션 세팅 적용"}
      </span>
    </button>
  );
}
