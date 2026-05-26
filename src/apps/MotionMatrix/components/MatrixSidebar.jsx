import { useEffect, useRef, useState } from 'react';
import MatrixPresetPanel from './MatrixPresetPanel';
import MatrixPromptForm from './MatrixPromptForm';
import SectionGroup, { SectionGroupAccent } from '../../../components/SectionGroup';
import {
  TARGET_MODELS, INTRO_STYLES, FLOW_STYLES, MOTION_DYNAMICS,
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
      <label className="text-[10px] font-medium text-zinc-400 tracking-wider uppercase flex items-center justify-between">
        {label}
        {isDynamic && <span className="text-[9px] text-[#FDCB6E] bg-[#FDCB6E]/10 px-1.5 py-0.5 rounded">Dynamic AI</span>}
      </label>
      <div className="relative" ref={buttonRef}>
        <button onClick={handleToggle} className={`w-full bg-[#18181B] border ${highlight ? 'border-[#FDCB6E] text-[#FDCB6E] shadow-[0_0_10px_rgba(168,199,250,0.1)]' : hasUnpickedRec ? 'border-amber-400/60 text-amber-300 ring-1 ring-amber-400/30' : 'border-zinc-800 hover:border-zinc-700 text-zinc-100'} py-2.5 px-3 rounded-lg text-left text-[11px] transition-colors flex justify-between items-center group ${isDynamic ? 'border-[#FDCB6E]/40 bg-[#FDCB6E]/5' : ''}`}>
          <span className="truncate pr-2 flex items-center gap-1.5">
            {hasUnpickedRec && <span className="text-amber-400 text-[10px]" title="렌더 메트릭스에서 추천된 옵션">★</span>}
            {selectedLabel}
          </span>
          <svg className={`w-3.5 h-3.5 ${highlight ? 'text-[#FDCB6E]' : 'text-zinc-500 group-hover:text-zinc-100'} transition-transform ${isOpen ? (placement === 'top' ? '-rotate-180' : 'rotate-180') : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
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
  // 아코디언 — engine 만 펼친 상태로 시작. 다른 섹션 열면 이전 섹션 자동 닫힘.
  const [openSection, setOpenSection] = useState('engine');
  const toggleSection = (key) => (next) => {
    setOpenSection((cur) => (next ? key : (cur === key ? null : cur)));
  };
  return (
    <SectionGroupAccent value="#FDCB6E">
    <div className="flex flex-col gap-7">

      {/* ─── 01 ENGINE — 출력 모델 + 진행 방식 ─── */}
      <SectionGroup index={1} label="Engine" dotColor="#FDCB6E" open={openSection === 'engine'} onToggle={toggleSection('engine')}>
        <div className="flex flex-col gap-2 relative z-[70]">
          <p className="text-[9px] text-zinc-500 font-bold px-1 uppercase tracking-wider">Target AI Model</p>
          <DropdownControl label="" value={p.targetModel} options={TARGET_MODELS} onChange={p.setTargetModel} highlight={true} />
        </div>

        <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5 relative z-[60]">
          <p className="text-[9px] text-zinc-500 font-bold px-1 uppercase tracking-wider">Animation Mode</p>
          <div className="flex bg-black/40 rounded-lg p-1 border border-zinc-800">
            <button onClick={() => p.setAnimationMode('loop')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${p.animationMode === 'loop' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'}`}>🔄 무한 반복 (Loop)</button>
            <button onClick={() => p.setAnimationMode('intro')} className={`flex-1 px-2 py-2 text-[11px] font-bold rounded transition-colors ${p.animationMode === 'intro' ? 'bg-[#FDCB6E]/20 text-[#FDCB6E]' : 'text-zinc-400 hover:text-zinc-100'}`}>✨ 등장 모션 (Intro)</button>
          </div>
          {p.animationMode === 'intro' && (
            <div className="pt-2 animate-fade-in-down flex flex-col gap-3">
              <DropdownControl label="Intro Style (등장 연출)" value={p.layers.intro} options={INTRO_STYLES} onChange={(val) => { p.setLayers({ ...p.layers, intro: val }); p.setActivePreset(''); }} highlight={true} />
              {p.targetModel === 'kling' && (
                <div className="bg-rose-500/10 border border-rose-500/40 p-2.5 rounded-lg flex flex-col gap-2 mt-1">
                  <span className="text-[10px] font-bold text-rose-400">🚨 Kling 3.0 Intro 가이드</span>
                  <span className="text-[9.5px] text-zinc-100 leading-relaxed">Start Image에 빈 검은 화면, End Image에 원본 이미지를 넣어야 합니다.</span>
                  <button onClick={p.downloadBlackFrame} className="w-full py-1.5 mt-1 bg-[#18181B] border border-rose-500/50 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded">시작용 1080p 블랙 프레임 다운로드</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 충돌 알림 — Engine 그룹 안에서만 노출 (Layer 조합 이슈) */}
        {p.auditIssues && p.auditIssues.length > 0 && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest">충돌 알림 ({p.auditIssues.length})</span>
            </div>
            {p.auditIssues.map((issue) => (
              <div key={issue.code} className="bg-black/30 border border-amber-500/20 rounded-lg p-3 flex flex-col gap-2">
                <div className="text-[11px] font-bold text-zinc-100">{issue.title}</div>
                <div className="text-[10px] text-zinc-400 leading-relaxed">{issue.desc}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {issue.fixes?.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => p.applyAuditFix?.(f.patch)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionGroup>

      {/* ─── 02 AI DIRECTOR — 레퍼런스 이미지 + 연출 요구사항 ─── */}
      <SectionGroup index={2} label="AI Director" dotColor="#A29BFE" open={openSection === 'director'} onToggle={toggleSection('director')}>
        <MatrixPromptForm
          image={p.image} setImage={p.setImage}
          isImageDragging={p.isImageDragging} setIsImageDragging={p.setIsImageDragging}
          onImageChange={p.onImageChange}
          directorNote={p.directorNote} setDirectorNote={p.setDirectorNote}
          aiInterpretation={p.aiInterpretation} setAiInterpretation={p.setAiInterpretation}
          isAnalyzing={p.isAnalyzing} onAnalyze={p.onAnalyze}
        />
      </SectionGroup>

      {/* ─── 03 PRESETS — 빠른 템플릿 (Loop 모드 한정) ─── */}
      {p.animationMode === 'loop' && (
        <SectionGroup index={3} label="Presets" dotColor="#55EFC4" open={openSection === 'presets'} onToggle={toggleSection('presets')}>
          <MatrixPresetPanel
            activePresetGroup={p.activePresetGroup} setActivePresetGroup={p.setActivePresetGroup}
            activePresetId={p.activePresetId} isPresetModified={p.isPresetModified}
            onApplyPreset={p.onApplyPreset}
            isImportOpen={p.isImportOpen} setIsImportOpen={p.setIsImportOpen}
            importText={p.importText} setImportText={p.setImportText} onImport={p.onImport}
          />
        </SectionGroup>
      )}

      {/* ─── 04 MATRIX — 세부 모션/시각 옵션 ─── */}
      <SectionGroup index={p.animationMode === 'loop' ? 4 : 3} label="Matrix" dotColor="#00CEC9" open={openSection === 'matrix'} onToggle={toggleSection('matrix')} className="mb-10">
        <div className="flex flex-col gap-2 relative z-[30]">
          <p className="text-[9px] text-zinc-500 font-bold px-1 uppercase tracking-wider">Flow & Rhythm</p>
          <div className="grid grid-cols-2 gap-3">
            {p.animationMode === 'intro'
              ? <DropdownControl label="Intro Style" value={p.layers.intro} options={INTRO_STYLES} onChange={(val) => { p.setLayers({ ...p.layers, intro: val }); p.setActivePreset(''); }} />
              : <DropdownControl label="Flow Style" value={p.layers.flow} options={FLOW_STYLES} onChange={(val) => { p.setLayers({ ...p.layers, flow: val }); p.setActivePreset(''); }} />}
            <DropdownControl label="Dynamics" value={p.layers.dynamics} options={MOTION_DYNAMICS} onChange={(val) => { p.setLayers({ ...p.layers, dynamics: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.dynamics} />
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/5">
          <p className="text-[9px] text-zinc-500 font-bold px-1 uppercase tracking-wider">Visual Matrix Layers</p>
          <div className="space-y-3">
            <DropdownControl label="Surface" value={p.layers.surface} options={p.surfaceOptions} onChange={(val) => { p.setLayers({ ...p.layers, surface: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.surface} />
            <DropdownControl label="Edge" value={p.layers.edge} options={p.edgeOptions} onChange={(val) => { p.setLayers({ ...p.layers, edge: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.edge} />
            <DropdownControl label="Ambient" value={p.layers.ambient} options={p.ambientOptions} onChange={(val) => { p.setLayers({ ...p.layers, ambient: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.ambient} />
            <div className="grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-white/5">
              <DropdownControl label="Duration" value={p.layers.duration} options={TIME_DURATION} onChange={(val) => { p.setLayers({ ...p.layers, duration: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.duration} />
              <DropdownControl label="Intensity" value={p.layers.intensity} options={INTENSITY_LEVELS} onChange={(val) => { p.setLayers({ ...p.layers, intensity: val }); p.setActivePreset(''); }} recommendedId={p.arcRecommended?.intensity} />
            </div>
            {p.exportMode === 'vfx_pass' && (
              <div className="pt-3 mt-1 border-t border-white/5 animate-fade-in-down flex flex-col gap-3">
                <DropdownControl label="VFX Render Target" value={p.vfxTarget} options={VFX_TARGETS} onChange={p.setVfxTarget} highlight={true} />
                <div className="bg-rose-500/10 border border-rose-500/40 p-2.5 rounded-lg flex flex-col gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-rose-400">🚨 완벽한 추출 팁</span>
                  <span className="text-[9.5px] text-zinc-100 leading-relaxed">텍스처 있는 원본 대신 흑백 실루엣 이미지(Matte)를 업로드하세요.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionGroup>
    </div>
    </SectionGroupAccent>
  );
}

function CompositingTab() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="bg-[#18181B] border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
        <h3 className="text-[11px] font-bold text-zinc-100 tracking-wide flex items-center gap-2"><MonitorIcon /> LumKey 루마 키어</h3>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          우측 패널에서 영상을 끌어다 놓으면 배경이 자동으로 제거됩니다.
          루마키 · 스크린 · 크로마블랙 · 멀티플라이 4가지 키잉 방식과 채널·임계값·게인을 조정해 알파를 추출하세요.
        </p>
        <div className="text-[10px] text-zinc-500 leading-snug pl-3 border-l-2 border-zinc-800 space-y-1">
          <div><span className="text-zinc-300 font-semibold">루마키</span> — 밝기 기반, 글로우/타이포</div>
          <div><span className="text-zinc-300 font-semibold">스크린</span> — 파티클·불꽃 합성용</div>
          <div><span className="text-zinc-300 font-semibold">크로마블랙</span> — 임계값 이하 컷</div>
          <div><span className="text-zinc-300 font-semibold">멀티플라이</span> — 흰 배경 제거</div>
        </div>
      </div>
    </div>
  );
}

export default function MatrixSidebar(props) {
  const { activeTab, setActiveTab, onReset } = props;
  const TABS = [
    { id: 'generate',    label: '프롬프트 생성', icon: <UploadIcon /> },
    { id: 'compositing', label: '영상 합성',     icon: <MonitorIcon /> },
  ];
  return (
    <aside className="w-[340px] bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-y-auto custom-scrollbar relative z-10">
      <div className="p-5 space-y-5">
        {/* 뷰 탭 — RenderMatrix 패턴 통일 (사이드바 내부 상단) */}
        <div className="flex bg-[#121214] p-1.5 rounded-xl border border-zinc-800/80 shadow-inner">
          {TABS.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-[11px] font-bold transition-all ${active ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300 border border-transparent'}`}
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
        {activeTab === 'compositing' && <CompositingTab />}

        {/* Reset Workspace — 사이드바 하단 (RenderMatrix는 별도 헤더 없으므로 사이드바에 통합) */}
        {onReset && (
          <div className="pt-2 mt-2 border-t border-zinc-800">
            <button
              onClick={onReset}
              className="w-full text-[11px] font-medium text-zinc-400 hover:text-zinc-100 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              Reset Workspace
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
