/* eslint-disable */
// v1 전용 편집(Edit) 뷰 메인 워크스페이스.
import React from 'react';
import {
    Edit3, ChevronDown, ScanLine, Copy, CheckCircle, Loader2, Stars, RefreshCcw
} from 'lucide-react';
import AiOutputBox from './AiOutputBox.jsx';
import { aiOptimizationModels } from '../constants/utils.js';

const EditWorkspace = ({ rp }) => {
    const editPrompts = rp.buildEditPrompts();
    return (
        <div className="flex-1 flex flex-col bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[10px] border border-zinc-800/60 shadow-2xl relative overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12">
                <div className="max-w-[850px] w-full mx-auto space-y-8 pb-20">

                    <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/50 mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-zinc-400" /> Image Retouching</h2>
                            <p className="text-[12px] text-[#a6a6a6] mt-1">기존 형태를 유지하며 디테일을 다듬고 퀄리티를 향상시킵니다.</p>
                        </div>
                    </div>

                    <div className={`rounded-[10px] border bg-[#121212] border-zinc-800 shadow-sm transition-all overflow-hidden flex flex-col`}>
                        <div className="flex justify-between items-center p-3 border-b border-zinc-800/50">
                            <div className="flex items-center gap-4 flex-wrap">
                                <button onClick={() => rp.setIsEditPromptExpanded(!rp.isEditPromptExpanded)} className="flex items-center gap-2 hover:bg-[#1C1C1C] p-1.5 rounded-[10px] transition-all group" title={rp.isEditPromptExpanded ? "프롬프트 접기" : "프롬프트 펼치기"}>
                                    <div className={`p-1 rounded-[10px] bg-[#1C1C1C] group-hover:bg-[#262626] transition-colors`}>
                                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${rp.isEditPromptExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                    <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">Base Technical Prompt</p>
                                </button>
                                <div className="flex gap-2">
                                    {rp.applyAiRecInEdit && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-[10px] uppercase border border-purple-500/20" title="AI 추천이 반영된 상태입니다">AI Rec</span>}
                                    {rp.editManualBasePrompt && <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[10px] font-bold rounded-[10px] uppercase border border-purple-500/20" title="무결성 검사를 통해 교정된 상태입니다">Resolved</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => rp.runInspector(true)} disabled={rp.isInspecting} title="무결성 검사: 설정된 옵션 간의 논리적 충돌을 검사하고 교정합니다." className="p-2 rounded-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center justify-center shadow-sm">
                                    {rp.isInspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                </button>
                                <button onClick={() => rp.copyToClipboard(rp.baseLangView === 'ko' ? editPrompts.baseTechnicalKo : editPrompts.baseTechnicalEn, 'top')} title={rp.copiedTop ? "복사 완료!" : "전체 프롬프트 복사"} className="p-2 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-sm flex items-center justify-center">
                                    {rp.copiedTop ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <div className="flex bg-[#1C1C1C] rounded-[10px] p-1 border border-zinc-800 shadow-inner ml-1">
                                    <button onClick={() => rp.setBaseLangView('en')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-all ${rp.baseLangView === 'en' ? 'bg-zinc-700 text-white shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300'}`}>EN</button>
                                    <button onClick={() => rp.setBaseLangView('ko')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[10px] transition-all ${rp.baseLangView === 'ko' ? 'bg-zinc-700 text-white shadow-sm' : 'text-[#a6a6a6] hover:text-zinc-300'}`}>KO</button>
                                </div>
                            </div>
                        </div>
                        <div className={`relative font-sans text-[12px] bg-[#1C1C1C] text-zinc-400 whitespace-pre-wrap leading-[1.625] transition-[max-height] duration-500 ease-in-out overflow-hidden ${rp.isEditPromptExpanded ? 'max-h-[3000px]' : 'max-h-[220px]'}`}>
                            <div className="p-6 pb-8">
                                {rp.baseLangView === 'ko' ? editPrompts.baseTechnicalKo : editPrompts.baseTechnicalEn}
                            </div>
                            {!rp.isEditPromptExpanded && (
                                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/80 to-transparent pointer-events-none" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                            <button onClick={() => rp.setEditAiModel('Overview')} className={`shrink-0 min-w-max px-6 py-3 border rounded-[10px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${rp.editAiModel === 'Overview' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 bg-[#1C1C1C] text-zinc-500 hover:bg-[#262626] hover:text-zinc-300'}`}>Overview</button>
                            {aiOptimizationModels.map(model => (
                                <button key={model.id} onClick={() => rp.setEditAiModel(model.id)} className={`shrink-0 min-w-max px-6 py-3 border rounded-[10px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${rp.editAiModel === model.id ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800 bg-[#1C1C1C] text-zinc-500 hover:bg-[#262626] hover:text-zinc-300'}`}>{model.name}</button>
                            ))}
                        </div>

                        {rp.editAiModel === 'NanoBanana' && (
                            <div className="flex flex-nowrap gap-3">
                                <button onClick={() => rp.requestEditDramaticEnhancement()} disabled={rp.isEditEnhancing} title="풍부한 묘사가 포함된 서술형 프롬프트를 생성합니다." className="shrink-0 flex-1 px-6 py-3.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                    {rp.isEditEnhancing ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Stars className="w-4 h-4 text-purple-400" />} 프롬프트 빌드
                                </button>
                            </div>
                        )}
                        {rp.editAiModel === 'Midjourney' && (
                            <button onClick={() => rp.requestMidjourneyOptimization(true)} disabled={rp.isEditMjOptimizing} title="미드저니 V6 형식에 맞춘 프롬프트를 생성합니다." className="w-full shrink-0 px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[10px] font-black text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-md">
                                {rp.isEditMjOptimizing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RefreshCcw className="w-4 h-4 text-white" />} 미드저니 최적화
                            </button>
                        )}
                        {rp.editAiModel === 'ChatGPT' && (
                            <button onClick={() => rp.requestChatGPTEnhancement(true)} disabled={rp.isEditCgEnhancing} title="DALL-E 3 생성을 위한 자연어 지시문을 생성합니다." className="w-full shrink-0 px-6 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                {rp.isCgEnhancing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Stars className="w-4 h-4 text-white" />} DALL-E 지시문 빌드
                            </button>
                        )}
                    </div>

                    <AiOutputBox
                        modelState={rp.editAiModel}
                        content={editPrompts.outputContent}
                        outdatedFlag={rp.isEditOutdated}
                        onCopy={rp.copyToClipboard}
                        copied={rp.copiedBottom}
                    />

                </div>
            </div>
        </div>
    );
};

export default EditWorkspace;
