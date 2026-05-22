/* eslint-disable */
// current 사이드바 편집 모드 입력 패널 (타겟 이미지, 리터칭 오라, 슬라이더, 셋업 토글).
import React from 'react';
import {
  Lock, Image as ImageIcon, X, AlertCircle, Brush, MessageSquare, Sparkles as SparkleIcon,
  Loader2, SlidersHorizontal, Bot, Wand
} from 'lucide-react';
import { sliderDesc } from '../constants/utils.js';

const EditPanel = ({
  editUploadedImage, setEditUploadedImage,
  isDragging,
  handleDragOver, handleDragLeave, handleEditDrop, handleEditImageUpload,
  editInstruction, setEditInstruction,
  hasKoreanEdit,
  openEditTuningRoom,
  handleEditExpandIntent, isEditExpandingIntent,
  personaSliderValue, setPersonaSliderValue,
  applyAiRecInEdit, setApplyAiRecInEdit,
  applyAutoRefine, setApplyAutoRefine,
}) => (
  <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
    <div>
      <div className="mb-2 text-[11px] font-bold tracking-wide text-zinc-500 flex items-center gap-1.5"><Lock className="w-3 h-3" /> 타겟 형태 보존</div>
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleEditDrop} className={`relative rounded-[10px] border border-dashed border-zinc-700/60 p-5 text-center transition-all min-h-[130px] flex flex-col items-center justify-center ${isDragging ? 'bg-[#262626] border-emerald-500/50' : 'bg-[#121212] hover:bg-[#1A1A1A]'}`}>
        {editUploadedImage ? (
          <div className="flex flex-col items-center justify-center w-full gap-3">
            <img src={editUploadedImage} className="h-20 object-contain rounded-[6px] border border-zinc-700/50 shadow-md" />
            <button onClick={() => setEditUploadedImage(null)} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-full transition-colors border border-red-500/20"><X className="w-3 h-3" /> 제거</button>
          </div>
        ) : (
          <div className="text-[12px] font-bold text-[#a6a6a6] flex flex-col items-center gap-2">
            <ImageIcon className="w-7 h-7 opacity-40 mb-1" />
            <span className="text-zinc-400 font-sans">TARGET UPLOAD</span>
            <span className="text-[10px] text-zinc-600 font-normal">95% 실루엣 보존 락 활성화됨</span>
          </div>
        )}
        {!editUploadedImage && <input type="file" title="" onChange={handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />}
      </div>
      {!editUploadedImage && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[12px] bg-[#121212]/60 backdrop-blur-[2px]">
          <div className="bg-[#1C1C1C] px-4 py-2 rounded-[8px] border border-emerald-500/30 flex items-center gap-2 shadow-2xl">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-[12px] font-bold text-emerald-300">기준 이미지가 필요합니다</span>
          </div>
        </div>
      )}
    </div>

    <div className={`transition-all duration-300 relative ${!editUploadedImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold tracking-wide text-zinc-500 flex items-center gap-1.5"><Brush className="w-3 h-3" /> 마이크로 리터칭 오라</div>
        <div className="flex gap-1.5">
          <button onClick={openEditTuningRoom} disabled={!editInstruction.trim()} title="튜닝룸" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${!editInstruction.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction.trim()} title="자동 구체화" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
            {isEditExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="리터칭 방향 입력 후 마술봉 버튼을 눌러 영문으로 변환하세요." className={`w-full bg-[#1C1C1C] text-[12px] tracking-tight p-4 rounded-[10px] border outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600 focus:ring-2 transition-all shadow-sm font-sans ${hasKoreanEdit ? 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500/20' : 'border-zinc-800 focus:border-emerald-500/50 focus:ring-emerald-500/10'}`} />
      {hasKoreanEdit && (
        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-amber-400/90 font-bold bg-amber-500/10 p-2 rounded-[6px] border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>한글이 포함되어 있습니다. AI 최적화를 위해 마술봉 버튼을 눌러 영문으로 정규화하세요.</span>
        </div>
      )}

      <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[9px] font-bold text-zinc-500 font-sans tracking-tighter">{sliderDesc.leftLabel}</span>
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
          <span className="text-[9px] font-bold text-emerald-500 font-sans tracking-tighter">{sliderDesc.rightLabel}</span>
        </div>
        <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
          <div className="flex items-center gap-2">
            <Bot className={`w-4 h-4 ${applyAiRecInEdit ? 'text-indigo-400' : 'text-zinc-600'}`} />
            <span className={`text-[12px] font-bold tracking-wide ${applyAiRecInEdit ? 'text-indigo-300' : 'text-zinc-500'}`}>AI 조형 셋업</span>
          </div>
          <button onClick={() => setApplyAiRecInEdit(!applyAiRecInEdit)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAiRecInEdit ? 'bg-indigo-500' : 'bg-[#121212] border border-zinc-800'}`}>
            <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAiRecInEdit ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
          <div className="flex items-center gap-2">
            <Wand className={`w-4 h-4 ${applyAutoRefine ? 'text-emerald-400' : 'text-zinc-600'}`} />
            <span className={`text-[12px] font-bold tracking-wide font-sans ${applyAutoRefine ? 'text-emerald-300' : 'text-zinc-500'}`}>Sketch Normalization</span>
          </div>
          <button onClick={() => setApplyAutoRefine(!applyAutoRefine)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAutoRefine ? 'bg-emerald-500' : 'bg-[#121212] border border-zinc-800'}`}>
            <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAutoRefine ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default EditPanel;
