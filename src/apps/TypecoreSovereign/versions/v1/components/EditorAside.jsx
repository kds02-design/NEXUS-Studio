/* eslint-disable */
// v1 전용 생성(Editor) 뷰 좌측 사이드바.
import React from 'react';
import {
    Command, Sparkles, ImageIcon, MessageSquare, Wand, Loader2, SlidersHorizontal,
    Bot, RefreshCcw, Anchor, Settings, LayoutTemplate, Box as BoxIcon, Brush,
    Layers3, Activity
} from 'lucide-react';
import { DropdownControl, OptionGroupCard, SectionHeader } from './PrimitiveUI.jsx';
import PersonaSelector from './PersonaSelector.jsx';
import { staticOptions } from '../constants/options.js';
import { sliderDesc, getOptionName } from '../constants/utils.js';

const EditorAside = ({ rp, theme }) => {
    return (
        <aside className="w-[360px] shrink-0 border border-zinc-800/60 bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                <PersonaSelector
                    aiPersona={rp.aiPersona}
                    setAiPersona={rp.setAiPersona}
                    personaDropdownOpen={rp.personaDropdownOpen}
                    setPersonaDropdownOpen={rp.setPersonaDropdownOpen}
                />

                <div className="shrink-0 rounded-[10px] border border-zinc-800 p-6 bg-[#121212] shadow-lg space-y-6 mt-2 relative overflow-hidden">
                    <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5">
                            <Command className="w-3 h-3" /> Subject Text
                        </div>
                        <textarea
                            value={rp.inputText}
                            onChange={e => rp.setInputText(e.target.value)}
                            placeholder="텍스트 입력 (엔터로 줄바꿈)"
                            rows={rp.inputText.includes('\n') ? 2 : 1}
                            className={`w-full bg-[#15171C] font-black outline-none text-white border border-zinc-800 rounded-[10px] px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm resize-none custom-scrollbar ${rp.inputText.includes('\n') || rp.inputText.length > 10 ? 'text-[15px] leading-tight' : 'text-[20px] leading-tight'}`}
                        />
                    </div>
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" /> Design Aura
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => rp.moodImageRef.current?.click()} disabled={rp.isAnalyzingMood} title="배경 무드 분석: 원화나 다중 이미지(배경+캐릭터)를 업로드하면 구조적인 타이포 아우라를 자동 추출합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${rp.isAnalyzingMood ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' : 'bg-[#1C1C1C] hover:bg-[#262626] text-[#a6a6a6] hover:text-white border border-zinc-700/60 shadow-sm'}`}>
                                    {rp.isAnalyzingMood ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                </button>
                                <input type="file" ref={rp.moodImageRef} className="hidden" accept="image/*" multiple onChange={rp.handleMoodImageUpload} />
                                <button onClick={() => rp.openTuningRoom()} disabled={!rp.customDesignInjections.trim()} title="튜닝룸: AI와 대화하며 형태적 아이디어를 구체화합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${!rp.customDesignInjections.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                                <button onClick={rp.handleExpandIntent} disabled={rp.isExpandingIntent || !rp.customDesignInjections.trim()} title="자동 구체화: 간단한 키워드를 전문적인 형태 묘사로 확장합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${rp.isExpandingIntent ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 shadow-sm'}`}>
                                    {rp.isExpandingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <textarea value={rp.customDesignInjections} onChange={e => rp.setCustomDesignInjections(e.target.value)} placeholder="원하는 분위기나 형태를 묘사하세요." className="w-full bg-[#1C1C1C] text-[13px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-200 custom-scrollbar placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />

                        <div className="mt-4 bg-[#1C1C1C] rounded-[10px] p-5 shadow-inner border border-zinc-800">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                                <SlidersHorizontal className="w-4 h-4 text-zinc-600" />
                                <span className="text-[10px] font-bold text-emerald-400">{sliderDesc.rightLabel}</span>
                            </div>
                            <input type="range" min="0" max="100" value={rp.personaSliderValue} onChange={e => rp.setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-indigo-500" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-2 mt-4">
                    <button onClick={rp.handleAiRecommendation} disabled={rp.isRecommending} title="현재 텍스트와 아우라를 분석하여 AI가 최적의 구조를 추천합니다." className="col-span-4 py-3.5 rounded-[10px] bg-purple-600/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600/20 font-bold text-[11px] uppercase flex items-center justify-center gap-2 transition-colors shadow-sm">
                        {rp.isRecommending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />} AI 스마트 셋업
                    </button>
                    <button onClick={rp.handleReset} title="모든 설정을 초기화합니다." className="bg-[#1C1C1C] border border-zinc-800 hover:bg-[#262626] hover:text-white text-[#a6a6a6] rounded-[10px] flex items-center justify-center transition-colors">
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                </div>
                {rp.aiRecSummary && (
                    <div className={`mt-3 p-4 rounded-[10px] border animate-in fade-in duration-500 bg-[#1C1C1C] border-zinc-700`}>
                        <p className={`text-[11px] font-bold mb-1 text-zinc-300 flex items-center gap-1.5`}><Sparkles className="w-3 h-3 text-[#a6a6a6]" /> {rp.aiRecSummary.title}</p>
                        <p className={`text-[10px] leading-relaxed text-[#a6a6a6]`}>{rp.aiRecSummary.reason}</p>
                    </div>
                )}

                <div className="mt-6 mb-4 px-1">
                    <div className="mb-3">
                        <DropdownControl label="타입 프리셋" icon={<Anchor className="w-3.5 h-3.5 text-zinc-400" />} data={[...staticOptions.MMOStyles, ...(rp.dynamicOptions.MMOStyles || [])]} value={rp.scriptType} onChange={rp.handleScriptPresetChange} />
                    </div>

                    <div className="shrink-0 mb-4 p-2.5 rounded-[10px] border border-zinc-800 bg-[#121212] flex items-center justify-between shadow-sm transition-colors">
                        <div className="flex items-center gap-2 pl-1">
                            <Settings className="w-4 h-4 text-[#a6a6a6]" />
                            <h3 className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">조형 설정</h3>
                        </div>
                        <div className="flex bg-[#1C1C1C] rounded-[6px] p-0.5 border border-zinc-800 shadow-inner">
                            <button onClick={() => rp.setIsAdvancedOptionsEnabled(false)} className={`px-3 py-1.5 text-[10px] font-bold rounded-[4px] transition-all ${!rp.isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>요약 보기</button>
                            <div className="w-[1px] bg-zinc-800 my-1 mx-0.5" />
                            <button onClick={() => rp.setIsAdvancedOptionsEnabled(true)} className={`px-3 py-1.5 text-[10px] font-bold rounded-[4px] transition-all ${rp.isAdvancedOptionsEnabled ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>세부 편집</button>
                        </div>
                    </div>

                    <OptionGroupCard
                        id="layout" openCardId={rp.openCardId} onToggle={rp.handleToggleCard}
                        title="구조 배치"
                        icon={<LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={`${getOptionName(staticOptions.ratios, rp.aspectRatio)} · ${getOptionName(staticOptions.layouts, rp.layoutType).split(' ')[0]} · ${getOptionName(staticOptions.occupancies, rp.occupancy).split(' ')[0]}`}
                    >
                        <div className="mb-3">
                            <DropdownControl label="레이아웃 프리셋" data={staticOptions.layoutPresets} value={rp.layoutPreset} onChange={rp.handleLayoutPresetChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <DropdownControl label="비율" data={staticOptions.ratios} value={rp.aspectRatio} onChange={(val) => { rp.setAspectRatio(val); rp.setLayoutPreset(''); }} />
                            <DropdownControl label="크기 / 여백" data={staticOptions.occupancies} value={rp.occupancy} onChange={(val) => { rp.setOccupancy(val); rp.setLayoutPreset(''); }} />
                        </div>
                        <div className="mb-3">
                            <DropdownControl label="배열 방식" data={staticOptions.layouts} value={rp.layoutType} onChange={(val) => { rp.setLayoutType(val); rp.setLayoutPreset(''); }} />
                        </div>
                        {(rp.layoutType === "TitleSub" || rp.layoutType === "SubTitle") && (
                            <div className="mb-3">
                                <DropdownControl label="서브 텍스트 크기" data={staticOptions.subTitleSizes} value={rp.subTitleSize} onChange={rp.setSubTitleSize} />
                            </div>
                        )}
                        {rp.isAdvancedOptionsEnabled && (
                            <div className="mt-3 pt-3 border-t border-zinc-800/50">
                                <DropdownControl label="고급 (전체 실루엣)" data={staticOptions.MMOSilhouetteFramings} value={rp.mmoSilhouetteFraming} onChange={(val) => { rp.setMmoSilhouetteFraming(val); rp.setLayoutPreset(''); }} />
                            </div>
                        )}
                    </OptionGroupCard>

                    {rp.isAdvancedOptionsEnabled && (
                        <OptionGroupCard
                            id="density" openCardId={rp.openCardId} onToggle={rp.handleToggleCard}
                            title="글자 밀도"
                            icon={<BoxIcon className="w-3.5 h-3.5 text-zinc-400" />}
                            summary={`${{ "Narrow": "좁은", "Normal": "표준", "Wide": "넓은", "UltraWide": "초광폭" }[rp.charWidth] || '표준'} 폭 · ${getOptionName(staticOptions.proportions, rp.charProportion)}${rp.isAdvancedOptionsEnabled ? ` · ${getOptionName([...staticOptions.stemWeights, ...(rp.dynamicOptions.stemWeights || [])], rp.stemWeight).split(' ')[0]}` : ''}`}
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <DropdownControl label="폭감" data={staticOptions.widths} value={rp.charWidth} onChange={rp.setCharWidth} />
                                <DropdownControl label="비례" data={staticOptions.proportions} value={rp.charProportion} onChange={rp.setCharProportion} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <DropdownControl label="획 두께" data={[...staticOptions.stemWeights, ...(rp.dynamicOptions.stemWeights || [])]} value={rp.stemWeight} onChange={rp.setStemWeight} />
                            </div>
                        </OptionGroupCard>
                    )}

                    <OptionGroupCard
                        id="terminal" openCardId={rp.openCardId} onToggle={rp.handleToggleCard}
                        title="획 마감"
                        icon={<Brush className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={rp.isAdvancedOptionsEnabled ? `${getOptionName([...staticOptions.terminalStyles, ...(rp.dynamicOptions.terminalStyles || [])], rp.terminalStyle).split(' ')[0]} 마감 · ${getOptionName([...staticOptions.strokeSharpness, ...(rp.dynamicOptions.strokeSharpness || [])], rp.strokeSharpness).split(' ')[0]}` : `${getOptionName([...staticOptions.terminalStyles, ...(rp.dynamicOptions.terminalStyles || [])], rp.terminalStyle).split(' ')[0]} 마감`}
                    >
                        <div className={`grid gap-3 ${rp.isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <DropdownControl label="마감 방식" data={[...staticOptions.terminalStyles, ...(rp.dynamicOptions.terminalStyles || [])]} value={rp.terminalStyle} onChange={rp.setTerminalStyle} />
                            {rp.isAdvancedOptionsEnabled && <DropdownControl label="예리함" data={[...staticOptions.strokeSharpness, ...(rp.dynamicOptions.strokeSharpness || [])]} value={rp.strokeSharpness} onChange={rp.setStrokeSharpness} />}
                        </div>
                        {rp.isAdvancedOptionsEnabled && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <DropdownControl label="절단 방식" data={[...staticOptions.slicingIntensities, ...(rp.dynamicOptions.slicingIntensities || [])]} value={rp.slicingIntensity} onChange={rp.setSlicingIntensity} />
                                <DropdownControl label="코너 성격" data={[...staticOptions.cornerStyles, ...(rp.dynamicOptions.cornerStyles || [])]} value={rp.cornerStyle} onChange={rp.setCornerStyle} />
                            </div>
                        )}
                    </OptionGroupCard>

                    <OptionGroupCard
                        id="connection" openCardId={rp.openCardId} onToggle={rp.handleToggleCard}
                        title="문자 결속"
                        icon={<Layers3 className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={rp.isAdvancedOptionsEnabled ? `글자 ${getOptionName(staticOptions.letterConnections, rp.letterConnection).split(' ')[0]} · 내부공간 ${getOptionName(staticOptions.internalSpaces, rp.internalSpace).split(' ')[0]}` : `글자 ${getOptionName(staticOptions.letterConnections, rp.letterConnection).split(' ')[0]}`}
                    >
                        <div className={`grid gap-3 ${rp.isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <DropdownControl label="글자 결합" data={staticOptions.letterConnections} value={rp.letterConnection} onChange={rp.setLetterConnection} />
                            {rp.isAdvancedOptionsEnabled && <DropdownControl label="자간" data={[...staticOptions.kerningOptions, ...(rp.dynamicOptions.kerningOptions || [])]} value={rp.kerning} onChange={rp.setKerning} />}
                        </div>
                        {rp.isAdvancedOptionsEnabled && (
                            <div className={`grid gap-3 mt-3 grid-cols-2`}>
                                <DropdownControl label="내부 공간" data={staticOptions.internalSpaces} value={rp.internalSpace} onChange={rp.setInternalSpace} />
                                <DropdownControl label="로고화 정도" data={staticOptions.logoDegrees} value={rp.logoDegree} onChange={rp.setLogoDegree} />
                            </div>
                        )}
                    </OptionGroupCard>

                    <OptionGroupCard
                        id="intensity" openCardId={rp.openCardId} onToggle={rp.handleToggleCard}
                        title="표현 강도"
                        icon={<Activity className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={rp.isAdvancedOptionsEnabled ? `동세: ${getOptionName([...staticOptions.kineticVelocities, ...(rp.dynamicOptions.kineticVelocities || [])], rp.kineticVelocity).split(' ')[0]} · 파괴: ${getOptionName([...staticOptions.deformationDamages, ...(rp.dynamicOptions.deformationDamages || [])], rp.deformationDamage).split(' ')[0]}` : `동세: ${getOptionName([...staticOptions.kineticVelocities, ...(rp.dynamicOptions.kineticVelocities || [])], rp.kineticVelocity).split(' ')[0]}`}
                    >
                        <div className={`grid gap-3 ${rp.isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(rp.dynamicOptions.kineticVelocities || [])]} value={rp.kineticVelocity} onChange={rp.setKineticVelocity} />
                            {rp.isAdvancedOptionsEnabled && <DropdownControl label="전체 기울기" data={staticOptions.slantAngles} value={rp.slantAngle} onChange={rp.setSlantAngle} />}
                        </div>
                        <div className={`grid gap-3 mt-3 ${rp.isAdvancedOptionsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            <DropdownControl label="배경 대비" icon={<BoxIcon className="w-3 h-3" />} data={staticOptions.base} value={rp.baseStyle} onChange={rp.setBaseStyle} />
                            {rp.isAdvancedOptionsEnabled && <DropdownControl label="파괴 및 침식" data={[...staticOptions.deformationDamages, ...(rp.dynamicOptions.deformationDamages || [])]} value={rp.deformationDamage} onChange={rp.setDeformationDamage} />}
                        </div>
                        {rp.isAdvancedOptionsEnabled && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <DropdownControl label="주변 장식" data={staticOptions.MMOSurroundingElements} value={rp.mmoSurroundingElement} onChange={rp.setMmoSurroundingElement} />
                            </div>
                        )}
                    </OptionGroupCard>
                </div>

                <section className="mt-8 border-t border-zinc-800/50 pt-4 mb-4 px-5">
                    <div className="flex items-center justify-between">
                        <SectionHeader id="06" label="모디파이어 (구조 강제)" icon={<Wand className="w-3.5 h-3.5" />} />
                        <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={() => rp.setIsEnhanceModeEnabled(!rp.isEnhanceModeEnabled)}>
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${rp.isEnhanceModeEnabled ? 'text-purple-400' : 'text-zinc-500'}`}>{rp.isEnhanceModeEnabled ? '활성화됨' : '비활성'}</span>
                            <div className={`w-8 h-4 rounded-full p-1 flex items-center transition-colors shadow-inner ${rp.isEnhanceModeEnabled ? 'bg-purple-500' : 'bg-[#1C1C1C] border border-zinc-800'}`}>
                                <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform ${rp.isEnhanceModeEnabled ? 'translate-x-4 border-none' : 'translate-x-0 border border-zinc-600'}`} />
                            </div>
                        </div>
                    </div>
                    <div className={`p-3 rounded-[10px] border bg-[#121212] border-zinc-800 mt-3 shadow-sm transition-all duration-300 ${!rp.isEnhanceModeEnabled ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                        <div className="flex bg-[#1C1C1C] rounded-[10px] p-1 border border-zinc-800">
                            <button onClick={() => rp.isEnhanceModeEnabled && rp.setEnhanceMode('refine')} title="가장 안전하고 실무적인 모드. 조형적 완결성을 극대화합니다." className={`flex-1 py-2.5 rounded-[8px] text-[11px] font-bold transition-all ${rp.enhanceMode === 'refine' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💎 정제</button>
                            <button onClick={() => rp.isEnhanceModeEnabled && rp.setEnhanceMode('variation')} title="본질은 유지하되 다양한 조형적 해석을 탐색합니다." className={`flex-1 py-2.5 rounded-[8px] text-[11px] font-bold transition-all ${rp.enhanceMode === 'variation' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>🎨 변주</button>
                            <button onClick={() => rp.isEnhanceModeEnabled && rp.setEnhanceMode('deconstruct')} title="글자를 분해하고 재구성하여 급진적 스타일을 실험합니다." className={`flex-1 py-2.5 rounded-[8px] text-[11px] font-bold transition-all ${rp.enhanceMode === 'deconstruct' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 'text-[#a6a6a6] hover:text-zinc-300 border border-transparent'}`}>💥 해체</button>
                        </div>
                    </div>
                </section>
            </div>
        </aside>
    );
};

export default EditorAside;
