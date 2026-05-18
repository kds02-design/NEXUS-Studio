// 공용 UI 컨트롤. 원본 index.jsx 의 ToggleControl / DropdownControl / PopoverSelect 를 그대로 이전.
// 여러 컴포넌트(사이드바, 폼)에서 재사용되므로 별도 모듈로 분리.

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Sparkle, Sparkle as SparkleIcon } from 'lucide-react';

export const ToggleControl = ({ label, enabled, onChange, theme, disabled = false }) => (
  <div onClick={() => !disabled && onChange()} className={`w-full flex items-center justify-between px-4 py-3 rounded-sm border transition-all ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'} ${theme === 'dark' ? 'bg-[#18181B] border-zinc-800 hover:border-[#76cee0]/50' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}>
    <span className={`text-[11px] font-bold transition-colors ${enabled ? (theme === 'dark' ? 'text-[#76cee0]' : 'text-[#76cee0]') : 'text-zinc-500'}`}>{label}</span>
    <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-[#76cee0]' : 'bg-zinc-700'}`}>
        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all`} style={{ left: enabled ? 'calc(100% - 14px)' : '2px' }} />
    </div>
  </div>
);

export const DropdownControl = ({ label, icon, data = [], value, onChange, theme, disabled = false, dynamicNames = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const toggleDropdown = () => !disabled && setIsOpen(!isOpen);

  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const combinedData = useMemo(() => {
      const safeData = data || [];
      if (!value) return safeData;
      const exists = safeData.find(o => o.id === value);
      if (exists) return safeData;
      const displayName = dynamicNames[value] ? dynamicNames[value] : value;
      return [{ id: value, name: `✨ ${displayName}`, en: value }, ...safeData];
  }, [data, value, dynamicNames]);

  const selectedOption = combinedData.find(o => o.id === value) || combinedData[0] || { name: 'Select' };

  return (
    <div className={`w-full space-y-1.5 relative transition-all ${disabled ? 'opacity-30 grayscale pointer-events-none' : ''}`} ref={containerRef}>
      {label && <p className="text-[10px] font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5 text-zinc-500">{icon} {label}</p>}
      <button onClick={toggleDropdown} className={`w-full flex items-center justify-between px-4 py-3 rounded-md border transition-all ${theme === 'dark' ? 'bg-[#111111] border-zinc-800 hover:border-[#76cee0]/50 text-zinc-200 shadow-inner' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'}`}>
        <div className="flex items-center gap-2 overflow-hidden">
            {selectedOption.hex && <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: selectedOption.hex, border: selectedOption.id === 'White' ? '1px solid #444' : 'none' }} />}
            <span className="text-[11px] truncate font-bold">{selectedOption.name}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 right-0 mt-2 z-[999]">
          <div className="max-h-[220px] overflow-y-auto custom-scrollbar py-1">
            {combinedData.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
                <span className="flex items-center gap-2">
                    {opt.hex && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.hex }} />}
                    <span>{opt.name}</span>
                </span>
                {value === opt.id && <Sparkle className="w-3.5 h-3.5 animate-pulse" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const PopoverSelect = ({ label, icon, value, options = [], onChange, highlight }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOption = options.find(o => o.id === value) || options[0] || {};
  let borderClass = "border-zinc-800";
  let bgClass = "bg-[#111111]";
  let textClass = "text-zinc-200";
  let labelClass = "text-[#65a3b3]";
  let iconClass = "text-[#65a3b3]";
  if (highlight === 'step') {
      borderClass = "border-zinc-800 hover:border-[#76cee0]/60";
      bgClass = "bg-[#111315]";
      textClass = "text-zinc-100";
  }

  return (
    <div className="w-full space-y-2 relative" ref={containerRef}>
      <div className={`flex items-center gap-2 mb-1 ${labelClass}`}>
        <span className={iconClass}>{icon}</span>
        <h3 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1">{label}</h3>
      </div>
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all shadow-inner ${bgClass} ${borderClass} ${textClass}`}>
        <div className="flex flex-col items-start text-left gap-0.5">
          <span className="text-[12px] font-bold">{selectedOption.name || selectedOption.label || ''}</span>
          {selectedOption.en && <span className="text-[9px] text-zinc-500 font-normal uppercase tracking-wider line-clamp-1">{selectedOption.en}</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 right-0 mt-2 z-[999]">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar py-1">
            {options.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
                <span className="flex flex-col gap-0.5 pr-4 text-left">
                  <span className={`text-[12px] font-bold`}>{opt.name || opt.label}</span>
                  {opt.en && <span className="text-[9px] opacity-60 leading-tight font-normal">{opt.en}</span>}
                </span>
                {value === opt.id && <SparkleIcon className="w-4 h-4 animate-pulse shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
