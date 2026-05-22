/* eslint-disable */
// current 버전 전용 PrimitiveUI: SectionHeader, DropdownControl, OptionGroupCard.
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const SectionHeader = ({ id, label, icon }) => (
  <div className="flex items-center gap-2 pl-1 text-[#a6a6a6] relative mt-4 first:mt-0 transition-all duration-700">
    {icon}
    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6]">{id} {label}</h3>
  </div>
);

export const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = data.find(o => o.id === value) || data[0] || { name: 'None', en: '' };

  return (
    <div className={`space-y-1.5 relative transition-all duration-300 ${disabled ? 'opacity-40 grayscale pointer-events-none' : ''} ${isOpen ? 'z-[9999]' : 'z-10'}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between pl-1">
          <p className="text-[11px] font-bold tracking-tight flex items-center gap-1.5 text-zinc-400">
            {icon} {label}
          </p>
        </div>
      )}
      <button onClick={(e) => { e.preventDefault(); if (!disabled) setIsOpen(!isOpen); }} title={selectedOption?.en} className="w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] border transition-all bg-[#0A0A0A] border-zinc-800 hover:border-zinc-600 outline-none shadow-sm">
        <span className="text-[12px] font-bold truncate text-zinc-200 tracking-tight">{selectedOption?.name || 'None'}</span>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </button>
      {isOpen && (
        <div className="nx-popover-panel absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto z-[9999] custom-scrollbar">
          {data.map(opt => {
            const isActive = value === opt.id;
            // 영문 부제 — 'AAA Game Title Logo' 같은 풀 영문은 길어서 한 줄 라벨에 부담.
            // 첫 단어(또는 짧은 phrase) 만 노출하고 풀버전은 title 로 호버 시 표시.
            const subFull = opt.en || '';
            const subShort = subFull.length > 0 && subFull.length <= 24 ? subFull : '';
            return (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                title={subFull}
                className={`nx-popover-item ${isActive ? 'is-active' : ''}`}
              >
                <span className={`nx-popover-check ${isActive ? '' : 'is-hidden'}`}>
                  <Check className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 truncate">
                  {opt.name}
                  {subShort && <span className="nx-popover-sub">({subShort})</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// `number` prop 으로 카드 좌상단 1~6 뱃지를 표시한다 (와이어프레임 패턴).
// `summaryLines` 는 ["림라이트", "강도: Medium"] 처럼 2줄 요약을 줄 수 있다 (없으면 `summary` 한 줄 사용).
// 펼치면 grid 안에서 가로 2칸을 차지해 다른 카드들이 깨지지 않도록 `col-span-2` 가 자동 적용된다.
export const OptionGroupCard = ({ id, number, title, icon, summary, summaryLines, children, openCardId, onToggle }) => {
  const isOpen = openCardId === id;
  return (
    <div className={`rounded-[12px] border shadow-md transition-all duration-300 relative hover:z-[100] focus-within:z-[100] ${isOpen ? 'z-40 border-zinc-600 bg-[#1A1A1F] col-span-2 shadow-black/30' : 'z-10 border-zinc-800/80 bg-[#121212] hover:border-zinc-700 hover:bg-[#161616]'}`}>
      <button onClick={(e) => { e.preventDefault(); onToggle(id); }} className="w-full flex items-start justify-between p-4 transition-colors outline-none rounded-[12px] bg-transparent cursor-pointer">
        <div className="flex flex-col items-start gap-2 text-left flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 w-full">
            {number !== undefined && (
              <span className={`text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isOpen ? 'bg-white/10 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                {number}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-100 tracking-wide flex-1 min-w-0 truncate">
              {icon} {title}
            </div>
          </div>
          {!isOpen && (summaryLines || summary) && (
            <div className="text-[11px] leading-tight text-zinc-500 font-medium pl-7 w-full min-w-0">
              {summaryLines
                ? summaryLines.map((line, i) => (
                    <div key={i} className={`truncate ${i === 0 ? 'text-zinc-400' : 'text-zinc-500 mt-0.5'}`}>{line}</div>
                  ))
                : <div className="truncate">{summary}</div>}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 mt-0.5 ${isOpen ? 'rotate-180 text-white' : 'text-zinc-500'}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-4 pb-4">
          <div className={`pt-3 border-t space-y-4 ${isOpen ? 'border-zinc-700/50' : 'border-zinc-800/50'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
