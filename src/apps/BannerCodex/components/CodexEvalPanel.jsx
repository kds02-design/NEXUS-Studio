import { X, Settings, ChevronUp, ChevronDown, Edit3 } from 'lucide-react';
import { EVALUATION_KEYS, getScoreLabel } from '../constants/categories';

export const getFinalScore100 = (banner) => {
  const aiBase100 = banner?.aiScore != null
    ? Math.round(parseFloat(banner.aiScore) * 10)
    : Math.round(parseFloat(banner?.score || 0) * 10) - parseInt(banner?.manualScoreAdj || 0);
  return Math.min(99, Math.max(0, aiBase100 + parseInt(banner?.manualScoreAdj || 0)));
};

const CodexEvalPanel = ({ editedBanner, isScoreAdjExpanded, setIsScoreAdjExpanded, onClose, handleEditChange }) => {
  const validScores = EVALUATION_KEYS.map(k => editedBanner?.scores?.[k]?.score).filter(s => s != null).map(s => Math.round(s));
  const maxScore = validScores.length > 0 ? Math.max(...validScores) : -1;
  const minScore = validScores.length > 0 ? Math.min(...validScores) : 101;

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-lg z-[520] flex flex-col animate-in fade-in duration-300 text-white p-8 md:p-10 overflow-y-auto custom-scrollbar"
      onClick={onClose} onWheel={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onMouseMove={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm border border-white/20 z-10">
        <X className="w-4 h-4 text-white" />
      </button>
      <div className="mt-auto flex flex-col gap-5 w-full max-w-5xl mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-end justify-between shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-white">AI 10대 지표 상세 평가</h3>
            <p className="text-zinc-400 text-[13px] mt-1.5">AI 모델이 분석한 디자인 세부 점수 및 의견입니다.</p>
          </div>
          <div className="text-right">
            <div className="text-zinc-400 text-[10px] font-bold mb-1 tracking-wider uppercase">최종 환산 점수</div>
            <div className="text-[72px] font-black text-[#0eb9b3] font-mono tracking-tighter drop-shadow-[0_4px_16px_rgba(14,185,179,0.3)] leading-none mt-2">
              {getFinalScore100(editedBanner)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2 shrink-0">
          {EVALUATION_KEYS.map((key) => {
            const data = editedBanner?.scores?.[key];
            if (!data) return null;
            const isMissing = data.score == null;
            const scoreVal = isMissing ? null : Math.round(data.score);
            const isMax = !isMissing && validScores.length > 1 && scoreVal === maxScore && maxScore !== minScore;
            const isMin = !isMissing && validScores.length > 1 && scoreVal === minScore && maxScore !== minScore;
            const boxBgClass = isMissing
              ? 'bg-zinc-900/40 border-dashed border-zinc-700/40 opacity-60'
              : isMax ? 'bg-[#0eb9b3]/15 border-[#0eb9b3]/20 hover:bg-[#0eb9b3]/25'
              : isMin ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
              : 'bg-black/40 border-white/[0.05] hover:bg-black/60';
            return (
              <div key={key} className={`${boxBgClass} border rounded-lg px-4 py-2.5 transition-colors flex items-center gap-4 shadow-sm`}>
                <div className="w-[110px] shrink-0 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-300 font-medium">{getScoreLabel(key)}</span>
                  <span className={`text-lg font-mono font-bold leading-none ${isMissing ? 'text-zinc-600' : 'text-[#0eb9b3]'}`}>{isMissing ? '—' : scoreVal}</span>
                </div>
                <div className="w-px h-5 bg-white/10 shrink-0"></div>
                <p className={`text-[11px] font-normal leading-tight break-keep flex-1 ${isMissing ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>{data.reason}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
          <div className="bg-black/40 border border-white/[0.05] rounded-xl p-4 col-span-1 shadow-lg flex flex-col justify-start transition-all duration-300 self-start w-full">
            <button onClick={(e) => { e.stopPropagation(); setIsScoreAdjExpanded(!isScoreAdjExpanded); }} className="flex justify-between items-center w-full group cursor-pointer">
              <label className="text-[13px] font-bold text-white flex items-center gap-2 group-hover:text-[#0eb9b3] transition-colors cursor-pointer pointer-events-none">
                <Settings className="w-4 h-4 text-[#0eb9b3]" />점수 보정
                {isScoreAdjExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
              </label>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border pointer-events-none ${parseInt(editedBanner?.manualScoreAdj || 0) > 0 ? 'bg-[#0eb9b3]/20 text-[#0eb9b3] border-[#0eb9b3]/30' : parseInt(editedBanner?.manualScoreAdj || 0) < 0 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-zinc-300 border-white/10'}`}>
                {parseInt(editedBanner?.manualScoreAdj || 0) > 0 ? '+' : ''}{parseInt(editedBanner?.manualScoreAdj || 0)}점
              </span>
            </button>
            {isScoreAdjExpanded && (
              <div className="flex items-center gap-2 px-1 mt-5 animate-in fade-in slide-in-from-top-2">
                <button onClick={(e) => { e.stopPropagation(); handleEditChange('manualScoreAdj', Math.max(-3, parseInt(editedBanner?.manualScoreAdj || 0) - 1)); }}
                  className="text-[16px] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors cursor-pointer">-</button>
                <input type="range" min="-3" max="3" step="1" value={parseInt(editedBanner?.manualScoreAdj || 0)}
                  onChange={(e) => handleEditChange('manualScoreAdj', parseInt(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none shadow-inner mx-2"
                  style={{ background: `linear-gradient(to right, #ef4444 0%, #52525b 50%, #14b8a6 100%)` }}
                  onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} />
                <button onClick={(e) => { e.stopPropagation(); handleEditChange('manualScoreAdj', Math.min(3, parseInt(editedBanner?.manualScoreAdj || 0) + 1)); }}
                  className="text-[16px] font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 text-zinc-400 hover:text-white transition-colors cursor-pointer">+</button>
              </div>
            )}
          </div>
          <div className="bg-black/40 border border-white/[0.05] rounded-xl p-4 col-span-1 lg:col-span-2 flex flex-col shadow-lg">
            <label className="text-[13px] font-bold flex items-center gap-2 text-white mb-2"><Edit3 className="w-4 h-4 text-violet-400" /> AI 학습용 피드백 코멘트</label>
            <textarea value={editedBanner?.userComment || ''} onChange={(e) => handleEditChange('userComment', e.target.value)}
              placeholder="이 배너 디자인에 대한 평가 기준이나 피드백을 적어주세요. (입력 시 다음 AI 분석에 반영됩니다)"
              className="w-full flex-1 p-2.5 rounded-lg border border-white/10 bg-black/30 text-[11px] font-normal resize-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-all text-white placeholder:text-zinc-500 custom-scrollbar min-h-[50px]"
              onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodexEvalPanel;
