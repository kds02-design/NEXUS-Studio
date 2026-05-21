import { useRef } from 'react';

// dataURL(또는 일반 URL) 형식의 레퍼런스 이미지를 파일로 다운로드.
// data:image/<mime>;base64,... 에서 확장자를 자동 추출 (없으면 png 폴백).
function downloadReferenceImage(image) {
  if (!image) return;
  let ext = 'png';
  const m = String(image).match(/^data:image\/([a-z0-9+]+);/i);
  if (m) ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = image;
  a.download = `motion-matrix-ref-${ts}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function MatrixPromptForm({
  image, _setImage, isImageDragging, setIsImageDragging, onImageChange,
  directorNote, setDirectorNote,
  aiInterpretation, setAiInterpretation,
  isAnalyzing, onAnalyze,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 relative z-[40]">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-zinc-100 tracking-wide">AI Director's Note</h3>
        <button onClick={() => onAnalyze(true)} disabled={!image || isAnalyzing} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${!image ? 'bg-black/40 text-zinc-600 border border-zinc-800 cursor-not-allowed' : 'bg-gradient-to-r from-[#FDCB6E]/20 to-[#FDCB6E]/20 border border-[#FDCB6E]/50 text-[#FDCB6E] hover:from-[#FDCB6E]/30 hover:to-[#FDCB6E]/30'}`}>
          🎲 전문가 픽 (Surprise Me)
        </button>
      </div>
      <div className="flex flex-col gap-2 mt-1">
        <div className="text-[10px] font-medium text-zinc-400">1. 레퍼런스 이미지 (선택)</div>
        <div
          className={`relative border border-dashed rounded-xl transition-all aspect-video flex flex-col items-center justify-center overflow-hidden ${image ? 'border-zinc-800 bg-[#18181B]' : isImageDragging ? 'border-[#FDCB6E] bg-[#FDCB6E]/5' : 'border-zinc-800 hover:border-[#6b7280] hover:bg-[#18181B] cursor-pointer'}`}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(false); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragging(false); onImageChange(e.dataTransfer.files[0]); }}
          onClick={() => !image && fileInputRef.current.click()}
        >
          {image ? (
            <div className="relative group w-full h-full flex items-center justify-center p-2">
              <img src={image} alt="Upload preview" className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
              {/* 다운로드 버튼 — Prompt Arc 등에서 자동 임포트된 레퍼런스를 로컬에 저장. 우상단 고정, group-hover 와 무관하게 항상 노출. */}
              <button
                onClick={(e) => { e.stopPropagation(); downloadReferenceImage(image); }}
                title="레퍼런스 이미지 다운로드"
                className="absolute top-3 right-3 z-10 p-1.5 bg-black/40/85 hover:bg-zinc-800 text-zinc-100 rounded-md border border-zinc-800 backdrop-blur-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
              </button>
              <div className="absolute inset-0 bg-black/40/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm" onClick={() => fileInputRef.current.click()}>
                <span className="bg-zinc-800 px-3 py-1.5 rounded-full text-[11px] font-medium text-zinc-100 border border-zinc-700">Change Image</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-zinc-400">
              <div className="w-10 h-10 bg-black/40 border border-zinc-800 rounded-full flex items-center justify-center mb-2.5">
                <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <p className="text-[11px] font-medium text-zinc-100 mb-1">타이포 이미지를 드래그하세요</p>
              <p className="text-[9px] text-zinc-500 max-w-[80%] text-center leading-relaxed">⚠️ 텍스트 주변에 최소 25% 이상의 검정 여백이 필요합니다.</p>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={(e) => onImageChange(e.target.files[0])} accept="image/*" className="hidden" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-medium text-zinc-400 flex justify-between">
          <span>2. 연출 요구사항 (선택)</span>
          {directorNote && <button onClick={() => { setDirectorNote(''); setAiInterpretation(''); }} className="text-[#FDCB6E] hover:text-[#FDCB6E]/90">지우기</button>}
        </div>
        <textarea
          value={directorNote}
          onChange={(e) => setDirectorNote(e.target.value)}
          placeholder="ex) 사이버펑크 느낌으로 네온사인이 번쩍이면서 노이즈가 끼게 해줘."
          className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-100 outline-none focus:border-[#FDCB6E] resize-y custom-scrollbar min-h-[70px] placeholder:text-zinc-500"
        />
      </div>
      <button onClick={() => onAnalyze(false)} disabled={(!image && !directorNote.trim()) || isAnalyzing} className={`w-full py-3 px-4 rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center gap-2 mt-1 ${(!image && !directorNote.trim()) ? 'bg-[#18181B] text-zinc-500 cursor-not-allowed border border-zinc-800' : isAnalyzing ? 'bg-zinc-800 text-zinc-100 cursor-wait' : 'bg-[#FDCB6E] hover:bg-[#FDCB6E]/90 text-black'}`}>
        {isAnalyzing ? 'AI Director가 셋업 중입니다...' : '✨ AI 연출 해석 및 자동 세팅 (Gemini)'}
      </button>
      {aiInterpretation && (
        <div className="mt-1 p-3.5 bg-[#FDCB6E]/10 border border-[#FDCB6E]/30 rounded-xl animate-fade-in-down">
          <div className="text-[10px] font-bold text-[#FDCB6E] mb-1.5">🤖 AI Director's Feedback:</div>
          <div className="text-[11px] text-zinc-100 leading-relaxed break-keep">{aiInterpretation}</div>
        </div>
      )}
    </div>
  );
}
