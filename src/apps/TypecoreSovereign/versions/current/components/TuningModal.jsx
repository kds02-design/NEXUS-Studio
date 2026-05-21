/* eslint-disable */
// current Tuning Room 모달 (생성 / 편집 공용 — props 로 차이 주입).
import React from 'react';
import { MessageSquare, X, Image as ImageIcon, Loader2, Play, CheckCircle } from 'lucide-react';

const TuningModal = ({
  isOpen, onClose, title, currentLabel, currentLabelIcon, currentValue,
  chatHistory, chatScrollRef, isLoading, loadingMessage,
  referenceImage, setReferenceImage,
  inputValue, setInputValue,
  onSend, onApply, applyLabel,
  onImageUpload,
  placeholder = "수정 요청이나 감성 키워드를 입력하세요.",
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[460px] h-[750px] max-h-[90vh] bg-[#121212] border border-zinc-800 rounded-[12px] shadow-2xl flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/60 shrink-0 bg-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-300" />
            <h3 className="text-white font-bold text-sm tracking-wide font-mono">{title}</h3>
          </div>
          <button onClick={onClose} className="text-[#a6a6a6] hover:text-white transition-colors p-1 rounded-[10px] hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 border-b border-zinc-800/50 bg-[#121212] shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            {currentLabelIcon}
            <span className="text-[11px] font-bold text-[#a6a6a6] tracking-wider uppercase font-mono">{currentLabel}</span>
          </div>
          <p className="text-[13px] font-mono tracking-tight text-emerald-300 bg-emerald-500/10 leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar whitespace-pre-wrap px-3 py-2.5 border-l-[3px] border-emerald-500 rounded-[6px]">"{currentValue}"</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-[#1A1A1A]" ref={chatScrollRef}>
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-[10px] px-4 py-3 text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-zinc-700 text-white rounded-br-sm' : 'bg-[#121212] border border-zinc-800/80 text-zinc-300 rounded-tl-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-[10px] px-4 py-3 bg-[#121212] border border-zinc-800/80 text-zinc-400 rounded-tl-sm flex items-center gap-2 text-[13px] font-mono">
                <Loader2 className="w-4 h-4 animate-spin" /> {loadingMessage}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 shrink-0 bg-[#1A1A1A] flex flex-col gap-3 border-t border-zinc-800/60">
          {referenceImage && (
            <div className="flex items-center justify-between bg-[#1C1C1C] p-2 rounded-[10px] border border-zinc-700 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={`data:image/jpeg;base64,${referenceImage}`} className="h-10 w-auto rounded-[10px] border border-zinc-700 object-cover opacity-80" alt="ref" />
                <div className="text-[11px] text-zinc-300 font-bold font-mono">Reference Image Attached</div>
              </div>
              <button onClick={() => setReferenceImage(null)} title="레퍼런스 제거" className="p-1 hover:bg-red-500/20 rounded-[10px] text-red-400 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="relative flex items-center gap-2">
            <label title="스타일 분석을 위한 레퍼런스 이미지를 업로드합니다." className="cursor-pointer p-3.5 bg-[#1C1C1C] hover:bg-[#262626] border border-zinc-700 rounded-[10px] transition-colors shrink-0 shadow-sm group">
              <ImageIcon className="w-4 h-4 text-[#a6a6a6] group-hover:text-white transition-colors" />
              <input type="file" className="hidden" accept="image/*" onChange={onImageUpload} />
            </label>
            <div className="relative flex-1">
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSend(); }}
                placeholder={placeholder}
                className="w-full bg-[#1C1C1C] font-mono tracking-tighter border-2 border-zinc-800 rounded-[10px] pl-4 pr-12 py-3.5 text-[13px] text-zinc-200 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-zinc-600 shadow-sm"
              />
              <button
                onClick={onSend}
                disabled={isLoading || (!inputValue.trim() && !referenceImage)}
                title="전송"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-[10px] transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>
            </div>
          </div>
          <button
            onClick={onApply}
            className="w-full py-4 bg-[#1C1C1C] hover:bg-zinc-800 rounded-[10px] font-bold font-mono text-[13px] text-white flex items-center justify-center gap-2 transition-all shadow-sm border border-zinc-700"
          >
            <CheckCircle className="w-4 h-4" /> {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TuningModal;
