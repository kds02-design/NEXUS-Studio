import { Sparkles, Loader2, MessageSquare, Highlighter, X, Play, Check } from "lucide-react";

// 좌측 사이드바 안의 "Custom Directive" 자유 묘사 + AI 확장/튜닝룸 트리거 박스.
// + 튜닝룸(채팅) 모달까지 한 파일로 묶음. modal 은 isOpen=true 일 때만 렌더.
export function CustomDirectiveBox({
  value, onChange, placeholder,
  isExpanding, onExpand,
  onOpenChat,
}) {
  return (
    <div className="space-y-1 pt-2">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Custom Directive (자유 묘사)</label>
      <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-inner">
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
        <div className="flex justify-end gap-1 p-1 bg-transparent border-t border-zinc-800">
          <button onClick={onExpand} disabled={isExpanding || !value}
            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50"
            title="문장 자동 구체화">
            {isExpanding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onOpenChat}
            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
            title="대화형 튜닝룸 열기">
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 튜닝룸: AI 디렉터와 대화하며 의도 문장을 다듬는 채팅 모달.
export function TuningRoomModal({
  isOpen, onClose,
  tempIntent,
  chatMessages, chatInput, setChatInput, isChatting,
  onSend, onApply,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full h-[600px] flex flex-col bg-[#121214] border border-zinc-800 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-[#121214] shrink-0">
          <h3 className="text-white text-[14px] font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" /> 튜닝 룸
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 bg-[#18181B] border-b border-zinc-800/50 shrink-0 max-h-[140px] overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Highlighter className="w-3 h-3" /> 적용 예정 묘사
          </p>
          <p className="text-zinc-300 font-normal break-keep-all leading-relaxed text-[12px]">
            {tempIntent || "어떤 느낌을 원하시는지 말씀해주세요!"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#121214]">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-br-sm' : 'bg-[#1E1E22] text-zinc-300 rounded-bl-sm border border-zinc-800/50'}`}>
                <span className="whitespace-pre-wrap font-normal">{msg.text}</span>
              </div>
            </div>
          ))}
          {isChatting && (
            <div className="flex w-full justify-start">
              <div className="bg-[#1E1E22] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-md">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span className="text-[12px] text-zinc-400 font-normal">수정 중...</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-[#121214] flex flex-col gap-3 shrink-0 border-t border-zinc-800/50">
          <div className="flex gap-2 relative">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onSend(); }}
              placeholder="Type a message..."
              className="flex-1 bg-[#1A1A1E] border border-zinc-800 rounded-full pl-5 pr-14 py-3 text-[13px] text-white font-normal outline-none focus:border-emerald-500/50 transition-all placeholder:text-zinc-600"
              disabled={isChatting} />
            <button onClick={onSend} disabled={!chatInput.trim() || isChatting}
              className="absolute right-1 top-1 bottom-1 w-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-full transition-colors">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          </div>
          <button onClick={onApply} disabled={isChatting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[12px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 border-none">
            <Check className="w-4 h-4" /> 묘사 반영
          </button>
        </div>
      </div>
    </div>
  );
}
