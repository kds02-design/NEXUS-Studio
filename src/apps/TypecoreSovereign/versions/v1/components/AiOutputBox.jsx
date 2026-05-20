/* eslint-disable */
// v1 전용 출력 박스 — overview / NanoBanana / ChatGPT / Midjourney 출력 표시.
import React from 'react';
import { Terminal, AlertCircle, CheckCircle, Copy } from 'lucide-react';

const AiOutputBox = ({ modelState, content, outdatedFlag = false, onCopy, copied }) => {
    const isPlaceholderContent = content.startsWith('[ V16.2 RPG TYPOGRAPHY OVERVIEW ]') || content.startsWith('[ V16.2 I2I EDIT OVERVIEW ]');

    return (
        <div className={`rounded-[10px] p-6 sm:p-8 border bg-[#121212] border-zinc-800 relative transition-all duration-500`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full sm:w-auto">
                    <p className="text-[12px] font-bold uppercase text-[#a6a6a6] flex items-center gap-2"><Terminal className="w-4 h-4" /> {modelState} Output</p>
                    {outdatedFlag && !isPlaceholderContent && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="옵션이 변경되었습니다. 최신 프롬프트를 위해 다시 생성해주세요.">
                            <AlertCircle className="w-3 h-3" /> 재생성 필요
                        </span>
                    )}
                </div>
                <button onClick={() => onCopy(content, 'bottom')} className="p-2.5 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center justify-center shadow-sm" title={copied ? "복사 완료!" : "결과물 복사"}>
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
            <div className={`max-w-[800px] w-full mx-auto text-left whitespace-pre-wrap font-mono text-[13px] leading-relaxed p-6 rounded-[10px] border bg-[#1C1C1C] border-zinc-800 transition-colors duration-500 text-zinc-300 ${outdatedFlag && !isPlaceholderContent ? 'opacity-60 grayscale' : 'opacity-100'}`}>
                {content}
            </div>
        </div>
    );
};

export default AiOutputBox;
