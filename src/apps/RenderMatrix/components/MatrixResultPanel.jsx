import {
  ShieldCheck, ActivitySquare, Sliders, CheckCircle, AlertCircle,
  ChevronRight, Check, Stars, Sparkles,
} from "lucide-react";
import { ScoreBar } from "./MatrixControls";
import MatrixHeader from "./MatrixHeader";
import { QUICK_ADJUSTMENTS, EDIT_BUDGETS } from "../constants/presets";
import { getQualityFeedback } from "../services/promptCompiler";

// 우측 결과 영역: Logic Audit / Quality Score / Quick Adjustments 카드 3개 +
// 하단 모델 헤더 + 컴파일된 prompt 출력 박스.
export default function MatrixResultPanel({
  currentView, vfxPassMode, editVfxPassMode,
  auditIssues, qualityScores,
  activeTroubleshoots, onApplyTroubleshoot,
  aiModel, setAiModel, currentIR,
  compiledOutputs, optimizedPrompts, optimizedPromptsKo,
  isOptimizing, onOptimize, onCopy, isCopied, onSendToMotion,
}) {
  const isVfxBox = currentView === "editor" ? vfxPassMode : editVfxPassMode;
  const promptText = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
  const hasOutput = !!promptText;
  const quickList = currentView === 'editor' ? QUICK_ADJUSTMENTS : EDIT_BUDGETS;

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden">
      <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">
        {/* Logic Audit */}
        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col overflow-y-auto custom-scrollbar relative">
          <div className="flex items-center gap-2 mb-4 text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Logic Audit</h2>
          </div>
          {auditIssues.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-[11px] font-bold bg-zinc-900/50 rounded-xl border border-zinc-800/50 p-6 text-center leading-relaxed">
              <CheckCircle className="w-6 h-6 text-emerald-500/20 mb-2" />
              충돌 없음.<br />현재 룰에 완벽히 부합합니다.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {auditIssues.map((issue, idx) => (
                <div key={idx} className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl animate-in slide-in-from-top-2">
                  <h3 className="text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {issue.title}
                  </h3>
                  <p className="text-[10px] text-zinc-300 mb-3 leading-relaxed">{issue.desc}</p>
                  <div className="flex gap-2">
                    {issue.options.map((opt, oIdx) => (
                      <button key={oIdx} onClick={() => onApplyTroubleshoot(opt, false)}
                        className="flex-1 px-3 py-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[10px] font-bold rounded-lg transition-colors border border-zinc-700 text-left">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quality Score */}
        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-4 text-indigo-400 shrink-0">
            <ActivitySquare className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Quality Score</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
            <ScoreBar label="형태 보존 (Structure)" score={qualityScores.structure} colorClass="bg-blue-500" />
            <ScoreBar label="재질 통합 (Material)" score={qualityScores.material} colorClass="bg-purple-500" />
            <ScoreBar label="판독/가시성 (Visibility)" score={qualityScores.visibility} colorClass="bg-emerald-500" />
            <ScoreBar label="이펙트 절제 (FX Control)" score={qualityScores.fxControl} colorClass="bg-amber-500" />
          </div>
          <div className="mt-3 flex items-start gap-2 bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg">
            <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-indigo-200 leading-snug font-medium">
              {getQualityFeedback(qualityScores)}
            </p>
          </div>
        </div>

        {/* Quick Adjustments */}
        <div className="bg-[#1E1B24] border border-emerald-900/30 rounded-2xl p-5 flex flex-col shrink-0 shadow-[inset_0_0_40px_rgba(16,185,129,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Sliders className="w-20 h-20 text-emerald-500" /></div>
          <div className="flex items-center gap-2 mb-4 text-emerald-400 shrink-0 relative z-10">
            <Sliders className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Quick Adjustments</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative z-10 pr-1">
            {quickList.map((opt, i) => {
              if (!opt.action) return null;
              const isActive = activeTroubleshoots.includes(opt.id);
              return (
                <button key={i} onClick={() => onApplyTroubleshoot(opt, true)}
                  className={`w-full text-left p-3 rounded-xl transition-all group flex gap-3 items-start ${isActive ? 'bg-emerald-900/30 border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/40 hover:bg-emerald-900/20 border border-emerald-500/10 hover:border-emerald-500/30'}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-zinc-700 bg-transparent'}`}>
                    {isActive && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex flex-col">
                    <div className={`text-[11px] font-bold mb-1 leading-snug transition-colors ${isActive ? 'text-emerald-300' : 'text-zinc-300 group-hover:text-emerald-300'}`}>
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

      {/* Prompt output panel */}
      <div className="bg-[#18181B] border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        <MatrixHeader
          currentView={currentView}
          aiModel={aiModel} setAiModel={setAiModel}
          hasOutput={hasOutput} isCopied={isCopied}
          isOptimizing={isOptimizing} currentIR={currentIR}
          onOptimize={onOptimize} onCopy={onCopy} onSendToMotion={onSendToMotion}
        />
        <div className="p-6 flex-1 flex gap-5 overflow-hidden">
          <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.8] p-6 rounded-xl border min-h-full relative group transition-colors ${isVfxBox ? 'bg-orange-950/20 border-orange-500/30 text-orange-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>
              {optimizedPrompts[aiModel] && (
                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[9px] px-3 py-1.5 rounded-bl-xl font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border-b border-l border-emerald-500/20">
                  <Stars className="w-3 h-3" /> OPTIMIZED
                </div>
              )}
              <div className="absolute top-4 right-4 bg-zinc-800/80 text-zinc-400 text-[9px] px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                {aiModel} {optimizedPrompts[aiModel] ? "Optimized" : "Engine"}
              </div>
              {optimizedPromptsKo[aiModel] && (
                <div className="mb-5 p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-[12px] leading-relaxed font-sans shadow-inner">
                  <span className="font-bold flex items-center gap-1.5 mb-2 text-emerald-400 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> AI 최적화 의도 분석 리포트
                  </span>
                  {optimizedPromptsKo[aiModel]}
                </div>
              )}
              {promptText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
