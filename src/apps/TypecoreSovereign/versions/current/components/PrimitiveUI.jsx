/* eslint-disable */
// current 버전 전용 PrimitiveUI: SectionHeader, DropdownControl, OptionGroupCard.
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
        <div className="nx-popover-panel absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto z-[9999] custom-scrollbar py-1">
          {data.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} title={opt.en} className={`nx-popover-item ${value === opt.id ? 'is-active' : ''}`}>
              <span>{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const OptionGroupCard = ({ id, title, icon, summary, children, openCardId, onToggle }) => {
  const isOpen = openCardId === id;
  return (
    <div className={`rounded-[10px] border shadow-sm mb-3 transition-all duration-300 relative hover:z-[100] focus-within:z-[100] ${isOpen ? 'z-40 border-indigo-500/30 bg-[#16161E]' : 'z-10 border-zinc-800/80 bg-[#121212] hover:border-zinc-700'}`}>
      <button onClick={(e) => { e.preventDefault(); onToggle(id); }} className="w-full flex items-center justify-between p-4 transition-colors outline-none rounded-[10px] bg-transparent cursor-pointer">
        <div className="flex flex-col items-start gap-1 text-left flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 text-[12px] font-bold text-zinc-100 tracking-wide w-full">
            {icon} {title}
          </div>
          {!isOpen && summary && <div className="text-[11px] text-zinc-500 font-medium ml-6 truncate w-full">{summary}</div>}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-zinc-500'}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1500px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="px-4 pb-4">
          <div className={`pt-3 border-t space-y-4 ${isOpen ? 'border-indigo-500/20' : 'border-zinc-800/50'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
