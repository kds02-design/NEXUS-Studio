import { Stars, Copy, Check, Loader2, Video } from "lucide-react";
import { AI_MODELS, VIDEO_AI_MODELS } from "../constants/presets";

// 결과 패널 상단: AI 모델 선택 + 최적화/복사/Motion 전달 액션.
export default function MatrixHeader({
  currentView, aiModel, setAiModel,
  hasOutput, isCopied, isOptimizing, currentIR,
  onOptimize, onCopy, onSendToMotion,
}) {
  const modelList = currentView === 'motion' ? VIDEO_AI_MODELS : AI_MODELS;
  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214]">
      <div className="flex gap-2">
        {modelList.map(model => (
          <button key={model.id} onClick={() => setAiModel(model.id)}
            className={`px-4 py-2 text-[11px] font-bold rounded-lg transition-colors ${aiModel === model.id ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {model.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onOptimize} disabled={isOptimizing || !currentIR}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50">
          {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stars className="w-3.5 h-3.5" />}
          AI 최적화
        </button>
        <button onClick={onCopy}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap ${isCopied ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={onSendToMotion} disabled={!hasOutput}
          title="모션 메트릭스로 보내서 애니메이션 추천 받기"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 shadow-md whitespace-nowrap bg-amber-500 hover:bg-amber-400 text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed">
          <Video className="w-3.5 h-3.5" /> Motion으로 →
        </button>
      </div>
    </div>
  );
}
