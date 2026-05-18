import { MessageSquare, X, Edit3, Settings, Loader2, Play, CheckCircle2, ShieldAlert, Info } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';

// 3개의 오버레이 모달 — Idea Tuning Room (Create / Edit) + Logic Audit
export default function BreezeModals() {
  const {
    isTuningModalOpen, setIsTuningModalOpen,
    currentTunedAura, tuningChatHistory, isTuningLoading,
    tuningInputValue, setTuningInputValue, handleSendTuningMessage,
    setCustomDesignInjections, tuningChatRef,
    isEditTuningModalOpen, setIsEditTuningModalOpen,
    currentTunedEditAura, editTuningChatHistory, isEditTuningLoading,
    editTuningInputValue, setEditTuningInputValue, handleSendEditTuningMessage,
    setEditInstruction, editTuningChatRef,
    isAuditModalOpen, setIsAuditModalOpen, verificationLog,
  } = useBreeze();

  return (
    <>
      {isTuningModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] h-[700px] max-h-[90vh] bg-[#111111] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-[#16161D]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <h3 className="text-zinc-100 font-bold text-[13px]">AI Tuning Room</h3>
              </div>
              <button onClick={() => setIsTuningModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800 bg-[#0F0F0F] shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Current Aura</span>
              </div>
              <p className="text-[12px] text-zinc-300 leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">"{currentTunedAura}"</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111]" ref={tuningChatRef}>
              {tuningChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-200 text-zinc-900 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTuningLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[12px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adjusting...
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 shrink-0 bg-[#16161D] flex flex-col gap-3 border-t border-zinc-800">
              <div className="relative flex items-center">
                <input value={tuningInputValue} onChange={e => setTuningInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSendTuningMessage(); }} placeholder="Ask to change style, mood, etc..." className="w-full bg-[#111] border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-[12px] text-zinc-200 outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-600"/>
                <button onClick={handleSendTuningMessage} disabled={isTuningLoading || !tuningInputValue.trim()} className="absolute right-2 w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors disabled:opacity-50">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>
              </div>
              <button onClick={() => { setCustomDesignInjections(currentTunedAura); setIsTuningModalOpen(false); }} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                <CheckCircle2 className="w-4 h-4 text-white" /> Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditTuningModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] h-[700px] max-h-[90vh] bg-[#111111] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0 bg-[#16161D]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <h3 className="text-white font-black text-sm">Micro-Edit Tuning Room</h3>
              </div>
              <button onClick={() => setIsEditTuningModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800 bg-[#0F0F0F] shrink-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Settings className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Current Edit Note</span>
              </div>
              <p className="text-[12px] text-zinc-300 leading-relaxed max-h-[100px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">"{currentTunedEditAura}"</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111]" ref={editTuningChatRef}>
              {editTuningChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-200 text-zinc-900 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isEditTuningLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-800 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[12px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adjusting...
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 shrink-0 bg-[#16161D] flex flex-col gap-3 border-t border-zinc-800">
              <div className="relative flex items-center">
                <input value={editTuningInputValue} onChange={e => setEditTuningInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSendEditTuningMessage(); }} placeholder="Ask to refine the instruction..." className="w-full bg-[#111] border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-[12px] text-zinc-200 outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-600"/>
                <button onClick={handleSendEditTuningMessage} disabled={isEditTuningLoading || !editTuningInputValue.trim()} className="absolute right-2 w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors disabled:opacity-50">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>
              </div>
              <button onClick={() => { setEditInstruction(currentTunedEditAura); setIsEditTuningModalOpen(false); }} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[12px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                <CheckCircle2 className="w-4 h-4 text-white" /> Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuditModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] bg-[#111111] border border-violet-500/30 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.2)] flex flex-col overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#16161D]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-violet-400" />
                <h3 className="text-white font-bold text-[13px]">프롬프트 논리 교정 완료</h3>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap flex gap-3 items-start">
                <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                <p>{verificationLog}</p>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-800 bg-[#0F0F0F] flex justify-end">
              <button onClick={() => setIsAuditModalOpen(false)} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-[12px] transition-all">
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
