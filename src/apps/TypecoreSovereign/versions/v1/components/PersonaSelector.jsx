/* eslint-disable */
// v1 전용 페르소나 선택 드롭다운 — Create / Edit 사이드바에서 공통 사용.
import React from 'react';
import { Crown, ChevronDown } from 'lucide-react';
import { directorPersonas } from '../constants/personas.jsx';

const PersonaSelector = ({ aiPersona, setAiPersona, personaDropdownOpen, setPersonaDropdownOpen }) => {
    return (
        <div className="mb-2 shrink-0">
            <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5" /> AI Director Persona
                </h3>
            </div>
            <div className={`relative ${personaDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-4 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left shadow-sm focus:border-indigo-500/50">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 opacity-80">{directorPersonas.find(p => p.id === aiPersona)?.icon}</div>
                        <div>
                            <div className="text-[12px] font-bold text-zinc-200">{directorPersonas.find(p => p.id === aiPersona)?.shortTitle}</div>
                        </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {personaDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                        {directorPersonas.map(p => (
                            <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-4 flex items-start gap-3 transition-all ${aiPersona === p.id ? 'border-l-[3px] border-indigo-400 bg-indigo-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                                <div className="mt-0.5 opacity-80">{p.icon}</div>
                                <div className="flex-1">
                                    <div className={`text-[11px] font-bold flex items-center justify-between ${aiPersona === p.id ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>
                                        {p.shortTitle}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-1">{p.subtitle}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonaSelector;
