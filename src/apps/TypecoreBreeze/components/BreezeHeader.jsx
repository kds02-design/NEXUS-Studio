import { ChevronDown, Star, MessageSquare, Wand2 as Wand2Icon, Loader2, Image as ImageIcon, X, ScanLine } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';
import { directorPersonas, sliderDesc } from '../constants/categories.jsx';
import { Tooltip } from './ui.jsx';

// CREATION 뷰의 좌측 사이드바 상단 — Director Persona 선택 + 입력 폼 + 레퍼런스 이미지 업로드
export default function BreezeHeader() {
  const {
    aiPersona, setAiPersona, personaDropdownOpen, setPersonaDropdownOpen,
    selectedCategory,
    inputText, setInputText,
    customDesignInjections, setCustomDesignInjections,
    personaSliderValue, setPersonaSliderValue,
    isExpandingIntent, handleExpandIntent, openTuningRoom,
    styleImage, setStyleImage,
    isStyleDragging, isAnalyzingStyle, analyzeStyleImage,
    handleStyleDragOver, handleStyleDragLeave, handleStyleDrop, handleStyleImageUpload,
  } = useBreeze();

  const activePersona = directorPersonas.find(p => p.id === aiPersona);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Director Persona</h3>
        </div>
        <div className="relative">
          <button onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)} className="w-full flex items-center justify-between p-3.5 rounded-xl border border-zinc-700/80 bg-[#16161D] hover:border-zinc-600 transition-all text-left">
            <div className="flex items-center gap-3">
              <div className="text-zinc-400 bg-zinc-800 p-2 rounded-md">{activePersona?.icon || <Star className="w-4 h-4" />}</div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-bold text-zinc-200 truncate">{activePersona?.shortTitle || "Select Persona"}</div>
                <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{activePersona?.subtitle || "..."}</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {personaDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-[1000] flex flex-col max-h-[300px] overflow-y-auto custom-scrollbar">
              {directorPersonas.filter(p => p.category === selectedCategory).map(p => (
                <button key={p.id} onClick={() => { setAiPersona(p.id); setPersonaDropdownOpen(false); }} className={`w-full text-left p-3.5 flex items-center gap-3 transition-all ${aiPersona === p.id ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}>
                  <div className={`p-2 rounded-md ${aiPersona === p.id ? 'bg-white text-black' : 'bg-[#111] text-zinc-500'}`}>{p.icon}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className={`text-[11px] font-bold truncate ${aiPersona === p.id ? 'text-white' : 'text-zinc-300'}`}>{p.shortTitle}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5 truncate">{p.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <hr className="border-zinc-800/80" />

      <div className="rounded-xl border border-[#D4AF37]/30 bg-[#16161D]/40 p-5 space-y-6 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1.5">Subject Text</div>
            <input value={inputText} onChange={e => setInputText(e.target.value)} className="w-full bg-transparent border-b border-zinc-600 focus:border-[#D4AF37] text-[20px] font-bold outline-none pb-2 text-zinc-100 transition-colors" placeholder="Enter text..." />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase text-violet-400">Design Aura</div>
              <div className="flex gap-1.5">
                <Tooltip text="AI 튜닝 어시스턴트">
                  <button onClick={openTuningRoom} disabled={!customDesignInjections.trim()} className={`w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${!customDesignInjections.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-900/50 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/50'}`}><MessageSquare className="w-3 h-3" /></button>
                </Tooltip>
                <Tooltip text="키워드 상세 구체화">
                  <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} className={`w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isExpandingIntent ? 'bg-violet-600 text-white' : (!customDesignInjections.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-900/50 text-violet-300 hover:bg-violet-600 hover:text-white border border-violet-500/50')}`}>{isExpandingIntent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2Icon className="w-3 h-3" />}</button>
                </Tooltip>
              </div>
            </div>
            <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="e.g. Minimalist, bouncy..." className="w-full bg-[#1A1A24] border border-violet-500/30 text-[11px] rounded-md p-3 outline-none min-h-[4rem] resize-none text-violet-100 custom-scrollbar focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-zinc-600" />

            <div className="mt-3 px-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-bold text-zinc-500">{sliderDesc.leftLabel}</span>
                <span className="text-[9px] font-bold text-zinc-500">{sliderDesc.rightLabel}</span>
              </div>
              <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:rounded-full" />
            </div>
          </div>
        </div>

        <hr className="border-zinc-700/50" />

        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase text-zinc-400">Reference Style (I2P)</div>
          <div onDragOver={handleStyleDragOver} onDragLeave={handleStyleDragLeave} onDrop={handleStyleDrop} className={`relative rounded-xl border-2 border-dashed p-4 transition-all flex flex-col items-center justify-center min-h-[90px] ${isStyleDragging ? 'border-violet-500 bg-violet-900/20' : 'border-zinc-700 bg-[#111111] hover:border-zinc-500'}`}>
            {styleImage ? (
              <div className="w-full space-y-3">
                <div className="relative group mx-auto w-max">
                  <img src={styleImage} className="h-14 object-cover rounded border border-zinc-600" />
                  <button onClick={() => setStyleImage(null)} className="absolute -top-1 -right-1 p-1 bg-black/80 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3 text-zinc-300" /></button>
                </div>
                <button onClick={analyzeStyleImage} disabled={isAnalyzingStyle} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                  {isAnalyzingStyle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />} Extract Style
                </button>
              </div>
            ) : (
              <div className="text-center pointer-events-none">
                <ImageIcon className="w-4 h-4 text-zinc-500 mx-auto mb-1.5" />
                <div className="text-[10px] text-zinc-400">Drop style reference here</div>
              </div>
            )}
            {!styleImage && <input type="file" accept="image/*" onChange={handleStyleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />}
          </div>
        </div>
      </div>
    </>
  );
}
