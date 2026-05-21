/* eslint-disable */
// current 사이드바 생성 모드 입력 패널 (텍스트, 레퍼런스 업로드, 오라 정규화, 슬라이더).
import React from 'react';
import {
  Lock, ScanLine, Sparkles, X, Image as ImageIcon, Loader2, Cpu, Zap, Wand,
  SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { sliderDesc } from '../constants/utils.js';

const CreationPanel = ({
  inputText, setInputText,
  incomingFromArc, setIncomingFromArc,
  isAnalyzingCreation,
  creationUploadedImage, setCreationUploadedImage,
  isCreationDragging,
  handleCreationDragOver, handleCreationDragLeave, handleCreationDrop, handleCreationImageUpload,
  analyzeCreationImage,
  customDesignInjections, setCustomDesignInjections,
  hasKoreanAura,
  handleExpandIntent, isExpandingIntent,
  personaSliderValue, setPersonaSliderValue,
}) => (
  <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono"><Lock className="w-3 h-3" /> [L1] 텍스트 보존 락</div>
      <textarea
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        placeholder="텍스트 입력 (엔터로 줄바꿈)"
        rows={inputText.includes('\n') ? 2 : 1}
        className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[10px] px-4 py-3 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-inner resize-none custom-scrollbar font-mono ${inputText.includes('\n') || inputText.length > 10 ? 'text-[15px] leading-tight' : 'text-[20px] leading-tight'}`}
      />
    </div>

    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-between font-mono">
        <div className="flex items-center gap-1.5"><ScanLine className="w-3 h-3" /> [L3] 이미지 역설계 (레퍼런스 분석)</div>
      </div>
      {incomingFromArc && (
        <div className="mb-3 px-3 py-2 rounded-[8px] border border-[#6C5CE7]/40 bg-[#6C5CE7]/10 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-[#A29BFE] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[10px] font-bold text-[#A29BFE] tracking-wider uppercase">프롬프트 아크에서 전달됨</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {incomingFromArc.hasImage
                ? (isAnalyzingCreation ? '이미지 분석 중... 옵션 자동 설정' : '이미지 + 옵션 자동 설정 완료')
                : '이미지 로드 실패. 텍스트만 적용됨'}
            </div>
            {incomingFromArc.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {incomingFromArc.tags.slice(0, 6).map((t, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-zinc-300">#{t}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setIncomingFromArc(null)} className="text-zinc-500 hover:text-zinc-300 shrink-0" title="배지 닫기">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div
        onDragOver={handleCreationDragOver}
        onDragLeave={handleCreationDragLeave}
        onDrop={handleCreationDrop}
        className={`relative rounded-[10px] border border-dashed p-4 text-center transition-all flex flex-col items-center justify-center ${isCreationDragging ? 'bg-[#262626] border-emerald-500/50' : 'border-zinc-700/60 bg-[#121212] hover:bg-[#1A1A1A]'}`}
      >
        {creationUploadedImage ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <img src={creationUploadedImage} className="h-20 object-contain rounded-[6px] border border-zinc-700/50 shadow-md" />
            <div className="flex gap-2">
              <button onClick={() => analyzeCreationImage(creationUploadedImage)} disabled={isAnalyzingCreation} className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-[6px] flex items-center gap-1.5 transition-colors disabled:opacity-50">
                {isAnalyzingCreation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cpu className="w-3 h-3" />} 역설계 분석
              </button>
              <button onClick={() => setCreationUploadedImage(null)} className="text-[10px] font-bold text-red-400 hover:text-red-300 px-3 py-1.5 bg-red-500/10 rounded-[6px] transition-colors border border-red-500/20">제거</button>
            </div>
          </div>
        ) : (
          <div className="text-[11px] font-bold text-[#a6a6a6] flex flex-col items-center gap-2 py-2">
            <ImageIcon className="w-6 h-6 opacity-40 mb-1" />
            <span className="text-zinc-400 tracking-wider font-mono">REFERENCE UPLOAD</span>
            <span className="text-[9px] text-zinc-600 font-normal">레퍼런스 이미지 드래그 앤 드롭</span>
          </div>
        )}
        {!creationUploadedImage && <input type="file" onChange={handleCreationImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 font-mono"><Zap className="w-3 h-3" /> 조형 오라 정규화</div>
        <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections.trim()} title="자동 구체화" className={`p-1.5 rounded-[6px] transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
          {isExpandingIntent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand className="w-3 h-3" />}
        </button>
      </div>
      <textarea
        value={customDesignInjections}
        onChange={e => setCustomDesignInjections(e.target.value)}
        placeholder="역설계 분석 시 텍스트가 자동 생성됩니다. 직접 입력도 가능합니다."
        className={`mt-2 w-full bg-[#1C1C1C] text-[12px] p-4 rounded-[10px] border outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar tracking-tight placeholder:text-zinc-600 focus:ring-2 transition-all shadow-sm font-mono ${hasKoreanAura ? 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/20' : 'border-zinc-800 focus:border-emerald-500/50 focus:ring-emerald-500/10'}`}
      />
      {hasKoreanAura && (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400/90 font-bold bg-amber-500/10 p-2 rounded-[6px] border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>한글이 포함되어 있습니다. AI 최적화를 위해 마술봉 버튼을 눌러 영문으로 정규화하세요.</span>
        </div>
      )}

      <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-tighter">{sliderDesc.leftLabel}</span>
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
          <span className="text-[10px] font-bold text-emerald-500 font-mono tracking-tighter">{sliderDesc.rightLabel}</span>
        </div>
        <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
      </div>
    </div>
  </div>
);

export default CreationPanel;
