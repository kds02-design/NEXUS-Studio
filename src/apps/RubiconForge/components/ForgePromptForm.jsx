// AI Directive 섹션 (사용자 의도 입력 + 키워드 셋업 / 분석 / 리셋 버튼).
// 원본 index.jsx 의 AI DIRECTIVE 블록을 그대로 이전.
// (원본에는 챗 모달 UI 가 별도로 렌더되지 않음 - 상태/핸들러만 존재하므로 동일하게 유지)

import {
  Wand2, Loader2, Sparkle as SparkleIcon, MessageSquare, Wand, ScanLine, RefreshCw,
} from 'lucide-react';

export default function ForgePromptForm({
  userIntent, setUserIntent,
  isExpandingIntent, handleExpandIntent,
  openChatModal,
  isKeywordSetting, handleKeywordSetup,
  isAnalyzingStyle, analyzeStyle, styleImage,
  handleResetSettings,
}) {
  return (
    <div className="border-t border-zinc-800/50 pt-8 space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
           <Wand2 className="w-4 h-4" /> AI DIRECTIVE (Quick Actions)
        </h3>
        <div className="w-full flex flex-col bg-[#111111] border border-zinc-700/50 rounded-xl focus-within:border-purple-500/50 transition-all overflow-hidden">
            <textarea value={userIntent} onChange={(e) => setUserIntent(e.target.value)} placeholder={`원하는 캠페인 느낌을 입력하세요 (예: 여름 세일, 청량한 느낌)...`} className="w-full h-24 bg-transparent p-4 text-[12px] text-zinc-300 focus:outline-none resize-none custom-scrollbar" />
            <div className="flex justify-end gap-1.5 p-3 pt-0 bg-transparent">
                <button onClick={handleExpandIntent} disabled={isExpandingIntent || !userIntent} className="p-1.5 text-purple-500/60 hover:text-purple-400 transition-colors disabled:opacity-50">
                    {isExpandingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparkleIcon className="w-4 h-4" />}
                </button>
                <button onClick={openChatModal} disabled={!userIntent} className="p-1.5 text-purple-500/60 hover:text-purple-400 transition-colors disabled:opacity-50">
                    <MessageSquare className="w-4 h-4" />
                </button>
            </div>
        </div>

        <div className="flex items-center justify-between pt-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Auto Setup & Reset</span>
           <div className="flex gap-2">
              <button onClick={handleKeywordSetup} disabled={isKeywordSetting || !userIntent} className="p-2 rounded-md bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-purple-500/50 hover:text-purple-400 transition-colors">
                 <Wand className="w-4 h-4" />
              </button>
              <button onClick={analyzeStyle} disabled={isAnalyzingStyle || !styleImage} className="p-2 rounded-md bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-[#76cee0]/50 hover:text-[#76cee0] transition-colors">
                 <ScanLine className="w-4 h-4" />
              </button>
              <button onClick={handleResetSettings} className="p-2 rounded-md bg-[#111111] text-zinc-400 border border-zinc-800 hover:border-red-500/50 hover:text-red-400 transition-colors">
                 <RefreshCw className="w-4 h-4" />
              </button>
           </div>
        </div>
    </div>
  );
}
