/* eslint-disable */
// current 사이드바 — 초보자 온보딩 우선의 Quick Start + 고급 옵션 구조.
//
// 설계 의도 (UX):
//   - 위에서 아래로 ①②③ 따라가면 결과가 나옴 (글자 → 분위기 → 모양).
//   - "고급 옵션"은 바이올렛 톤 패널로 시각 구분 — 원하는 사람만 연다.
//   - 고급 옵션은 효과가 큰 것만 유지 (레이아웃 / 굵기·비율 / 추가 효과 / 배경·가드).
//     끝 모양·간격·질감·장식 등 미세 옵션은 드롭다운 대신 "세부 요구사항 직접 입력"
//     텍스트로 통합 — 십자가 모티프처럼 옵션에 없는 요구도 같은 경로로 받는다.
//   - 친근 라벨 + 작은 보조 설명 + 호버 시 원래 전문 용어 노출.
import React, { useRef, useState } from 'react';
import {
  LayoutTemplate, Sparkles, Sparkles as SparkleIcon,
  ChevronDown, ChevronRight, Wand, FastForward, Loader2, X, FileUp, RefreshCcw,
  Image as ImageIcon, Box as BoxIcon, Highlighter, Bot,
  MessageSquare, Edit3, SlidersHorizontal, PenTool, Sliders, Type, Shield, PencilLine,
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
  mmo:          { label: '글자 모양',           hint: '원하는 모양을 고르면 세부 옵션이 한 번에 맞춰져요', pro: 'Shape Preset' },
  custom:       { label: '세부 요구사항 직접 입력', hint: '옵션에 없는 요구를 글로 — 예: T를 십자가 모양으로', pro: 'Custom Shape Directives' },
  weight:       { label: '굵기 · 비율',         hint: '획 굵기·글자 폭·장평',                        pro: 'Stroke Weight & Proportion' },
  guards:       { label: '배경 & 보호 가드',    hint: '배경 대비 + AI가 멋대로 바꾸지 못하게 잠금',   pro: 'Background & Safety Guards' },
  target:       { label: '대상 이미지',         hint: '리터칭할 이미지를 업로드',                    pro: 'Target Image' },
  feel:         { label: '느낌 미세 조절',      hint: '형태는 그대로, 느낌만 살짝 — 가운데가 "그대로"', pro: 'Feel Micro-Adjust' },
  direction:    { label: '바꿀 방향 (선택)',    hint: '슬라이더로 부족할 때만 글로 — 비워둬도 OK',    pro: 'Edit Direction' },
  retouchMods:  { label: '리터칭 효과',         hint: '획 꺾임·연장 / 오브제화 / 부식·질감 — 미세 변형 카테고리', pro: '리터칭 모디파이어' },
  layout:       { label: '레이아웃 · 배치',    hint: '비율·여백·배열',                             pro: '구조 배치' },
  modifier:     { label: '추가 효과',           hint: '정제 / 변주 / 해체 + 전투 동세',              pro: '모디파이어 & 전투 동세' },
};

// 가드 친근 라벨 — id 는 hook 의 safetyGuards 와 동일.
const GUARD_OPTIONS = [
  { id: 'guard_mutation', label: '글자 지키기',  hint: '글자가 다른 글자로 바뀌지 않게 잠금' },
  { id: 'guard_layout',   label: '배치 고정',    hint: '레이아웃이 흐트러지지 않게 잠금' },
  { id: 'guard_3d',       label: '2D 평면 유지', hint: '입체·그림자 없이 평면으로 잠금' },
  { id: 'guard_noise',    label: '잡효과 차단',  hint: '불필요한 이펙트·노이즈 억제' },
];

// 고급 옵션 액센트 — 앱 컬러(#A29BFE)로 Quick Start(에메랄드)와 시각 구분.
const ADV = '#A29BFE';

// 라벨 + 작은 보조 설명을 그리는 공통 헤더.
const FieldHeader = ({ icon, label, hint, right }) => (
  <div className="mb-1.5 flex items-start justify-between gap-2">
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-zinc-200">
        {icon}
        <span>{label}</span>
      </div>
      {hint && <div className="text-[9px] text-zinc-500 mt-0.5 leading-snug">{hint}</div>}
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
        className="w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center text-[9px] font-black"
        style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}55` }}
      >
        {step}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-zinc-100 leading-none">{title}</div>
        {hint && <div className="text-[9px] text-zinc-500 mt-1 leading-snug">{hint}</div>}
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
    editFeelAdjust, setEditFeelAxis, resetEditFeelAdjust,
    applyAiRecInEdit, setApplyAiRecInEdit, applyAutoRefine, setApplyAutoRefine,
    setIsImportModalOpen, handleReset, aiRecSummary,
    dynamicOptions, scriptType, handleScriptPresetChange,
    customShapeText, setCustomShapeText, isTranslatingShape,
    stemWeight, setStemWeight, charWidth, setCharWidth, charProportion, setCharProportion,
    activeGuards, toggleGuard,
    editStrokeMod, setEditStrokeMod, editElementMod, setEditElementMod, editSurfaceMod, setEditSurfaceMod,
    aspectRatio, setAspectRatio, occupancy, setOccupancy, layoutType, setLayoutType,
    layoutPreset, setLayoutPreset, subTitleSize, setSubTitleSize,
    mmoSilhouetteFraming, setMmoSilhouetteFraming, handleLayoutPresetChange,
    baseStyle, setBaseStyle,
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
            <button onClick={() => setCurrentView('editor')} className={`flex-1 py-1.5 text-[10px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${!isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <PenTool className="w-3 h-3 shrink-0" /> <span>새로 만들기</span>
            </button>
            <button onClick={() => setCurrentView('edit')} className={`flex-1 py-1.5 text-[10px] font-bold rounded relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap ${isEditMode ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Edit3 className="w-3 h-3 shrink-0" /> <span>리터칭</span>
            </button>
          </div>
          <div className="mt-2 text-[9px] text-zinc-500 leading-snug">
            {isEditMode
              ? '리터칭 모드 — 형태·배치·색은 그대로, 획 각도·침식 같은 미세 효과만 더해요.'
              : '새로 만들기 모드 — ①글자 → ②분위기 → ③모양 세 가지만 고르면 바로 결과가 나와요.'}
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
                className={`w-full bg-[#0A0A0A] font-black outline-none text-white border border-zinc-800 rounded-[8px] px-3 py-2 focus:border-emerald-500/50 transition-all resize-none ${inputText.includes('\n') || inputText.length > 10 ? 'text-[13px] leading-tight' : 'text-[15px] leading-tight'}`}
              />
            </StepCard>

            {/* ② 페르소나 + 슬라이더 */}
            <StepCard step="2" title={FRIENDLY.persona.label} hint={FRIENDLY.persona.hint} pro={FRIENDLY.persona.pro}>
              <div className={`relative ${coreDropdownOpen ? 'z-[9999]' : 'z-10'}`}>
                <button onClick={() => setCoreDropdownOpen(!coreDropdownOpen)} className="w-full flex items-center justify-between p-2.5 rounded-[10px] border border-zinc-800 bg-[#1C1C1C] hover:bg-[#262626] transition-all text-left">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 opacity-80 shrink-0">{activePersona?.icon}</div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-zinc-200 truncate">{activePersona?.shortTitle}</div>
                      {activePersona?.subtitle && <div className="text-[9px] text-zinc-500 mt-0.5 leading-snug">{activePersona.subtitle}</div>}
                    </div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#a6a6a6] transition-transform shrink-0 ${coreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {coreDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1C1C1C] border border-zinc-700 rounded-[10px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[1000] flex flex-col">
                    {coreArchetypes.map(p => (
                      <button key={p.id} onClick={() => { (handleCoreArchetypeChange || setCoreArchetype)(p.id); setCoreDropdownOpen(false); }} className={`w-full text-left p-2.5 flex items-start gap-2.5 transition-all ${coreArchetype === p.id ? 'border-l-[3px] border-emerald-400 bg-emerald-500/10' : 'border-l-[3px] border-transparent hover:bg-[#262626]'}`}>
                        <div className="mt-0.5 opacity-80">{p.icon}</div>
                        <div className="flex-1">
                          <div className={`text-[10px] font-bold ${coreArchetype === p.id ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>{p.shortTitle}</div>
                          <div className="text-[9px] text-zinc-500 mt-1">{p.subtitle}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-[#1C1C1C] rounded-[8px] p-2.5 border border-zinc-800/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                  <SlidersHorizontal className="w-3 h-3 text-emerald-500/60" />
                  <span className="text-[9px] font-bold text-emerald-500">{sliderDesc.rightLabel}</span>
                </div>
                <input type="range" min="0" max="100" value={personaSliderValue} onChange={e => setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </StepCard>

            {/* ③ 글자 모양 프리셋 — 결과물 형태별 비주얼 그리드. 12살도 바로 고를 수 있게
                드롭다운 대신 이모지+이름 버튼. 선택 시 세부 옵션 자동 세팅 + 프롬프트 스타일 주입. */}
            <StepCard step="3" title={FRIENDLY.mmo.label} hint={FRIENDLY.mmo.hint} pro={FRIENDLY.mmo.pro}>
              <div className="grid grid-cols-3 gap-1.5">
                {staticOptions.shapePresets.map(s => {
                  const active = scriptType === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleScriptPresetChange(s.id)}
                      title={s.hint}
                      className={`flex flex-col items-center gap-1 rounded-[10px] border px-1 py-2 transition-all ${active ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]' : 'border-zinc-800 bg-[#1C1C1C] hover:border-zinc-600 hover:bg-[#222222]'}`}
                    >
                      <span className="text-[16px] leading-none">{s.emoji}</span>
                      <span className={`text-[9.5px] font-bold leading-tight ${active ? 'text-emerald-300' : 'text-zinc-300'}`}>{s.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-zinc-500 leading-snug">
                {scriptType
                  ? `${staticOptions.shapePresets.find(s => s.id === scriptType)?.hint || ''} — 세부 옵션이 자동으로 맞춰졌어요.`
                  : '마음에 드는 모양을 하나 골라보세요. 획 두께·끝 모양이 한 번에 설정돼요.'}
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
                      <MessageSquare className="w-3 h-3" />
                    </button>
                    <button onClick={handleExpandIntent} disabled={isExpandingIntent || !customDesignInjections?.trim()} title="자동 구체화" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
                      {isExpandingIntent ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand className="w-3 h-3" />}
                    </button>
                  </div>
                }
              />
              <textarea
                value={customDesignInjections}
                onChange={e => setCustomDesignInjections(e.target.value)}
                placeholder="비워둬도 OK. 예: 균열이 번지는 검은 돌, 차가운 푸른 빛"
                className="w-full bg-[#1C1C1C] text-[11px] p-2.5 rounded-[8px] border border-zinc-800 outline-none min-h-[3.5rem] resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all"
              />
              {aiRecSummary && (
                <div className="mt-2 p-2.5 rounded-[8px] border bg-[#1C1C1C] border-zinc-700/60">
                  <p className="text-[10px] font-bold mb-1 text-emerald-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-emerald-400/70" /> {String(aiRecSummary.title)}</p>
                  <p className="text-[9px] leading-relaxed text-zinc-400">{String(aiRecSummary.reason)}</p>
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
                  <div className="text-[10px] font-bold text-[#a6a6a6] flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span className="text-zinc-400">이미지 업로드</span>
                    <span className="text-[9px] text-zinc-600 font-normal">클릭하거나 드래그</span>
                  </div>
                )}
                <input type="file" ref={editImageRef} className="hidden" accept="image/*" onChange={handleEditImageUpload} />
              </div>
            </StepCard>

            {/* 이미지 있어야 이후 단계 활성. 페르소나(스타일 분위기)는 리터칭 목적
                ("대상 이미지 최대 유지 + 미세 효과")과 충돌해 리터칭 모드에서 제외. */}
            <div className={`${!editUploadedImage ? 'opacity-40 pointer-events-none' : ''}`}>
              {/* ② 느낌 미세 조절 — 리터칭의 핵심. 양방향 슬라이더 5축, 가운데(0)=그대로.
                  움직인 축만 미세 가중치로 프롬프트에 반영 → "원본을 지키며 살짝만" 이라는
                  리터칭 목적이 UI 자체에서 읽히도록. */}
              <StepCard step="2" title={FRIENDLY.feel.label} hint={FRIENDLY.feel.hint} pro={FRIENDLY.feel.pro}>
                {staticOptions.editFeelAxes.map(ax => {
                  const v = editFeelAdjust?.[ax.id] || 0;
                  const desc = v === 0 ? '그대로' : `${Math.abs(v) >= 2 ? '확실히' : '살짝'} ${v > 0 ? ax.right : ax.left}`;
                  return (
                    <div key={ax.id} className="bg-[#1C1C1C] rounded-[8px] px-2.5 py-2 border border-zinc-800/60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-zinc-300">{ax.label}</span>
                        <span className={`text-[9px] font-bold ${v === 0 ? 'text-zinc-600' : v > 0 ? 'text-emerald-400' : 'text-sky-400'}`}>{desc}</span>
                      </div>
                      <input
                        type="range" min="-2" max="2" step="1" value={v}
                        onChange={e => setEditFeelAxis(ax.id, Number(e.target.value))}
                        className={`w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer ${v === 0 ? 'accent-zinc-500' : v > 0 ? 'accent-emerald-500' : 'accent-sky-500'}`}
                      />
                      <div className="flex justify-between text-[8px] text-zinc-600 mt-0.5">
                        <span>{ax.left}</span><span>그대로</span><span>{ax.right}</span>
                      </div>
                    </div>
                  );
                })}
                {Object.values(editFeelAdjust || {}).some(v => v !== 0) && (
                  <button
                    onClick={resetEditFeelAdjust}
                    className="w-full py-1.5 rounded-[8px] text-[9.5px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                  >
                    모두 "그대로"로 되돌리기
                  </button>
                )}
              </StepCard>

              {/* ③ 바꿀 방향 (선택) */}
              <div className="mt-3" />
              <StepCard step="3" title={FRIENDLY.direction.label} hint={FRIENDLY.direction.hint} pro={FRIENDLY.direction.pro}>
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={openEditTuningRoom} disabled={!editInstruction?.trim()} title="튜닝룸" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${!editInstruction?.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                    <MessageSquare className="w-3 h-3" />
                  </button>
                  <button onClick={handleEditExpandIntent} disabled={isEditExpandingIntent || !editInstruction?.trim()} title="자동 구체화" className={`p-1.5 rounded-md transition-all flex items-center justify-center ${isEditExpandingIntent ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'}`}>
                    {isEditExpandingIntent ? <Loader2 className="w-3 h-3 animate-spin" /> : <SparkleIcon className="w-3 h-3" />}
                  </button>
                </div>
                <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} placeholder="예: 더 차갑고 푸른 빛으로, 가장자리에 균열 추가" className="w-full bg-[#1C1C1C] text-[11px] p-2.5 rounded-[8px] border border-zinc-800 outline-none min-h-[4rem] resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/50 transition-all" />

                {/* AI 조형 추천(페르소나 골격 주입)은 "대상 이미지 최대 유지" 목적과 충돌해 제거.
                    스케치 자동 정규화만 유지 — 러프 원본을 다듬는 건 리터칭 본연의 일. */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[8px] border border-zinc-800/80 p-2.5">
                    <div className="flex items-center gap-2">
                      <Wand className={`w-3 h-3 ${applyAutoRefine ? 'text-emerald-400' : 'text-zinc-600'}`} />
                      <span className={`text-[10px] font-bold ${applyAutoRefine ? 'text-emerald-300' : 'text-[#a6a6a6]'}`}>스케치 자동 정규화</span>
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

        {/* ═════════ 고급 옵션 — 바이올렛 톤으로 Quick Start 와 시각 구분 ═════════ */}
        <div className="mt-1">
          <button
            onClick={toggleDetails}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] border transition-colors ${
              detailsOpen
                ? 'bg-[#17151F] text-zinc-200'
                : 'bg-[#121212] border-dashed text-zinc-400 hover:text-zinc-200'
            }`}
            style={{ borderColor: detailsOpen ? `${ADV}55` : `${ADV}30` }}
            title="레이아웃·굵기·추가 효과·가드 + 직접 입력"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" style={{ color: ADV }} />
              <span className="text-[11px] font-bold">고급 옵션</span>
              <span className="text-[8px] font-black tracking-[0.15em] px-1.5 py-0.5 rounded" style={{ background: `${ADV}22`, color: ADV }}>PRO</span>
            </div>
            {detailsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {detailsOpen && (
            <div className="mt-2 rounded-[12px] border p-2.5 flex flex-col gap-2.5 bg-[#121016]" style={{ borderColor: `${ADV}26` }}>

              {/* 세부 요구사항 직접 입력 (Creation only) — 끝 모양·간격·질감·장식 등
                  미세 드롭다운을 대체하는 자유 텍스트. 항상 노출 (아코디언 아님). */}
              {!isEditMode && (
                <div className="rounded-[10px] border border-zinc-800/80 bg-[#161320] p-2.5">
                  <FieldHeader
                    icon={<PencilLine className="w-3 h-3" style={{ color: ADV }} />}
                    label={FRIENDLY.custom.label}
                    hint={FRIENDLY.custom.hint}
                    right={isTranslatingShape ? <Loader2 className="w-3 h-3 animate-spin text-zinc-500" /> : null}
                  />
                  <textarea
                    value={customShapeText}
                    onChange={e => setCustomShapeText(e.target.value)}
                    placeholder={"예: T를 십자가 모양으로 / 끝을 더 뾰족하게 / 글자끼리 붙여서 / 주변에 룬 문자"}
                    className="w-full bg-[#0E0C14] text-[11px] p-2.5 rounded-[8px] border border-zinc-800 outline-none min-h-[3.5rem] resize-none text-zinc-300 placeholder:text-zinc-600 transition-all focus:border-[#A29BFE]/50"
                  />
                </div>
              )}

              <SectionGroupAccent value={ADV}>

                {/* 리터칭 모디파이어 (Edit only) — 디테일 안쪽에서 가장 먼저 */}
                {isEditMode && (
                  <SectionGroup
                    icon={<Highlighter className="w-3.5 h-3.5" />}
                    label={FRIENDLY.retouchMods.label}
                    {...sectionProps('retouch')}
                  >
                    <div title={FRIENDLY.retouchMods.pro} className="text-[9px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.retouchMods.hint}</div>
                    <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(dynamicOptions?.editStrokeMods || [])]} value={editStrokeMod} onChange={setEditStrokeMod} />
                    <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(dynamicOptions?.editElementMods || [])]} value={editElementMod} onChange={setEditElementMod} />
                    <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(dynamicOptions?.editSurfaceMods || [])]} value={editSurfaceMod} onChange={setEditSurfaceMod} />
                  </SectionGroup>
                )}

                {/* 레이아웃 · 배치 (Creation only) — 리터칭은 대상 이미지의 배치를 그대로 보존하므로 제외 */}
                {!isEditMode && (
                <SectionGroup
                  icon={<LayoutTemplate className="w-3.5 h-3.5" />}
                  label={FRIENDLY.layout.label}
                  {...sectionProps('layout')}
                >
                  <div title={FRIENDLY.layout.pro} className="text-[9px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.layout.hint}</div>
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
                )}

                {/* 굵기 · 비율 (Creation only) */}
                {!isEditMode && (
                  <SectionGroup
                    icon={<Type className="w-3.5 h-3.5" />}
                    label={FRIENDLY.weight.label}
                    {...sectionProps('weight')}
                  >
                    <div title={FRIENDLY.weight.pro} className="text-[9px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.weight.hint}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <DropdownControl label="획 굵기" data={[...staticOptions.stemWeights, ...(dynamicOptions?.stemWeights || [])]} value={stemWeight} onChange={setStemWeight} />
                      <DropdownControl label="글자 폭" data={[...staticOptions.widths, ...(dynamicOptions?.widths || [])]} value={charWidth} onChange={setCharWidth} />
                    </div>
                    <DropdownControl label="비율 (장평)" data={staticOptions.proportions} value={charProportion} onChange={setCharProportion} />
                  </SectionGroup>
                )}

                {/* 추가 효과 (모디파이어 + 전투 동세) (Creation only) —
                    리터칭의 변형 허용량은 기본 정제(5-15%)로 고정, 강도는 느낌 슬라이더(±2)가 담당 */}
                {!isEditMode && (
                <SectionGroup
                  icon={<Wand className="w-3.5 h-3.5" />}
                  label={FRIENDLY.modifier.label}
                  {...sectionProps('modifier')}
                >
                  <div title={FRIENDLY.modifier.pro} className="text-[9px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.modifier.hint}</div>
                  {/* 모디파이어 활성 + 모드 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${isEnhanceModeEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}>{isEnhanceModeEnabled ? '활성화됨' : '비활성'}</span>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsEnhanceModeEnabled(!isEnhanceModeEnabled)}>
                      <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors ${isEnhanceModeEnabled ? 'bg-indigo-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                        <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${isEnhanceModeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-[8px] border bg-[#171717] border-zinc-800/80 ${!isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                    <div className="flex bg-[#0A0A0A] rounded-[8px] p-1 border border-zinc-800/60">
                      <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('refine')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${enhanceMode === 'refine' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💎 정제</button>
                      <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('variation')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>🎨 변주</button>
                      <button onClick={() => isEnhanceModeEnabled && setEnhanceMode('deconstruct')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💥 해체</button>
                    </div>
                  </div>

                  {/* 전투 동세 토글 */}
                  <div className="pt-2 mt-1 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FastForward className="w-3 h-3 text-[#a6a6a6]" />
                        <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#a6a6a6]">전투 동세</h3>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMomentumActive(!momentumActive)}>
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${momentumActive ? 'text-amber-400' : 'text-zinc-500'}`}>{momentumActive ? 'ON' : 'OFF'}</span>
                        <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors ${momentumActive ? 'bg-amber-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                          <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${momentumActive ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionGroup>
                )}

                {/* 배경 & 보호 가드 (Creation only) — 리터칭은 원본의 배경·색을 그대로 보존 */}
                {!isEditMode && (
                <SectionGroup
                  icon={<Shield className="w-3.5 h-3.5" />}
                  label={FRIENDLY.guards.label}
                  {...sectionProps('guards')}
                >
                  <div title={FRIENDLY.guards.pro} className="text-[9px] text-zinc-500 mb-1 leading-snug">{FRIENDLY.guards.hint}</div>
                  <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={baseStyle} onChange={setBaseStyle} />
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {GUARD_OPTIONS.map(g => {
                      const on = activeGuards.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          onClick={() => toggleGuard(g.id)}
                          title={g.hint}
                          className={`px-2 py-2 rounded-[8px] text-[9.5px] font-bold border transition-colors text-left ${on ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                        >
                          {on ? '🔒 ' : '🔓 '}{g.label}
                        </button>
                      );
                    })}
                  </div>
                </SectionGroup>
                )}

              </SectionGroupAccent>
            </div>
          )}
        </div>

        {/* ═════════ Import / Reset (Creation only) ═════════ */}
        {!isEditMode && (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button onClick={() => setIsImportModalOpen(true)} title="프롬프트로 설정 복원" className="py-2 rounded-[8px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <FileUp className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">불러오기</span>
            </button>
            <button onClick={handleReset} title="초기화" className="py-2 rounded-[8px] bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <RefreshCcw className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold">초기화</span>
            </button>
          </div>
        )}

      </div>
    </aside>
  );
};

export default Sidebar;
