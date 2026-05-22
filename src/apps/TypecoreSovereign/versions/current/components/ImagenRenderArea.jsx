/* eslint-disable */
// Imagen 렌더 영역 — 모델 선택 + 렌더 버튼 + 결과 + Download + Save to PromptArc.
// 참조 이미지 입력은 제거 — 사용자 요청에 따라 prompt 만으로 렌더링.
import React from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, Download, Save } from 'lucide-react';

const ImagenRenderArea = ({
  promptText,
  imagenModels = [],
  selectedModel,
  setSelectedModel,
  onRender,
  rendering,
  renderedImage,
  renderError,
  onDownloadRendered,
  onSaveToPromptArc,
  savingToArc,
  isLoggedIn,
  canRender,
  grade,
}) => {
  const hasOutput = !!promptText;

  return (
    <div className="bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden h-full min-h-[480px]">
      {/* 헤더 — 모델 pill + 렌더 버튼 */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 bg-[#121214] gap-3">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {imagenModels.length > 0 && setSelectedModel ? (
            imagenModels.map((m) => {
              const active = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  disabled={!canRender || rendering}
                  title={`${m.label}${m.desc ? ' · ' + m.desc : ''}`}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap transition-colors ${active ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span>{m.label}</span>
                  {m.desc && <span className="text-[9px] opacity-60 font-medium">{m.desc}</span>}
                </button>
              );
            })
          ) : (
            <span className="text-[11px] text-zinc-500">Imagen 렌더링</span>
          )}
        </div>
        <button
          onClick={() => onRender?.(promptText)}
          disabled={rendering || !canRender || !hasOutput || !onRender}
          title={
            !canRender ? `Pro 등급부터 사용할 수 있습니다 (현재: ${grade || 'general'})`
            : !hasOutput ? '먼저 프롬프트를 컴파일하세요'
            : undefined
          }
          className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {rendering ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중…</>
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
            <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-black/40 overflow-hidden flex items-center justify-center">
              <img src={renderedImage.dataUrl} alt="Imagen render"
                className="max-w-full max-h-full w-auto h-auto object-contain block" />
            </div>
            <div className="shrink-0 flex items-center gap-2 flex-wrap">
              <button
                onClick={onDownloadRendered}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> 다운로드
              </button>
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
                ? '좌측 프롬프트를 먼저 컴파일하세요'
                : rendering
                  ? '이미지 생성 중입니다'
                  : '우측 상단 [렌더링] 버튼을 눌러 시작'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagenRenderArea;
