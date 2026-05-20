/* eslint-disable */
// v1 전용 작은 컨트롤 컴포넌트 모음 (격리 사본).
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, X, ChevronDown, Check } from 'lucide-react';
import { combineOptions } from '../constants/utils.js';

export const ToggleControl = ({ label, desc, enabled, onChange, colorClass = "bg-rose-500" }) => (
    <div onClick={onChange} className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${enabled ? `bg-zinc-900 border-zinc-700 shadow-inner` : `bg-[#18181B] border-zinc-800 hover:border-zinc-600`}`}>
        <div className="flex flex-col">
            <span className={`text-[11px] font-bold transition-colors ${enabled ? 'text-white' : 'text-zinc-300'}`}>{label}</span>
            {desc && <span className="text-[9px] text-zinc-500 mt-0.5">{desc}</span>}
        </div>
        <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? colorClass : 'bg-zinc-700'}`}>
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all shadow-sm`} style={{ left: enabled ? 'calc(100% - 14px)' : '2px' }} />
        </div>
    </div>
);

export const ImageDropzone = ({ image, onClear, onUpload, onDragOver, onDragLeave, onDrop, isDragging, title, sub, icon: Icon, heightClass = "h-36", isLoading = false }) => {
    return (
        <label
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (onDragOver) onDragOver(e); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (onDragLeave) onDragLeave(e); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (onDrop) onDrop(e); }}
            className={`relative border border-dashed rounded-xl flex-1 flex flex-col items-center justify-center transition-all overflow-hidden group cursor-pointer ${heightClass} ${isDragging ? `border-pink-500 bg-pink-500/10` : `border-zinc-700/50 bg-[#18181B] hover:border-zinc-500`}`}
        >
            {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">분석 중...</span>
                </div>
            )}
            {image ? (
                <div className="relative w-full h-full p-2 flex flex-col items-center justify-center group-hover:opacity-90 transition-all">
                    <img src={image} className="w-full h-full object-contain drop-shadow-xl pointer-events-none" alt="Source" />
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(e); }} className={`absolute top-2 right-2 bg-black/80 hover:bg-zinc-800 text-white p-1.5 rounded-sm backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md z-30`}><X className="w-3 h-3" /></button>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 opacity-40 pointer-events-none">
                    <Icon className={`w-6 h-6 text-zinc-500`} />
                    <div className="text-center">
                        <p className="text-[9px] font-bold tracking-tight text-center leading-snug text-zinc-400">{title}</p>
                        {sub && <p className="text-[8px] text-zinc-500 mt-0.5">{sub}</p>}
                    </div>
                </div>
            )}
            {!image && <input type="file" onChange={onUpload} className="hidden" accept="image/*" disabled={isLoading} />}
        </label>
    );
};

export const DropdownControl = ({ label, icon, data = [], value, onChange, disabled = false, dynamicNames = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const combinedData = useMemo(() => combineOptions(data, value, dynamicNames), [data, value, dynamicNames]);
    const selectedOption = combinedData.find(o => o.id === value) || combinedData[0];

    return (
        <div className={`w-full space-y-1.5 relative ${disabled ? 'opacity-40 pointer-events-none' : ''}`} ref={containerRef}>
            {label && <p className="text-[10px] font-bold uppercase tracking-widest pl-1 flex items-center gap-1.5 text-zinc-400">{icon} {label}</p>}
            <button onClick={() => !disabled && setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-[#18181B] text-zinc-200 outline-none ${isOpen ? 'border-pink-500' : 'border-zinc-800 hover:border-zinc-600'}`}>
                <span className="text-[11px] truncate font-bold">{selectedOption.name}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute left-0 right-0 mt-2 rounded-xl border z-[999] bg-[#121214] border-zinc-700 shadow-2xl`}>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar py-1">
                        {combinedData.map(opt => (
                            <div key={opt.id} onClick={() => { onChange(opt.id); setIsOpen(false); }} className={`px-4 py-3 text-[11px] cursor-pointer hover:bg-zinc-800 transition-colors flex justify-between ${value === opt.id ? 'text-pink-400 font-bold' : 'text-zinc-400'}`}>
                                {opt.name} {value === opt.id && <Check className="w-3.5 h-3.5" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ScoreBar = ({ label, score, colorClass }) => (
    <div className="flex flex-col gap-1 w-full">
        <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-zinc-400">{label}</span>
            <span className={score >= 90 ? "text-pink-400" : score >= 70 ? "text-amber-400" : "text-rose-400"}>{score}</span>
        </div>
        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${score}%` }} />
        </div>
    </div>
);
