/* eslint-disable */
// v2 전용 우측 메인 워크스페이스 — Header / Dashboard / Prompt / Output 패널.
import React from 'react';
import {
    Activity, Sparkles, Stars, Info,
    ChevronDown, ScanLine, Loader2, Copy, CheckCircle, RefreshCcw,
    PenTool, Edit3, Menu,
} from 'lucide-react';
import { aiOptimizationModels } from '../constants/options.js';

const Workspace = ({ rp }) => {
    const {
        isSidebarOpen, setIsSidebarOpen, isEditMode,
        currentModel, setModel, isPromptOutdated, isExpanded, setExpanded,
        isGeneratingDramatic, isGeneratingMj, isGeneratingCg,
        hasManualBasePrompt, currentPrompts, currentOutputContent,
        copiedTop, copiedBottom, baseLangView, setBaseLangView,
        copyToClipboard, runInspector, isInspecting,
        handleCompileDramatic, handleCompileMj, handleCompileCg,
    } = rp;

    return (
        <div className="flex-1 flex flex-col bg-[#141414] backdrop-blur-xl rounded-[16px] border border-zinc-800/80 shadow-2xl relative overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
                <div className="max-w-[850px] w-full mx-auto pb-20">

                    {/* Header Action Bar */}
                    <div className="flex items-center justify-between w-full pb-4 border-b border-zinc-800/60 mb-6">
                        <div className="flex items-center gap-3">
                            {!isSidebarOpen && (
                                <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[8px] border border-zinc-700 transition-colors shadow-sm shrink-0">
                                    <Menu className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                                </button>
                            )}
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    {isEditMode ? <><Edit3 className="w-5 h-5 text-zinc-400" /> Image Retouching</> : <><PenTool className="w-5 h-5 text-zinc-400" /> Typography Generator</>}
                                </h2>
                                <p className="text-[12px] text-zinc-500 mt-0.5">{isEditMode ? '기존 형태를 유지하며 디테일을 다듬습니다.' : '지정된 옵션을 바탕으로 최적화된 프롬프트를 생성합니다.'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard */}
                    <div className="bg-[#0A0A0A] border border-zinc-800/60 rounded-[10px] p-4 mt-4 flex items-center gap-3 flex-wrap text-[11px] text-zinc-400">
                        <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold text-zinc-300">{isEditMode ? '리터칭 모드' : '생성 모드'}</span>
                        <span className="text-zinc-500">·</span>
                        <span>활성 모델: <span className="text-zinc-200 font-medium">{currentModel}</span></span>
                        {isPromptOutdated && (
                            <>
                                <span className="text-zinc-500">·</span>
                                <span className="text-amber-400">옵션이 변경되었습니다. 재생성을 권장합니다.</span>
                            </>
                        )}
                    </div>

                    <div className="space-y-8 mt-8">
                        {/* Accordion Prompt View */}
                        <div className={`rounded-[12px] border bg-[#0A0A0A] border-zinc-800/60 shadow-sm transition-all overflow-hidden flex flex-col`}>
                            <div className="flex justify-between items-center p-3 border-b border-zinc-800/60 bg-[#121212]">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <button onClick={() => setExpanded(!isExpanded)} className="flex items-center gap-2 hover:bg-[#1A1A1A] p-1.5 rounded-[10px] transition-all group outline-none" title={isExpanded ? "프롬프트 접기" : "프롬프트 펼치기"}>
                                        <div className={`p-1 rounded-[8px] bg-[#1C1C1C] group-hover:bg-[#262626] transition-colors`}>
                                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                        <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">Base Technical Prompt</p>
                                    </button>
                                    <div className="flex gap-2">
                                        {hasManualBasePrompt && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded-[6px] uppercase border border-emerald-500/20">Resolved</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => runInspector(isEditMode)} disabled={isInspecting} title="무결성 검사" className="p-2 rounded-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center justify-center shadow-sm">
                                        {isInspecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => copyToClipboard(baseLangView === 'ko' ? currentPrompts.baseTechnicalKo : currentPrompts.baseTechnicalEn, 'top')} title={copiedTop ? "복사 완료!" : "전체 프롬프트 복사"} className="p-2 rounded-[8px] bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-sm flex items-center justify-center">
                                        {copiedTop ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <div className="flex bg-[#0A0A0A] rounded-[8px] p-1 border border-zinc-800 shadow-inner ml-1">
                                        <button onClick={() => setBaseLangView('en')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[6px] transition-all ${baseLangView === 'en' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>EN</button>
                                        <button onClick={() => setBaseLangView('ko')} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-[6px] transition-all ${baseLangView === 'ko' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>KO</button>
                                    </div>
                                </div>
                            </div>
                            <div className={`relative font-sans text-[12px] bg-[#0A0A0A] text-zinc-400 whitespace-pre-wrap leading-[1.625] transition-[max-height] duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[3000px]' : 'max-h-[220px]'}`}>
                                <div className="p-6 pb-8">
                                    {baseLangView === 'ko' ? currentPrompts.baseTechnicalKo : currentPrompts.baseTechnicalEn}
                                </div>
                                {!isExpanded && <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent pointer-events-none" />}
                            </div>
                        </div>

                        {/* Output Generation Actions */}
                        <div className="space-y-4">
                            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar pb-2">
                                <button onClick={() => setModel('Overview')} className={`shrink-0 min-w-max px-6 py-2.5 border rounded-[8px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${currentModel === 'Overview' ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800/80 bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>Overview</button>
                                {aiOptimizationModels.map(model => (
                                    <button key={model.id} onClick={() => setModel(model.id)} className={`shrink-0 min-w-max px-6 py-2.5 border rounded-[8px] text-[11px] font-bold tracking-wide transition-all shadow-sm ${currentModel === model.id ? 'border-zinc-500 bg-zinc-800 text-white' : 'border-zinc-800/80 bg-[#121212] text-zinc-500 hover:bg-[#1A1A1A] hover:text-zinc-300'}`}>{model.name}</button>
                                ))}
                            </div>

                            {currentModel === 'NanoBanana' && (
                                <button onClick={handleCompileDramatic} disabled={isGeneratingDramatic} className="w-full shrink-0 px-6 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                    {isGeneratingDramatic ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Stars className="w-4 h-4 text-emerald-400" />} 프롬프트 빌드
                                </button>
                            )}
                            {currentModel === 'Midjourney' && (
                                <button onClick={handleCompileMj} disabled={isGeneratingMj} className="w-full shrink-0 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] font-black text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-md">
                                    {isGeneratingMj ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <RefreshCcw className="w-4 h-4 text-white" />} 미드저니 최적화
                                </button>
                            )}
                            {currentModel === 'ChatGPT' && (
                                <button onClick={handleCompileCg} disabled={isGeneratingCg} className="w-full shrink-0 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[10px] font-bold text-[12px] uppercase flex justify-center items-center gap-2 transition-all shadow-sm">
                                    {isGeneratingCg ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Stars className="w-4 h-4 text-white" />} DALL-E 지시문 빌드
                                </button>
                            )}
                        </div>

                        {currentModel === 'Overview' ? (
                            <div className="mt-6 animate-in fade-in duration-300">
                                <div className="bg-[#0A0A0A] border border-zinc-800/60 rounded-[12px] p-6 text-zinc-400 text-[12px] leading-relaxed">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Info className="w-4 h-4 text-indigo-400" />
                                        <h3 className="text-[13px] font-bold text-zinc-200 uppercase tracking-widest">Overview</h3>
                                    </div>
                                    <p>현재 옵션 조합으로 컴파일된 베이스 프롬프트는 위쪽 패널에서 확인할 수 있습니다. AI 모델 탭을 선택하면 각 모델에 최적화된 변환 결과가 표시됩니다.</p>
                                    <ul className="mt-4 space-y-1.5 text-[11px] text-zinc-500 list-disc list-inside">
                                        <li>NanoBanana — 단일 이미지 생성용 드라마틱 프롬프트</li>
                                        <li>Midjourney — 짧고 함축적인 v6/v7 최적화 프롬프트</li>
                                        <li>ChatGPT (DALL-E) — 자연어 지시문 형태의 프롬프트</li>
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className={`mt-6 rounded-[12px] border bg-[#0A0A0A] border-zinc-800/60 shadow-sm transition-all overflow-hidden ${isPromptOutdated ? 'opacity-60' : ''}`}>
                                <div className="flex justify-between items-center p-3 border-b border-zinc-800/60 bg-[#121212]">
                                    <p className="text-[12px] font-bold uppercase text-[#a6a6a6] tracking-wider">{currentModel} Output {isEditMode ? '(Edit)' : ''}</p>
                                    {currentOutputContent && (
                                        <button onClick={() => copyToClipboard(currentOutputContent, 'bottom')} title={copiedBottom ? "복사 완료!" : "결과 복사"} className="p-2 rounded-[8px] bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-sm flex items-center justify-center">
                                            {copiedBottom ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                                <div className="relative font-sans text-[12px] bg-[#0A0A0A] text-zinc-400 whitespace-pre-wrap leading-[1.625] p-6 min-h-[140px]">
                                    {currentOutputContent || <span className="text-zinc-600">아직 생성된 결과물이 없습니다. 상단의 빌드 버튼을 눌러 생성하세요.</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;
