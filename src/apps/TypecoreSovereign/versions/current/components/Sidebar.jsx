/* eslint-disable */
// current 사이드바 — v2 레이아웃 포팅.
// 격리 원칙: versions/current/ 외부 모듈은 사용하지 않음. v2 의 데이터/구조만 베껴와 current 훅에 매핑.
//
// 매핑:
//   v2 directorPersonas → current coreArchetypes
//   v2 aiPersona/setAiPersona/personaDropdownOpen/setPersonaDropdownOpen
//     → current coreArchetype/setCoreArchetype/coreDropdownOpen/setCoreDropdownOpen
//   v2 scriptType/handleScriptPresetChange → current scriptType/handleScriptPresetChange (신규 추가)
//
// v2 에는 있지만 current 훅이 미지원이라 생략한 항목:
//   - 무드 이미지 분석 버튼 (moodImageRef + handleMoodImageUpload + isAnalyzingMood)
//   - 레퍼런스 구조 추출 버튼 (referenceExtractRef + handleReferenceExtraction + isExtractingReference)
//   - AI 스마트 셋업 버튼 (handleAiRecommendation)
import React, { useRef } from 'react';
import {
  Command, LayoutTemplate, Anchor, Brush, Settings, Activity, Sparkles, Sparkles as SparkleIcon,
  ChevronDown, Wand, FastForward, Loader2, X, FileUp, RefreshCcw,
  Image as ImageIcon, Box as BoxIcon, Highlighter, Bot, Layers3,
  MessageSquare, Edit3, SlidersHorizontal, Crown, AlertCircle, PenTool,
} from 'lucide-react';
import { DropdownControl, OptionGroupCard, SectionHeader } from './PrimitiveUI.jsx';
import { coreArchetypes } from '../constants/personas.jsx';
import { staticOptions } from '../constants/options.js';
import { getOptionName, sliderDesc } from '../constants/utils.js';

const Sidebar = ({ rp, version, setVersion, versions }) => {
  // 파일 input ref — edit 이미지 업로드 트리거. current 훅에 ref 가 없어 로컬에서 관리.
  const editImageRef = useRef(null);

  const {
    isSidebarOpen, isEditMode, setCurrentView,
    coreArchetype, setCoreArchetype, coreDropdownOpen, setCoreDropdownOpen,
    inputText, setInputText, customDesignInjections, setCustomDesignInjections,
    openTuningRoom, openEditTuningRoom, handleExpandIntent, isExpandingIntent,
    personaSliderValue, setPersonaSliderValue,
    editUploadedImage, setEditUploadedImage, handleEditImageUpload,
    isDragging, handleDragOver, handleDragLeave, handleEditDrop,
    editInstruction, setEditInstruction, isEditExpandingIntent, handleEditExpandIntent,
    applyAiRecInEdit, setApplyAiRecInEdit, applyAutoRefine, setApplyAutoRefine,
    setIsImportModalOpen, handleReset, aiRecSummary,
    dynamicOptions, scriptType, handleScriptPresetChange,
    isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled,
    editOpenCardId, handleEditToggleCard, openCardId, handleToggleCard,
    editStrokeMod, setEditStrokeMod, editElementMod, setEditElementMod, editSurfaceMod, setEditSurfaceMod,
    aspectRatio, setAspectRatio, occupancy, setOccupancy, layoutType, setLayoutType,
    layoutPreset, setLayoutPreset, subTitleSize, setSubTitleSize,
    mmoSilhouetteFraming, setMmoSilhouetteFraming, handleLayoutPresetChange,
    terminalStyle, setTerminalStyle, strokeSharpness, setStrokeSharpness,
    slicingIntensity, setSlicingIntensity, cornerStyle, setCornerStyle,
    letterConnection, setLetterConnection, kerning, setKerning,
    internalSpace, setInternalSpace, logoDegree, setLogoDegree,
    kineticVelocity, setKineticVelocity, slantAngle, setSlantAngle,
    baseStyle, setBaseStyle, deformationDamage, setDeformationDamage,
    mmoSurroundingElement, setMmoSurroundingElement,
    isEnhanceModeEnabled, setIsEnhanceModeEnabled,
    enhanceMode, setEnhanceMode, momentumActive, setMomentumActive,
  } = rp;

  if (!isSidebarOpen) {
    return <aside className="w-0 border-none opacity-0 m-0 p-0 shrink-0 bg-transparent rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 z-50" />;
  }

  const activePersona = coreArchetypes.find(p => p.id === coreArchetype);

  return (
    <aside className="w-[380px] shrink-0 border border-zinc-800/80 bg-[#141414] rounded-[16px] flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 z-50">
      {/* === 상단 헤더 — 생성/리터칭 토글 === */}
      <div className="shrink-0 z-20 border-b border-zinc-800/80 bg-[#1A1A1A]">
        <div className="p-4 space-y-3">
          <div className="flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] bg-[#2C2C2C] transition-all duration-300 ${!isEditMode ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
            <button onClick={() => setCurrentView('editor')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${!isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <PenTool className="w-3.5 h-3.5 shrink-0" /> <span>생성 어셈블리</span>
            </button>
            <button onClick={() => setCurrentView('edit')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Edit3 className="w-3.5 h-3.5 shrink-0" /> <span>마이크로 리터칭</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

        {/* 1. AI Director Persona — 드롭다운 */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" /> AI Director Persona
            </h3>
          </div>
          <div className={`relative ${coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
            <button onClick={() => setCoreDropdownOpen(!coreDropdownOpen)} className="w-full flex items-center justify-between p-4 rounded-[12px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left shadow-sm focus:border-indigo-500/50 outline-none">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 opacity-80">{activePersona?.icon}</div>
                <div>
                  <div className="text-[12px] font-bold text-zinc-200">{activePersona?.shortTitle}</div>
                  {activePersona?.subtitle && <div className="text-[10px] text-zinc-500 mt-1">{activePersona.subtitle}</div>}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${coreDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {coreDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[12px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                {coreArchetypes.map(p => (
                  <button key={p.id} onClick={() => { setCoreArchetype(p.id); setCoreDropdownOpen(false); }} className={`w-full text-left p-4 flex items-start gap-3 transition-all ${coreArchetype === p.id ? 'border-l-[3px] border-emerald-400 bg-emerald-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                    <div className="mt-0.5 opacity-80">{p.icon}</div>
                    <div className="flex-1">
                      <div className={`text-[11px] font-bold flex items-center justify-between ${coreArchetype === p.id ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>{p.shortTitle}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{p.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. Specific Inputs (Creation vs Edit) */}
        {!isEditMode ? (
          <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Command className="w-3 h-3" /> Subject Text</div>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="텍스트 입력 (엔터로 줄바꿈)" rows={inputText.includes('\n') ? 2 : 1} className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[10px] px-4 py-3 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-inner resize-none custom-scrollbar ${inputText.includes('\n') || inputText.length > 10 ? 'text-[15px] leading-tight' : 'text-[20px] leading-tight'}`} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Design Aura</div>
                <div className="flex gap-1.5">
                  <button onClick={() => openTuningRoom?.()} disabled={!customDesignInjections?.trim()} title="AI 튜닝룸" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${!customDesignInjections?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections?.trim()} title="자동 구체화" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
                    {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="원하는 분위기나 형태를 묘사하세요." className="w-full bg-[#1C1C1C] text-[12px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-sm" />

              <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="shrink-0 rounded-[12px] border border-zinc-800/80 p-5 bg-[#171717] shadow-lg space-y-6 relative overflow-hidden">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Target Image</div>

              <div
                onClick={() => editImageRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleEditDrop}
                className={`relative rounded-[10px] border border-dashed border-zinc-700/60 p-5 text-center cursor-pointer transition-all min-h-[130px] flex flex-col items-center justify-center ${isDragging ? 'bg-[#262626] border-emerald-500/50' : 'bg-[#121212] hover:bg-[#1A1A1A]'}`}
              >
                {editUploadedImage ? (
                  <div className="flex flex-col items-center justify-center w-full gap-3">
                    <img src={editUploadedImage} className="h-20 object-contain rounded-[6px] border border-zinc-700/50 shadow-md" />
                    <button onClick={(e) => { e.stopPropagation(); setEditUploadedImage(null); }} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 rounded-full transition-colors border border-red-500/20"><X className="w-3 h-3" /> REMOVE</button>
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-[#a6a6a6] flex flex-col items-center gap-2">
                    <ImageIcon className="w-7 h-7 opacity-40 mb-1" />
                    <span className="text-zinc-400">TARGET UPLOAD</span>
                    <span className="text-[9px] text-zinc-600 font-normal">클릭하거나 리믹스할 이미지를 드롭하세요</span>
                  </div>
                )}
                <input type="file" ref={editImageRef} className="hidden" accept="image/*" onChange={handleEditImageUpload} />
              </div>
            </div>

            <div className={`transition-all duration-300 relative ${!editUploadedImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Brush className="w-3 h-3" /> Edit Direction</div>
                <div className="flex gap-1.5">
                  <button onClick={openEditTuningRoom} disabled={!editInstruction?.trim()} title="튜닝룸" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${!editInstruction?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction?.trim()} title="자동 구체화" className={`p-2 rounded-[8px] transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-sm'}`}>
                    {isEditExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="리터칭 방향을 입력하세요." className="w-full bg-[#1C1C1C] text-[12px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all shadow-sm" />

              <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800/60">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-emerald-500" />
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                  <div className="flex items-center gap-2">
                    <Bot className={`w-4 h-4 ${applyAiRecInEdit ? 'text-indigo-400' : 'text-zinc-600'}`} />
                    <span className={`text-[11px] font-bold tracking-wide ${applyAiRecInEdit ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>AI 조형 자동 추천</span>
                  </div>
                  <button onClick={() => setApplyAiRecInEdit(!applyAiRecInEdit)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAiRecInEdit ? 'bg-indigo-500' : 'bg-[#121212] border border-zinc-800'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAiRecInEdit ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                  <div className="flex items-center gap-2">
                    <Wand className={`w-4 h-4 ${applyAutoRefine ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    <span className={`text-[11px] font-bold tracking-wide ${applyAutoRefine ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>스케치 자동 정규화</span>
                  </div>
                  <button onClick={() => setApplyAutoRefine(!applyAutoRefine)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${applyAutoRefine ? 'bg-emerald-500' : 'bg-[#121212] border border-zinc-800'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${applyAutoRefine ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Import / Reset (Creation only) */}
        {!isEditMode && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button onClick={() => setIsImportModalOpen(true)} title="프롬프트로 설정 복원" className="py-3 rounded-[10px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <FileUp className="w-4 h-4" /> <span className="text-[11px] font-bold">Import</span>
            </button>
            <button onClick={handleReset} title="초기화" className="py-3 rounded-[10px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <RefreshCcw className="w-4 h-4" /> <span className="text-[11px] font-bold">Reset</span>
            </button>
          </div>
        )}
        {(!isEditMode && aiRecSummary) && (
          <div className="mt-2 p-4 rounded-[10px] border animate-in fade-in duration-500 bg-[#1C1C1C] border-zinc-700/60 shadow-sm">
            <p className="text-[11px] font-bold mb-1 text-emerald-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-emerald-400/70" /> {String(aiRecSummary.title)}</p>
            <p className="text-[10px] leading-relaxed text-zinc-400">{String(aiRecSummary.reason)}</p>
          </div>
        )}

        {/* 4. Core Options Wrapper */}
        <div className={`transition-all duration-300 pb-8 ${(isEditMode && !editUploadedImage) ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
          <div className="mt-4 mb-4 px-1">
            <div className="mb-3">
              <DropdownControl label="타입 프리셋" icon={<Anchor className="w-3.5 h-3.5 text-zinc-400" />} data={[...staticOptions.MMOStyles, ...(dynamicOptions?.MMOStyles || [])]} value={scriptType} onChange={handleScriptPresetChange} />
            </div>

            <div className="shrink-0 mb-4 p-2.5 rounded-[10px] border border-zinc-800/80 bg-[#171717] flex items-center justify-between shadow-sm transition-colors">
              <div className="flex items-center gap-2 pl-1">
                <Settings className="w-4 h-4 text-[#a6a6a6]" />
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">조형 설정</h3>
              </div>
              <div className="flex bg-[#0A0A0A] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
                <button onClick={() => setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all ${!isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>요약</button>
                <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
                <button onClick={() => setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1 text-[10px] font-bold rounded-[4px] transition-all ${isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>고급</button>
              </div>
            </div>

            {isEditMode && (
              <OptionGroupCard id="edit_retouch" openCardId={editOpenCardId} onToggle={handleEditToggleCard} title="세부 조형 리터칭" icon={<Highlighter className="w-3.5 h-3.5 text-zinc-400" />} summary={`${getOptionName([...staticOptions.editStrokeMods, ...(dynamicOptions?.editStrokeMods || [])], editStrokeMod).split(' ')[0]} · ${getOptionName([...staticOptions.editElementMods, ...(dynamicOptions?.editElementMods || [])], editElementMod).split(' ')[0]}`}>
                <div className="space-y-3">
                  <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions?.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} />
                  <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions?.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} />
                  <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions?.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} />
                </div>
              </OptionGroupCard>
            )}

            <OptionGroupCard id="layout" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="구조 배치" icon={<LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />} summary={`${getOptionName(staticOptions.ratios, aspectRatio)} · ${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]}`}>
              <div className="mb-3"><DropdownControl label="레이아웃 프리셋" data={staticOptions.layoutPresets} value={layoutPreset} onChange={handleLayoutPresetChange} /></div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <DropdownControl label="비율" data={staticOptions.ratios} value={aspectRatio} onChange={(val) => { setAspectRatio(val); setLayoutPreset(''); }} />
                <DropdownControl label="크기/여백" data={staticOptions.occupancies} value={occupancy} onChange={(val) => { setOccupancy(val); setLayoutPreset(''); }} />
              </div>
              <div className="mb-3"><DropdownControl label="배열 방식" data={staticOptions.layouts} value={layoutType} onChange={(val) => { setLayoutType(val); setLayoutPreset(''); }} /></div>
              {(layoutType === "TitleSub" || layoutType === "SubTitle") && (<div className="mb-3"><DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={subTitleSize} onChange={setSubTitleSize} /></div>)}
              {isAdvancedOptionsEnabled && (<div className="mt-3 pt-3 border-t border-zinc-800/50"><DropdownControl label="고급 실루엣" data={staticOptions.MMOSilhouetteFramings} value={mmoSilhouetteFraming} onChange={(val) => { setMmoSilhouetteFraming(val); setLayoutPreset(''); }} /></div>)}
            </OptionGroupCard>

            {isAdvancedOptionsEnabled && (
              <OptionGroupCard id="terminal" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="획 마감" icon={<Brush className="w-3.5 h-3.5 text-zinc-400" />} summary={`${getOptionName([...staticOptions.terminalStyles, ...(dynamicOptions?.terminalStyles || [])], terminalStyle).split(' ')[0]} · ${getOptionName([...staticOptions.strokeSharpness, ...(dynamicOptions?.strokeSharpness || [])], strokeSharpness).split(' ')[0]}`}>
                <div className="grid grid-cols-2 gap-3">
                  <DropdownControl label="마감 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions?.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} />
                  <DropdownControl label="예리함" data={[...staticOptions.strokeSharpness, ...(dynamicOptions?.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <DropdownControl label="절단 방식" data={[...staticOptions.slicingIntensities, ...(dynamicOptions?.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} />
                  <DropdownControl label="코너 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions?.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} />
                </div>
              </OptionGroupCard>
            )}

            {(!isEditMode && isAdvancedOptionsEnabled) && (
              <OptionGroupCard id="connection" openCardId={openCardId} onToggle={handleToggleCard} title="문자 결속" icon={<Layers3 className="w-3.5 h-3.5 text-zinc-400" />} summary={`결합 ${getOptionName(staticOptions.letterConnections, letterConnection).split(' ')[0]}`}>
                <div className="grid grid-cols-2 gap-3">
                  <DropdownControl label="글자 결합" data={staticOptions.letterConnections} value={letterConnection} onChange={setLetterConnection} />
                  <DropdownControl label="자간" data={[...staticOptions.kerningOptions, ...(dynamicOptions?.kerningOptions || [])]} value={kerning} onChange={setKerning} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={internalSpace} onChange={setInternalSpace} />
                  <DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={logoDegree} onChange={setLogoDegree} />
                </div>
              </OptionGroupCard>
            )}

            {isAdvancedOptionsEnabled && (
              <OptionGroupCard id="intensity" openCardId={isEditMode ? editOpenCardId : openCardId} onToggle={isEditMode ? handleEditToggleCard : handleToggleCard} title="표현 강도" icon={<Activity className="w-3.5 h-3.5 text-zinc-400" />} summary={`동세: ${getOptionName([...staticOptions.kineticVelocities, ...(dynamicOptions?.kineticVelocities || [])], kineticVelocity).split(' ')[0]} · 파괴: ${getOptionName([...staticOptions.deformationDamages, ...(dynamicOptions?.deformationDamages || [])], deformationDamage).split(' ')[0]}`}>
                <div className="grid grid-cols-2 gap-3">
                  <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(dynamicOptions?.kineticVelocities || [])]} value={kineticVelocity} onChange={setKineticVelocity} />
                  <DropdownControl label="기울기" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} />
                  <DropdownControl label="파괴/침식" data={[...staticOptions.deformationDamages, ...(dynamicOptions?.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} />
                </div>
              </OptionGroupCard>
            )}
          </div>

          <section className="mt-6 border-t border-zinc-800/50 pt-4 px-3">
            <div className="flex items-center justify-between">
              <SectionHeader id="06" label="모디파이어 (구조 강제)" icon={<Wand className="w-3.5 h-3.5" />} />
              <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? '활성화됨' : '비활성'}</span>
                <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors shadow-inner ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-[10px] border bg-[#171717] border-zinc-800/80 mt-3 shadow-sm transition-all duration-300 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <div className="flex bg-[#0A0A0A] rounded-[10px] p-1 border border-zinc-800/60">
                <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-2 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💎 정제</button>
                <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-2 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>🎨 변주</button>
                <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-2 rounded-[8px] text-[11px] font-bold transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💥 해체</button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-2">
                  <FastForward className="w-3.5 h-3.5 text-[#a6a6a6]" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">전투 동세 (Combat Dynamics)</h3>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMomentumActive(!momentumActive)}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{momentumActive ? 'ON' : 'OFF'}</span>
                  <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors shadow-inner ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                    <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
