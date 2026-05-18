import { EXPORT_MODES, EXPORT_MODE_INFO } from '../constants/presets';

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const LoopIcon = ({ active }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#a8c7fa' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div className="fixed inset-0 z-[100] bg-[#0f1115]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-down">
        <div className="bg-[#2b2d31]/30 px-5 py-3.5 border-b border-[#2b2d31]">
          <h3 className="text-[12px] font-bold text-[#e3e3e3] flex items-center gap-2">
            <svg className="w-4 h-4 text-[#a8c7fa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            AI 영상 검수 리포트
          </h3>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">영상 분석 결과 아래 오류가 감지되었습니다. <b>현재 우측 원본 프롬프트</b>에 보정 지시어를 추가하시겠습니까?</p>
          <div className="flex flex-col gap-2 bg-[#0f1115] p-3.5 rounded-xl border border-[#2b2d31]">
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
                  <span className="text-[11px] text-[#e3e3e3] flex items-center gap-2 font-medium">
                    <span className="w-1.5 h-1.5 bg-[#f28b82] rounded-full"></span> {labels[key]}
                  </span>
                  <span className="text-[10px] text-[#9ca3af] pl-3.5 leading-relaxed bg-[#181a1f] p-1.5 rounded border border-[#2b2d31]">
                    <span className="font-bold text-[#8e918f]">AI 분석:</span> {analysisModal.results[`${key}Reasoning`]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2.5 mt-2">
            <button onClick={() => setAnalysisModal({ isOpen: false, results: null })} className="flex-1 py-2 rounded-lg bg-[#0f1115] hover:bg-[#2b2d31] text-[#9ca3af] hover:text-[#e3e3e3] text-[11px] font-medium transition-colors border border-[#2b2d31]">취소 (무시)</button>
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
              className="flex-1 py-2 rounded-lg bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f] text-[11px] font-semibold transition-colors"
            >
              보정 프롬프트 자동 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaneHeader(p) {
  if (p.activeTab === 'compositing') {
    return (
      <header className="h-14 flex items-center px-6 border-b border-[#2b2d31] shrink-0 justify-between bg-[#181a1f]">
        <div className="w-full flex items-center space-x-4">
          <button onClick={p.toggleQaPlay} disabled={!p.qaVideoSrc} className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${p.qaVideoSrc ? 'bg-[#0F82FF] hover:bg-[#3b9cff] text-white shadow-[0_0_10px_rgba(15,130,255,0.4)]' : 'bg-[#2b2d31] text-[#6b7280] cursor-not-allowed'}`}>
            {p.qaIsPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className="flex-1 flex items-center space-x-3">
            <span className="text-[11px] font-mono text-[#a8c7fa] w-12 text-right">{p.formatTime(p.qaCurrentTime)}</span>
            <input type="range" min="0" max={p.qaDuration || 100} step="0.01" value={p.qaCurrentTime} onChange={p.handleQaSeek} disabled={!p.qaVideoSrc} className="flex-1 h-1.5 bg-[#2b2d31] rounded-lg appearance-none cursor-pointer" />
            <span className="text-[11px] font-mono text-[#9ca3af] w-12">{p.formatTime(p.qaDuration)}</span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 border-l border-[#2b2d31] pl-4">
            <button onClick={() => p.setQaIsLooping(!p.qaIsLooping)} className={`p-1.5 rounded transition-colors ${p.qaIsLooping ? 'bg-[#0F82FF]/10' : 'hover:bg-[#2b2d31]'}`} title="반복 재생">
              <LoopIcon active={p.qaIsLooping} />
            </button>
            <select value={p.qaPlaybackRate} onChange={p.handleQaSpeedChange} disabled={!p.qaVideoSrc} className="bg-[#0f1115] border border-[#2b2d31] text-[10px] text-[#e3e3e3] rounded p-1.5 focus:outline-none focus:border-[#a8c7fa] font-mono">
              <option value="0.25">0.25x</option><option value="0.5">0.5x</option><option value="1">1.0x (Normal)</option><option value="1.5">1.5x</option><option value="2">2.0x</option>
            </select>
          </div>
        </div>
      </header>
    );
  }
  return (
    <header className="h-14 flex items-center px-6 border-b border-[#2b2d31] shrink-0 justify-between bg-[#181a1f]">
      <div className="flex items-center gap-3">
        <span className="text-[#e3e3e3] font-medium text-[13px]">{p.activeTab === 'generate' ? 'Engine Output' : 'Validation Workflow'}</span>
        {p.activeTab === 'generate' && (
          <>
            <div className="h-3 w-[1px] bg-[#2b2d31] mx-1"></div>
            <div className="flex flex-wrap gap-1 bg-[#0f1115] rounded-md p-0.5 border border-[#2b2d31]">
              {EXPORT_MODES.map((mode) => (
                <button key={mode.id} onClick={() => p.setExportMode(mode.id)} className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${p.exportMode === mode.id ? 'bg-[#2b2d31] text-[#e3e3e3]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>{mode.label}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function GenerateOutput(p) {
  return (
    <div className={`flex-1 p-5 flex flex-col custom-scrollbar overflow-hidden ${EXPORT_MODE_INFO[p.exportMode] ? 'pt-3' : ''}`}>
      <div className={`bg-[#0f1115] border ${p.isOverLimit ? 'border-[#f28b82]' : 'border-[#2b2d31]'} rounded-xl flex flex-col shadow-lg h-full overflow-hidden`}>
        <div className="bg-[#1e1e1f] px-5 py-3.5 border-b border-[#2b2d31] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-medium tracking-wide flex items-center gap-2 ${p.isOverLimit ? 'text-[#f28b82]' : 'text-[#e3e3e3]'}`}>Target Model Prompt</span>
            <button onClick={() => p.setIsOptimized(!p.isOptimized)} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border transition-colors ${p.isOptimized ? 'bg-[#a8c7fa]/20 border-[#a8c7fa]/50 text-[#a8c7fa]' : 'bg-[#0f1115] border-[#4b4d52] text-[#6b7280]'}`} title="위험 단어 자동 필터링 및 압축">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              {p.isOptimized ? 'Auto-Optimized ON' : 'Auto-Optimized OFF'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono ${p.isOverLimit ? 'text-[#f28b82] font-bold' : 'text-[#9ca3af]'}`}>{p.promptLength} / {p.currentMaxLimit} chars</span>
            <button onClick={() => p.handleCopy(p.combinedOutput)} className="text-[11px] bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f] px-3.5 py-1.5 rounded-lg transition-colors font-bold shrink-0">Copy Prompt</button>
          </div>
        </div>
        {p.isOptimized && p.logs.length > 0 && (
          <div className="bg-[#0f1115] border-b border-[#2b2d31] p-3 px-5 flex flex-col gap-1.5 shrink-0">
            <div className="text-[10px] font-bold text-[#a8c7fa] flex items-center gap-1.5 mb-1">Prompt Inspector Logs (자동 보정 내역)</div>
            {p.logs.map((log, i) => (
              <div key={i} className={`text-[9.5px] font-mono leading-relaxed ${log.includes('⚠️') ? 'text-[#f28b82]' : 'text-[#9ca3af]'}`}>{log}</div>
            ))}
          </div>
        )}
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[13px] font-mono text-[#e3e3e3] whitespace-pre-wrap leading-relaxed select-all">{p.combinedOutput}</p>
        </div>
      </div>
    </div>
  );
}

function ValidateOutput(p) {
  return (
    <div className="flex-1 p-5 flex flex-col gap-4 custom-scrollbar overflow-hidden">
      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl flex flex-col shadow-lg shrink-0">
        <div className="bg-[#1e1e1f] px-5 py-3 border-b border-[#2b2d31] shrink-0">
          <span className="text-[11px] font-medium text-[#e3e3e3] tracking-wide">Original Prompt (원본 프롬프트 입력)</span>
        </div>
        <div className="p-4 bg-[#0f1115]">
          <textarea className="w-full bg-[#131314] border border-[#2b2d31] rounded-lg p-3 text-[12px] text-[#e3e3e3] outline-none focus:border-[#a8c7fa] resize-y custom-scrollbar min-h-[100px]" placeholder="문제가 발생한 영상 제작에 사용했던 원본 프롬프트를 붙여넣으세요..." value={p.baseValidatePrompt} onChange={(e) => p.setBaseValidatePrompt(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-center shrink-0">
        <svg className="w-5 h-5 text-[#444746]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
      </div>
      <div className={`bg-[#0f1115] border ${p.isOverLimit ? 'border-[#f28b82]' : 'border-[#a8c7fa]/50'} rounded-xl flex flex-col shadow-lg flex-1 min-h-0 overflow-hidden`}>
        <div className="bg-[#1e1e1f] px-5 py-3.5 border-b border-[#2b2d31] flex justify-between items-center shrink-0">
          <span className={`text-[11px] font-medium tracking-wide flex items-center gap-2 ${p.isOverLimit ? 'text-[#f28b82]' : 'text-[#a8c7fa]'}`}>Corrected Prompt</span>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono ${p.isOverLimit ? 'text-[#f28b82] font-bold' : 'text-[#9ca3af]'}`}>{p.promptLength} / {p.currentMaxLimit} chars</span>
            <button onClick={() => p.handleCopy(p.combinedOutput)} disabled={!p.finalOutput} className="text-[11px] bg-[#a8c7fa] hover:bg-[#c2d7fa] text-[#062e6f] px-3.5 py-1.5 rounded-lg transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed shrink-0">Copy Correction</button>
          </div>
        </div>
        <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
          <p className="text-[13px] font-mono text-[#e3e3e3] whitespace-pre-wrap leading-relaxed select-all">{p.combinedOutput || '원본 프롬프트를 입력하고 좌측에서 검수를 진행하면 보정 코드가 추가됩니다.'}</p>
        </div>
      </div>
    </div>
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
        <div className="absolute inset-0 z-50 bg-[#0F82FF]/10 backdrop-blur-sm border-2 border-[#0F82FF] border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-[#181a1f] text-[#e3e3e3] px-6 py-4 rounded-xl font-bold shadow-2xl flex items-center space-x-3 border border-[#2b2d31]">
            <UploadIcon /><span>영상을 여기에 놓으세요</span>
          </div>
        </div>
      )}
      {!p.qaVideoSrc ? (
        <div className="text-center p-8 border-2 border-dashed border-[#2b2d31] rounded-xl max-w-md bg-[#181a1f]/80 backdrop-blur-md pointer-events-none">
          <div className="flex justify-center mb-4 text-[#a8c7fa]"><MonitorIcon /></div>
          <h3 className="text-[14px] font-bold text-[#e3e3e3] mb-2 tracking-tight">알파 채널 및 합성 검수</h3>
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">투명 배경 영상이나 VFX Pass 모드 추출 영상을 드래그 앤 드롭하세요. 좌측에서 Screen 모드 선택 시 배경과 완벽하게 합성됩니다.</p>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center overflow-visible pointer-events-none">
          <video
            ref={p.qaVideoRef}
            src={p.qaVideoSrc}
            loop={p.qaIsLooping}
            muted
            playsInline
            draggable={false}
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
    <div style={{ width: `${100 - props.leftPaneWidth}%` }} className="h-full flex flex-col bg-[#181a1f] overflow-hidden">
      <PaneHeader {...props} />
      {props.activeTab === 'generate' && EXPORT_MODE_INFO[props.exportMode] && (
        <div className="mx-5 mt-5 px-4 py-3 bg-[#a8c7fa]/5 border border-[#a8c7fa]/20 rounded-lg shrink-0">
          <p className="text-[11px] font-bold text-[#a8c7fa] mb-1">{EXPORT_MODE_INFO[props.exportMode].title}</p>
          <p className="text-[10px] text-[#9ca3af] leading-relaxed">{EXPORT_MODE_INFO[props.exportMode].desc}</p>
        </div>
      )}
      {props.activeTab === 'generate' && <GenerateOutput {...props} />}
      {props.activeTab === 'validate' && <ValidateOutput {...props} />}
      {props.activeTab === 'compositing' && <CompositingCanvas {...props} />}
    </div>
  );
}
