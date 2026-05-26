/* eslint-disable */
// current 메인 워크스페이스: 헤더 액션바, 모델 탭, Spec Matrix, 컴파일 버튼, 출력 박스.
import React, { useState } from 'react';
import {
  Menu, Edit3, PenTool, FileUp, ChevronDown, Shield, Loader2, RefreshCcw, CheckCircle, Copy,
  Type, LayoutTemplate, Users, Sliders, Brush, Activity, Wand, Highlighter, Hexagon, Layers,
  RotateCcw,
} from 'lucide-react';
import OverviewTab from './OverviewTab.jsx';
import AiOutputBox from './AiOutputBox.jsx';
import ImagenRenderArea from './ImagenRenderArea.jsx';
import { DropdownControl } from './PrimitiveUI.jsx';
import { staticOptions } from '../constants/options.js';
import { coreArchetypes } from '../constants/personas.jsx';
import { getOptionName, aiOptimizationModels } from '../constants/utils.js';

// 각 옵션의 기본값 — 카드 초기화(Reset) 버튼에서 참조. useSovereignPromptCurrent 의 useState 초기값과 동기 유지.
const DEFAULTS = {
  stemWeight: "Stem_Heavy", charWidth: "Normal", charProportion: "P_Std",
  kerning: "Kern_Std", letterConnection: "Conn_Indep", internalSpace: "Space_Std", logoDegree: "Logo_Std",
  terminalStyle: "Term_Chisel", strokeSharpness: "Sharp_Std", cornerStyle: "Corner_Right", strokeExtension: "Ext_None",
  slicingIntensity: "Slic_None", kineticVelocity: "Vel_Static", slantAngle: "Slant_0",
  deformationDamage: "Damage_None", strokeTexture: "Tex_Clean", baseStyle: "BlackWhite",
  mmoSurroundingElement: "Clean", mmoSilhouetteFraming: "Emblem",
  aspectRatio: "16:9", occupancy: "50%", layoutType: "Center", subTitleSize: "Sub_Small",
  editStrokeMod: "E_Stroke_None", editElementMod: "E_Elem_None", editSurfaceMod: "E_Surf_None",
};

// 라벨:값 페어 — 컴팩트 표시. 5-col 그리드에서 카드 폭 ~268px 에 맞춰 라벨 폭을 좁힘.
// 텍스트 두께는 레귤러(font-normal) — 시각적 노이즈 감소.
const Pair = ({ label, value, accent }) => (
  <div className="flex items-baseline gap-1.5 text-[10.5px] leading-tight">
    <span className="text-zinc-600 shrink-0 w-[44px] font-normal tracking-tight">{label}</span>
    <span className={`font-normal truncate flex-1 min-w-0 ${accent === 'amber' ? 'text-amber-300' : accent === 'indigo' ? 'text-indigo-300' : accent === 'rose' ? 'text-rose-300' : 'text-zinc-200'}`}>{value}</span>
  </div>
);

// 의미 단위 행 라벨 — 카드 그룹 위에 표시.
const RowLabel = ({ label, accent = 'zinc' }) => (
  <div className={`flex items-center gap-2 mb-2 pl-2 border-l-2 ${accent === 'indigo' ? 'border-indigo-500/50' : accent === 'cyan' ? 'border-cyan-500/40' : accent === 'amber' ? 'border-amber-500/40' : accent === 'rose' ? 'border-rose-500/40' : accent === 'emerald' ? 'border-emerald-500/40' : 'border-zinc-700'}`}>
    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</span>
  </div>
);

// 인라인 토글 버튼 — 카드 내부 boolean 컨트롤용.
const InlineToggle = ({ label, value, onToggle, accent = 'indigo' }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`flex items-center justify-between bg-[#1C1C1C] rounded-md border px-3 py-2 transition-colors w-full ${value ? `border-${accent}-500/40` : 'border-zinc-800 hover:border-zinc-700'}`}
  >
    <span className={`text-[11px] font-bold ${value ? `text-${accent}-300` : 'text-zinc-500'}`}>{label}</span>
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${value ? `bg-${accent}-500/20 text-${accent}-300` : 'bg-zinc-800 text-zinc-500'}`}>{value ? 'ON' : 'OFF'}</span>
  </button>
);

// 클릭 펼침 + Reset 버튼이 있는 카드. editingCard 상태는 상위 Workspace 에서 관리.
// 5-col 그리드 대응: 패딩·gap·라벨 사이즈를 줄여 ~268px 카드폭에 맞춤.
const EditableCard = ({ id, label, icon, summary, controls, onReset, className = '', editingCard, setEditingCard }) => {
  const isEditing = editingCard === id;
  const toggle = () => setEditingCard(isEditing ? null : id);
  return (
    // overflow 는 visible — DropdownControl 의 펼친 팝오버가 카드 밖으로 나올 수 있게.
    // 펼쳐진 상태에서 카드 z-index 를 올려 다른 카드 위로 떠야 가려지지 않음.
    <div className={`bg-[#121212] rounded-[7px] border transition-colors flex flex-col ${isEditing ? 'border-indigo-500/40 shadow-[0_0_0_1px_rgba(99,102,241,0.15)] relative z-20' : 'border-zinc-800/50 hover:border-zinc-700 relative'} ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
        className="flex items-center justify-between gap-1 px-2.5 pt-2 pb-1.5 cursor-pointer select-none"
      >
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500 truncate">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {onReset && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onReset(); } }}
              className="text-zinc-600 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
              title="기본값으로 초기화"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </span>
          )}
          <ChevronDown className={`w-2.5 h-2.5 text-zinc-600 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
        </span>
      </div>
      <div className="px-2.5 pb-2 flex flex-col gap-1">
        {!isEditing ? (
          <div className="flex flex-col gap-1 min-h-0">{summary}</div>
        ) : (
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>{controls}</div>
        )}
      </div>
    </div>
  );
};

const Workspace = ({ rp, imagen }) => {
  const scores = rp.getValidationScores();
  // 현재 인라인 편집 중인 카드 id. null 이면 모두 요약(읽기) 상태.
  const [editingCard, setEditingCard] = useState(null);

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#18181B] rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <div className="w-full pb-20">

          {/* Header Action Bar */}
          <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/60 mb-6">
            <div className="flex items-center gap-3">
              {!rp.isSidebarOpen && (
                <button onClick={() => rp.setIsSidebarOpen(true)} className="p-2 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[8px] border border-zinc-700 transition-colors shadow-sm shrink-0">
                  <Menu className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                </button>
              )}
              <div>
                <h2 className="text-[20px] font-bold text-white flex items-center gap-2">
                  {rp.isEditMode ? <><Edit3 className="w-5 h-5 text-zinc-400" /> 마이크로 리터칭</> : <><PenTool className="w-5 h-5 text-zinc-400" /> 프롬프트 생성</>}
                </h2>
                <p className="text-[11px] tracking-tight text-zinc-500 mt-1">{rp.isEditMode ? '기준 이미지의 형태를 95% 보존하면서 표면·디테일만 리터칭합니다.' : '선택한 옵션을 모델별 프롬프트로 조립합니다.'}</p>
              </div>
            </div>
            {!rp.isEditMode && (
              <button onClick={() => rp.setIsImportModalOpen(true)} title="프롬프트 역설계 (텍스트/JSON)" className="p-2.5 rounded-[10px] bg-[#1C1C1C] border border-zinc-700 hover:bg-[#262626] text-zinc-400 transition-colors flex items-center justify-center shadow-sm">
                <FileUp className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Model Adapters Tabs */}
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar mb-6">
            <button onClick={() => rp.setModel('Overview')} className={`shrink-0 min-w-max px-6 py-2.5 rounded-[8px] text-[12px] font-bold tracking-wide font-sans transition-all shadow-sm ${rp.currentModel === 'Overview' ? 'bg-zinc-800 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>Validation</button>
            {aiOptimizationModels.map(model => (
              <button key={model.id} onClick={() => rp.setModel(model.id)} className={`shrink-0 min-w-max px-6 py-2.5 rounded-[8px] text-[12px] font-bold tracking-wide font-sans transition-all shadow-sm ${rp.currentModel === model.id ? 'bg-indigo-600 text-white' : 'bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>{model.name}</button>
            ))}
          </div>

          {/* Dynamic Content based on selected Model */}
          {rp.currentModel === 'Overview' ? (
            <OverviewTab
              scores={scores}
              executeAutoCorrection={rp.executeAutoCorrection}
              handleApplyAllCorrections={rp.handleApplyAllCorrections}
            />
          ) : (
            <>
              {/* System Specification Matrix */}
              <div className="bg-[#1C1C1C] border border-zinc-800/80 rounded-[12px] p-5 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-5 border-b border-zinc-800/50 pb-3">
                  <div>
                    <span className="text-zinc-500 font-bold text-[10px] tracking-wide block mb-1">실제 적용된 옵션</span>
                    <h4 className="text-zinc-200 text-[13px] font-bold">현재 설정 요약</h4>
                  </div>
                  <button onClick={() => rp.setExpanded(!rp.isExpanded)} className="text-[11px] font-bold font-sans bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5">
                    {rp.isExpanded ? 'Summary' : 'View Raw'} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rp.isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {!rp.isExpanded ? (
                  (() => {
                    const persona = coreArchetypes.find(p => p.id === rp.coreArchetype);
                    const dyn = rp.dynamicOptions || {};
                    const list = (key) => [...(staticOptions[key] || []), ...(dyn[key] || [])];
                    const name = (key, val) => getOptionName(list(key), val);
                    const GUARD_LABELS = { guard_mutation: '텍스트', guard_layout: '레이아웃', guard_3d: '2D 평면', guard_noise: 'VFX 억제' };
                    const toggleGuard = (id) => rp.setActiveGuards(rp.activeGuards.includes(id) ? rp.activeGuards.filter(g => g !== id) : [...rp.activeGuards, id]);
                    const cardProps = { editingCard, setEditingCard };
                    // 5-col 그리드 + 의미별 행 그룹화. 각 그룹은 row 단위로 분리되어 빈 슬롯이
                    // 자연스럽게 좌측 클러스터링을 만들고, 위 RowLabel 로 의미 단위를 시각화한다.
                    const gridCls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2";
                    return (
                      <div className="flex flex-col gap-4">

                        {/* ─── Group A: 의도 (Intent) — 프롬프트 상단 auraBlock + modeSpecificBlock ─── */}
                        <section>
                          <RowLabel label="의도 (Intent)" accent="indigo" />
                          <div className={gridCls}>
                        {/* 1. 콘텐츠 & 의도 — Aura at top of prompt */}
                        <EditableCard {...cardProps} id="content" label="콘텐츠 & 의도" icon={<Type className="w-3 h-3" />}
                          onReset={() => { rp.setCustomDesignInjections(''); rp.setPersonaSliderValue(50); }}
                          summary={<>
                            <div className="text-[13px] text-indigo-300 font-normal break-all leading-tight">"{rp.inputText}"</div>
                            {rp.customDesignInjections ? (
                              <div className="text-[10px] text-zinc-500 leading-snug line-clamp-2 mt-0.5">{rp.customDesignInjections}</div>
                            ) : (
                              <div className="text-[10px] text-zinc-700 italic">Aura 입력 없음</div>
                            )}
                            <div className="text-[9px] text-zinc-600 mt-auto pt-1 border-t border-zinc-800/50">Mass ↔ Sharpness · {rp.personaSliderValue}</div>
                          </>}
                          controls={<>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">텍스트</div>
                              <textarea value={rp.inputText} onChange={(e) => rp.setInputText(e.target.value)} rows={1} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-md px-2.5 py-1.5 text-[12px] text-white font-bold outline-none focus:border-indigo-500/50 resize-none" />
                            </div>
                            <div>
                              <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Aura</div>
                              <textarea value={rp.customDesignInjections} onChange={(e) => rp.setCustomDesignInjections(e.target.value)} placeholder="분위기·형태 묘사" rows={2} className="w-full bg-[#0A0A0A] border border-zinc-800 rounded-md px-2.5 py-1.5 text-[11px] text-zinc-300 outline-none focus:border-indigo-500/50 resize-none" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
                                <span>Mass ↔ Sharpness</span><span>{rp.personaSliderValue}</span>
                              </div>
                              <input type="range" min="0" max="100" value={rp.personaSliderValue} onChange={(e) => rp.setPersonaSliderValue(e.target.value)} className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
                            </div>
                          </>}
                        />

                        {/* 2. 모디파이어 — modeSpecificBlock 위치 */}
                        <EditableCard {...cardProps} id="modifier" label="모디파이어" icon={<Wand className="w-3 h-3" />}
                          onReset={() => { rp.setIsEnhanceModeEnabled(true); rp.setEnhanceMode('refine'); }}
                          summary={<>
                            <Pair label="활성화" value={rp.isEnhanceModeEnabled ? 'ON' : 'OFF'} accent={rp.isEnhanceModeEnabled ? 'indigo' : null} />
                            <Pair label="모드" value={rp.isEnhanceModeEnabled ? (rp.enhanceMode === 'refine' ? '💎 정제' : rp.enhanceMode === 'variation' ? '🎨 변주' : '💥 해체') : '—'} accent={rp.isEnhanceModeEnabled ? (rp.enhanceMode === 'deconstruct' ? 'rose' : 'indigo') : null} />
                          </>}
                          controls={<>
                            <InlineToggle label="모디파이어 활성" value={rp.isEnhanceModeEnabled} onToggle={() => rp.setIsEnhanceModeEnabled(!rp.isEnhanceModeEnabled)} />
                            <div className={`grid grid-cols-3 gap-1.5 ${!rp.isEnhanceModeEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                              {[['refine', '💎 정제', 'indigo'], ['variation', '🎨 변주', 'emerald'], ['deconstruct', '💥 해체', 'rose']].map(([id, label, color]) => (
                                <button key={id} onClick={() => rp.setEnhanceMode(id)} className={`py-1.5 rounded-md text-[10px] font-bold border transition-colors ${rp.enhanceMode === id ? `bg-${color}-500/20 text-${color}-300 border-${color}-500/40` : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>{label}</button>
                              ))}
                            </div>
                          </>}
                        />

                          </div>
                        </section>

                        {/* ─── Group B: 캔버스 (Canvas) — 레이아웃 + 페르소나 ─── */}
                        <section>
                          <RowLabel label="캔버스 (Canvas)" accent="cyan" />
                          <div className={gridCls}>
                        {/* 3. 레이아웃 */}
                        <EditableCard {...cardProps} id="layout" label="레이아웃" icon={<LayoutTemplate className="w-3 h-3" />}
                          onReset={() => { rp.setAspectRatio(DEFAULTS.aspectRatio); rp.setOccupancy(DEFAULTS.occupancy); rp.setLayoutType(DEFAULTS.layoutType); rp.setMmoSilhouetteFraming(DEFAULTS.mmoSilhouetteFraming); rp.setSubTitleSize(DEFAULTS.subTitleSize); rp.setLayoutPreset(''); }}
                          summary={<>
                            <Pair label="배열" value={name('layouts', rp.layoutType)} />
                            <Pair label="비율" value={name('ratios', rp.aspectRatio)} />
                            <Pair label="점유" value={name('occupancies', rp.occupancy)} />
                            <Pair label="실루엣" value={name('MMOSilhouetteFramings', rp.mmoSilhouetteFraming)} />
                            {(rp.layoutType === 'TitleSub' || rp.layoutType === 'SubTitle') && (
                              <Pair label="서브" value={name('subTitleSizes', rp.subTitleSize)} />
                            )}
                          </>}
                          controls={<>
                            <DropdownControl label="배열" data={staticOptions.layouts} value={rp.layoutType} onChange={(v) => { rp.setLayoutType(v); rp.setLayoutPreset(''); }} />
                            <div className="grid grid-cols-2 gap-2">
                              <DropdownControl label="비율" data={staticOptions.ratios} value={rp.aspectRatio} onChange={(v) => { rp.setAspectRatio(v); rp.setLayoutPreset(''); }} />
                              <DropdownControl label="점유" data={staticOptions.occupancies} value={rp.occupancy} onChange={(v) => { rp.setOccupancy(v); rp.setLayoutPreset(''); }} />
                            </div>
                            <DropdownControl label="실루엣" data={staticOptions.MMOSilhouetteFramings} value={rp.mmoSilhouetteFraming} onChange={(v) => { rp.setMmoSilhouetteFraming(v); rp.setLayoutPreset(''); }} />
                            {(rp.layoutType === 'TitleSub' || rp.layoutType === 'SubTitle') && (
                              <DropdownControl label="서브 크기" data={staticOptions.subTitleSizes} value={rp.subTitleSize} onChange={rp.setSubTitleSize} />
                            )}
                          </>}
                        />

                        {/* 4. 디렉터 페르소나 */}
                        <EditableCard {...cardProps} id="persona" label="디렉터 페르소나" icon={<Users className="w-3 h-3" />}
                          onReset={() => { rp.setCoreArchetype('core_fortress'); rp.setScriptType?.('Gen_Original'); }}
                          summary={<>
                            <div className="text-[13px] text-zinc-200 font-normal leading-tight">{persona?.shortTitle}</div>
                            <div className="text-[10px] text-zinc-500 leading-snug">{persona?.subtitle}</div>
                            {rp.scriptType && (
                              <div className="text-[9px] text-zinc-600 mt-auto pt-1 border-t border-zinc-800/50">
                                타입 프리셋 · {name('MMOStyles', rp.scriptType)}
                              </div>
                            )}
                          </>}
                          controls={<>
                            <DropdownControl label="페르소나" data={coreArchetypes.map(p => ({ id: p.id, name: p.shortTitle, en: p.subtitle }))} value={rp.coreArchetype} onChange={rp.setCoreArchetype} />
                            <DropdownControl label="타입 프리셋" data={staticOptions.MMOStyles} value={rp.scriptType} onChange={rp.handleScriptPresetChange || rp.setScriptType} />
                          </>}
                        />

                          </div>
                        </section>

                        {/* ─── Group C: 형태 (Form) — Feature / Terminals / Logo character ─── */}
                        <section>
                          <RowLabel label="형태 (Form)" accent="emerald" />
                          <div className={gridCls}>
                        {/* 5. 형태 (Feature) — Creation / 리터칭 — Edit */}
                        {!rp.isEditMode ? (
                          <EditableCard {...cardProps} id="feature" label="형태 (Feature)" icon={<Sliders className="w-3 h-3" />}
                            onReset={() => { rp.setStemWeight(DEFAULTS.stemWeight); rp.setCharWidth(DEFAULTS.charWidth); rp.setCharProportion(DEFAULTS.charProportion); rp.setKerning(DEFAULTS.kerning); rp.setLetterConnection(DEFAULTS.letterConnection); rp.setInternalSpace(DEFAULTS.internalSpace); }}
                            summary={<>
                              <Pair label="획 무게" value={name('stemWeights', rp.stemWeight)} />
                              <Pair label="폭" value={name('widths', rp.charWidth)} />
                              <Pair label="자간" value={name('kerningOptions', rp.kerning)} />
                              <Pair label="결합" value={name('letterConnections', rp.letterConnection)} />
                              <Pair label="내부 공간" value={name('internalSpaces', rp.internalSpace)} />
                            </>}
                            controls={<>
                              <div className="grid grid-cols-2 gap-2">
                                <DropdownControl label="획 무게" data={list('stemWeights')} value={rp.stemWeight} onChange={rp.setStemWeight} />
                                <DropdownControl label="폭" data={staticOptions.widths} value={rp.charWidth} onChange={rp.setCharWidth} />
                                <DropdownControl label="자간" data={list('kerningOptions')} value={rp.kerning} onChange={rp.setKerning} />
                                <DropdownControl label="결합" data={staticOptions.letterConnections} value={rp.letterConnection} onChange={rp.setLetterConnection} />
                                <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={rp.internalSpace} onChange={rp.setInternalSpace} />
                              </div>
                            </>}
                          />
                        ) : (
                          <EditableCard {...cardProps} id="retouch" label="리터칭 모디파이어" icon={<Highlighter className="w-3 h-3" />}
                            onReset={() => { rp.setEditStrokeMod(DEFAULTS.editStrokeMod); rp.setEditElementMod(DEFAULTS.editElementMod); rp.setEditSurfaceMod(DEFAULTS.editSurfaceMod); rp.setApplyAiRecInEdit(false); rp.setApplyAutoRefine(false); }}
                            summary={<>
                              <Pair label="획 변형" value={name('editStrokeMods', rp.editStrokeMod)} />
                              <Pair label="요소 변환" value={name('editElementMods', rp.editElementMod)} />
                              <Pair label="표면 질감" value={name('editSurfaceMods', rp.editSurfaceMod)} />
                              <Pair label="AI 자동" value={rp.applyAiRecInEdit ? 'ON' : 'OFF'} accent={rp.applyAiRecInEdit ? 'indigo' : null} />
                              <Pair label="자동 정규화" value={rp.applyAutoRefine ? 'ON' : 'OFF'} accent={rp.applyAutoRefine ? 'indigo' : null} />
                            </>}
                            controls={<>
                              <DropdownControl label="획 변형" data={list('editStrokeMods')} value={rp.editStrokeMod} onChange={rp.setEditStrokeMod} />
                              <DropdownControl label="요소 변환" data={list('editElementMods')} value={rp.editElementMod} onChange={rp.setEditElementMod} />
                              <DropdownControl label="표면 질감" data={list('editSurfaceMods')} value={rp.editSurfaceMod} onChange={rp.setEditSurfaceMod} />
                              <InlineToggle label="AI 조형 자동 추천" value={rp.applyAiRecInEdit} onToggle={() => rp.setApplyAiRecInEdit(!rp.applyAiRecInEdit)} />
                              <InlineToggle label="스케치 자동 정규화" value={rp.applyAutoRefine} onToggle={() => rp.setApplyAutoRefine(!rp.applyAutoRefine)} accent="emerald" />
                            </>}
                          />
                        )}

                        {/* 6. 마감 (Terminals) */}
                        <EditableCard {...cardProps} id="terminals" label="마감 (Terminals)" icon={<Brush className="w-3 h-3" />}
                          onReset={() => { rp.setTerminalStyle(DEFAULTS.terminalStyle); rp.setStrokeSharpness(DEFAULTS.strokeSharpness); rp.setCornerStyle(DEFAULTS.cornerStyle); rp.setStrokeExtension(DEFAULTS.strokeExtension); }}
                          summary={<>
                            <Pair label="마감" value={name('terminalStyles', rp.terminalStyle)} />
                            <Pair label="예리함" value={name('strokeSharpness', rp.strokeSharpness)} />
                            <Pair label="코너" value={name('cornerStyles', rp.cornerStyle)} />
                            <Pair label="연장" value={name('strokeExtensions', rp.strokeExtension)} />
                          </>}
                          controls={<>
                            <div className="grid grid-cols-2 gap-2">
                              <DropdownControl label="마감" data={list('terminalStyles')} value={rp.terminalStyle} onChange={rp.setTerminalStyle} />
                              <DropdownControl label="예리함" data={list('strokeSharpness')} value={rp.strokeSharpness} onChange={rp.setStrokeSharpness} />
                              <DropdownControl label="코너" data={list('cornerStyles')} value={rp.cornerStyle} onChange={rp.setCornerStyle} />
                              <DropdownControl label="연장" data={list('strokeExtensions')} value={rp.strokeExtension} onChange={rp.setStrokeExtension} />
                            </div>
                          </>}
                        />

                        {/* 7. 로고 (Logo character) */}
                        <EditableCard {...cardProps} id="logo" label="로고화" icon={<Hexagon className="w-3 h-3" />}
                          onReset={() => rp.setLogoDegree(DEFAULTS.logoDegree)}
                          summary={<>
                            <Pair label="로고화 정도" value={name('logoDegrees', rp.logoDegree)} />
                          </>}
                          controls={<DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={rp.logoDegree} onChange={rp.setLogoDegree} />}
                        />

                          </div>
                        </section>

                        {/* ─── Group D: 동세 & 표면 (Motion & Surface) ─── */}
                        <section>
                          <RowLabel label="동세 & 표면 (Motion & Surface)" accent="amber" />
                          <div className={gridCls}>
                        {/* 8. 다이나믹 (Structure modified by) */}
                        <EditableCard {...cardProps} id="dynamics" label="다이나믹" icon={<Activity className="w-3 h-3" />}
                          onReset={() => { rp.setKineticVelocity(DEFAULTS.kineticVelocity); rp.setSlantAngle(DEFAULTS.slantAngle); rp.setSlicingIntensity(DEFAULTS.slicingIntensity); rp.setMomentumActive(false); }}
                          summary={<>
                            <Pair label="동세" value={name('kineticVelocities', rp.kineticVelocity)} />
                            <Pair label="기울기" value={name('slantAngles', rp.slantAngle)} />
                            <Pair label="절단" value={name('slicingIntensities', rp.slicingIntensity)} />
                            <Pair label="전투 동세" value={rp.momentumActive ? 'ON' : 'OFF'} accent={rp.momentumActive ? 'amber' : null} />
                          </>}
                          controls={<>
                            <div className="grid grid-cols-2 gap-2">
                              <DropdownControl label="동세" data={list('kineticVelocities')} value={rp.kineticVelocity} onChange={rp.setKineticVelocity} />
                              <DropdownControl label="기울기" data={staticOptions.slantAngles} value={rp.slantAngle} onChange={rp.setSlantAngle} />
                              <DropdownControl label="절단" data={staticOptions.slicingIntensities} value={rp.slicingIntensity} onChange={rp.setSlicingIntensity} />
                            </div>
                            <InlineToggle label="전투 동세 (Combat Dynamics)" value={rp.momentumActive} onToggle={() => rp.setMomentumActive(!rp.momentumActive)} accent="amber" />
                          </>}
                        />

                        {/* 9. 표면 & 배경 */}
                        <EditableCard {...cardProps} id="surface" label="표면 & 배경" icon={<Layers className="w-3 h-3" />}
                          onReset={() => { rp.setDeformationDamage(DEFAULTS.deformationDamage); rp.setStrokeTexture(DEFAULTS.strokeTexture); rp.setBaseStyle(DEFAULTS.baseStyle); }}
                          summary={<>
                            <Pair label="손상" value={name('deformationDamages', rp.deformationDamage)} />
                            <Pair label="텍스처" value={name('strokeTextures', rp.strokeTexture)} />
                            <Pair label="배경" value={name('base', rp.baseStyle)} />
                          </>}
                          controls={<>
                            <DropdownControl label="손상" data={list('deformationDamages')} value={rp.deformationDamage} onChange={rp.setDeformationDamage} />
                            <DropdownControl label="텍스처" data={staticOptions.strokeTextures} value={rp.strokeTexture} onChange={rp.setStrokeTexture} />
                            <DropdownControl label="배경" data={staticOptions.base} value={rp.baseStyle} onChange={rp.setBaseStyle} />
                          </>}
                        />

                          </div>
                        </section>

                        {/* ─── Group E: 환경 & 보호 (Environment & Guards) ─── */}
                        <section>
                          <RowLabel label="환경 & 보호 (Environment)" accent="rose" />
                          <div className={gridCls}>
                        {/* 10. 주변 장식 (Surrounding) */}
                        <EditableCard {...cardProps} id="surrounding" label="주변 장식" icon={<Sliders className="w-3 h-3" />}
                          onReset={() => rp.setMmoSurroundingElement(DEFAULTS.mmoSurroundingElement)}
                          summary={<Pair label="장식" value={name('MMOSurroundingElements', rp.mmoSurroundingElement)} />}
                          controls={<DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={rp.mmoSurroundingElement} onChange={rp.setMmoSurroundingElement} />}
                        />

                        {/* 11. 가드 (Guards) */}
                        <EditableCard {...cardProps} id="guards" label="가드" icon={<Shield className="w-3 h-3" />}
                          onReset={() => rp.setActiveGuards(['guard_mutation', 'guard_3d', 'guard_layout', 'guard_noise'])}
                          summary={<div className="flex flex-wrap gap-1 items-center">
                            {rp.activeGuards.length === 0 ? (
                              <span className="text-[10px] text-zinc-700 italic">없음</span>
                            ) : (
                              rp.activeGuards.map(g => (
                                <span key={g} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded">{GUARD_LABELS[g] || g}</span>
                              ))
                            )}
                          </div>}
                          controls={<div className="flex flex-wrap gap-1.5">
                            {Object.entries(GUARD_LABELS).map(([id, label]) => {
                              const on = rp.activeGuards.includes(id);
                              return (
                                <button key={id} onClick={() => toggleGuard(id)} className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${on ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>{label}</button>
                              );
                            })}
                          </div>}
                        />
                          </div>
                        </section>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-[#0A0A0A] p-4 rounded-[8px] border border-zinc-800 relative">
                    <button onClick={() => rp.copyToClipboard(rp.currentPrompts.baseTechnicalEn, 'top')} className="absolute top-3 right-3 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] flex items-center gap-1 font-sans">
                      {rp.copiedTop ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                    </button>
                    <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap leading-relaxed font-sans">{rp.currentPrompts.baseTechnicalEn}</pre>
                  </div>
                )}
              </div>

              {/* Action Button for the selected Model */}
              <div className="mt-8 flex justify-end">
                {rp.currentModel === 'NanoBanana' && (
                  <button onClick={rp.handleCompileNanoBanana} disabled={rp.isGeneratingNano} className={`px-6 py-3.5 rounded-[8px] font-bold font-sans text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingNano ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
                {rp.currentModel === 'Midjourney' && (
                  <button onClick={rp.handleCompileMj} disabled={rp.isGeneratingMj} className={`px-6 py-3.5 rounded-[8px] font-bold font-sans text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingMj ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
                {rp.currentModel === 'ChatGPT' && (
                  <button onClick={rp.handleCompileCg} disabled={rp.isGeneratingCg} className={`px-6 py-3.5 rounded-[8px] font-bold font-sans text-[13px] transition-all flex items-center justify-center gap-2 shadow-md w-full sm:w-auto ${rp.isPromptOutdated ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 cursor-default'}`}>
                    {rp.isGeneratingCg ? <Loader2 className="w-4 h-4 animate-spin" /> : (rp.isPromptOutdated ? <RefreshCcw className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />)}
                    {rp.isPromptOutdated ? 'Compile Directives' : 'Compiled (Up to date)'}
                  </button>
                )}
              </div>

              {/* 프롬프트(좌) · 렌더링(우) — 페이지 폭에 따라 늘어나는 2-컬럼 grid.
                  좁은 폭에선 자동으로 세로로 쌓임. */}
              {(rp.currentModel === 'NanoBanana' || rp.currentModel === 'Midjourney' || rp.currentModel === 'ChatGPT') && (
                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
                  <div className="min-w-0 flex flex-col">
                    <AiOutputBox
                      modelState={rp.currentModel}
                      content={rp.currentOutputContent}
                      outdatedFlag={rp.isPromptOutdated}
                      copiedBottom={rp.copiedBottom}
                      copyToClipboard={rp.copyToClipboard}
                    />
                  </div>
                  {imagen && (
                    <div className="min-w-0 flex flex-col">
                      <ImagenRenderArea
                        promptText={rp.currentOutputContent}
                        {...imagen}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Workspace;
