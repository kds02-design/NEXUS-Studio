/* eslint-disable */
// current AI 출력 박스: Assembly 표시 + 복사 버튼.
import React from 'react';
import { Terminal, AlertCircle, CheckCircle, Copy } from 'lucide-react';

const AiOutputBox = ({ modelState, content, outdatedFlag = false, copiedBottom, copyToClipboard }) => (
  <div className={`rounded-[10px] p-6 sm:p-8 border bg-[#121212] border-zinc-800 relative transition-all duration-500 mt-4`}>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full sm:w-auto">
        <p className="text-[12px] font-bold uppercase text-[#a6a6a6] flex items-center gap-2 font-mono"><Terminal className="w-4 h-4" /> {modelState} Assembly</p>
        {outdatedFlag && (
          <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono" title="옵션이 변경되었습니다. 최신 프롬프트를 위해 다시 생성해주세요.">
            <AlertCircle className="w-3 h-3" /> 재생성 필요
          </span>
        )}
      </div>
      <button onClick={() => copyToClipboard(content, 'bottom')} className="p-2.5 rounded-[10px] bg-indigo-500 hover:bg-indigo-600 text-white transition-colors flex items-center justify-center shadow-sm" title={copiedBottom ? "복사 완료!" : "결과물 복사"}>
        {copiedBottom ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
    <div className={`max-w-[800px] w-full mx-auto text-left whitespace-pre-wrap text-[13px] leading-relaxed p-6 rounded-[10px] border bg-[#1C1C1C] border-zinc-800 transition-colors duration-500 text-zinc-300 ${outdatedFlag ? 'opacity-60 grayscale' : 'opacity-100'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {content}
    </div>
  </div>
);

export default AiOutputBox;
