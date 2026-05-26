/* eslint-disable */
// current 사이드바 — RenderMatrix 패턴(SectionGroup 단일 아코디언)으로 재구성.
//
// 변경 의도 (UX):
//   - OptionGroupCard 의 col-span / hover-z-index / max-height 애니메이션이 만들던 "왔다갔다" 제거.
//   - 한 번에 하나의 섹션만 열림 — 다른 섹션 열면 자동 닫혀 전체 스크롤 위치가 거의 변하지 않음.
//   - "요약/고급" 토글 제거 — 모든 옵션 섹션이 항상 존재. 사용자가 필요한 것만 펼침.
//   - 페르소나/콘텐츠/액션/타입프리셋/레이아웃/마감/문자결속/표현강도/모디파이어 모두 평탄한 SectionGroup 리스트.
import React, { useRef, useState } from 'react';
import {
  Command, LayoutTemplate, Anchor, Brush, Activity, Sparkles, Sparkles as SparkleIcon,
  ChevronDown, Wand, FastForward, Loader2, X, FileUp, RefreshCcw,
  Image as ImageIcon, Box as BoxIcon, Highlighter, Bot, Layers3,
  MessageSquare, Edit3, SlidersHorizontal, Crown, PenTool, Sliders,
} from 'lucide-react';
import { DropdownControl } from './PrimitiveUI.jsx';
import { coreArchetypes } from '../constants/personas.jsx';
import { staticOptions } from '../constants/options.js';
import { getOptionName, sliderDesc } from '../constants/utils.js';
import SectionGroup, { SectionGroupAccent } from '../../../../../components/SectionGroup.jsx';

const Sidebar = ({ rp, version, setVersion, versions }) => {
  const editImageRef = useRef(null);

  const {
    isSidebarOpen, isEditMode, setCurrentView,
    coreArchetype, setCoreArchetype, handleCoreArchetypeChange, coreDropdownOpen, setCoreDropdownOpen,
    inputText, setInputText, customDesignInjections, setCustomDesignInjections,
    openTuningRoom, openEditTuningRoom, handleExpandIntent, isExpandingIntent,
    personaSliderValue, setPersonaSliderValue,
    editUploadedImage, setEditUploadedImage, handleEditImageUpload,
    isDragging, handleDragOver, handleDragLeave, handleEditDrop,
    editInstruction, setEditInstruction, isEditExpandingIntent, handleEditExpandIntent,
    applyAiRecInEdit, setApplyAiRecInEdit, applyAutoRefine, setApplyAutoRefine,
    setIsImportModalOpen, handleReset, aiRecSummary,
    dynamicOptions, scriptType, handleScriptPresetChange,
    editStrokeMod, setEditStrokeMod, editElementMod, setEditElementMod, editSurfaceMod, setEditSurfaceMod,
    aspectRatio, setAspectRatio, occupancy, setOccupancy, layoutType, setLayoutType,
    layoutPreset, setLayoutPreset, subTitleSize, setSubTitleSize,
    mmoSilhouetteFraming, setMmoSilhouetteFraming, handleLayoutPresetChange,
    terminalStyle, setTerminalStyle, strokeSharpness, setStrokeSharpness,
    slicingIntensity, setSlicingIntensity, cornerStyle, setCornerStyle,
    strokeExtension, setStrokeExtension,
    letterConnection, setLetterConnection, kerning, setKerning,
    internalSpace, setInternalSpace, logoDegree, setLogoDegree,
    kineticVelocity, setKineticVelocity, slantAngle, setSlantAngle,
    baseStyle, setBaseStyle, deformationDamage, setDeformationDamage,
    strokeTexture, setStrokeTexture,
    mmoSurroundingElement, setMmoSurroundingElement,
    isEnhanceModeEnabled, setIsEnhanceModeEnabled,
    enhanceMode, setEnhanceMode, momentumActive, setMomentumActive,
  } = rp;

  // 단일 아코디언 — 모드별로 첫 열림 섹션 분리. localStorage 영속화는 생략(매번 첫 진입은 같은 위치).
  const [openByMode, setOpenByMode] = useState({ editor: 'content', edit: 'target' });
  const currentMode = isEditMode ? 'edit' : 'editor';
  const openSection = openByMode[currentMode];
  const toggleSection = (key) => (next) => {
    setOpenByMode((cur) => ({
      ...cur,
      [currentMode]: next ? key : (cur[currentMode] === key ? null : cur[currentMode]),
    }));
  };
  const sectionProps = (key) => ({
    open: openSection === key,
    onToggle: toggleSection(key),
  });

  if (!isSidebarOpen) {
    return <aside className="w-0 border-none opacity-0 m-0 p-0 shrink-0 bg-transparent rounded-2xl flex flex-col relative overflow-hidden transition-all duration-300 z-50" />;
  }

  const activePersona = coreArchetypes.find(p => p.id === coreArchetype);

  return (
    <aside className="w-[380px] shrink-0 border border-zinc-800/80 bg-[#141414] rounded-[16px] flex flex-col shadow-2xl relative overflow-hidden transition-all duration-300 z-50">
      {/* === 상단 헤더 — 생성/리터칭 토글 === */}
      <div className="shrink-0 z-20 border-b border-zinc-800/80 bg-[#1A1A1A]">
        <div className="p-4">
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

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
        <SectionGroupAccent value="#A29BFE">

          {/* ─── 1. AI Director Persona ─── */}
          <SectionGroup
            icon={<Crown className="w-3.5 h-3.5" />}
            label="디렉터 페르소나"
            {...sectionProps('persona')}
          >
            <div className={`relative ${coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
              <button onClick={() => setCoreDropdownOpen(!coreDropdownOpen)} className="w-full flex items-center justify-between p-3 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 opacity-80">{activePersona?.icon}</div>
                  <div>
                    <div className="text-[12px] font-bold text-zinc-200">{activePersona?.shortTitle}</div>
                    {activePersona?.subtitle && <div className="text-[10px] text-zinc-500 mt-0.5">{activePersona.subtitle}</div>}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform ${coreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {coreDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                  {coreArchetypes.map(p => (
                    <button key={p.id} onClick={() => { (handleCoreArchetypeChange || setCoreArchetype)(p.id); setCoreDropdownOpen(false); }} className={`w-full text-left p-3 flex items-start gap-3 transition-all ${coreArchetype === p.id ? 'border-l-[3px] border-emerald-400 bg-emerald-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                      <div className="mt-0.5 opacity-80">{p.icon}</div>
                      <div className="flex-1">
                        <div className={`text-[11px] font-bold ${coreArchetype === p.id ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>{p.shortTitle}</div>
                        <div className="text-[10px] text-zinc-500 mt-1">{p.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionGroup>

          {/* ─── 2. 컨텐츠 작성 (Creation) / 리터칭 대상 (Edit) ─── */}
          {!isEditMode ? (
            <SectionGroup
              icon={<Command className="w-3.5 h-3.5" />}
              label="컨텐츠 작성"
              {...sectionProps('content')}
            >
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">Subject Text</div>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="텍스트 입력 (엔터로 줄바꿈)"
                  rows={inputText.includes('\n') ? 2 : 1}
                  className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[8px] px-3 py-2 focus:border-emerald-500/50 transition-all resize-none ${inputText.includes('\n') || inputText.length > 10 ? 'text-[14px] leading-tight' : 'text-[18px] leading-tight'}`}
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Design Aura</div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openTuningRoom?.()} disabled={!customDesignInjections?.trim()} title="AI 튜닝룸" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${!customDesignInjections?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections?.trim()} title="자동 구체화" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
                      {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <textarea value={customDesignInjections} onChange={e => setCustomDesignInjections(e.target.value)} placeholder="원하는 분위기나 형태를 묘사하세요." className="w-full bg-[#1C1C1C] text-[12px] p-3 rounded-[8px] border border-zinc-800 outline-none min-h-[4.5rem] resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all" />
              </div>
              <div className="bg-[#1C1C1C] rounded-[8px] p-3 border border-zinc-800/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                  <SlidersHorizontal className="w-3 h-3 text-emerald-500/60" />
                  <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </SectionGroup>
          ) : (
            <SectionGroup
              icon={<ImageIcon className="w-3.5 h-3.5" />}
              label="리터칭 대상"
              {...sectionProps('target')}
            >
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">Target Image</div>
                <div
                  onClick={() => editImageRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleEditDrop}
                  className={`relative rounded-[8px] border border-dashed border-zinc-700/60 p-4 text-center cursor-pointer transition-all min-h-[110px] flex flex-col items-center justify-center ${isDragging ? 'bg-[#262626] border-emerald-500/50' : 'bg-[#121212] hover:bg-[#1A1A1A]'}`}
                >
                  {editUploadedImage ? (
                    <div className="flex flex-col items-center justify-center w-full gap-2">
                      <img src={editUploadedImage} className="h-16 object-contain rounded border border-zinc-700/50 shadow" />
                      <button onClick={(e) => { e.stopPropagation(); setEditUploadedImage(null); }} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 bg-red-500/10 rounded-full border border-red-500/20"><X className="w-3 h-3" /> REMOVE</button>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-[#a6a6a6] flex flex-col items-center gap-1">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                      <span className="text-zinc-400">TARGET UPLOAD</span>
                      <span className="text-[9px] text-zinc-600 font-normal">클릭하거나 이미지를 드롭</span>
                    </div>
                  )}
                  <input type="file" ref={editImageRef} className="hidden" accept="image/*" onChange={handleEditImageUpload} />
                </div>
              </div>
              <div className={`${!editUploadedImage ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5"><Brush className="w-3 h-3" /> Edit Direction</div>
                  <div className="flex gap-1.5">
                    <button onClick={openEditTuningRoom} disabled={!editInstruction?.trim()} title="튜닝룸" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${!editInstruction?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction?.trim()} title="자동 구체화" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
                      {isEditExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="리터칭 방향을 입력하세요." className="w-full bg-[#1C1C1C] text-[12px] p-3 rounded-[8px] border border-zinc-800 outline-none min-h-[4.5rem] resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all" />

                <div className="mt-3 bg-[#1C1C1C] rounded-[8px] p-3 border border-zinc-800/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                    <SlidersHorizontal className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                  </div>
                  <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[8px] border border-zinc-800/80 p-2.5">
                    <div className="flex items-center gap-2">
                      <Bot className={`w-3.5 h-3.5 ${applyAiRecInEdit ? 'text-indigo-400' : 'text-zinc-600'}`} />
                      <span className={`text-[11px] font-bold ${applyAiRecInEdit ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>AI 조형 자동 추천</span>
                    </div>
                    <button onClick={() => setApplyAiRecInEdit(!applyAiRecInEdit)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors ${applyAiRecInEdit ? 'bg-indigo-500' : 'bg-[#121212] border border-zinc-800'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${applyAiRecInEdit ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[8px] border border-zinc-800/80 p-2.5">
                    <div className="flex items-center gap-2">
                      <Wand className={`w-3.5 h-3.5 ${applyAutoRefine ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={`text-[11px] font-bold ${applyAutoRefine ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>스케치 자동 정규화</span>
                    </div>
                    <button onClick={() => setApplyAutoRefine(!applyAutoRefine)} className={`w-9 h-5 rounded-full p-1 flex items-center transition-colors ${applyAutoRefine ? 'bg-emerald-500' : 'bg-[#121212] border border-zinc-800'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition-transform ${applyAutoRefine ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </SectionGroup>
          )}

          {/* ─── 3. Import / Reset (Creation only) ─── */}
          {!isEditMode && (
            <SectionGroup
              icon={<FileUp className="w-3.5 h-3.5" />}
              label="액션"
              {...sectionProps('actions')}
            >
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIsImportModalOpen(true)} title="프롬프트로 설정 복원" className="py-2.5 rounded-[8px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
                  <FileUp className="w-4 h-4" /> <span className="text-[11px] font-bold">Import</span>
                </button>
                <button onClick={handleReset} title="초기화" className="py-2.5 rounded-[8px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
                  <RefreshCcw className="w-4 h-4" /> <span className="text-[11px] font-bold">Reset</span>
                </button>
              </div>
              {aiRecSummary && (
                <div className="mt-2 p-3 rounded-[8px] border bg-[#1C1C1C] border-zinc-700/60">
                  <p className="text-[11px] font-bold mb-1 text-emerald-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-emerald-400/70" /> {String(aiRecSummary.title)}</p>
                  <p className="text-[10px] leading-relaxed text-zinc-400">{String(aiRecSummary.reason)}</p>
                </div>
              )}
            </SectionGroup>
          )}

          {/* ─── 4. 리터칭 모디파이어 (Edit only) ─── */}
          {isEditMode && (
            <SectionGroup
              icon={<Highlighter className="w-3.5 h-3.5" />}
              label="리터칭 모디파이어"
              {...sectionProps('retouch')}
            >
              <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions?.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} />
              <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions?.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} />
              <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions?.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} />
            </SectionGroup>
          )}

          {/* ─── 5. 타입 프리셋 ─── */}
          <SectionGroup
            icon={<Anchor className="w-3.5 h-3.5" />}
            label="타입 프리셋"
            {...sectionProps('preset')}
          >
            <DropdownControl
              label="MMO 스타일"
              data={[...staticOptions.MMOStyles, ...(dynamicOptions?.MMOStyles || [])]}
              value={scriptType}
              onChange={handleScriptPresetChange}
            />
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              선택 시 획 무게 · 마감 · 예리함 · 동세 등 관련 옵션이 자동 세팅됩니다.
            </p>
          </SectionGroup>

          {/* ─── 6. 구조 배치 (레이아웃) ─── */}
          <SectionGroup
            icon={<LayoutTemplate className="w-3.5 h-3.5" />}
            label="구조 배치"
            {...sectionProps('layout')}
          >
            <DropdownControl label="레이아웃 프리셋" data={staticOptions.layoutPresets} value={layoutPreset} onChange={handleLayoutPresetChange} />
            <div className="grid grid-cols-2 gap-2">
              <DropdownControl label="비율" data={staticOptions.ratios} value={aspectRatio} onChange={(val) => { setAspectRatio(val); setLayoutPreset(''); }} />
              <DropdownControl label="크기/여백" data={staticOptions.occupancies} value={occupancy} onChange={(val) => { setOccupancy(val); setLayoutPreset(''); }} />
            </div>
            <DropdownControl label="배열 방식" data={staticOptions.layouts} value={layoutType} onChange={(val) => { setLayoutType(val); setLayoutPreset(''); }} />
            {(layoutType === "TitleSub" || layoutType === "SubTitle") && (
              <DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={subTitleSize} onChange={setSubTitleSize} />
            )}
            <DropdownControl label="실루엣 프레이밍" data={staticOptions.MMOSilhouetteFramings} value={mmoSilhouetteFraming} onChange={(val) => { setMmoSilhouetteFraming(val); setLayoutPreset(''); }} />
          </SectionGroup>

          {/* ─── 7. 마감 (Terminals) ─── */}
          <SectionGroup
            icon={<Brush className="w-3.5 h-3.5" />}
            label="마감 (Terminals)"
            {...sectionProps('terminal')}
          >
            <div className="grid grid-cols-2 gap-2">
              <DropdownControl label="마감 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions?.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} />
              <DropdownControl label="예리함" data={[...staticOptions.strokeSharpness, ...(dynamicOptions?.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} />
              <DropdownControl label="절단 방식" data={[...staticOptions.slicingIntensities, ...(dynamicOptions?.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} />
              <DropdownControl label="코너 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions?.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} />
            </div>
            <DropdownControl label="획 연장" data={staticOptions.strokeExtensions} value={strokeExtension} onChange={setStrokeExtension} />
          </SectionGroup>

          {/* ─── 8. 문자 결속 (Creation only) ─── */}
          {!isEditMode && (
            <SectionGroup
              icon={<Layers3 className="w-3.5 h-3.5" />}
              label="문자 결속"
              {...sectionProps('connection')}
            >
              <div className="grid grid-cols-2 gap-2">
                <DropdownControl label="글자 결합" data={staticOptions.letterConnections} value={letterConnection} onChange={setLetterConnection} />
                <DropdownControl label="자간" data={[...staticOptions.kerningOptions, ...(dynamicOptions?.kerningOptions || [])]} value={kerning} onChange={setKerning} />
                <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={internalSpace} onChange={setInternalSpace} />
                <DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={logoDegree} onChange={setLogoDegree} />
              </div>
            </SectionGroup>
          )}

          {/* ─── 9. 표현 강도 / 환경 ─── */}
          <SectionGroup
            icon={<Activity className="w-3.5 h-3.5" />}
            label="표현 강도 & 환경"
            {...sectionProps('intensity')}
          >
            <div className="grid grid-cols-2 gap-2">
              <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(dynamicOptions?.kineticVelocities || [])]} value={kineticVelocity} onChange={setKineticVelocity} />
              <DropdownControl label="기울기" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} />
              <DropdownControl label="파괴/침식" data={[...staticOptions.deformationDamages, ...(dynamicOptions?.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} />
              <DropdownControl label="표면 텍스처" data={staticOptions.strokeTextures} value={strokeTexture} onChange={setStrokeTexture} />
              <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} />
              <DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} />
            </div>
          </SectionGroup>

          {/* ─── 10. 모디파이어 & 전투 동세 ─── */}
          <SectionGroup
            icon={<Wand className="w-3.5 h-3.5" />}
            label="모디파이어"
            {...sectionProps('modifier')}
          >
            {/* 모디파이어 활성 + 모드 */}
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? '활성화됨' : '비활성'}</span>
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
                <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                  <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
            <div className={`p-2 rounded-[8px] border bg-[#171717] border-zinc-800/80 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
              <div className="flex bg-[#0A0A0A] rounded-[8px] p-1 border border-zinc-800/60">
                <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💎 정제</button>
                <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>🎨 변주</button>
                <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💥 해체</button>
              </div>
            </div>

            {/* 전투 동세 토글 */}
            <div className="pt-2 mt-1 border-t border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FastForward className="w-3.5 h-3.5 text-[#a6a6a6]" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6]">전투 동세</h3>
                </div>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMomentumActive(!momentumActive)}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{momentumActive ? 'ON' : 'OFF'}</span>
                  <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                    <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </div>
          </SectionGroup>

        </SectionGroupAccent>
      </div>
    </aside>
  );
};

export default Sidebar;
