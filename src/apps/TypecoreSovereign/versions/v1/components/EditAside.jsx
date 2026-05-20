/* eslint-disable */
// v1 전용 편집(Edit) 뷰 좌측 사이드바.
import React from 'react';
import {
    ImageIcon, UploadCloud, X, Brush, MessageSquare, Sparkles as SparkleIcon, Loader2,
    SlidersHorizontal, AlertCircle, Bot, Wand, Settings, Activity, Highlighter
} from 'lucide-react';
import { DropdownControl, OptionGroupCard } from './PrimitiveUI.jsx';
import PersonaSelector from './PersonaSelector.jsx';
import { staticOptions } from '../constants/options.js';
import { sliderDesc, getOptionName } from '../constants/utils.js';

const EditAside = ({ rp, theme }) => {
    return (
        <aside className="w-[360px] shrink-0 border border-zinc-800/60 bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                <PersonaSelector
                    aiPersona={rp.aiPersona}
                    setAiPersona={rp.setAiPersona}
                    personaDropdownOpen={rp.personaDropdownOpen}
                    setPersonaDropdownOpen={rp.setPersonaDropdownOpen}
                />

                <div className="shrink-0 rounded-[10px] border border-zinc-800 p-6 bg-[#121212] shadow-lg space-y-6 mt-2 relative overflow-hidden">
                    <div>
                        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center justify-between">
                            <span className="flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Base Image</span>
                            <span className="opacity-50 text-[9px]">(1차 결과물)</span>
                        </div>
                        <div onDragOver={rp.handleDragOver} onDragLeave={rp.handleDragLeave} onDrop={rp.handleEditDrop} className={`relative rounded-[10px] border border-dashed p-6 text-center transition-all min-h-[120px] flex flex-col items-center justify-center ${rp.isDragging ? 'border-indigo-400 bg-[#262626]' : 'border-zinc-700 bg-[#1C1C1C] hover:bg-[#262626]'}`}>
                            {rp.editUploadedImage ? (
                                <div className="flex items-center justify-between w-full">
                                    <img src={rp.editUploadedImage} className="h-16 object-cover rounded opacity-90 border border-zinc-700/50" />
                                    <button onClick={() => rp.setEditUploadedImage(null)} title="이미지 제거" className="p-2 hover:bg-red-500/20 rounded-[10px] transition-colors"><X className="w-5 h-5 text-zinc-400 hover:text-red-400" /></button>
                                </div>
                            ) : <div className="text-[11px] font-bold text-[#a6a6a6] py-3 flex flex-col items-center gap-2"><UploadCloud className="w-6 h-6 opacity-50 mb-1" /> 클릭하거나 이미지를 드래그하여 업로드</div>}
                            {!rp.editUploadedImage && <input type="file" title="" onChange={rp.handleEditImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />}
                        </div>
                    </div>

                    <div className={`transition-all duration-300 relative ${!rp.editUploadedImage ? 'opacity-40 pointer-events-none grayscale-[30%]' : ''}`}>
                        {!rp.editUploadedImage && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[10px] bg-[#121212]/40 backdrop-blur-[1.5px]">
                                <div className="bg-[#1C1C1C] px-4 py-2 rounded-[10px] border border-indigo-500/20 flex items-center gap-2 shadow-2xl">
                                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[11px] font-bold text-indigo-300">Base Image를 먼저 업로드해주세요</span>
                                </div>
                            </div>
                        )}
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#a6a6a6] flex items-center gap-1.5">
                                <Brush className="w-3 h-3" /> Edit Direction
                            </div>
                            <div className="flex gap-1.5">
                                <button onClick={rp.openEditTuningRoom} disabled={!rp.editInstruction.trim()} title="튜닝룸: AI와 대화하며 수정 방향을 다듬습니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${!rp.editInstruction.trim() ? 'opacity-30 cursor-not-allowed text-zinc-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'}`}>
                                    <MessageSquare className="w-4 h-4" />
                                </button>
                                <button onClick={rp.handleEditExpandIntent} disabled={rp.isEditExpandingIntent || !rp.editInstruction.trim()} title="자동 구체화: 간단한 키워드를 전문적인 프롬프트로 확장합니다." className={`p-2 rounded-[10px] transition-all flex items-center justify-center ${rp.isEditExpandingIntent ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/30' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 shadow-sm'}`}>
                                    {rp.isEditExpandingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <textarea value={rp.editInstruction} onChange={e => rp.setEditInstruction(e.target.value)} placeholder="원하는 리터칭 방향을 입력하세요." className="w-full bg-[#1C1C1C] text-[13px] p-4 rounded-[10px] border border-zinc-800 outline-none min-h-[5rem] resize-none text-zinc-200 custom-scrollbar placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm" />

                        <div className="mt-5 bg-[#1C1C1C] rounded-[10px] p-4 shadow-inner border border-zinc-800">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-bold text-[#a6a6a6]">{sliderDesc.leftLabel}</span>
                                <SlidersHorizontal className="w-3 h-3 text-emerald-400/60" />
                                <span className="text-[10px] font-bold text-emerald-400">{sliderDesc.rightLabel}</span>
                            </div>
                            <input type="range" min="0" max="100" value={rp.personaSliderValue} onChange={e => rp.setPersonaSliderValue(e.target.value)} className="w-full h-1.5 bg-zinc-700 rounded-[10px] appearance-none cursor-pointer accent-indigo-500" />
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                            <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Bot className={`w-4 h-4 ${rp.applyAiRecInEdit ? 'text-purple-400' : 'text-zinc-600'}`} />
                                    <span className={`text-[11px] font-bold tracking-wide ${rp.applyAiRecInEdit ? 'text-purple-300' : 'text-[#a6a6a6]'}`} title="AI가 적절한 세부 조형 옵션을 자동으로 추천하고 적용합니다.">AI 최적화 추천</span>
                                </div>
                                <button onClick={() => rp.setApplyAiRecInEdit(!rp.applyAiRecInEdit)} className={`w-10 h-5 rounded-full p-1 flex items-center transition-colors shadow-inner ${rp.applyAiRecInEdit ? 'bg-purple-500' : 'bg-[#121212] border border-zinc-800'}`}>
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${rp.applyAiRecInEdit ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between bg-[#1C1C1C] rounded-[10px] border border-zinc-800/80 p-3 hover:border-zinc-700 transition-colors shadow-sm">
                                <div className="flex items-start gap-2">
                                    <Wand className={`w-4 h-4 mt-0.5 ${rp.applyAutoRefine ? 'text-purple-400' : 'text-zinc-600'}`} />
                                    <div>
                                        <span className={`block text-[11px] font-bold tracking-wide ${rp.applyAutoRefine ? 'text-purple-300' : 'text-[#a6a6a6]'}`}>스케치 자동 보정</span>
                                        <span className="block text-[9px] text-zinc-500 mt-0.5">거친 선을 깔끔한 벡터 형태로 정규화합니다.</span>
                                    </div>
                                </div>
                                <button onClick={() => rp.setApplyAutoRefine(!rp.applyAutoRefine)} className={`w-10 h-5 rounded-full p-1 flex items-center shrink-0 transition-colors shadow-inner ${rp.applyAutoRefine ? 'bg-purple-500' : 'bg-[#121212] border border-zinc-800'}`}>
                                    <div className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${rp.applyAutoRefine ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 mb-4 px-1">
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
                        id="edit_retouch" openCardId={rp.editOpenCardId} onToggle={rp.handleEditToggleCard}
                        title="세부 조형 리터칭"
                        icon={<Highlighter className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={`${getOptionName([...staticOptions.editStrokeMods, ...(rp.dynamicOptions.editStrokeMods || [])], rp.editStrokeMod).split(' ')[0]} · ${getOptionName([...staticOptions.editElementMods, ...(rp.dynamicOptions.editElementMods || [])], rp.editElementMod).split(' ')[0]}`}
                    >
                        <div className="space-y-3">
                            <DropdownControl label="획(Stroke) 변형" data={[...staticOptions.editStrokeMods, ...(rp.dynamicOptions.editStrokeMods || [])]} value={rp.editStrokeMod} onChange={rp.setEditStrokeMod} />
                            <DropdownControl label="요소(Element) 변환" data={[...staticOptions.editElementMods, ...(rp.dynamicOptions.editElementMods || [])]} value={rp.editElementMod} onChange={rp.setEditElementMod} />
                            <DropdownControl label="표면(Surface) 질감" data={[...staticOptions.editSurfaceMods, ...(rp.dynamicOptions.editSurfaceMods || [])]} value={rp.editSurfaceMod} onChange={rp.setEditSurfaceMod} />
                        </div>
                    </OptionGroupCard>

                    <OptionGroupCard
                        id="edit_layout" openCardId={rp.editOpenCardId} onToggle={rp.handleEditToggleCard}
                        title="구조 배치 및 실루엣"
                        icon={<Settings className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={`${getOptionName(staticOptions.MMOSilhouetteFramings, rp.mmoSilhouetteFraming).split(' ')[0]}`}
                    >
                        <div className="space-y-3">
                            <div className="mb-3">
                                <DropdownControl label="타입 프리셋" data={staticOptions.layoutPresets} value={rp.layoutPreset} onChange={rp.handleLayoutPresetChange} />
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
                            <div className="mt-3 pt-3 border-t border-zinc-800/50">
                                <DropdownControl label="고급 (전체 실루엣)" data={staticOptions.MMOSilhouetteFramings} value={rp.mmoSilhouetteFraming} onChange={(val) => { rp.setMmoSilhouetteFraming(val); rp.setLayoutPreset(''); }} />
                            </div>
                        </div>
                    </OptionGroupCard>

                    <OptionGroupCard
                        id="edit_intensity" openCardId={rp.editOpenCardId} onToggle={rp.handleEditToggleCard}
                        title="동세 및 파괴"
                        icon={<Activity className="w-3.5 h-3.5 text-zinc-400" />}
                        summary={`${getOptionName([...staticOptions.kineticVelocities, ...(rp.dynamicOptions.kineticVelocities || [])], rp.kineticVelocity).split(' ')[0]} · 파괴: ${getOptionName([...staticOptions.deformationDamages, ...(rp.dynamicOptions.deformationDamages || [])], rp.deformationDamage).split(' ')[0]}`}
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <DropdownControl label="조형적 동세" data={[...staticOptions.kineticVelocities, ...(rp.dynamicOptions.kineticVelocities || [])]} value={rp.kineticVelocity} onChange={rp.setKineticVelocity} />
                                <DropdownControl label="전체 기울기" data={staticOptions.slantAngles} value={rp.slantAngle} onChange={rp.setSlantAngle} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DropdownControl label="파괴 및 침식" data={[...staticOptions.deformationDamages, ...(rp.dynamicOptions.deformationDamages || [])]} value={rp.deformationDamage} onChange={rp.setDeformationDamage} />
                                <DropdownControl label="사선 절단" data={[...staticOptions.slicingIntensities, ...(rp.dynamicOptions.slicingIntensities || [])]} value={rp.slicingIntensity} onChange={rp.setSlicingIntensity} />
                            </div>
                        </div>
                    </OptionGroupCard>
                </div>
            </div>
        </aside>
    );
};

export default EditAside;
