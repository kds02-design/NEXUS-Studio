/* eslint-disable */
// v2 전용 기본 UI 프리미티브 — SectionHeader / DropdownControl / OptionGroupCard.
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export const SectionHeader = ({ id, label, icon }) => (
    <div className="flex items-center gap-2 pl-1 text-[#a6a6a6] relative mt-4 first:mt-0 transition-all duration-700">
        {icon}
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">{String(id)}. {String(label)}</h3>
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
                    <p className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 text-[#a6a6a6]">
                        {icon} {String(label)}
                    </p>
                </div>
            )}
            <button onClick={(e) => { e.preventDefault(); if (!disabled) setIsOpen(!isOpen); }} title={String(selectedOption?.en)} className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] border transition-all bg-[#121212] border-zinc-700/60 hover:border-zinc-500 outline-none shadow-sm">
                <span className="text-[11px] font-bold truncate text-zinc-200">{String(selectedOption?.name || 'None')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            {isOpen && (
                <div className="absolute left-0 w-full mt-1 max-h-[250px] overflow-y-auto rounded-[8px] border backdrop-blur-xl z-[9999] shadow-2xl bg-[#1C1C1C] border-zinc-600 custom-scrollbar py-1">
                    {data.map(opt => (
                        <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} title={String(opt.en)} className={`px-3 py-2 mx-1 text-[11px] cursor-pointer rounded-[4px] transition-all group ${value === opt.id ? 'bg-indigo-500/15 text-indigo-300 font-bold border-l-[3px] border-indigo-500' : 'text-[#a6a6a6] hover:bg-[#262626] hover:text-zinc-100 border-l-[3px] border-transparent'}`}>
                            {String(opt.name)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const OptionGroupCard = ({ id, title, icon, summary, children, openCardId, onToggle }) => {
    const isOpen = openCardId === id;
    return (
        <div className={`rounded-[10px] border shadow-sm mb-3 transition-all duration-300 relative hover:z-[100] focus-within:z-[100] ${isOpen ? 'z-40 border-indigo-500/30 bg-[#16161E]' : 'z-10 border-zinc-800 bg-[#121212] hover:border-zinc-700'}`}>
            <button onClick={(e) => { e.preventDefault(); onToggle(id); }} className="w-full flex items-center justify-between p-3.5 transition-colors outline-none rounded-[10px] bg-transparent cursor-pointer">
                <div className="flex flex-col items-start gap-1 text-left flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200 tracking-wide w-full">
                        {icon} {String(title)}
                    </div>
                    {!isOpen && summary && <div className="text-[10px] text-[#a6a6a6] font-medium ml-6 truncate w-full">{String(summary)}</div>}
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-zinc-500'}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100 overflow-visible' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-4 pb-4">
                    <div className={`pt-3 border-t space-y-3 ${isOpen ? 'border-indigo-500/20' : 'border-zinc-800/50'}`}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
