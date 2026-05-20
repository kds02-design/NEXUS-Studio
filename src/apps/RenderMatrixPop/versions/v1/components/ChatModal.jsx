/* eslint-disable */
// v1 전용 Pop Tuning Room 모달 (격리 사본).
import React from 'react';
import { MessageSquare, X, Highlighter, Loader2, Check } from 'lucide-react';

export default function ChatModal({
    isOpen, onClose, tempIntent, chatMessages, chatInput, setChatInput,
    isChatting, onSend, onApply, chatScrollRef,
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className={`max-w-md w-full h-[600px] flex flex-col bg-[#121214] border border-pink-900/50 rounded-[2rem] shadow-[0_0_50px_rgba(236,72,153,0.1)] relative overflow-hidden`}>
                <div className={`p-5 border-b border-zinc-800/50 flex items-center justify-between shrink-0`}>
                    <h3 className={`text-white text-[14px] font-bold flex items-center gap-2`}><MessageSquare className={`w-4 h-4 text-pink-400`} /> Pop Tuning Room</h3>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className={`px-5 py-4 bg-[#18181B] border-b border-zinc-800/50 shrink-0 max-h-[140px] overflow-y-auto custom-scrollbar`}>
                    <p className={`text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-1.5 flex items-center gap-1`}><Highlighter className="w-3 h-3" /> 적용 예정 묘사</p>
                    <p className={`text-zinc-300 font-normal break-keep-all leading-relaxed text-[12px]`}>{tempIntent || "어떤 느낌을 원하시는지 말씀해주세요!"}</p>
                </div>
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#121214]">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-sm' : 'bg-pink-950/30 text-zinc-300 rounded-bl-sm border border-pink-500/20'}`}>
                                <span className="whitespace-pre-wrap font-normal">{msg.text}</span>
                            </div>
                        </div>
                    ))}
                    {isChatting && <div className="text-[12px] text-zinc-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />수정 중...</div>}
                </div>
                <div className={`p-4 bg-[#121214] flex flex-col gap-3 shrink-0 border-t border-zinc-800/50`}>
                    <div className="flex gap-2 relative">
                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSend(); }} placeholder="Type a message..." className={`flex-1 bg-[#1A1A1E] border border-zinc-800 rounded-full pl-5 pr-14 py-3 text-[13px] text-white font-normal outline-none focus:border-pink-500/50 transition-all placeholder:text-zinc-600`} disabled={isChatting} />
                    </div>
                    <button onClick={onApply} disabled={isChatting} className={`w-full py-3.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-[12px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 border-none`}>
                        <Check className="w-4 h-4" /> 묘사 반영
                    </button>
                </div>
            </div>
        </div>
    );
}
