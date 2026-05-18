import { useRef } from 'react';

export default function MatrixPromptForm({
  image, _setImage, isImageDragging, setIsImageDragging, onImageChange,
  directorNote, setDirectorNote,
  aiInterpretation, setAiInterpretation,
  isAnalyzing, onAnalyze,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4 relative z-[40]">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">AI Director's Note</h3>
        <button onClick={() => onAnalyze(true)} disabled={!image || isAnalyzing} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${!image ? 'bg-[#0f1115] text-[#4b4d52] border border-[#2b2d31] cursor-not-allowed' : 'bg-gradient-to-r from-[#0F82FF]/20 to-[#a8c7fa]/20 border border-[#0F82FF]/50 text-[#a8c7fa] hover:from-[#0F82FF]/30 hover:to-[#a8c7fa]/30'}`}>
          🎲 전문가 픽 (Surprise Me)
        </button>
      </div>
      <div className="flex flex-col gap-2 mt-1">
        <div className="text-[10px] font-medium text-[#9ca3af]">1. 레퍼런스 이미지 (선택)</div>
        <div
          className={`relative border border-dashed rounded-xl transition-all aspect-video flex flex-col items-center justify-center overflow-hidden ${image ? 'border-[#2b2d31] bg-[#181a1f]' : isImageDragging ? 'border-[#a8c7fa] bg-[#a8c7fa]/5' : 'border-[#2b2d31] hover:border-[#6b7280] hover:bg-[#181a1f] cursor-pointer'}`}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(false); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(false); onImageChange(e.dataTransfer.files[0]); }}
          onClick={() => !image && fileInputRef.current.click()}
        >
          {image ? (
            <div className="relative group w-full h-full flex items-center justify-center p-2">
              <img src={image} alt="Upload preview" className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
              <div className="absolute inset-0 bg-[#0f1115]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm" onClick={() => fileInputRef.current.click()}>
                <span className="bg-[#2b2d31] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#e3e3e3] border border-[#4b4d52]">Change Image</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-[#9ca3af]">
              <div className="w-10 h-10 bg-[#0f1115] border border-[#2b2d31] rounded-full flex items-center justify-center mb-2.5">
                <svg className="h-4 w-4 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <p className="text-[11px] font-medium text-[#e3e3e3] mb-1">타이포 이미지를 드래그하세요</p>
              <p className="text-[9px] text-[#6b7280] max-w-[80%] text-center leading-relaxed">⚠️ 텍스트 주변에 최소 25% 이상의 검정 여백이 필요합니다.</p>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={(e) => onImageChange(e.target.files[0])} accept="image/*" className="hidden" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-medium text-[#9ca3af] flex justify-between">
          <span>2. 연출 요구사항 (선택)</span>
          {directorNote && <button onClick={() => { setDirectorNote(''); setAiInterpretation(''); }} className="text-[#a8c7fa] hover:text-[#c2d7fa]">지우기</button>}
        </div>
        <textarea
          value={directorNote}
          onChange={(e) => setDirectorNote(e.target.value)}
          placeholder="ex) 사이버펑크 느낌으로 네온사인이 번쩍이면서 노이즈가 끼게 해줘."
          className="w-full bg-[#0f1115] border border-[#2b2d31] rounded-lg p-3 text-[11px] text-[#e3e3e3] outline-none focus:border-[#a8c7fa] resize-y custom-scrollbar min-h-[70px] placeholder:text-[#6b7280]"
        />
      </div>
      <button onClick={() => onAnalyze(false)} disabled={(!image && !directorNote.trim()) || isAnalyzing} className={`w-full py-3 px-4 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-2 mt-1 ${(!image && !directorNote.trim()) ? 'bg-[#181a1f] text-[#6b7280] cursor-not-allowed border border-[#2b2d31]' : isAnalyzing ? 'bg-[#2b2d31] text-[#e3e3e3] cursor-wait' : 'bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f]'}`}>
        {isAnalyzing ? 'AI Director가 셋업 중입니다...' : '✨ AI 연출 해석 및 자동 세팅 (Gemini)'}
      </button>
      {aiInterpretation && (
        <div className="mt-1 p-3.5 bg-[#a8c7fa]/10 border border-[#a8c7fa]/30 rounded-xl animate-fade-in-down">
          <div className="text-[10px] font-bold text-[#a8c7fa] mb-1.5">🤖 AI Director's Feedback:</div>
          <div className="text-[11px] text-[#e3e3e3] leading-relaxed break-keep">{aiInterpretation}</div>
        </div>
      )}
    </div>
  );
}
