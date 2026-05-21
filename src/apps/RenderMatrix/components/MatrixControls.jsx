import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { combineOptions } from "../constants/presets";

// 드롭다운 선택 컨트롤. recommendedId 가 있으면 ★ 추천 배지를 트리거 + 항목에 표시.
export const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false, dynamicNames = {}, recommendedId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const combinedData = useMemo(() => combineOptions(data, value, dynamicNames), [data, value, dynamicNames]);
  const selectedOption = combinedData.find(o => o.id === value) || combinedData[0];
  const hasUnpickedRec = recommendedId && recommendedId !== value && combinedData.some(o => o.id === recommendedId);
  return (
    <div className={`w-full space-y-1.5 relative ${disabled ? 'opacity-40 pointer-events-none' : ''}`} ref={containerRef}>
      {label && <p className="text-[10px] font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5 text-zinc-400">{icon} {label}</p>}
      <button onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-[#18181B] text-zinc-200 outline-none ${isOpen ? 'border-indigo-500' : hasUnpickedRec ? 'border-[#A29BFE]/60 ring-1 ring-[#A29BFE]/40' : 'border-zinc-800 hover:border-zinc-600'}`}>
        <span className="text-[11px] truncate font-bold flex items-center gap-1.5">
          {hasUnpickedRec && <span className="text-[#A29BFE] text-[10px]" title="프롬프트 아크에서 추천된 옵션이 있어요">★</span>}
          {selectedOption?.name}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border z-[999] bg-[#121214] border-zinc-700 shadow-2xl">
          <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1">
            {combinedData.map(opt => {
              const isSelected = value === opt.id;
              const isRecommended = recommendedId === opt.id;
              return (
                <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`px-4 py-3 text-[11px] cursor-pointer hover:bg-zinc-800 transition-colors flex justify-between items-center ${isSelected ? 'text-blue-400 font-bold' : isRecommended ? 'text-[#A29BFE]' : 'text-zinc-400'}`}>
                  <span className="flex items-center gap-1.5">
                    {isRecommended && !isSelected && <span className="text-[10px]" title="프롬프트 아크 추천">★</span>}
                    {opt.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {!isSelected && isRecommended && <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#A29BFE]/15 text-[#A29BFE] uppercase">추천</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// On/Off 토글 + 설명. enabled 시 colorClass 색이 적용된다.
export const ToggleControl = ({ label, desc, enabled, onChange, colorClass = "bg-blue-600" }) => (
  <div onClick={onChange} className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${enabled ? `bg-zinc-900 border-zinc-700 shadow-inner` : `bg-[#18181B] border-zinc-800 hover:border-zinc-600`}`}>
    <div className="flex flex-col pr-4">
      <span className={`text-[11px] font-bold transition-colors ${enabled ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
      {desc && <span className="text-[9px] text-zinc-500 mt-0.5 whitespace-pre-wrap">{desc}</span>}
    </div>
    <div className={`w-8 h-4 rounded-full shrink-0 relative transition-colors ${enabled ? colorClass : 'bg-zinc-700'}`}>
      <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all shadow-sm" style={{ left: enabled ? 'calc(100% - 14px)' : '2px' }} />
    </div>
  </div>
);

// 0~100 점수 막대. ≥90 emerald / ≥70 amber / <70 rose.
export const ScoreBar = ({ label, score, colorClass }) => (
  <div className="flex flex-col gap-1 w-full">
    <div className="flex justify-between items-center text-[10px] font-bold">
      <span className="text-zinc-400">{label}</span>
      <span className={score >= 90 ? "text-emerald-300/80" : score >= 70 ? "text-amber-300/80" : "text-rose-300/80"}>{score}</span>
    </div>
    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${score}%` }} />
    </div>
  </div>
);
