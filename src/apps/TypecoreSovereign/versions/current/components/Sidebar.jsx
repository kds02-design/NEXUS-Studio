/* eslint-disable */
// current 사이드바 — 초보자 5분 온보딩 우선의 Quick Start + 고급 옵션 구조.
//
// 설계 의도 (UX):
//   - 위에서 아래로 ①② 자연스럽게 따라가면 결과가 나옴 (텍스트 → 분위기 → 프리셋).
//   - "고급 옵션" 토글을 하나 둬서 7개 SectionGroup 을 한 묶음으로 숨김.
//   - 친근 라벨 + 작은 보조 설명 + 호버 시 원래 전문 용어 노출.
//   - 기능은 100% 유지 — rp 객체의 setter 시그니처와 staticOptions 키 그대로.
import React, { useRef, useState } from 'react';
import {
  Command, LayoutTemplate, Anchor, Brush, Activity, Sparkles, Sparkles as SparkleIcon,
  ChevronDown, ChevronRight, Wand, FastForward, Loader2, X, FileUp, RefreshCcw,
  Image as ImageIcon, Box as BoxIcon, Highlighter, Bot, Layers3,
  MessageSquare, Edit3, SlidersHorizontal, Crown, PenTool, Sliders, Type,
} from 'lucide-react';
import { DropdownControl } from './PrimitiveUI.jsx';
import { coreArchetypes } from '../constants/personas.jsx';
import { staticOptions } from '../constants/options.js';
import { sliderDesc } from '../constants/utils.js';
import SectionGroup, { SectionGroupAccent } from '../../../../../components/SectionGroup.jsx';

// 친근 라벨 사전 — 전문용어를 평이한 한국어로 매핑. 원래 용어는 title 툴팁으로 보존.
const FRIENDLY = {
  persona:      { label: '스타일 분위기',     hint: '글자가 풍기는 큰 분위기 — 첫 결정 포인트',  pro: '디렉터 페르소나 (Director Persona)' },
  text:         { label: '어떤 글자?',         hint: '실제로 그려질 텍스트',                       pro: 'Subject Text' },
  aura:         { label: '분위기 묘사 (선택)', hint: '원하는 분위기를 자유롭게 — 비워둬도 OK',     pro: 'Design Aura — 자유 묘사' },
  mmo:          { label: '글자 모양 프리셋',   hint: '획·마감·동세를 한 번에 설정',                pro: 'MMO Style Preset' },
  target:       { label: '대상 이미지',         hint: '리터칭할 이미지를 업로드',                    pro: 'Target Image' },
  direction:    { label: '바꿀 방향',           hint: '어떻게 손볼지 한 줄로',                       pro: 'Edit Direction' },
  retouchMods:  { label: '리터칭 효과',         hint: '획·요소·표면 질감 변환',                      pro: '리터칭 모디파이어' },
  layout:       { label: '레이아웃 · 배치',    hint: '비율·여백·배열',                             pro: '구조 배치' },
  terminals:    { label: '글자 끝 모양',         hint: '획의 끝·예리함·코너',                         pro: '마감 (Terminals)' },
  connection:   { label: '글자 연결 · 간격',    hint: '결합 방식·자간·내부 공간',                    pro: '문자 결속' },
  intensity:    { label: '강도 · 환경',         hint: '동세·기울기·파괴·배경',                       pro: '표현 강도 & 환경' },
  modifier:     { label: '추가 효과',           hint: '정제 / 변주 / 해체 + 전투 동세',              pro: '모디파이어 & 전투 동세' },
};

// 라벨 + 작은 보조 설명을 그리는 공통 헤더.
const FieldHeader = ({ icon, label, hint, right }) => (
  <div className="mb-1.5 flex items-start justify-between gap-2">
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-zinc-200">
        {icon}
        <span>{label}</span>
      </div>
      {hint && <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{hint}</div>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

// Quick Start 카드 — 항상 펼쳐진 강조 카드. 좌측 단계 번호 배지.
const StepCard = ({ step, accent = '#A29BFE', title, hint, pro, children }) => (
  <div
    className="rounded-[12px] border border-zinc-800 bg-[#161616] p-3 transition-colors hover:border-zinc-700"
    title={pro || undefined}
  >
    <div className="mb-2 flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
        style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}55` }}
      >
        {step}
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-zinc-100 leading-none">{title}</div>
        {hint && <div className="text-[10px] text-zinc-500 mt-1 leading-snug">{hint}</div>}
      </div>
    </div>
    <div className="space-y-2.5">{children}</div>
  </div>
);

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

  // 디테일 영역 펼침 — localStorage 영속화. 모드별로 분리해서 진입 경험 일관.
  const detailsLsKey = `nx:typecore:details:${isEditMode ? 'edit' : 'editor'}`;
  const [detailsOpen, setDetailsOpen] = useState(() => {
    try { return localStorage.getItem(detailsLsKey) === '1'; } catch { return false; }
  });
  const toggleDetails = () => {
    setDetailsOpen((v) => {
      const next = !v;
      try { localStorage.setItem(detailsLsKey, next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // 디테일 내부 아코디언 — 한 번에 하나만 열림. 모드별 첫 진입 섹션.
  const [openByMode, setOpenByMode] = useState({ editor: 'layout', edit: 'retouch' });
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
      {/* 상단 헤더 — 생성/리터칭 토글 (기존 유지) */}
      <div className="shrink-0 z-20 border-b border-zinc-800/80 bg-[#1A1A1A]">
        <div className="p-4">
          <div className="flex rounded-md p-1 bg-[#1A1A1A] border border-zinc-800 relative">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] bg-[#2C2C2C] transition-all duration-300 ${!isEditMode ? 'left-1' : 'left-[calc(50%+2px)]'}`} />
            <button onClick={() => setCurrentView('editor')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${!isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <PenTool className="w-3.5 h-3.5 shrink-0" /> <span>새로 만들기</span>
            </button>
            <button onClick={() => setCurrentView('edit')} className={`flex-1 py-1.5 text-[11px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Edit3 className="w-3.5 h-3.5 shrink-0" /> <span>리터칭</span>
            </button>
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 leading-snug">
            {isEditMode
              ? '기존 이미지를 다듬는 모드 — 대상 이미지부터 올려주세요.'
              : '새로 만들기 모드 — ①텍스트 → ②분위기 → ③프리셋 순서로 채우면 5분 안에 결과가 나옵니다.'}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">

        {/* ═════════ Quick Start (Creation 모드) ═════════ */}
        {!isEditMode && (
          <>
            {/* ① 텍스트 */}
            <StepCard step="1" title={FRIENDLY.text.label} hint={FRIENDLY.text.hint} pro={FRIENDLY.text.pro}>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="예: WARLORD · 군림 · WORLD WAR"
                rows={inputText.includes('\n') ? 2 : 1}
                className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[8px] px-3 py-2 focus:border-emerald-500/50 transition-all resize-none ${inputText.includes('\n') || inputText.length > 10 ? 'text-[14px] leading-tight' : 'text-[18px] leading-tight'}`}
              />
            </StepCard>

            {/* ② 페르소나 + 슬라이더 */}
            <StepCard step="2" title={FRIENDLY.persona.label} hint={FRIENDLY.persona.hint} pro={FRIENDLY.persona.pro}>
              <div className={`relative ${coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                <button onClick={() => setCoreDropdownOpen(!coreDropdownOpen)} className="w-full flex items-center justify-between p-3 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 opacity-80 shrink-0">{activePersona?.icon}</div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-zinc-200 truncate">{activePersona?.shortTitle}</div>
                      {activePersona?.subtitle && <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{activePersona.subtitle}</div>}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform shrink-0 ${coreDropdownOpen ? 'rotate-180' : ''}`} />
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
              <div className="bg-[#1C1C1C] rounded-[8px] p-3 border border-zinc-800/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                  <SlidersHorizontal className="w-3 h-3 text-emerald-500/60" />
                  <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </StepCard>

            {/* ③ MMO 프리셋 */}
            <StepCard step="3" title={FRIENDLY.mmo.label} hint={FRIENDLY.mmo.hint} pro={FRIENDLY.mmo.pro}>
              <DropdownControl
                label=""
                data={[...staticOptions.MMOStyles, ...(dynamicOptions?.MMOStyles || [])]}
                value={scriptType}
                onChange={handleScriptPresetChange}
              />
              <p className="text-[10px] text-zinc-500 leading-snug">
                선택하면 획 두께·끝 모양·동세 등이 한 번에 맞춰져요.
              </p>
            </StepCard>

            {/* 분위기 묘사 (선택) — 작게, 보조 영역 */}
            <div className="rounded-[12px] border border-dashed border-zinc-800 bg-[#121212] p-3">
              <FieldHeader
                icon={<Sparkles className="w-3 h-3 text-zinc-500" />}
                label={FRIENDLY.aura.label}
                hint={FRIENDLY.aura.hint}
                right={
                  <div className="flex gap-1.5">
                    <button onClick={() => openTuningRoom?.()} disabled={!customDesignInjections?.trim()} title="AI 튜닝룸" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${!customDesignInjections?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections?.trim()} title="자동 구체화" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
                      {isExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                }
              />
              <textarea
                value={customDesignInjections}
                onChange={e => setCustomDesignInjections(e.target.value)}
                placeholder="비워둬도 OK. 예: 균열이 번지는 검은 돌, 차가운 푸른 빛"
                className="w-full bg-[#1C1C1C] text-[12px] p-3 rounded-[8px] border border-zinc-800 outline-none min-h-[4rem] resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all"
              />
              {aiRecSummary && (
                <div className="mt-2 p-2.5 rounded-[8px] border bg-[#1C1C1C] border-zinc-700/60">
                  <p className="text-[11px] font-bold mb-1 text-emerald-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-emerald-400/70" /> {String(aiRecSummary.title)}</p>
                  <p className="text-[10px] leading-relaxed text-zinc-400">{String(aiRecSummary.reason)}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═════════ Quick Start (Edit 모드) ═════════ */}
        {isEditMode && (
          <>
            {/* ① 타깃 이미지 */}
            <StepCard step="1" title={FRIENDLY.target.label} hint={FRIENDLY.target.hint} pro={FRIENDLY.target.pro}>
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
                    <button onClick={(e) => { e.stopPropagation(); setEditUploadedImage(null); }} className="text-[9px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 bg-red-500/10 rounded-full border border-red-500/20"><X className="w-3 h-3" /> 제거</button>
                  </div>
                ) : (
                  <div className="text-[11px] font-bold text-[#a6a6a6] flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span className="text-zinc-400">이미지 업로드</span>
                    <span className="text-[9px] text-zinc-600 font-normal">클릭하거나 드래그</span>
                  </div>
                )}
                <input type="file" ref={editImageRef} className="hidden" accept="image/*" onChange={handleEditImageUpload} />
              </div>
            </StepCard>

            {/* ② 페르소나 + 슬라이더 — 이미지 있어야 활성 */}
            <div className={`${!editUploadedImage ? 'opacity-40 pointer-events-none' : ''}`}>
              <StepCard step="2" title={FRIENDLY.persona.label} hint={FRIENDLY.persona.hint} pro={FRIENDLY.persona.pro}>
                <div className={`relative ${coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                  <button onClick={() => setCoreDropdownOpen(!coreDropdownOpen)} className="w-full flex items-center justify-between p-3 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 opacity-80 shrink-0">{activePersona?.icon}</div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-zinc-200 truncate">{activePersona?.shortTitle}</div>
                        {activePersona?.subtitle && <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{activePersona.subtitle}</div>}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#a6a6a6] transition-transform shrink-0 ${coreDropdownOpen ? 'rotate-180' : ''}`} />
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
                <div className="bg-[#1C1C1C] rounded-[8px] p-3 border border-zinc-800/60">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                    <SlidersHorizontal className="w-3 h-3 text-emerald-500/60" />
                    <span className="text-[10px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                  </div>
                  <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                </div>
              </StepCard>

              {/* ③ 바꿀 방향 + AI 토글 */}
              <div className="mt-3" />
              <StepCard step="3" title={FRIENDLY.direction.label} hint={FRIENDLY.direction.hint} pro={FRIENDLY.direction.pro}>
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={openEditTuningRoom} disabled={!editInstruction?.trim()} title="튜닝룸" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${!editInstruction?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction?.trim()} title="자동 구체화" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
                    {isEditExpandingIntent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SparkleIcon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="예: 더 차갑고 푸른 빛으로, 가장자리에 균열 추가" className="w-full bg-[#1C1C1C] text-[12px] p-3 rounded-[8px] border border-zinc-800 outline-none min-h-[4.5rem] resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all" />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[8px] border border-zinc-800/80 p-2.5">
                    <div className="flex items-center gap-2">
                      <Bot className={`w-3.5 h-3.5 ${applyAiRecInEdit ? 'text-indigo-400' : 'text-zinc-600'}`} />
                      <span className={`text-[11px] font-bold ${applyAiRecInEdit ? 'text-indigo-300' : 'text-[#a6a6a6]'}`}>AI 조형 추천 적용</span>
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
              </StepCard>
            </div>
          </>
        )}

        {/* ═════════ 고급 옵션 (펼침 토글) ═════════ */}
        <div className="mt-1">
          <button
            onClick={toggleDetails}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[10px] border transition-colors ${
              detailsOpen
                ? 'bg-[#1C1C1C] border-zinc-700 text-zinc-200'
                : 'bg-[#121212] border-zinc-800 text-zinc-400 hover:bg-[#1A1A1A] hover:text-zinc-200'
            }`}
            title="구조·마감·결속·강도 등 모든 옵션"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[12px] font-bold">고급 옵션</span>
              <span className="text-[10px] text-zinc-500 font-normal">디테일 조정</span>
            </div>
            {detailsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {detailsOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <SectionGroupAccent value="#A29BFE">

                {/* 리터칭 모디파이어 (Edit only) — 디테일 안쪽에서 가장 먼저 */}
                {isEditMode && (
                  <SectionGroup
                    icon={<Highlighter className="w-3.5 h-3.5" />}
                    label={FRIENDLY.retouchMods.label}
                    {...sectionProps('retouch')}
                  >
                    <div title={FRIENDLY.retouchMods.pro} className="text-[10px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.retouchMods.hint}</div>
                    <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions?.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} />
                    <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions?.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} />
                    <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions?.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} />
                  </SectionGroup>
                )}

                {/* 레이아웃 · 배치 */}
                <SectionGroup
                  icon={<LayoutTemplate className="w-3.5 h-3.5" />}
                  label={FRIENDLY.layout.label}
                  {...sectionProps('layout')}
                >
                  <div title={FRIENDLY.layout.pro} className="text-[10px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.layout.hint}</div>
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

                {/* 글자 끝 모양 */}
                <SectionGroup
                  icon={<Brush className="w-3.5 h-3.5" />}
                  label={FRIENDLY.terminals.label}
                  {...sectionProps('terminal')}
                >
                  <div title={FRIENDLY.terminals.pro} className="text-[10px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.terminals.hint}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <DropdownControl label="마감 방식" data={[...staticOptions.terminalStyles, ...(dynamicOptions?.terminalStyles || [])]} value={terminalStyle} onChange={setTerminalStyle} />
                    <DropdownControl label="예리함" data={[...staticOptions.strokeSharpness, ...(dynamicOptions?.strokeSharpness || [])]} value={strokeSharpness} onChange={setStrokeSharpness} />
                    <DropdownControl label="절단 방식" data={[...staticOptions.slicingIntensities, ...(dynamicOptions?.slicingIntensities || [])]} value={slicingIntensity} onChange={setSlicingIntensity} />
                    <DropdownControl label="코너 성격" data={[...staticOptions.cornerStyles, ...(dynamicOptions?.cornerStyles || [])]} value={cornerStyle} onChange={setCornerStyle} />
                  </div>
                  <DropdownControl label="획 연장" data={staticOptions.strokeExtensions} value={strokeExtension} onChange={setStrokeExtension} />
                </SectionGroup>

                {/* 글자 연결 · 간격 (Creation only) */}
                {!isEditMode && (
                  <SectionGroup
                    icon={<Layers3 className="w-3.5 h-3.5" />}
                    label={FRIENDLY.connection.label}
                    {...sectionProps('connection')}
                  >
                    <div title={FRIENDLY.connection.pro} className="text-[10px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.connection.hint}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <DropdownControl label="글자 결합" data={staticOptions.letterConnections} value={letterConnection} onChange={setLetterConnection} />
                      <DropdownControl label="자간" data={[...staticOptions.kerningOptions, ...(dynamicOptions?.kerningOptions || [])]} value={kerning} onChange={setKerning} />
                      <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={internalSpace} onChange={setInternalSpace} />
                      <DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={logoDegree} onChange={setLogoDegree} />
                    </div>
                  </SectionGroup>
                )}

                {/* 강도 · 환경 */}
                <SectionGroup
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label={FRIENDLY.intensity.label}
                  {...sectionProps('intensity')}
                >
                  <div title={FRIENDLY.intensity.pro} className="text-[10px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.intensity.hint}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(dynamicOptions?.kineticVelocities || [])]} value={kineticVelocity} onChange={setKineticVelocity} />
                    <DropdownControl label="기울기" data={staticOptions.slantAngles} value={slantAngle} onChange={setSlantAngle} />
                    <DropdownControl label="파괴/침식" data={[...staticOptions.deformationDamages, ...(dynamicOptions?.deformationDamages || [])]} value={deformationDamage} onChange={setDeformationDamage} />
                    <DropdownControl label="표면 텍스처" data={staticOptions.strokeTextures} value={strokeTexture} onChange={setStrokeTexture} />
                    <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} />
                    <DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={mmoSurroundingElement} onChange={setMmoSurroundingElement} />
                  </div>
                </SectionGroup>

                {/* 추가 효과 (모디파이어 + 전투 동세) */}
                <SectionGroup
                  icon={<Wand className="w-3.5 h-3.5" />}
                  label={FRIENDLY.modifier.label}
                  {...sectionProps('modifier')}
                >
                  <div title={FRIENDLY.modifier.pro} className="text-[10px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.modifier.hint}</div>
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
          )}
        </div>

        {/* ═════════ Import / Reset (Creation only) ═════════ */}
        {!isEditMode && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => setIsImportModalOpen(true)} title="프롬프트로 설정 복원" className="py-2.5 rounded-[8px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <FileUp className="w-4 h-4" /> <span className="text-[11px] font-bold">불러오기</span>
            </button>
            <button onClick={handleReset} title="초기화" className="py-2.5 rounded-[8px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <RefreshCcw className="w-4 h-4" /> <span className="text-[11px] font-bold">초기화</span>
            </button>
          </div>
        )}

      </div>
    </aside>
  );
};

export default Sidebar;
