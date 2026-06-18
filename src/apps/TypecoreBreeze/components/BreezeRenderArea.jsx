// Breeze 전용 Imagen 렌더 영역 — Sovereign current 의 ImagenRenderArea 를 Breeze 톤(violet)으로 변형.
// Creation/Edit 두 뷰가 공통으로 사용.
import { AlertCircle, Image as ImageIcon, Loader2, Download, Save, Check, Layers, ImagePlus } from 'lucide-react';
import { useBreeze } from '../context/BreezeContext.jsx';

export default function BreezeRenderArea() {
  const {
    IMAGEN_MODELS, selectedImagenModel, setSelectedImagenModel,
    handleRender, rendering, renderedImage, renderError,
    handleDownloadRendered, handleSaveToPromptArc, savingToArc, savedToArcId,
    handleSendToRenderMatrix, sendingToRenderMatrix,
    sendRenderedToEditReference, currentView, editUploadedImage,
    isLoggedIn, canRender, grade,
  } = useBreeze();

  // 렌더 결과가 이미 Micro-Edit 레퍼런스(base)와 동일하면 "사용 중" 으로 표시.
  const isRenderedTheRef = !!renderedImage?.dataUrl && editUploadedImage === renderedImage.dataUrl;

  return (
    <div className="rounded-xl border bg-[#111111] border-zinc-800/80 overflow-hidden">
      {/* 헤더 — 모델 선택 + 렌더 버튼 */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-[#141414] gap-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {IMAGEN_MODELS.map((m) => {
            const active = selectedImagenModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedImagenModel(m.id)}
                disabled={!canRender || rendering}
                title={`${m.label}${m.desc ? ' · ' + m.desc : ''}`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap transition-colors ${active ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span>{m.label}</span>
                {m.desc && <span className="text-[9px] opacity-60 font-medium">{m.desc}</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleRender}
          disabled={rendering || !canRender}
          title={!canRender ? `Pro 등급부터 사용할 수 있습니다 (현재: ${grade || 'general'})` : undefined}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {rendering ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중…</>
            : !canRender ? <><ImageIcon className="w-3.5 h-3.5" /> Pro 전용</>
            : <><ImageIcon className="w-3.5 h-3.5" /> 렌더링</>}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {!canRender && (
          <div className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-400 leading-snug">
            Imagen 렌더링은 <b className="text-zinc-200">Pro 등급 이상</b>만 사용할 수 있습니다.
          </div>
        )}
        {renderError && (
          <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-[11px] text-rose-300/90 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="leading-snug break-words">{renderError}</span>
          </div>
        )}
        {renderedImage?.dataUrl ? (
          <>
            <div className="rounded-xl border border-zinc-800 bg-black/40 overflow-hidden flex items-center justify-center min-h-[300px]">
              <img src={renderedImage.dataUrl} alt="Imagen render" className="max-w-full max-h-[640px] w-auto h-auto object-contain block" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadRendered}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> 다운로드
              </button>
              {savedToArcId ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-semibold" title={`PromptArc doc id: ${savedToArcId}`}>
                  <Check className="w-3.5 h-3.5" /> PromptArc 저장됨
                </div>
              ) : (
                <button
                  onClick={handleSaveToPromptArc}
                  disabled={savingToArc || !isLoggedIn}
                  title={!isLoggedIn ? '로그인이 필요합니다' : undefined}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingToArc ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 저장 중…</>
                    : <><Save className="w-3.5 h-3.5" /> PromptArc에 저장</>}
                </button>
              )}
              {isRenderedTheRef ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-300 text-[11px] font-semibold" title="이 이미지가 현재 Micro-Edit 레퍼런스(base)입니다">
                  <Check className="w-3.5 h-3.5" /> 레퍼런스로 사용 중
                </div>
              ) : (
                <button
                  onClick={sendRenderedToEditReference}
                  title="이 이미지를 Micro-Edit 레퍼런스(base)로 보내 추가 효과를 적용"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/50 text-[11px] font-semibold transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> {currentView === 'edit' ? '레퍼런스로 보내기' : 'Micro-Edit 레퍼런스로'}
                </button>
              )}
              <button
                onClick={handleSendToRenderMatrix}
                disabled={sendingToRenderMatrix}
                title="렌더된 이미지를 Render Matrix 의 base image 로 자동 전송"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/50 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingToRenderMatrix ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 전송 중…</>
                  : <><Layers className="w-3.5 h-3.5" /> Render Matrix 로 보내기</>}
              </button>
              {renderedImage.modelId && (
                <span className="ml-auto text-[10px] text-zinc-500">
                  {IMAGEN_MODELS.find((m) => m.id === renderedImage.modelId)?.label || renderedImage.modelId}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 flex flex-col items-center justify-center text-zinc-600 gap-2 px-6 py-12 text-center">
            <ImageIcon className="w-9 h-9 opacity-30" />
            <p className="text-[12px] font-semibold leading-relaxed">
              {rendering ? '이미지 생성 중입니다' : '위 [렌더링] 버튼을 눌러 시작'}
            </p>
            <p className="text-[10px] text-zinc-700">선택한 모델: {IMAGEN_MODELS.find((m) => m.id === selectedImagenModel)?.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}
