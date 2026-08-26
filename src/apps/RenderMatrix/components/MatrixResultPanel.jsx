import { useRef, useState } from "react";
import {
  ActivitySquare, Sliders, AlertCircle,
  ChevronRight, Check, Stars, Sparkles, Image as ImageIcon, Download, Save, Loader2,
  Upload, X, Maximize2, Scissors,
} from "lucide-react";
import { ScoreBar } from "./MatrixControls";
import MatrixHeader from "./MatrixHeader";
import ImageZoomModal from "../../../components/ImageZoomModal";
import { QUICK_ADJUSTMENTS, EDIT_BUDGETS } from "../constants/presets";
import { getQualityFeedback } from "../services/promptCompiler";

// 우측 결과 영역: Logic Audit / Quality Score / Quick Adjustments 카드 3개 +
// 하단 모델 헤더 + 컴파일된 prompt 출력 박스 + Imagen 렌더 영역.
// 예상 질감·느낌 요약 한 줄 — [라벨] [값] 컴팩트 행.
function FeelRow({ k, v }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 text-[10px] leading-snug">
      <span className="text-zinc-500 shrink-0 w-10 font-bold">{k}</span>
      <span className="text-zinc-300 min-w-0">{v}</span>
    </div>
  );
}

export default function MatrixResultPanel({
  currentView, vfxPassMode, editVfxPassMode,
  auditIssues, qualityScores, feelSummary,
  activeTroubleshoots, onApplyTroubleshoot,
  aiModel, setAiModel, currentIR,
  compiledOutputs, optimizedPrompts, optimizedPromptsKo,
  isOptimizing, onOptimize, isCompressing, onCompress, onCopy, isCopied, onSendToMotion,
  // Imagen 렌더링
  onRender, rendering, renderedImage, renderError,
  onDownloadRendered, onSaveToPromptArc, onSendToMaskForge, savingToArc, isLoggedIn,
  canRender, grade,
  // 기본 이미지 — image-to-image 렌더링의 실제 입력.
  // 사이드바 "Image Analyzer" 의 referenceImage 와 분리된 별도 state (baseImage).
  baseImage, setBaseImage,
  // 마이크로 에디트 뷰의 Target 이미지 — edit 뷰에서는 이것이 렌더 입력.
  editImage,
  // 모델 선택
  imagenModels = [], selectedModel, setSelectedModel,
  // 출력 해상도 — Pro 모델만 선택 가능 (Flash 는 1K 고정)
  renderSizes = [], selectedRenderSize, setSelectedRenderSize, sizeSelectable = false,
}) {
  const isVfxBox = currentView === "editor" ? vfxPassMode : editVfxPassMode;
  const promptText = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
  // 렌더 결과 전체화면 모달 — 키/줌/팬 처리는 FullscreenImageModal 이 담당.
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const hasOutput = !!promptText;
  // 렌더 가능 판정용 참조 이미지 — 뷰별로 실제 렌더에 쓰이는 입력과 동일 기준.
  // (이전엔 edit 뷰에서도 baseImage 만 보고 버튼을 잠가, Target 이미지를 올려도 렌더 불가였음)
  const renderRefImage = currentView === 'edit' ? editImage : baseImage;
  const renderRefHint = currentView === 'edit'
    ? '사이드바 마이크로 에디트에 Target 이미지를 업로드하세요'
    : '좌측 상단 "기본 이미지"에 참조 이미지를 등록하세요';
  const quickList = currentView === 'editor' ? QUICK_ADJUSTMENTS : EDIT_BUDGETS;

  // 기본 이미지 업로드 — 드래그앤드롭 + 클릭. dataUrl 로 변환해서 setBaseImage.
  const refFileInputRef = useRef(null);
  const [isDraggingRefBox, setIsDraggingRefBox] = useState(false);
  const handleRefFiles = (files) => {
    const f = (files && files[0]) || null;
    if (!f || !f.type?.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => { setBaseImage?.(String(e.target.result)); };
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden min-h-0">
      <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">
        {/* 기본 이미지 (Reference) — 드래그앤드롭 업로드. 사이드바의 reference 와 동일 state 공유. */}
        <div
          className={`relative rounded-2xl flex flex-col overflow-hidden transition-colors ${
            isDraggingRefBox
              ? 'bg-[#00CEC9]/10 border-2 border-dashed border-[#00CEC9]'
              : 'bg-[#18181B] border border-zinc-800'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingRefBox(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingRefBox(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDraggingRefBox(false); handleRefFiles(e.dataTransfer.files); }}
        >
          <div className="flex items-center justify-between p-5 pb-3 shrink-0">
            <div className="flex items-center gap-2 text-[#00CEC9]">
              <ImageIcon className="w-4 h-4" />
              <h2 className="text-[11px] font-black uppercase tracking-widest">기본 이미지</h2>
            </div>
            {/* Logic Audit 알림 — 충돌 있을 때만 작게 표시 */}
            {auditIssues.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-bold" title={auditIssues.map(i => i.title).join(', ')}>
                <AlertCircle className="w-3 h-3" /> 충돌 {auditIssues.length}
              </span>
            )}
          </div>
          <div className="flex-1 px-5 pb-5 min-h-0">
            {baseImage ? (
              <div className="relative w-full h-full group">
                <img src={baseImage} alt="reference"
                  className="w-full h-full object-contain rounded-xl border border-zinc-800 bg-black/40" />
                <button
                  onClick={(e) => { e.stopPropagation(); setBaseImage?.(null); }}
                  title="이미지 제거"
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => refFileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 hover:bg-black/85 text-zinc-200 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  교체
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => refFileInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 hover:border-[#00CEC9]/50 transition-colors text-[11px] leading-relaxed"
              >
                <Upload className="w-6 h-6 mb-2 text-zinc-600" />
                <span className="font-semibold">클릭 또는 이미지를 끌어다 놓으세요</span>
                <span className="text-[10px] text-zinc-600 mt-1">렌더링/편집의 기준이 되는 시안 이미지</span>
              </button>
            )}
          </div>
          <input
            ref={refFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleRefFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* Quality Score */}
        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-4 text-indigo-400 shrink-0">
            <ActivitySquare className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Quality Score</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3 bg-black/20 p-4 rounded-xl border border-zinc-800/50">
            {/* 채도 낮춤 — 색조는 유지하되 /40 opacity 로 muted. */}
            <ScoreBar label="형태 보존 (Structure)" score={qualityScores.structure} colorClass="bg-sky-400/40" />
            <ScoreBar label="재질 통합 (Material)" score={qualityScores.material} colorClass="bg-violet-400/40" />
            <ScoreBar label="판독/가시성 (Visibility)" score={qualityScores.visibility} colorClass="bg-emerald-400/40" />
            <ScoreBar label="이펙트 절제 (FX Control)" score={qualityScores.fxControl} colorClass="bg-amber-400/40" />
          </div>
          <div className="mt-3 flex items-start gap-2 bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg">
            <ChevronRight className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-zinc-300 leading-snug font-medium">
              {getQualityFeedback(qualityScores)}
            </p>
          </div>
          {/* 예상 질감·느낌 요약 — 점수(수치)가 못 보여주는 "어떤 느낌으로 나올지"를
              현재 옵션 조합에서 규칙 기반으로 요약. editor 뷰에서만 제공. */}
          {currentView === 'editor' && feelSummary && (
            <div className="mt-3 bg-zinc-900/40 border border-zinc-800 p-3 rounded-lg space-y-1.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-indigo-300/80 mb-0.5">예상 질감 · 느낌</div>
              <FeelRow k="무드" v={feelSummary.mood} />
              <FeelRow k="재질" v={feelSummary.material} />
              <FeelRow k="조형" v={feelSummary.form} />
              <FeelRow k="라이팅" v={feelSummary.lighting} />
              <FeelRow k="이펙트" v={feelSummary.fx} />
              <FeelRow k="배경" v={feelSummary.background} />
            </div>
          )}
        </div>

        {/* Quick Adjustments */}
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

      {/* 하단 — 좌(프롬프트)/우(렌더링) 분할. 각 컬럼 1:1 비율, 독립 스크롤. */}
      <div className="flex-1 flex gap-5 overflow-hidden min-h-0">

        {/* ─── 좌측 — 프롬프트 패널 ─── */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <MatrixHeader
            currentView={currentView}
            aiModel={aiModel} setAiModel={setAiModel}
            hasOutput={hasOutput} isCopied={isCopied}
            isOptimizing={isOptimizing} currentIR={currentIR}
            isCompressing={isCompressing} onCompress={onCompress}
            onOptimize={onOptimize} onCopy={onCopy} onSendToMotion={onSendToMotion}
          />
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.7] p-5 rounded-xl border relative group transition-colors ${isVfxBox ? 'bg-orange-950/20 border-orange-500/30 text-orange-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>
              {optimizedPrompts[aiModel] && (
                <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-300 text-[9px] px-3 py-1.5 rounded-bl-xl font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border-b border-l border-emerald-500/20">
                  <Stars className="w-3 h-3" /> OPTIMIZED
                </div>
              )}
              <div className="absolute top-4 right-4 bg-zinc-800/80 text-zinc-400 text-[9px] px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                {aiModel} {optimizedPrompts[aiModel] ? "Optimized" : "Engine"}
              </div>
              {optimizedPromptsKo[aiModel] && (
                <div className="mb-5 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-100/90 text-[12px] leading-relaxed font-sans">
                  <span className="font-bold flex items-center gap-1.5 mb-2 text-emerald-300/90 tracking-wider">
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
          {/* 헤더 — 좌: 모델 pill, 우: 렌더링 버튼(1차 액션) */}
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
              {/* 출력 해상도 — Pro 모델 전용. Flash 선택 시 1K 고정 안내. */}
              {renderSizes.length > 0 && setSelectedRenderSize && (
                <div className="flex items-center gap-1 ml-1 pl-2 border-l border-zinc-800">
                  {sizeSelectable ? (
                    renderSizes.map((s) => {
                      const active = selectedRenderSize === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedRenderSize(s.id)}
                          disabled={!canRender || rendering}
                          title={s.desc}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-colors ${active ? 'bg-[#00CEC9]/15 border-[#00CEC9]/50 text-[#00CEC9]' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {s.label}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-zinc-600 whitespace-nowrap" title="해상도 선택은 Nano Banana Pro 전용 — Flash 모델은 1K 고정입니다">1K 고정</span>
                  )}
                </div>
              )}
            </div>

            {/* 1차 액션 — 렌더링만 컬러 강조. 참조 이미지 없으면 차단. */}
            <button
              onClick={() => onRender?.(promptText)}
              disabled={rendering || !canRender || !hasOutput || !onRender || !renderRefImage}
              title={
                !canRender ? `Pro 등급부터 사용할 수 있습니다 (현재: ${grade || 'general'})`
                : !hasOutput ? '먼저 프롬프트를 생성하세요'
                : !renderRefImage ? renderRefHint
                : undefined
              }
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap bg-[#00CEC9] hover:bg-[#00CEC9]/90 text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {rendering ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중…</>
              ) : !canRender ? (
                <><ImageIcon className="w-3.5 h-3.5" /> Pro 전용</>
              ) : !renderRefImage ? (
                <><AlertCircle className="w-3.5 h-3.5" /> {currentView === 'edit' ? 'Target 이미지 필요' : '참조 이미지 필요'}</>
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
                {/* 클릭 → 전체화면 모달 (Esc/클릭으로 닫기) */}
                <div
                  className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-black/40 overflow-hidden flex items-center justify-center relative group cursor-zoom-in"
                  onClick={() => setImageFullscreen(true)}
                  title="클릭하면 전체화면으로 봅니다"
                >
                  <img
                    src={renderedImage.dataUrl}
                    alt="Imagen render"
                    className="max-w-full max-h-full w-auto h-auto object-contain block"
                  />
                  <span className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>
                {/* 액션 바 — 모두 뉴트럴(보더+텍스트). */}
                <div className="shrink-0 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={onDownloadRendered}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> 다운로드
                  </button>
                  <button
                    onClick={onSendToMaskForge}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors"
                  >
                    <Scissors className="w-3.5 h-3.5" /> Mask Forge로 투명화
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
                    : !renderRefImage
                      ? renderRefHint
                      : rendering
                        ? '이미지 생성 중입니다'
                        : '우측 상단 [렌더링] 버튼을 눌러 시작'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 전체화면 이미지 모달 — portal 로 body 에 렌더 (레이아웃 overflow 영향 회피). */}
      {imageFullscreen && renderedImage?.dataUrl && (
        <ImageZoomModal src={renderedImage.dataUrl} onClose={() => setImageFullscreen(false)} />
      )}
    </div>
  );
}
