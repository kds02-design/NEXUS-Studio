/* eslint-disable */
// v1 전용 워크스페이스 (Audit + Quality + Quick + Compiled Output).
import React from 'react';
import {
    Star, Copy, Loader2, Check, CheckCircle, AlertCircle,
    ShieldCheck, ActivitySquare, Sliders, ChevronRight, PieChart, Music,
} from 'lucide-react';
import { ScoreBar } from './Controls.jsx';
import { AI_MODELS, QUICK_ADJUSTMENTS, EDIT_QUICK_ADJUSTMENTS } from '../constants/options.js';
import { getQualityFeedback } from '../constants/compilers.js';

export default function Workspace(props) {
    const {
        currentView, auditIssues, qualityScores, promptBudget,
        activeTroubleshoots, applyAction,
        aiModel, setAiModel, currentIR,
        compiledOutputs, optimizedPrompts, isOptimizing,
        handleOptimizePrompt, copyToClipboard, isCopied,
    } = props;

    return (
        <div className="flex-1 flex flex-col gap-5 overflow-hidden">

            {/* TOP PANELS */}
            <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">

                {/* 1. Audit Viewer */}
                <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col overflow-y-auto custom-scrollbar relative">
                    <div className="flex items-center gap-2 mb-4 text-pink-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest">Logic Audit</h2>
                    </div>
                    {auditIssues.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-[11px] font-bold bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6 text-center leading-relaxed">
                            <CheckCircle className="w-6 h-6 text-pink-500/20 mb-2" />
                            충돌 없음.<br />명확하고 경쾌한 조형입니다.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {auditIssues.map((issue, idx) => (
                                <div key={idx} className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl animate-in slide-in-from-top-2">
                                    <h3 className="text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {issue.title}</h3>
                                    <p className="text-[10px] text-zinc-300 mb-3 leading-relaxed">{issue.desc}</p>
                                    <div className="flex gap-2">
                                        {issue.options.map((opt, oIdx) => (
                                            <button key={oIdx} onClick={() => applyAction(opt)} className="flex-1 px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[10px] font-bold rounded-lg transition-colors border border-zinc-700 text-left">
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Quality Score Viewer */}
                <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-2 mb-4 text-cyan-400 shrink-0">
                        <ActivitySquare className="w-4 h-4" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest">Pop Quality</h2>
                    </div>
                    <div className="flex-1 flex flex-col justify-center gap-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
                        <ScoreBar label="귀여운 형태 (Cute Feel)" score={qualityScores.cuteFeel} colorClass="bg-orange-400" />
                        <ScoreBar label="판독/가시성 (Readability)" score={qualityScores.readability} colorClass="bg-blue-400" />
                        <ScoreBar label="장식 절제 (FX Control)" score={qualityScores.fxControl} colorClass="bg-pink-400" />
                        <ScoreBar label="재질 통합 (Structure)" score={qualityScores.structure} colorClass="bg-emerald-400" />
                    </div>

                    <div className="mt-3 flex items-start gap-2 bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-lg">
                        <ChevronRight className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-cyan-200 leading-snug font-medium">
                            {getQualityFeedback(qualityScores)}
                        </p>
                    </div>
                </div>

                {/* 3. Quick Adjustments */}
                <div className="bg-[#1E1B24] border border-pink-900/30 rounded-2xl p-5 flex flex-col shrink-0 shadow-[inset_0_0_40px_rgba(236,72,153,0.03)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Music className="w-20 h-20 text-pink-500" /></div>
                    <div className="flex items-center gap-2 mb-4 text-pink-400 shrink-0 relative z-10">
                        <Sliders className="w-4 h-4" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest">Pop Adjustments</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative z-10 pr-1">
                        {(currentView === 'editor' ? QUICK_ADJUSTMENTS : EDIT_QUICK_ADJUSTMENTS).map((opt, i) => {
                            if (!opt.action) return null;
                            const isActive = activeTroubleshoots.includes(opt.id);
                            return (
                                <button
                                    key={i}
                                    onClick={() => applyAction(opt, true)}
                                    className={`w-full text-left p-3 rounded-xl transition-all group flex gap-3 items-start
                                ${isActive ? 'bg-pink-900/30 border border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-black/40 hover:bg-pink-900/20 border border-pink-500/10 hover:border-pink-500/30'}`}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors
                                ${isActive ? 'bg-pink-500 border-pink-400 text-white' : 'border-zinc-700 bg-transparent'}`}>
                                        {isActive && <Check className="w-3 h-3" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className={`text-[11px] font-bold mb-1 leading-snug transition-colors ${isActive ? 'text-pink-300' : 'text-zinc-300 group-hover:text-pink-300'}`}>
                                            {opt.label}
                                        </div>
                                        <div className="text-[9px] text-zinc-500 leading-snug">{opt.desc}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Compiled Prompt Viewer */}
            <div className="bg-[#18181B] border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214]">
                    <div className="flex gap-2">
                        {AI_MODELS.map(model => (
                            <button key={model.id} onClick={() => setAiModel(model.id)} className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-colors ${aiModel === model.id ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                {model.name}
                            </button>
                        ))}
                    </div>

                    <div className="hidden lg:flex items-center gap-3 bg-black/40 border border-zinc-800/80 px-4 py-1.5 rounded-full">
                        <PieChart className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[9px] font-bold text-zinc-500 mr-1">Weight Budget:</span>
                        <div className="flex h-1.5 w-48 rounded-full overflow-hidden bg-zinc-800">
                            <div style={{ width: `${promptBudget.shape}%` }} className="bg-orange-500 transition-all duration-500" title={`조형: ${promptBudget.shape}%`} />
                            <div style={{ width: `${promptBudget.material}%` }} className="bg-cyan-500 transition-all duration-500" title={`재질: ${promptBudget.material}%`} />
                            <div style={{ width: `${promptBudget.color}%` }} className="bg-pink-500 transition-all duration-500" title={`색상: ${promptBudget.color}%`} />
                            <div style={{ width: `${promptBudget.env}%` }} className="bg-indigo-500 transition-all duration-500" title={`장식/배경: ${promptBudget.env}%`} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleOptimizePrompt} disabled={isOptimizing || !currentIR} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50`}>
                            {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                            AI 최적화
                        </button>
                        <button onClick={copyToClipboard} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap ${isCopied ? 'bg-pink-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 flex gap-5 overflow-hidden">
                    <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
                        <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.8] p-6 rounded-xl border min-h-full relative group transition-colors ${currentIR?.vfxPassMode ? 'bg-pink-950/20 border-pink-500/30 text-pink-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>

                            {optimizedPrompts[aiModel] && (
                                <div className="absolute top-0 right-0 bg-pink-500/10 text-pink-400 text-[9px] px-3 py-1.5 rounded-bl-xl font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border-b border-l border-pink-500/20">
                                    <Star className="w-3 h-3" /> OPTIMIZED
                                </div>
                            )}

                            <div className="absolute top-4 right-4 bg-zinc-800/80 text-zinc-400 text-[9px] px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                {aiModel} {optimizedPrompts[aiModel] ? "Optimized" : "Engine"}
                            </div>

                            {optimizedPrompts[aiModel] || compiledOutputs[aiModel]}

                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
