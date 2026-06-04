import { useRef, useState } from "react";
import {
  ActivitySquare, Sliders, AlertCircle,
  ChevronRight, Check, Stars, Sparkles,
  Image as ImageIcon, Download, Save, Loader2, Upload, X,
} from "lucide-react";
// ScoreBar 는 RenderMatrix 와 시각이 동일 — 재사용.
import { ScoreBar } from "../../RenderMatrix/components/MatrixControls";
import PopHeader from "./PopHeader";
import { QUICK_ADJUSTMENTS, EDIT_BUDGETS } from "../constants/presets";
import { getQualityFeedback } from "../services/promptCompiler";

// 우측 결과 영역: Logic Audit / Quality Score / Quick Adjustments + 컴파일된 prompt + Imagen 렌더링.
// 하단 — 좌 프롬프트 / 우 Imagen 패널. RenderMatrix 와 동일한 렌더링 흐름.
export default function PopResultPanel({
  currentView, vfxPassMode, editVfxPassMode,
  auditIssues, qualityScores,
  activeTroubleshoots, onApplyTroubleshoot,
  aiModel, setAiModel, currentIR,
  compiledOutputs, optimizedPrompts, optimizedPromptsKo,
  isOptimizing, onOptimize, onCopy, isCopied,
  // Imagen 렌더링
  onRender, rendering, renderedImage, renderError,
  onDownloadRendered, onSaveToPromptArc, savingToArc, isLoggedIn,
  canRender, grade,
  // base image — 우측 결과 패널 상단 슬롯. Imagen 렌더링의 base 이미지(사이드바 referenceImage 와는 별개).
  baseImage, setBaseImage,
  // 모델 선택
  imagenModels = [], selectedModel, setSelectedModel,
}) {
  const isVfxBox = currentView === "editor" ? vfxPassMode : editVfxPassMode;
  const promptText = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
  const hasOutput = !!promptText;
  const quickList = currentView === 'editor' ? QUICK_ADJUSTMENTS : EDIT_BUDGETS;

  // 기본 이미지 업로드 — 드래그앤드롭 + 클릭. dataUrl 로 변환해서 setBaseImage.
  const baseFileInputRef = useRef(null);
  const [isDraggingBaseBox, setIsDraggingBaseBox] = useState(false);
  const handleBaseFiles = (files) => {
    const f = (files && files[0]) || null;
    if (!f || !f.type?.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => { setBaseImage?.(String(e.target.result)); };
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden">
      <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">
        {/* 기본 이미지(Base) — 우측 패널의 Imagen 렌더링 base. 좌측 사이드바의 referenceImage 와는 별개 슬롯.
            Logic Audit 충돌은 우상단 작은 뱃지로 합쳐 표시 (자세한 트러블슈팅은 Quick Adjustments 카드). */}
        <div
          className={`relative rounded-2xl flex flex-col overflow-hidden transition-colors ${
            isDraggingBaseBox
              ? 'bg-[#00CEC9]/10 border-2 border-dashed border-[#00CEC9]'
              : 'bg-[#18181B] border border-zinc-800'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingBaseBox(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingBaseBox(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDraggingBaseBox(false); handleBaseFiles(e.dataTransfer.files); }}
        >
          <div className="flex items-center justify-between p-5 pb-3 shrink-0">
            <div className="flex items-center gap-2 text-[#00CEC9]">
              <ImageIcon className="w-4 h-4" />
              <h2 className="text-[11px] font-black uppercase tracking-widest">기본 이미지</h2>
            </div>
            {auditIssues.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-bold" title={auditIssues.map(i => i.title).join(', ')}>
                <AlertCircle className="w-3 h-3" /> 충돌 {auditIssues.length}
              </span>
            )}
          </div>
          <div className="flex-1 px-5 pb-5 min-h-0">
            {baseImage ? (
              <div className="relative w-full h-full group">
                <img src={baseImage} alt="base"
                  className="w-full h-full object-contain rounded-xl border border-zinc-800 bg-black/40" />
                <button
                  onClick={(e) => { e.stopPropagation(); setBaseImage?.(null); }}
                  title="이미지 제거"
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => baseFileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 hover:bg-black/85 text-zinc-200 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  교체
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => baseFileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 hover:border-[#00CEC9]/50 transition-colors text-[11px] leading-relaxed"
              >
                <Upload className="w-6 h-6 mb-2 text-zinc-600" />
                <span className="font-semibold">클릭 또는 이미지를 끌어다 놓으세요</span>
                <span className="text-[10px] text-zinc-600 mt-1">Imagen 렌더링의 base 이미지</span>
              </button>
            )}
          </div>
          <input
            ref={baseFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleBaseFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-4 text-indigo-400 shrink-0">
            <ActivitySquare className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Quality Score</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
            <ScoreBar label="형태 보존 (Structure)" score={qualityScores.structure} colorClass="bg-blue-500" />
            <ScoreBar label="재질 통합 (Material)" score={qualityScores.material} colorClass="bg-purple-500" />
            <ScoreBar label="판독/가시성 (Visibility)" score={qualityScores.visibility} colorClass="bg-emerald-500" />
            <ScoreBar label="이펙트 절제 (FX Control)" score={qualityScores.fxControl} colorClass="bg-amber-500" />
          </div>
          <div className="mt-3 flex items-start gap-2 bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-lg">
            <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-indigo-200 leading-snug font-medium">
              {getQualityFeedback(qualityScores)}
            </p>
          </div>
        </div>

        <div className="bg-[#1E1B24] border border-emerald-900/30 rounded-2xl p-5 flex flex-col shrink-0 shadow-[inset_0_0_40px_rgba(16,185,129,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Sliders className="w-20 h-20 text-emerald-500" /></div>
          <div className="flex items-center gap-2 mb-4 text-emerald-400 shrink-0 relative z-10">
            <Sliders className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Quick Adjustments</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 relative z-10 pr-1">
            {quickList.map((opt, i) => {
              if (!opt.action) return null;
              const isActive = activeTroubleshoots.includes(opt.id);
              return (
                <button key={i} onClick={() => onApplyTroubleshoot(opt, true)}
                  className={`w-full text-left p-3 rounded-xl transition-all group flex gap-3 items-start ${isActive ? 'bg-emerald-900/30 border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/40 hover:bg-emerald-900/20 border border-emerald-500/10 hover:border-emerald-500/30'}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-zinc-700 bg-transparent'}`}>
                    {isActive && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex flex-col">
                    <div className={`text-[11px] font-bold mb-1 leading-snug transition-colors ${isActive ? 'text-emerald-300' : 'text-zinc-300 group-hover:text-emerald-300'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[9px] text-zinc-500 leading-snug">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 — 좌(프롬프트) / 우(Imagen 렌더링) 분할. RenderMatrix 와 동일. */}
      <div className="flex-1 flex gap-5 overflow-hidden min-h-0">

        {/* ─── 좌측 — 프롬프트 패널 ─── */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <PopHeader
            currentView={currentView}
            aiModel={aiModel} setAiModel={setAiModel}
            isCopied={isCopied} isOptimizing={isOptimizing} currentIR={currentIR}
            onOptimize={onOptimize} onCopy={onCopy}
          />
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.7] p-5 rounded-xl border relative group transition-colors ${isVfxBox ? 'bg-orange-950/20 border-orange-500/30 text-orange-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>
              {optimizedPrompts[aiModel] && (
                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[9px] px-3 py-1.5 rounded-bl-xl font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border-b border-l border-emerald-500/20">
                  <Stars className="w-3 h-3" /> OPTIMIZED
                </div>
              )}
              <div className="absolute top-4 right-4 bg-zinc-800/80 text-zinc-400 text-[9px] px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                {aiModel} {optimizedPrompts[aiModel] ? "Optimized" : "Engine"}
              </div>
              {optimizedPromptsKo[aiModel] && (
                <div className="mb-5 p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-[12px] leading-relaxed font-sans shadow-inner">
                  <span className="font-bold flex items-center gap-1.5 mb-2 text-emerald-400 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> AI 최적화 의도 분석 리포트
                  </span>
                  {optimizedPromptsKo[aiModel]}
                </div>
              )}
              {promptText}
            </div>
          </div>
        </div>

        {/* ─── 우측 — Imagen 렌더링 패널 ─── */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          {/* 헤더 — 좌: 모델 pill, 우: 렌더링 버튼 */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214] gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {imagenModels.length > 0 && setSelectedModel ? (
                imagenModels.map((m) => {
                  const active = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModel(m.id)}
                      disabled={!canRender || rendering}
                      title={`${m.label} · ${m.desc}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap transition-colors ${active ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <span>{m.label}</span>
                      <span className="text-[9px] opacity-60 font-medium">{m.desc}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-[11px] text-zinc-500">Imagen 렌더링</span>
              )}
            </div>

            {/* 1차 액션 — 렌더링. 우측 상단 "기본 이미지(baseImage)" 없으면 차단. */}
            <button
              onClick={() => onRender?.(promptText)}
              disabled={rendering || !canRender || !hasOutput || !onRender || !baseImage}
              title={
                !canRender ? `Pro 등급부터 사용할 수 있습니다 (현재: ${grade || 'general'})`
                : !hasOutput ? '먼저 프롬프트를 생성하세요'
                : !baseImage ? '우측 상단 "기본 이미지"에 base 이미지를 등록하세요'
                : undefined
              }
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap bg-[#00CEC9] hover:bg-[#00CEC9]/90 text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {rendering ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중…</>
              ) : !canRender ? (
                <><ImageIcon className="w-3.5 h-3.5" /> Pro 전용</>
              ) : !baseImage ? (
                <><AlertCircle className="w-3.5 h-3.5" /> 기본 이미지 필요</>
              ) : (
                <><ImageIcon className="w-3.5 h-3.5" /> 렌더링</>
              )}
            </button>
          </div>

          {/* 본문 — 빈 상태 / 에러 / 이미지 */}
          <div className="flex-1 flex flex-col p-6 gap-3 overflow-y-auto custom-scrollbar min-h-0">
            {!canRender && (
              <div className="shrink-0 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-400 leading-snug">
                Imagen 렌더링은 <b className="text-zinc-200">Pro 등급 이상</b>만 사용할 수 있습니다. 프로필 메뉴에서 업그레이드를 신청하세요.
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
                  <img
                    src={renderedImage.dataUrl}
                    alt="Imagen render"
                    className="max-w-full max-h-full w-auto h-auto object-contain block"
                  />
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
                      {imagenModels.find((m) => m.id === renderedImage.modelId)?.label || renderedImage.modelId}로 생성됨
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-0 rounded-xl border border-dashed border-zinc-800 bg-black/20 flex flex-col items-center justify-center text-zinc-600 gap-2 px-6 text-center">
                <ImageIcon className="w-10 h-10 opacity-30" />
                <p className="text-[12px] font-semibold leading-relaxed">
                  {!hasOutput
                    ? '좌측에서 프롬프트를 생성/최적화하세요'
                    : !baseImage
                      ? '우측 상단 "기본 이미지"에 base 이미지를 등록하세요'
                      : rendering
                        ? '이미지 생성 중입니다'
                        : '우측 상단 [렌더링] 버튼을 눌러 시작'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
