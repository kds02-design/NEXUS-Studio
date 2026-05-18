import { useEffect, useRef, useState } from 'react';
import MatrixPresetPanel from './MatrixPresetPanel';
import MatrixPromptForm from './MatrixPromptForm';
import {
  TARGET_MODELS, TRANSITION_TARGETS, INTRO_STYLES, FLOW_STYLES, MOTION_DYNAMICS,
  TIME_DURATION, INTENSITY_LEVELS, VFX_TARGETS,
} from '../constants/presets';

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

// Shared dropdown component with optional ★ recommendation indicator (used by RenderMatrix integration).
export const DropdownControl = ({ label, value, options, onChange, highlight = false, recommendedId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPlacement(window.innerHeight - rect.bottom < 250 ? 'top' : 'bottom');
    }
    setIsOpen(!isOpen);
  };
  const selectedOption = options.find((o) => o.id === value);
  const selectedLabel = selectedOption?.label || 'Select...';
  const isDynamic = selectedOption?.id?.startsWith('dynamic_');
  const hasUnpickedRec = recommendedId && recommendedId !== value && options.some((o) => o.id === recommendedId);

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase flex items-center justify-between">
        {label}
        {isDynamic && <span className="text-[9px] text-[#a8c7fa] bg-[#a8c7fa]/10 px-1.5 py-0.5 rounded">Dynamic AI</span>}
      </label>
      <div className="relative" ref={buttonRef}>
        <button onClick={handleToggle} className={`w-full bg-[#181a1f] border ${highlight ? 'border-[#a8c7fa] text-[#a8c7fa] shadow-[0_0_10px_rgba(168,199,250,0.1)]' : hasUnpickedRec ? 'border-amber-400/60 text-amber-300 ring-1 ring-amber-400/30' : 'border-[#2b2d31] hover:border-[#4b4d52] text-[#e3e3e3]'} py-2.5 px-3 rounded-lg text-left text-[11px] transition-colors flex justify-between items-center group ${isDynamic ? 'border-[#a8c7fa]/40 bg-[#a8c7fa]/5' : ''}`}>
          <span className="truncate pr-2 flex items-center gap-1.5">
            {hasUnpickedRec && <span className="text-amber-400 text-[10px]" title="렌더 메트릭스에서 추천된 옵션">★</span>}
            {selectedLabel}
          </span>
          <svg className={`w-3.5 h-3.5 ${highlight ? 'text-[#a8c7fa]' : 'text-[#6b7280] group-hover:text-[#e3e3e3]'} transition-transform ${isOpen ? (placement === 'top' ? '-rotate-180' : 'rotate-180') : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
        {isOpen && (
          <div className={`nx-popover-panel absolute z-50 w-full max-h-60 overflow-y-auto custom-scrollbar py-1 ${placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}>
            {options.map((opt) => {
              const isSelected = value === opt.id;
              const isRecommended = recommendedId === opt.id;
              return (
                <button key={opt.id} className={`nx-popover-item ${isSelected ? 'is-active' : ''}`} onClick={() => { onChange(opt.id); setIsOpen(false); }}>
                  <span className="truncate flex-1 flex items-center gap-1.5">
                    {!isSelected && isRecommended && <span className="text-amber-400 text-[10px]">★</span>}
                    {opt.label}
                  </span>
                  {isSelected && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {!isSelected && isRecommended && <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 uppercase">추천</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function IncomingBanner({ incomingFromRender, isArcAnalyzing, onClose }) {
  if (!incomingFromRender) return null;
  return (
    <div className="bg-amber-500/10 border border-amber-400/40 rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 z-[80]">
      <svg className={`w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5 ${isArcAnalyzing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {isArcAnalyzing
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-6.219-8.56"/>
          : <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L23 12l-5.714 2.143L15 21l-2.286-6.857L7 12l5.714-2.143L15 3z"/>}
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">렌더 메트릭스에서 전달된 프롬프트</div>
        <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
          {incomingFromRender.status === 'analyzing' && 'Gemini로 모션 추천 분석 중...'}
          {incomingFromRender.status === 'done' && (incomingFromRender.summary || '분석 완료. 아래 패널에 ★로 추천 모션이 강조 표시됩니다.')}
          {incomingFromRender.status === 'no-text' && '프롬프트 텍스트가 비어있어서 추천을 건너뜁니다.'}
          {incomingFromRender.status === 'failed' && `분석 실패: ${incomingFromRender.errorMessage || ''}`}
        </div>
        {incomingFromRender.style && <div className="mt-1.5 text-[9px] text-zinc-500 font-mono">style: {incomingFromRender.style}</div>}
        {incomingFromRender.text && (
          <details className="mt-1.5 text-[9px]">
            <summary className="text-amber-400 cursor-pointer hover:text-amber-300">전달된 프롬프트 보기</summary>
            <pre className="mt-1.5 p-2 bg-black/40 rounded text-[9px] text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">{incomingFromRender.text}</pre>
          </details>
        )}
      </div>
      <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 shrink-0" title="배지 닫기">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

function GenerateTab(p) {
  return (
    <>
      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-4 flex flex-col gap-3 relative z-[70]">
        <h3 className="text-[11px] font-bold text-[#a8c7fa] tracking-wide flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          Target AI Model (출력 모델 최적화)
        </h3>
        <DropdownControl label="" value={p.targetModel} options={TARGET_MODELS} onChange={p.setTargetModel} highlight={true} />
      </div>

      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-4 flex flex-col gap-3 relative z-[60]">
        <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">Animation Mode (진행 방식)</h3>
        <div className="flex bg-[#0f1115] rounded-lg p-1 border border-[#2b2d31]">
          <button onClick={() => p.setAnimationMode('loop')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${p.animationMode === 'loop' ? 'bg-[#2b2d31] text-[#e3e3e3]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>🔄 무한 반복 (Loop)</button>
          <button onClick={() => p.setAnimationMode('intro')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${p.animationMode === 'intro' ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>✨ 등장 모션 (Intro)</button>
          <button onClick={() => p.setAnimationMode('transition')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${p.animationMode === 'transition' ? 'bg-[#a8c7fa]/20 text-[#a8c7fa]' : 'text-[#9ca3af] hover:text-[#e3e3e3]'}`}>➡️ 재질 변환 (Trans)</button>
        </div>
        {p.animationMode === 'transition' && (
          <div className="pt-3 mt-1 border-t border-[#2b2d31] animate-fade-in-down flex flex-col gap-3">
            <DropdownControl label="Target Material (목표 재질)" value={p.targetMaterial} options={TRANSITION_TARGETS} onChange={p.handleTargetMaterialChange} highlight={true} />
            <p className="text-[9.5px] text-[#8e918f] mt-1 leading-relaxed">※ 재질 선택 시 최적 효과가 자동 매칭됩니다.</p>
          </div>
        )}
        {p.animationMode === 'intro' && (
          <div className="pt-3 mt-1 border-t border-[#2b2d31] animate-fade-in-down flex flex-col gap-3">
            <DropdownControl label="Intro Style (등장 연출)" value={p.layers.intro} options={INTRO_STYLES} onChange={(val) => { p.setLayers({ ...p.layers, intro: val }); p.setActivePreset(''); }} highlight={true} />
            {p.targetModel === 'kling' && (
              <div className="bg-[#f28b82]/10 border border-[#f28b82]/30 p-2.5 rounded-lg flex flex-col gap-2 mt-1">
                <span className="text-[10px] font-bold text-[#f28b82]">🚨 Kling 3.0 Intro 가이드</span>
                <span className="text-[9.5px] text-[#e3e3e3] leading-relaxed">Start Image에 빈 검은 화면, End Image에 원본 이미지를 넣어야 합니다.</span>
                <button onClick={p.downloadBlackFrame} className="w-full py-1.5 mt-1 bg-[#181a1f] border border-[#f28b82]/50 hover:bg-[#f28b82]/20 text-[#f28b82] text-[10px] font-bold rounded">시작용 1080p 블랙 프레임 다운로드</button>
              </div>
            )}
          </div>
        )}
      </div>

      {p.animationMode === 'loop' && (
        <MatrixPresetPanel
          activePreset={p.activePreset} applyPreset={p.applyPreset}
          isImportOpen={p.isImportOpen} setIsImportOpen={p.setIsImportOpen}
          importText={p.importText} setImportText={p.setImportText} onImport={p.onImport}
        />
      )}

      <MatrixPromptForm
        image={p.image} setImage={p.setImage}
        isImageDragging={p.isImageDragging} setIsImageDragging={p.setIsImageDragging}
        onImageChange={p.onImageChange}
        directorNote={p.directorNote} setDirectorNote={p.setDirectorNote}
        aiInterpretation={p.aiInterpretation} setAiInterpretation={p.setAiInterpretation}
        isAnalyzing={p.isAnalyzing} onAnalyze={p.onAnalyze}
      />

      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-5 relative z-[30] mb-10">
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-medium text-[#e3e3e3]">Flow & Rhythm</h3>
          <div className="grid grid-cols-2 gap-3">
            {p.animationMode === 'intro'
              ? <DropdownControl label="Intro Style" value={p.layers.intro} options={INTRO_STYLES} onChange={(val) => { p.setLayers({ ...p.layers, intro: val }); p.setActivePreset(''); }} />
              : <DropdownControl label="Flow Style" value={p.layers.flow} options={FLOW_STYLES} onChange={(val) => { p.setLayers({ ...p.layers, flow: val }); p.setActivePreset(''); }} />}
            <DropdownControl label="Dynamics" value={p.layers.dynamics} options={MOTION_DYNAMICS} onChange={(val) => { p.setLayers({ ...p.layers, dynamics: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.dynamics} />
          </div>
        </div>
        <div className="h-px bg-[#2b2d31] w-full"></div>
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-medium text-[#e3e3e3]">Visual Matrix Layers</h3>
          <div className="space-y-3">
            <DropdownControl label="Surface" value={p.layers.surface} options={p.surfaceOptions} onChange={(val) => { p.setLayers({ ...p.layers, surface: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.surface} />
            <DropdownControl label="Edge" value={p.layers.edge} options={p.edgeOptions} onChange={(val) => { p.setLayers({ ...p.layers, edge: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.edge} />
            <DropdownControl label="Ambient" value={p.layers.ambient} options={p.ambientOptions} onChange={(val) => { p.setLayers({ ...p.layers, ambient: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.ambient} />
            <div className="grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-[#2b2d31]">
              <DropdownControl label="Duration" value={p.layers.duration} options={TIME_DURATION} onChange={(val) => { p.setLayers({ ...p.layers, duration: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.duration} />
              <DropdownControl label="Intensity" value={p.layers.intensity} options={INTENSITY_LEVELS} onChange={(val) => { p.setLayers({ ...p.layers, intensity: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.intensity} />
            </div>
            {p.exportMode === 'vfx_pass' && (
              <div className="pt-3 mt-1 border-t border-[#2b2d31] animate-fade-in-down flex flex-col gap-3">
                <DropdownControl label="VFX Render Target" value={p.vfxTarget} options={VFX_TARGETS} onChange={p.setVfxTarget} highlight={true} />
                <div className="bg-[#f28b82]/10 border border-[#f28b82]/30 p-2.5 rounded-lg flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-[#f28b82]">🚨 완벽한 추출 팁</span>
                  <span className="text-[9.5px] text-[#e3e3e3] leading-relaxed">텍스처 있는 원본 대신 흑백 실루엣 이미지(Matte)를 업로드하세요.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ValidateTab(p) {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl overflow-hidden flex flex-col">
        <div className="bg-[#2b2d31]/20 px-5 py-3 border-b border-[#2b2d31] flex justify-between items-center">
          <span className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">생성된 영상 업로드</span>
          <button onClick={p.onClearValidate} className="text-[10px] text-[#a8c7fa] hover:text-[#e3e3e3] transition-colors">업로드 초기화</button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">AI 영상 모델 결과물(.mp4)을 업로드하면 핵심 프레임을 추출하여 오류를 시각적으로 감지합니다.</p>
          <div
            className={`relative w-full aspect-video max-h-64 rounded-lg border border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors ${p.isResultDragging ? 'border-[#a8c7fa] bg-[#a8c7fa]/5' : p.resultVideo ? 'border-[#2b2d31] bg-black' : 'border-[#444746] hover:border-[#8e918f] bg-[#0f1115] cursor-pointer'}`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); p.setIsResultDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); p.setIsResultDragging(false); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); p.setIsResultDragging(false); p.onResultChange(e.dataTransfer.files[0]); }}
            onClick={() => { if (!p.resultVideo && !p.isResultAnalyzing) p.resultVideoRef.current.click(); }}
          >
            {p.resultVideo ? (
              <div className="relative w-full h-full group flex flex-col">
                <video src={p.resultVideo} className="w-full h-full object-contain bg-black rounded-lg" controls autoPlay loop muted playsInline />
                <button onClick={(e) => { e.stopPropagation(); p.resultVideoRef.current.click(); }} className="absolute top-2 right-2 bg-[#1e1e1f]/80 text-[#e3e3e3] px-2.5 py-1.5 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-[#444746] font-medium shadow-md">다른 영상 업로드</button>
              </div>
            ) : (
              <>
                <svg className="w-6 h-6 text-[#6b7280] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                <span className="text-[11px] font-medium text-[#e3e3e3]">클릭하거나 영상을 드래그하세요</span>
              </>
            )}
            {p.isResultAnalyzing && (
              <div className="absolute inset-0 bg-[#0f1115]/80 flex flex-col items-center justify-center backdrop-blur-sm z-10 gap-2">
                <svg className="animate-spin w-5 h-5 text-[#a8c7fa]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span className="text-[10px] text-[#a8c7fa]">AI 영상 프레임 추출 및 추론 중...</span>
              </div>
            )}
            <input type="file" accept="video/mp4,video/webm" className="hidden" ref={p.resultVideoRef} onChange={(e) => p.onResultChange(e.target.files[0])} />
          </div>
          {p.analyzedFrames.length > 0 && (
            <div className="flex gap-2">
              {p.analyzedFrames.map((src, i) => (
                <div key={i} className="flex-1 aspect-video rounded-md relative overflow-hidden border border-[#2b2d31] bg-[#0f1115]">
                  <span className="absolute top-1 left-1 bg-[#181a1f]/80 px-1.5 py-0.5 text-[9px] text-[#e3e3e3] rounded font-medium backdrop-blur-md z-10 border border-[#2b2d31]/50">{['Start', 'Mid', 'End'][i]}</span>
                  <img src={src} className="w-full h-full object-cover opacity-80" alt={`frame ${i}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 mb-10">
        <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide mb-4">매뉴얼 검수 및 보정 적용</h3>
        <div className="flex flex-col gap-3">
          {[
            { id: 'cameraMoved', label: '카메라 줌 아웃 / 무빙 발생' },
            { id: 'shapeMutated', label: '타이포 형태가 녹거나 변형됨' },
            { id: 'loopBroken', label: '루프 마지막에 부자연스럽게 끊김' },
            { id: 'particlesEscaped', label: '입자가 프레임을 벗어남' },
            { id: 'alphaDirty', label: '배경에 연기 등 불순물 발생' },
          ].map((item) => (
            <div key={item.id} className="flex items-center gap-3 cursor-pointer group w-full" onClick={() => p.setEvalChecks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}>
              <div className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0 ${p.evalChecks[item.id] ? 'bg-[#a8c7fa] border-[#a8c7fa] text-[#062e6f]' : 'border-[#6b7280] group-hover:border-[#9ca3af] bg-[#0f1115]'}`}>
                {p.evalChecks[item.id] && <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
              </div>
              <span className={`text-[12px] truncate ${p.evalChecks[item.id] ? 'text-[#e3e3e3] font-medium' : 'text-[#9ca3af] group-hover:text-[#e3e3e3]'} ${item.id === 'loopBroken' && p.animationMode !== 'loop' ? 'line-through text-[#6b7280]' : ''}`}>
                {item.label} {item.id === 'loopBroken' && p.animationMode !== 'loop' && '(루프 모드 전용)'}
              </span>
              {p.aiDetectedErrors && p.aiDetectedErrors[item.id] && p.animationMode === 'loop' && (
                <span className="ml-auto text-[9px] font-bold bg-[#f28b82]/10 text-[#f28b82] px-1.5 py-0.5 rounded border border-[#f28b82]/20 flex items-center gap-1 shrink-0 animate-fade-in-down">
                  <span className="w-1.5 h-1.5 bg-[#f28b82] rounded-full animate-pulse"></span> AI 감지됨
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#6b7280] mt-4 pt-3 border-t border-[#2b2d31]">※ 체크 시 우측 원본 프롬프트 하단에 방어 코드가 자동 병합됩니다.</p>
      </div>
    </div>
  );
}

function CompositingTab(p) {
  return (
    <div className="flex flex-col gap-5 pb-10">
      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide flex items-center gap-2"><MonitorIcon /> 검수할 영상 (VFX Pass 등)</h3>
        <label className={`flex flex-col items-center justify-center w-full py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${p.qaDragActiveVideo ? 'border-[#0F82FF] bg-[#0F82FF]/10' : 'border-[#2b2d31] hover:border-[#4b4d52] hover:bg-[#2b2d31]/30'}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); p.setQaDragActiveVideo(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); p.setQaDragActiveVideo(false); }}
          onDrop={p.onQaDropMain}
        >
          <div className={`transition-transform duration-200 ${p.qaDragActiveVideo ? 'scale-110 text-[#0F82FF]' : 'text-[#6b7280]'}`}><UploadIcon /></div>
          <span className="mt-3 text-[11px] text-[#e3e3e3] font-medium">{p.qaVideoSrc ? '다른 영상 불러오기' : '합성할 영상을 드래그 앤 드롭'}</span>
          <span className="mt-1 text-[10px] text-[#9ca3af]">알파 포함 WebM/MOV 또는 검은 배경 MP4</span>
          <input type="file" accept="video/webm, video/quicktime, video/mp4" className="hidden" onChange={(e) => p.onProcessQaVideoFile(e.target.files[0])} />
        </label>
        {p.qaVideoSrc && (
          <div className="bg-[#0f1115] border border-[#2b2d31] rounded-lg p-3 text-[10px] text-[#9ca3af] grid grid-cols-2 gap-2">
            <div>해상도: <span className="text-[#e3e3e3] font-mono">{p.qaVideoInfo.width}x{p.qaVideoInfo.height}</span></div>
            <div>총 길이: <span className="text-[#e3e3e3] font-mono">{p.qaDuration.toFixed(2)}s</span></div>
          </div>
        )}
      </div>

      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">배경 환경 세팅</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => p.setQaBgType('checker-dark')} className={`py-2 text-[11px] rounded-lg border transition-colors ${p.qaBgType === 'checker-dark' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>다크 체커보드</button>
          <button onClick={() => p.setQaBgType('checker-light')} className={`py-2 text-[11px] rounded-lg border transition-colors ${p.qaBgType === 'checker-light' ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>라이트 체커보드</button>
        </div>
        <div className="space-y-2 mt-2">
          <span className="text-[10px] text-[#9ca3af]">단색 크로마키 배경</span>
          <div className="flex space-x-2">
            {[{ color: '#000000', label: 'Black' }, { color: '#FFFFFF', label: 'White' }, { color: '#00FF00', label: 'Green' }, { color: '#FF00FF', label: 'Magenta' }].map((swatch) => (
              <button key={swatch.color} onClick={() => { p.setQaBgType('color'); p.setQaBgColor(swatch.color); }} className={`w-8 h-8 rounded-full border-2 transition-transform ${p.qaBgType === 'color' && p.qaBgColor === swatch.color ? 'border-[#0F82FF] scale-110' : 'border-[#4b4d52] hover:scale-105'}`} style={{ backgroundColor: swatch.color }} title={swatch.label} />
            ))}
            <div className="relative">
              <input type="color" value={p.qaBgColor} onChange={(e) => { p.setQaBgType('color'); p.setQaBgColor(e.target.value); }} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" title="커스텀 색상" />
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] transition-transform ${p.qaBgType === 'color' && !['#000000', '#FFFFFF', '#00FF00', '#FF00FF'].includes(p.qaBgColor) ? 'border-[#0F82FF] scale-110' : 'border-[#4b4d52] hover:scale-105'}`} style={{ backgroundColor: p.qaBgColor }}>
                <span className="mix-blend-difference text-white">+</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2 mt-2">
          <span className="text-[10px] text-[#9ca3af]">실제 이미지 위에 합성</span>
          <label className={`block text-center py-2.5 px-3 border border-[#2b2d31] rounded-lg text-[11px] cursor-pointer hover:border-[#4b4d52] transition-colors ${p.qaBgType === 'image' ? 'border-[#0F82FF] text-[#0F82FF] bg-[#0F82FF]/5' : 'bg-[#0f1115] text-[#e3e3e3]'}`}>
            {p.qaBgImageSrc ? '배경 이미지 변경' : '배경 이미지 업로드'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => p.onProcessQaBgImageFile(e.target.files[0])} />
          </label>
        </div>
      </div>

      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
        <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">블렌딩 모드</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'normal', label: 'Normal (알파)' },
            { id: 'screen', label: 'Screen' },
            { id: 'color-dodge', label: 'Color Dodge' },
            { id: 'plus-lighter', label: 'Add' },
          ].map((m) => (
            <button key={m.id} onClick={() => p.setQaBlendMode(m.id)} className={`py-2 text-[11px] rounded-lg border transition-colors ${p.qaBlendMode === m.id ? 'border-[#0F82FF] bg-[#0F82FF]/10 text-[#0F82FF]' : 'border-[#2b2d31] bg-[#0f1115] text-[#9ca3af] hover:text-[#e3e3e3]'}`}>{m.label}</button>
          ))}
        </div>
        <p className="text-[9.5px] text-[#6b7280]">※ VFX Pass 영상은 Screen이나 Add 모드에서 배경이 투명하게 빠집니다.</p>
      </div>

      <div className="bg-[#181a1f] border border-[#2b2d31] rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-[#e3e3e3] tracking-wide">트랜스폼</h3>
          <button onClick={() => p.setQaSettings({ scale: 100, x: 0, y: 0 })} className="text-[10px] text-[#0F82FF] hover:text-[#a8c7fa]">리셋</button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-[#9ca3af]">확대 (Scale)</span>
              <span className="text-[#e3e3e3] font-mono">{p.qaSettings.scale}%</span>
            </div>
            <input type="range" min="10" max="500" value={p.qaSettings.scale} onChange={(e) => p.setQaSettings({ ...p.qaSettings, scale: parseInt(e.target.value) })} className="w-full h-1.5 bg-[#2b2d31] rounded-lg appearance-none cursor-pointer" />
          </div>
          <p className="text-[9.5px] text-[#6b7280]">※ 우측 캔버스를 마우스로 드래그하여 이동(Pan)할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

export default function MatrixSidebar(props) {
  const { activeTab, setActiveTab, onReset } = props;
  const TABS = [
    { id: 'generate',    label: '프롬프트 생성', icon: <UploadIcon /> },
    { id: 'validate',    label: '영상 검수',     icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { id: 'compositing', label: '영상 합성',     icon: <MonitorIcon /> },
  ];
  return (
    <aside className="w-[340px] bg-[#181a1f] border border-[#2b2d31] rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-y-auto custom-scrollbar relative z-10">
      <div className="p-5 space-y-5">
        {/* 뷰 탭 — RenderMatrix 패턴 통일 (사이드바 내부 상단) */}
        <div className="flex bg-[#0f1115] p-1 rounded-xl border border-[#2b2d31] shadow-inner">
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-bold transition-all ${active ? 'bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/30' : 'text-[#9ca3af] hover:bg-[#2b2d31]/60 hover:text-[#e3e3e3] border border-transparent'}`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        <IncomingBanner
          incomingFromRender={props.incomingFromRender}
          isArcAnalyzing={props.isArcAnalyzing}
          onClose={() => { props.setIncomingFromRender(null); props.setArcRecommended(null); }}
        />
        {activeTab === 'generate' && <GenerateTab {...props} />}
        {activeTab === 'validate' && <ValidateTab {...props} />}
        {activeTab === 'compositing' && <CompositingTab {...props} />}

        {/* Reset Workspace — 사이드바 하단 (RenderMatrix는 별도 헤더 없으므로 사이드바에 통합) */}
        {onReset && (
          <div className="pt-2 mt-2 border-t border-[#2b2d31]">
            <button
              onClick={onReset}
              className="w-full text-[11px] font-medium text-[#9ca3af] hover:text-[#e3e3e3] px-3 py-2 rounded-lg hover:bg-[#2b2d31]/50 transition-colors"
            >
              Reset Workspace
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
