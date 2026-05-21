import { useRef, useState } from 'react';
import {
  AlertCircle, CheckCircle, Image as ImageIcon, Upload, X, Loader2,
  Sliders, Activity, Video as VideoIcon, Download, Save, Zap, Sparkles,
} from 'lucide-react';
import { EXPORT_MODES, EXPORT_MODE_INFO } from '../constants/presets';

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const LoopIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#FDCB6E' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="22" x2="4" y2="22"></line><polyline points="8 21 3 21 3 16"></polyline>
    <path d="M21 3v5h-5"></path><path d="M3 21v-5h5"></path>
    <path d="M21 8a9 9 0 0 1-9 9 9 9 0 0 1-9-9"></path><path d="M3 16a9 9 0 0 1 9-9 9 9 0 0 1 9 9"></path>
  </svg>
);
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);
const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

export function AnalysisModal({ analysisModal, setAnalysisModal, setEvalChecks, animationMode, showToast }) {
  if (!analysisModal.isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181B] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4">
        <div className="bg-zinc-900/40 px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-[12px] font-bold text-zinc-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            AI 영상 검수 리포트
          </h3>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[11px] text-zinc-400 leading-relaxed">영상 분석 결과 아래 오류가 감지되었습니다. <b>현재 우측 원본 프롬프트</b>에 보정 지시어를 추가하시겠습니까?</p>
          <div className="flex flex-col gap-2 bg-black/30 p-3.5 rounded-xl border border-zinc-800">
            {['cameraMoved', 'shapeMutated', 'loopBroken', 'particlesEscaped', 'alphaDirty'].map((key) => {
              if (!analysisModal.results[key]) return null;
              if (key === 'loopBroken' && animationMode !== 'loop') return null;
              const labels = {
                cameraMoved: '카메라 줌 아웃 / 이동 감지됨',
                shapeMutated: '타이포 형태 변형 및 왜곡 감지됨',
                loopBroken: '루프 깨짐 / 끝부분 뚝 끊김 감지됨',
                particlesEscaped: '입자의 프레임 외곽 이탈 감지됨',
                alphaDirty: '배경 오염 감지됨',
              };
              return (
                <div key={key} className="flex flex-col gap-1 mb-1.5 last:mb-0">
                  <span className="text-[11px] text-zinc-100 flex items-center gap-2 font-medium">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span> {labels[key]}
                  </span>
                  <span className="text-[10px] text-zinc-400 pl-3.5 leading-relaxed bg-black/40 p-1.5 rounded border border-zinc-800/60">
                    <span className="font-bold text-zinc-500">AI 분석:</span> {analysisModal.results[`${key}Reasoning`]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2.5 mt-2">
            <button onClick={() => setAnalysisModal({ isOpen: false, results: null })} className="flex-1 py-2 rounded-lg bg-black/30 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 text-[11px] font-medium transition-colors border border-zinc-800">취소 (무시)</button>
            <button
              onClick={() => {
                setEvalChecks((prev) => ({
                  cameraMoved: prev.cameraMoved || analysisModal.results.cameraMoved,
                  shapeMutated: prev.shapeMutated || analysisModal.results.shapeMutated,
                  loopBroken: prev.loopBroken || analysisModal.results.loopBroken,
                  particlesEscaped: prev.particlesEscaped || analysisModal.results.particlesEscaped,
                  alphaDirty: prev.alphaDirty || analysisModal.results.alphaDirty,
                }));
                setAnalysisModal({ isOpen: false, results: null });
                showToast('보정 프롬프트가 설정에 반영되었습니다.');
              }}
              className="flex-1 py-2 rounded-lg bg-[#FDCB6E] hover:bg-[#FDCB6E]/90 text-black text-[11px] font-bold transition-colors"
            >
              보정 프롬프트 자동 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 생성 탭 — 상단 3-카드 (참조 이미지 / 모드 / 인스펙터) + 하단 split (프롬프트 / Veo 렌더) ───
function GenerateView(p) {
  const refFileInputRef = useRef(null);
  const [isDraggingRefBox, setIsDraggingRefBox] = useState(false);
  const handleRefFiles = (files) => {
    const f = (files && files[0]) || null;
    if (!f || !f.type?.startsWith('image/')) return;
    p.onImageChange?.(f);
  };

  const promptText = p.combinedOutput;
  const hasOutput = !!promptText && promptText.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-hidden min-h-0 p-5">
      {/* 상단 3카드 */}
      <div className="grid grid-cols-3 gap-5 h-[280px] shrink-0">
        {/* 참조 이미지 */}
        <div
          className={`relative rounded-2xl flex flex-col overflow-hidden transition-colors ${
            isDraggingRefBox
              ? 'bg-[#FDCB6E]/10 border-2 border-dashed border-[#FDCB6E]'
              : 'bg-[#18181B] border border-zinc-800'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingRefBox(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingRefBox(false); }}
          onDrop={(e) => { e.preventDefault(); setIsDraggingRefBox(false); handleRefFiles(e.dataTransfer.files); }}
        >
          <div className="flex items-center justify-between p-5 pb-3 shrink-0">
            <div className="flex items-center gap-2 text-[#FDCB6E]">
              <ImageIcon className="w-4 h-4" />
              <h2 className="text-[11px] font-black uppercase tracking-widest">기본 이미지</h2>
            </div>
          </div>
          <div className="flex-1 px-5 pb-5 min-h-0">
            {p.image ? (
              <div className="relative w-full h-full group">
                <img src={p.image} alt="reference" className="w-full h-full object-contain rounded-xl border border-zinc-800 bg-black/40" />
                <button
                  onClick={(e) => { e.stopPropagation(); p.setImage?.(null); }}
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
                className="w-full h-full flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800 hover:border-[#FDCB6E]/50 transition-colors text-[11px] leading-relaxed"
              >
                <Upload className="w-6 h-6 mb-2 text-zinc-600" />
                <span className="font-semibold">클릭 또는 이미지를 끌어다 놓으세요</span>
                <span className="text-[10px] text-zinc-600 mt-1">Veo 영상의 기준이 되는 첫 프레임</span>
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

        {/* Animation Mode + Export Mode */}
        <div className="bg-[#18181B] border border-zinc-800 rounded-2xl p-5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-4 text-indigo-400 shrink-0">
            <Activity className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Output Mode</h2>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div>
              <div className="text-[9px] font-bold text-zinc-500 mb-1.5 tracking-wider">EXPORT</div>
              <div className="flex flex-wrap gap-1 bg-black/30 rounded-lg p-1 border border-zinc-800">
                {EXPORT_MODES.map((mode) => (
                  <button key={mode.id} onClick={() => p.setExportMode(mode.id)}
                    className={`flex-1 min-w-0 px-2 py-1.5 text-[10px] font-bold rounded transition-colors ${p.exportMode === mode.id ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {mode.label}
                  </button>
                ))}
              </div>
              {EXPORT_MODE_INFO[p.exportMode] && (
                <p className="text-[9.5px] text-zinc-500 leading-relaxed mt-2">{EXPORT_MODE_INFO[p.exportMode].desc}</p>
              )}
            </div>
            <div className="pt-3 border-t border-zinc-800">
              <button onClick={() => p.setIsOptimized(!p.isOptimized)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[10px] font-bold border transition-colors ${p.isOptimized ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-black/30 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> Auto-Optimize</span>
                <span className="text-[9px] opacity-80">{p.isOptimized ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inspector Logs / Quick Hint */}
        <div className="bg-[#1E1B24] border border-emerald-900/30 rounded-2xl p-5 flex flex-col shrink-0 shadow-[inset_0_0_40px_rgba(16,185,129,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none"><Sliders className="w-20 h-20 text-emerald-500" /></div>
          <div className="flex items-center gap-2 mb-4 text-emerald-400 shrink-0 relative z-10">
            <Sliders className="w-4 h-4" />
            <h2 className="text-[11px] font-black uppercase tracking-widest">Prompt Inspector</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col gap-1.5 pr-1">
            {p.isOptimized && p.logs && p.logs.length > 0 ? (
              p.logs.map((log, i) => (
                <div key={i} className={`text-[9.5px] font-mono leading-relaxed px-2 py-1 rounded ${log.includes('⚠️') ? 'text-amber-300 bg-amber-500/5' : 'text-zinc-400'}`}>{log}</div>
              ))
            ) : (
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                {p.isOptimized ? '자동 보정될 항목이 없습니다. 프롬프트가 깔끔해요.' : 'Auto-Optimize OFF — 원본 그대로 출력됩니다.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 하단 — 좌(프롬프트) / 우(Veo 렌더) */}
      <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
        {/* 프롬프트 */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214] gap-3">
            <span className="text-[11px] font-bold text-zinc-200 tracking-wider uppercase">Target Model Prompt</span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono ${p.isOverLimit ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>{p.promptLength} / {p.currentMaxLimit}</span>
              <button onClick={() => p.handleCopy(p.combinedOutput)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors">
                Copy
              </button>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar min-h-0">
            <div className={`font-mono text-[13px] whitespace-pre-wrap leading-[1.7] p-5 rounded-xl border ${p.isOverLimit ? 'bg-rose-950/20 border-rose-500/30 text-rose-200' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-200'}`}>
              {promptText || '좌측에서 옵션을 설정하세요.'}
            </div>
          </div>
        </div>

        {/* Veo 렌더 */}
        <div className="flex-1 min-w-0 bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-[#121214] gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {p.veoModels?.length > 0 && p.setSelectedVeoModel ? (
                p.veoModels.map((m) => {
                  const active = p.selectedVeoModel === m.id;
                  return (
                    <button key={m.id} onClick={() => p.setSelectedVeoModel(m.id)}
                      disabled={!p.canRender || p.rendering}
                      title={`${m.label} · ${m.desc}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap transition-colors ${active ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                      <span>{m.label}</span>
                      <span className="text-[9px] opacity-60 font-medium">{m.desc}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-[11px] text-zinc-500">Veo 영상 렌더</span>
              )}
            </div>
            <button
              onClick={() => p.onRender?.(promptText)}
              disabled={p.rendering || !p.canRender || !hasOutput || !p.onRender || !p.image}
              title={
                !p.canRender ? `Pro 등급부터 사용할 수 있습니다 (현재: ${p.grade || 'general'})`
                : !hasOutput ? '먼저 프롬프트를 생성하세요'
                : !p.image ? '"기본 이미지"를 등록하세요'
                : undefined
              }
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all active:scale-95 whitespace-nowrap bg-[#FDCB6E] hover:bg-[#FDCB6E]/90 text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {p.rendering ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중…</>
              ) : !p.canRender ? (
                <><VideoIcon className="w-3.5 h-3.5" /> Pro 전용</>
              ) : !p.image ? (
                <><AlertCircle className="w-3.5 h-3.5" /> 참조 필요</>
              ) : (
                <><VideoIcon className="w-3.5 h-3.5" /> 영상 렌더</>
              )}
            </button>
          </div>
          <div className="flex-1 flex flex-col p-6 gap-3 overflow-y-auto custom-scrollbar min-h-0">
            {!p.canRender && (
              <div className="shrink-0 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40 text-[11px] text-zinc-400 leading-snug">
                Veo 영상 렌더는 <b className="text-zinc-200">Pro 등급 이상</b>만 사용할 수 있습니다. 프로필 메뉴에서 업그레이드를 신청하세요.
              </div>
            )}
            {p.rendering && (
              <div className="shrink-0 px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-950/20 text-[11px] text-amber-200 flex items-start gap-2">
                <Loader2 className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-spin" />
                <span className="leading-snug">Veo가 영상을 만드는 중입니다 — 보통 30초 ~ 2분 걸려요. 탭을 떠나도 백그라운드에서 계속 진행됩니다.</span>
              </div>
            )}
            {p.renderError && (
              <div className="shrink-0 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-[11px] text-rose-300/90 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="leading-snug break-words">{p.renderError}</span>
              </div>
            )}
            {p.renderedVideo?.dataUrl ? (
              <>
                <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-black/40 overflow-hidden flex items-center justify-center">
                  <video
                    src={p.renderedVideo.dataUrl}
                    controls autoPlay loop muted playsInline
                    className="max-w-full max-h-full w-auto h-auto object-contain block"
                  />
                </div>
                <div className="shrink-0 flex items-center gap-2 flex-wrap">
                  <button onClick={p.onDownloadRendered}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors">
                    <Download className="w-3.5 h-3.5" /> 다운로드
                  </button>
                  <button onClick={() => p.onSaveToPromptArc?.(promptText)}
                    disabled={p.savingToArc || !p.isLoggedIn}
                    title={!p.isLoggedIn ? '로그인이 필요합니다' : undefined}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {p.savingToArc ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 저장 중…</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> PromptArc에 저장</>
                    )}
                  </button>
                  {p.renderedVideo.modelId && (
                    <span className="ml-auto text-[10px] text-zinc-500">
                      {p.veoModels?.find((m) => m.id === p.renderedVideo.modelId)?.label || p.renderedVideo.modelId}로 생성됨
                    </span>
                  )}
                </div>
              </>
            ) : !p.rendering && (
              <div className="flex-1 min-h-0 rounded-xl border border-dashed border-zinc-800 bg-black/20 flex flex-col items-center justify-center text-zinc-600 gap-2 px-6 text-center">
                <VideoIcon className="w-10 h-10 opacity-30" />
                <p className="text-[12px] font-semibold leading-relaxed">
                  {!hasOutput
                    ? '좌측에서 프롬프트를 생성하세요'
                    : !p.image
                      ? '"기본 이미지"를 등록하세요'
                      : '우측 상단 [영상 렌더] 버튼을 눌러 시작'}
                </p>
                <p className="text-[10px] text-zinc-700 mt-1 max-w-sm">
                  렌더 완료 시 PromptArc 내 폴더에 자동 저장됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidateView(p) {
  return (
    <div className="flex-1 p-5 flex flex-col gap-4 custom-scrollbar overflow-hidden">
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl flex flex-col shadow-lg shrink-0">
        <div className="bg-zinc-900/40 px-5 py-3 border-b border-zinc-800 shrink-0">
          <span className="text-[11px] font-medium text-zinc-100 tracking-wide">Original Prompt (원본 프롬프트 입력)</span>
        </div>
        <div className="p-4 bg-black/20">
          <textarea className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 text-[12px] text-zinc-100 outline-none focus:border-[#FDCB6E] resize-y custom-scrollbar min-h-[100px]" placeholder="문제가 발생한 영상 제작에 사용했던 원본 프롬프트를 붙여넣으세요..." value={p.baseValidatePrompt} onChange={(e) => p.setBaseValidatePrompt(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-zinc-700" />
      </div>
      <div className={`bg-[#18181B] border ${p.isOverLimit ? 'border-rose-500/50' : 'border-[#FDCB6E]/40'} rounded-xl flex flex-col shadow-lg flex-1 min-h-0 overflow-hidden`}>
        <div className="bg-zinc-900/40 px-5 py-3.5 border-b border-zinc-800 flex justify-between items-center shrink-0">
          <span className={`text-[11px] font-medium tracking-wide flex items-center gap-2 ${p.isOverLimit ? 'text-rose-400' : 'text-[#FDCB6E]'}`}>Corrected Prompt</span>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono ${p.isOverLimit ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>{p.promptLength} / {p.currentMaxLimit} chars</span>
            <button onClick={() => p.handleCopy(p.combinedOutput)} disabled={!p.finalOutput}
              className="text-[11px] bg-[#FDCB6E] hover:bg-[#FDCB6E]/90 text-black px-3.5 py-1.5 rounded-lg transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
              Copy Correction
            </button>
          </div>
        </div>
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[13px] font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed select-all">{p.combinedOutput || '원본 프롬프트를 입력하고 좌측에서 검수를 진행하면 보정 코드가 추가됩니다.'}</p>
        </div>
      </div>
    </div>
  );
}

function CompositingHeader(p) {
  return (
    <header className="h-14 flex items-center px-6 border-b border-zinc-800 shrink-0 justify-between bg-[#121214]">
      <div className="w-full flex items-center space-x-4">
        <button onClick={p.toggleQaPlay} disabled={!p.qaVideoSrc} className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${p.qaVideoSrc ? 'bg-[#FDCB6E] hover:bg-[#FDCB6E]/90 text-black shadow-[0_0_10px_rgba(253,203,110,0.3)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
          {p.qaIsPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="flex-1 flex items-center space-x-3">
          <span className="text-[11px] font-mono text-[#FDCB6E] w-12 text-right">{p.formatTime(p.qaCurrentTime)}</span>
          <input type="range" min="0" max={p.qaDuration || 100} step="0.01" value={p.qaCurrentTime} onChange={p.handleQaSeek} disabled={!p.qaVideoSrc} className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
          <span className="text-[11px] font-mono text-zinc-400 w-12">{p.formatTime(p.qaDuration)}</span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 border-l border-zinc-800 pl-4">
          <button onClick={() => p.setQaIsLooping(!p.qaIsLooping)} className={`p-1.5 rounded transition-colors ${p.qaIsLooping ? 'bg-[#FDCB6E]/10' : 'hover:bg-zinc-800'}`} title="반복 재생">
            <LoopIcon active={p.qaIsLooping} />
          </button>
          <select value={p.qaPlaybackRate} onChange={p.handleQaSpeedChange} disabled={!p.qaVideoSrc} className="bg-black/40 border border-zinc-800 text-[10px] text-zinc-100 rounded p-1.5 focus:outline-none focus:border-[#FDCB6E] font-mono">
            <option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1">1.0x (Normal)</option><option value="1.5">1.5x</option><option value="2">2.0x</option>
          </select>
        </div>
      </div>
    </header>
  );
}

function CompositingCanvas(p) {
  return (
    <div className={`flex-1 relative flex items-center justify-center overflow-hidden ${p.qaBgType === 'checker-dark' ? 'bg-checker-dark' : p.qaBgType === 'checker-light' ? 'bg-checker-light' : ''} ${p.isPanning ? 'cursor-grabbing' : p.qaSettings.scale > 100 ? 'cursor-grab' : 'default'}`}
      style={p.getCanvasBackgroundStyle()}
      onMouseDown={p.handlePanStart}
      onMouseMove={p.handlePanMove}
      onMouseUp={p.handlePanEnd}
      onMouseLeave={p.handlePanEnd}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); p.setQaDragActiveVideo(true); }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); p.setQaDragActiveVideo(false); }}
      onDrop={p.onQaDropMain}
    >
      {p.qaDragActiveVideo && (
        <div className="absolute inset-0 z-50 bg-[#FDCB6E]/10 backdrop-blur-sm border-2 border-[#FDCB6E] border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-[#18181B] text-zinc-100 px-6 py-4 rounded-xl font-bold shadow-2xl flex items-center space-x-3 border border-zinc-800">
            <UploadIcon /><span>영상을 여기에 놓으세요</span>
          </div>
        </div>
      )}
      {!p.qaVideoSrc ? (
        <div className="text-center p-8 border-2 border-dashed border-zinc-800 rounded-xl max-w-md bg-[#18181B]/80 backdrop-blur-md pointer-events-none">
          <div className="flex justify-center mb-4 text-[#FDCB6E]"><MonitorIcon /></div>
          <h3 className="text-[14px] font-bold text-zinc-100 mb-2 tracking-tight">알파 채널 및 합성 검수</h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed">투명 배경 영상이나 VFX Pass 모드 추출 영상을 드래그 앤 드롭하세요. 좌측에서 Screen 모드 선택 시 배경과 완벽하게 합성됩니다.</p>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center overflow-visible pointer-events-none">
          <video
            ref={p.qaVideoRef}
            src={p.qaVideoSrc}
            loop={p.qaIsLooping}
            muted playsInline draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onTimeUpdate={p.handleQaTimeUpdate}
            onLoadedMetadata={p.handleQaLoadedMetadata}
            style={{
              transform: `translate(${p.qaSettings.x}px, ${p.qaSettings.y}px) scale(${p.qaSettings.scale / 100})`,
              transformOrigin: 'center center',
              width: '100%', height: '100%', objectFit: 'contain',
              mixBlendMode: p.qaBlendMode, pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function MatrixResultPanel(props) {
  return (
    <div className="flex-1 h-full flex flex-col bg-[#0f0f11] rounded-2xl border border-zinc-800 overflow-hidden">
      {props.activeTab === 'generate' && <GenerateView {...props} />}
      {props.activeTab === 'validate' && <ValidateView {...props} />}
      {props.activeTab === 'compositing' && (
        <>
          <CompositingHeader {...props} />
          <CompositingCanvas {...props} />
        </>
      )}
    </div>
  );
}
