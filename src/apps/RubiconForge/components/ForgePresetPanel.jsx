// Architecture Blueprint 패널 - 현재 옵션 조합을 raw spec 텍스트로 보여주고
// validation 상태/수정 버튼 + 리셋/복사 액션을 제공.
// 원본 index.jsx 의 첫 번째 결과 패널 블록을 그대로 이전.

import { Code2, RefreshCw, Copy, Check, Wand2 } from 'lucide-react';

export default function ForgePresetPanel({
  validation,
  handleFixValidation,
  handleResetSettings,
  copyToClipboard,
  baseSpec,
  isCopiedBase,
}) {
  return (
    <div className="p-8 lg:p-10 rounded-sm border border-zinc-800/60 bg-[#0F0F12] relative shadow-[0_40px_120px_rgba(0,0,0,0.8)] flex flex-col">
        <div className="flex justify-between items-center mb-6 relative z-20">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">
                   <Code2 className="w-5 h-5 opacity-40" /> Architecture Blueprint
                </div>
                <button
                  onClick={() => { if (validation.status !== 'Optimal') handleFixValidation(); }}
                  disabled={validation.status === 'Optimal'}
                  title={validation.status !== 'Optimal' ? "클릭하여 자동 수정합니다." : ""}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-bold transition-all ${validation.status !== 'Optimal' ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-sm hover:brightness-125' : 'cursor-default opacity-80'} ${validation.color} ${validation.bg}`}
                >
                    {validation.icon} {validation.msg}
                    {validation.status !== 'Optimal' && <span className="ml-1.5 px-1.5 py-0.5 bg-black/30 rounded text-[9px] uppercase tracking-wider flex items-center gap-1"><Wand2 className="w-2.5 h-2.5" /> Fix</span>}
                </button>
            </div>
            <div className="flex gap-2">
               <button onClick={handleResetSettings} className="p-3 rounded-md transition-all text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-800"><RefreshCw className="w-4 h-4" /></button>
               <button onClick={() => copyToClipboard(baseSpec, 'base')} className={`p-3 rounded-md transition-all active:scale-90 ${isCopiedBase ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30'}`}>
                   {isCopiedBase ? <Check className="w-4 h-4 animate-in zoom-in" /> : <Copy className="w-4 h-4" />}
               </button>
            </div>
        </div>

        <div className="font-mono text-[14px] leading-[1.6] whitespace-pre-wrap opacity-60 tracking-tight bg-black/20 p-8 rounded-sm border border-white/5 max-h-[300px] overflow-y-auto custom-scrollbar text-[#7ea6ae]">
            {baseSpec}
        </div>
    </div>
  );
}
