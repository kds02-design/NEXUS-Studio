/* eslint-disable */
// Imagen 렌더 영역 — 모델 선택 + 렌더 버튼 + 결과 + Download + Save / Send.
// 자동 저장 흐름: PromptEngine 의 handleRender 가 결과 직후 saveRenderToPromptArc 호출 →
// savedToArcId 가 채워지면 여기 버튼이 "저장됨" 인디케이터로 전환.
import React, { useState } from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, Download, Save, Check, Layers, Maximize2, PenTool } from 'lucide-react';
import ImageZoomModal from '../../../../../components/ImageZoomModal';

const ImagenRenderArea = ({
  promptText,
  imagenModels = [],
  selectedModel,
  setSelectedModel,
  onRender,
  rendering,
  renderStage,
  renderedImage,
  renderError,
  onDownloadRendered,
  onSaveToPromptArc,
  savingToArc,
  savedToArcId,              // 자동/수동 저장 완료 시 PromptArc doc id.
  onSendToRenderMatrix,      // Render Matrix 의 base image 로 송신.
  sendingToRenderMatrix,
  onSendToVectorForge,       // Vector Forge 로 송신 — 흑백 형태를 SVG 벡터로.
  isLoggedIn,
  canRender,
  grade,
}) => {
  const hasOutput = !!promptText;
  const [zoomOpen, setZoomOpen] = useState(false);

  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden h-full min-h-[480px]">
      {/* 헤더 — 모델 라벨(고정) + 렌더 버튼. 모델은 품질 일관성을 위해 하나로 고정되므로 선택 UI 없음. */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-[#121214] gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap truncate" title={imagenModels[0]?.desc || undefined}>
            {imagenModels[0]?.label || 'Imagen 렌더링'}
            {imagenModels[0]?.desc && <span className="ml-1.5 text-[9px] text-zinc-600 font-medium">{imagenModels[0].desc}</span>}
          </span>
        </div>
        <button
          onClick={() => onRender?.(promptText)}
          disabled={rendering || !canRender || !hasOutput || !onRender}
          title={
            !canRender ? `Pro 등급부터 사용할 수 있습니다 (현재: ${grade || 'general'})`
            : !hasOutput ? '좌측 옵션을 설정하면 프롬프트가 준비됩니다'
            : undefined
          }
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {rendering ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {renderStage === 'optimizing' ? 'AI 최적화 중…' : '생성 중…'}</>
          ) : !canRender ? (
            <><ImageIcon className="w-3.5 h-3.5" /> Pro 전용</>
          ) : (
            <><ImageIcon className="w-3.5 h-3.5" /> 렌더링</>
          )}
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto custom-scrollbar min-h-0">
        {!canRender && (
          <div className="shrink-0 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-400 leading-snug">
            Imagen 렌더링은 <b className="text-zinc-200">Pro 등급 이상</b>만 사용할 수 있습니다.
          </div>
        )}
        {renderError && (
          <div className="shrink-0 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-[11px] text-rose-300/90 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="leading-snug break-words">{renderError}</span>
          </div>
        )}
        {renderedImage?.dataUrl ? (
          <>
            <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-black/40 overflow-hidden flex items-center justify-center relative group cursor-zoom-in"
              onClick={() => setZoomOpen(true)} title="클릭하면 전체화면으로 봅니다">
              <img src={renderedImage.dataUrl} alt="Imagen render"
                className="max-w-full max-h-full w-auto h-auto object-contain block" />
              <span className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-2 flex-wrap">
              <button
                onClick={onDownloadRendered}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> 다운로드
              </button>
              {/* PromptArc 자동 저장 결과 — id 가 있으면 저장됨 인디케이터, 없으면 수동 저장 버튼.
                  자동 저장 실패 시 사용자가 재시도할 수 있게 미저장 시에만 버튼 노출. */}
              {savedToArcId ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-semibold" title={`PromptArc doc id: ${savedToArcId}`}>
                  <Check className="w-3.5 h-3.5" /> PromptArc 저장됨
                </div>
              ) : (
                <button
                  onClick={() => onSaveToPromptArc?.(promptText)}
                  disabled={savingToArc || !isLoggedIn}
                  title={!isLoggedIn ? '로그인이 필요합니다' : undefined}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingToArc ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 저장 중…</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" /> PromptArc에 저장</>
                  )}
                </button>
              )}
              {/* Render Matrix 로 송신 — base image 슬롯에 자동 임포트되어 후속 머티리얼/렌더 효과 적용 가능. */}
              {onSendToRenderMatrix && (
                <button
                  onClick={onSendToRenderMatrix}
                  disabled={sendingToRenderMatrix}
                  title="렌더된 이미지를 Render Matrix 의 base image 로 자동 전송"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-500/50 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sendingToRenderMatrix ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 전송 중…</>
                  ) : (
                    <><Layers className="w-3.5 h-3.5" /> Render Matrix 로 보내기</>
                  )}
                </button>
              )}
              {onSendToVectorForge && (
                <button
                  onClick={onSendToVectorForge}
                  title="렌더된 흑백 글자 형태를 Vector Forge 로 보내 SVG 벡터로 변환"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-500/50 text-[11px] font-semibold transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" /> Vector Forge 로 보내기
                </button>
              )}
              {renderedImage.modelId && (
                <span className="ml-auto text-[10px] text-zinc-500">
                  {imagenModels.find((m) => m.id === renderedImage.modelId)?.label || renderedImage.modelId}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 rounded-xl border border-dashed border-zinc-800 bg-black/20 flex flex-col items-center justify-center text-zinc-600 gap-2 px-6 text-center">
            <ImageIcon className="w-9 h-9 opacity-30" />
            <p className="text-[12px] font-semibold leading-relaxed">
              {!hasOutput
                ? '좌측에서 옵션을 고르면 프롬프트가 자동으로 준비됩니다'
                : rendering
                  ? '이미지 생성 중입니다'
                  : '우측 상단 [렌더링] 버튼을 눌러 시작'}
            </p>
          </div>
        )}
      </div>
      {zoomOpen && renderedImage?.dataUrl && (
        <ImageZoomModal src={renderedImage.dataUrl} onClose={() => setZoomOpen(false)} />
      )}
    </div>
  );
};

export default ImagenRenderArea;
