import { useState } from 'react';
import { X, Settings, ChevronUp, ChevronDown, Edit3, Sparkles, Loader2, Wand2 } from 'lucide-react';
import {
  WEB_EVALUATION_KEYS,
  getWebScoreLabel,
  getWebFinalScore100,
  hasWebEvaluation,
} from '../../constants/webEvalCriteria';

const WebDesignEvalModal = ({
  isOpen,
  onClose,
  banner,
  onEditChange,
  onAnalyze,
  isAnalyzing = false,
  isAdmin = false,
}) => {
  const [isScoreAdjExpanded, setIsScoreAdjExpanded] = useState(false);
  if (!isOpen || !banner) return null;

  const hasEval = hasWebEvaluation(banner);
  const validScores = WEB_EVALUATION_KEYS
    .map(k => banner?.webScores?.[k]?.score)
    .filter(s => s != null)
    .map(s => Math.round(s));
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : -1;
  const minScore = validScores.length > 0 ? Math.min(...validScores) : 101;
  const manualAdj = parseInt(banner?.webManualScoreAdj || 0);

  return (
    <div
      className="fixed top-[52px] left-0 right-0 bottom-0 z-[2100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-[#121214] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#d8b17e]" />
              Web Design Analysis
            </h3>
            <p className="text-[12px] text-zinc-500 mt-1">
              {hasEval ? 'AI가 분석한 10대 지표 결과입니다.' : '아직 분석되지 않은 페이지입니다. 분석을 시작해 보세요.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasEval && (
              <div className="text-right">
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">최종 점수</div>
                <div className="text-4xl font-black text-[#d8b17e] font-mono tracking-tighter leading-none mt-1">
                  {getWebFinalScore100(banner)}
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
          {!hasEval ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#d8b17e]/10 border border-[#d8b17e]/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#d8b17e]" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-zinc-200 text-sm font-medium">AI 디자인 분석을 시작할까요?</p>
                <p className="text-xs text-zinc-500">정보 구조, 비주얼 위계, 컬러, CTA 등 10개 지표로 페이지를 평가합니다.</p>
              </div>
              {onAnalyze && (
                <button
                  onClick={() => onAnalyze(banner)}
                  disabled={isAnalyzing}
                  className={`mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    isAnalyzing
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-[#d8b17e] hover:bg-[#e2c08e] text-black shadow-lg shadow-[#d8b17e]/20'
                  }`}
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> 분석 시작</>
                  )}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 10대 지표 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                {WEB_EVALUATION_KEYS.map((key) => {
                  const data = banner?.webScores?.[key];
                  if (!data) {
                    return (
                      <div key={key} className="bg-zinc-900/40 border border-dashed border-zinc-700/40 rounded-lg px-4 py-2.5 opacity-60 flex items-center gap-4">
                        <div className="w-[110px] shrink-0 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400 font-medium">{getWebScoreLabel(key)}</span>
                          <span className="text-lg font-mono font-bold leading-none text-zinc-600">—</span>
                        </div>
                        <div className="w-px h-5 bg-white/10 shrink-0" />
                        <p className="text-[11px] italic text-zinc-500 leading-tight flex-1">평가 누락</p>
                      </div>
                    );
                  }
                  const scoreVal = Math.round(data.score);
                  const isMax = validScores.length > 1 && scoreVal === maxScore && maxScore !== minScore;
                  const isMin = validScores.length > 1 && scoreVal === minScore && maxScore !== minScore;
                  const boxClass = isMax
                    ? 'bg-[#d8b17e]/15 border-[#d8b17e]/30'
                    : isMin
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-black/30 border-white/[0.06]';
                  return (
                    <div key={key} className={`${boxClass} border rounded-lg px-4 py-2.5 flex items-center gap-4 transition-colors`}>
                      <div className="w-[110px] shrink-0 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-300 font-medium">{getWebScoreLabel(key)}</span>
                        <span className="text-lg font-mono font-bold leading-none text-[#d8b17e]">{scoreVal}</span>
                      </div>
                      <div className="w-px h-5 bg-white/10 shrink-0" />
                      <p className="text-[11px] leading-tight break-keep text-zinc-300 flex-1">{data.reason}</p>
                    </div>
                  );
                })}
              </div>

              {/* 점수 보정 + 피드백 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-black/30 border border-white/[0.06] rounded-xl p-4 col-span-1 flex flex-col">
                  <button
                    onClick={() => setIsScoreAdjExpanded(v => !v)}
                    className="flex justify-between items-center w-full group cursor-pointer"
                  >
                    <label className="text-[12px] font-bold text-white flex items-center gap-2 group-hover:text-[#d8b17e] transition-colors pointer-events-none">
                      <Settings className="w-3.5 h-3.5 text-[#d8b17e]" />점수 보정
                      {isScoreAdjExpanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                    </label>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border pointer-events-none ${
                        manualAdj > 0
                          ? 'bg-[#d8b17e]/20 text-[#d8b17e] border-[#d8b17e]/30'
                          : manualAdj < 0
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-white/5 text-zinc-300 border-white/10'
                      }`}
                    >
                      {manualAdj > 0 ? '+' : ''}{manualAdj}점
                    </span>
                  </button>
                  {isScoreAdjExpanded && (
                    <div className="flex items-center gap-2 px-1 mt-4 animate-in fade-in slide-in-from-top-2">
                      <button
                        onClick={() => onEditChange?.('webManualScoreAdj', Math.max(-3, manualAdj - 1))}
                        className="text-[15px] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
                      >-</button>
                      <input
                        type="range" min="-3" max="3" step="1" value={manualAdj}
                        onChange={(e) => onEditChange?.('webManualScoreAdj', parseInt(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none mx-2"
                        style={{ background: `linear-gradient(to right, #ef4444 0%, #52525b 50%, #d8b17e 100%)` }}
                      />
                      <button
                        onClick={() => onEditChange?.('webManualScoreAdj', Math.min(3, manualAdj + 1))}
                        className="text-[15px] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
                      >+</button>
                    </div>
                  )}
                </div>
                <div className="bg-black/30 border border-white/[0.06] rounded-xl p-4 col-span-1 lg:col-span-2 flex flex-col">
                  <label className="text-[12px] font-bold flex items-center gap-2 text-white mb-2">
                    <Edit3 className="w-3.5 h-3.5 text-violet-400" /> AI 학습용 피드백
                  </label>
                  <textarea
                    value={banner?.webUserComment || ''}
                    onChange={(e) => onEditChange?.('webUserComment', e.target.value)}
                    placeholder="이 페이지 디자인에 대한 평가 기준이나 의견을 적어주세요."
                    className="w-full flex-1 p-2.5 rounded-lg border border-white/10 bg-black/30 text-[11px] font-normal resize-none focus:border-violet-500 focus:outline-none text-white placeholder:text-zinc-500 min-h-[60px]"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        {hasEval && (isAdmin || onAnalyze) && (
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-white/5 bg-black/30">
            {onAnalyze && (
              <button
                onClick={() => onAnalyze(banner)}
                disabled={isAnalyzing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${
                  isAnalyzing
                    ? 'bg-violet-500/20 text-violet-300 border-violet-500/30 cursor-not-allowed'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20'
                }`}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> 재분석 중…</>
                ) : (
                  <><Wand2 className="w-3 h-3" /> AI 재분석</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebDesignEvalModal;
