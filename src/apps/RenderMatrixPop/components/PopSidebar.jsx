import { useCallback } from "react";
import {
  PenTool, Eraser, ScanLine, Loader2, Sparkles, TextCursorInput,
  Users, Box, Sun, Image as ImageIcon, Layers, Palette, Flame, Target, ImagePlus,
} from "lucide-react";
// 폼 컨트롤들은 RenderMatrix 와 시각 동일 → 공유 컴포넌트 재사용.
import { DropdownControl, ToggleControl } from "../../RenderMatrix/components/MatrixControls";
import PopImageViewer from "./PopImageViewer";
import PopPresetPanel from "./PopPresetPanel";
import { CustomDirectiveBox } from "./PopPromptForm";
import { DIRECTOR_PERSONAS, RENDER_ENGINES, EDIT_BUDGETS } from "../constants/presets";
import { fileToDataUrl } from "../services/cloudinary";

// Pop 사이드바: 세 가지 view (editor / edit / motion) 의 좌측 컨트롤.
// state/setters 는 usePopPrompt 의 값 그대로 prop-drill.
export default function PopSidebar({
  state, setters, presets, appOptions,
  isAnalyzingRef, handleAnalyzeReference,
  isAnalyzingPrompt, handleAnalyzePrompt,
  isExpandingIntent, onExpandIntent, onOpenChatModal,
  onAnyChange, onSwitchView,
  isDraggingRef, setIsDraggingRef,
  isDraggingEdit, setIsDraggingEdit,
  isDraggingMotion, setIsDraggingMotion,
}) {
  const handleChange = useCallback((setter) => (val) => {
    setter(val);
    onAnyChange?.();
  }, [onAnyChange]);

  const readImage = async (file, target) => {
    if (!file || !file.type?.startsWith('image/')) return;
    try { target(await fileToDataUrl(file)); } catch (e) { console.warn(e); }
  };

  return (
    <aside className="w-[340px] bg-[#18181B] border border-zinc-800 rounded-2xl flex flex-col shrink-0 shadow-2xl overflow-y-auto custom-scrollbar relative z-10">
      <div className="p-6 space-y-6">
        <div className="flex bg-[#121214] p-1.5 rounded-xl border border-zinc-800/80 shadow-inner">
          <button onClick={() => onSwitchView('editor', 'NanoBanana')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${state.currentView === 'editor' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <PenTool className="w-3.5 h-3.5 shrink-0" /> Creation
          </button>
          <button onClick={() => onSwitchView('edit', 'NanoBanana')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all ${state.currentView === 'edit' ? 'bg-[#27272A] text-white shadow-sm border border-zinc-700/50' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Eraser className="w-3.5 h-3.5 shrink-0" /> Micro-Edit
          </button>
          {/* Motion 탭 제거됨 — Motion Matrix 앱(motion-metrics)에서 처리. */}
        </div>

        {state.currentView === "editor" && (
          <>
            <div className="space-y-3 p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl relative">
              <div className="flex items-center gap-2 text-emerald-400 mb-3">
                <ScanLine className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Reverse Engineering Tools</span>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 font-bold px-1 mb-1">IMAGE ANALYZER (이미지 역분석)</p>
                <div className="relative">
                  <PopImageViewer
                    image={state.referenceImage}
                    onClear={(e) => { e.stopPropagation(); e.preventDefault(); setters.setReferenceImage(null); }}
                    onUpload={(e) => readImage(e.target.files[0], setters.setReferenceImage)}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingRef(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingRef(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDraggingRef(false); readImage(e.dataTransfer.files[0], setters.setReferenceImage); }}
                    isDragging={isDraggingRef}
                    isLoading={isAnalyzingRef}
                    title="REFERENCE IMAGE" sub="역설계할 타이포그래피 시안 업로드"
                    icon={ImageIcon} heightClass="h-24"
                  />
                  {state.referenceImage && !isAnalyzingRef && (
                    <button onClick={handleAnalyzeReference} className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-md flex items-center gap-1.5 text-[9px] font-bold tracking-wider transition-colors z-20">
                      <Sparkles className="w-3 h-3" /> 분석
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1 mt-4 pt-4 border-t border-emerald-500/20">
                <p className="text-[9px] text-zinc-500 font-bold px-1 mb-1">PROMPT ANALYZER (프롬프트 텍스트 역분석)</p>
                <div className="relative">
                  <textarea value={state.importPromptStr} onChange={e => setters.setImportPromptStr(e.target.value)}
                    placeholder="기존에 생성했던 프롬프트나 타 AI 프롬프트를 붙여넣으세요..."
                    className="w-full h-20 bg-black/40 border border-zinc-700/50 rounded-xl p-3 text-[10px] text-zinc-300 custom-scrollbar placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-colors" />
                  {state.importPromptStr.trim() && !isAnalyzingPrompt && (
                    <button onClick={handleAnalyzePrompt} className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-md flex items-center gap-1.5 text-[9px] font-bold tracking-wider transition-colors z-20">
                      <TextCursorInput className="w-3 h-3" /> 매핑
                    </button>
                  )}
                  {isAnalyzingPrompt && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-30">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 p-4 bg-purple-950/20 border border-purple-500/30 rounded-xl shadow-inner relative mt-4">
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                <div className="absolute top-0 right-0 p-2 opacity-10"><Users className="w-16 h-16" /></div>
              </div>
              <div className="flex items-center gap-2 text-purple-400 mb-2 relative z-10">
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Director Persona</span>
              </div>
              <div className="relative z-10">
                <DropdownControl data={DIRECTOR_PERSONAS.map(p => ({ id: p.id, name: p.name }))}
                  value={state.directorPersona} onChange={handleChange(setters.setDirectorPersona)} disabled={state.vfxPassMode} />
              </div>
            </div>

            <PopPresetPanel
              activePresetGroup={presets.activePresetGroup}
              setActivePresetGroup={presets.setActivePresetGroup}
              activePresetId={presets.activePresetId}
              isPresetModified={presets.isPresetModified}
              onApplyPreset={presets.handleApplyPreset}
            />

            <CustomDirectiveBox
              value={state.userIntent} onChange={(v) => handleChange(setters.setUserIntent)(v)}
              placeholder="원하는 세부 디테일을 적어주세요"
              isExpanding={isExpandingIntent} onExpand={onExpandIntent}
              onOpenChat={onOpenChatModal}
            />

            <div className={`space-y-3 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl transition-opacity ${state.vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Box className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Morphology (조형 제어)</span>
              </div>
              <DropdownControl label="Scale (글씨 구조)" data={appOptions.typographyScales} value={state.typographyScale} onChange={handleChange(setters.setTypographyScale)} dynamicNames={appOptions.typographyScales} />
              <DropdownControl label="Camera Lens (원근감)" data={appOptions.cameraLenses} value={state.cameraLens} onChange={handleChange(setters.setCameraLens)} dynamicNames={appOptions.cameraLenses} />
              <DropdownControl label="Front Relief (정면 부조/음양각)" data={appOptions.frontReliefs} value={state.frontRelief} onChange={handleChange(setters.setFrontRelief)} dynamicNames={appOptions.frontReliefs} />
              <DropdownControl label="Projection Depth (후면 돌출/원근)" data={appOptions.projectionDepths} value={state.projectionDepth} onChange={handleChange(setters.setProjectionDepth)} dynamicNames={appOptions.projectionDepths} />
            </div>

            <div className={`space-y-3 transition-opacity ${state.vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
              <DropdownControl label="Base Material (베이스 재질)" data={appOptions.materials} value={state.material} onChange={handleChange(setters.setMaterial)} dynamicNames={appOptions.materials} />
              <DropdownControl label="Surface Detail (미세 질감 밀도)" icon={<ScanLine className="w-4 h-4" />} data={appOptions.surfaceDetails} value={state.surfaceDetail} onChange={handleChange(setters.setSurfaceDetail)} dynamicNames={appOptions.surfaceDetails} />
              <DropdownControl label="Internal Texture (내부 질감)" data={appOptions.dramaticTextures} value={state.dramaticTex} onChange={handleChange(setters.setDramaticTex)} />
              <DropdownControl label="Surface Wear (마모도)" data={appOptions.wearLevels} value={state.wearLevel} onChange={handleChange(setters.setWearLevel)} />
            </div>

            <div className={`space-y-3 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl mt-4 transition-opacity ${state.vfxPassMode ? 'opacity-30 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Sun className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Edge & Lighting</span>
              </div>
              <DropdownControl label="Outline Thickness" data={appOptions.rimThicknesses} value={state.rimThickness} onChange={handleChange(setters.setRimThickness)} />
              <div className="flex gap-2">
                <DropdownControl label="Rim Light Intensity" data={appOptions.rimIntensities} value={state.rimIntensity} onChange={handleChange(setters.setRimIntensity)} />
                <DropdownControl label="Rim Light Color" data={appOptions.rimColors} value={state.rimColor} onChange={handleChange(setters.setRimColor)} />
              </div>
              <ToggleControl label="Specular Glint (반사광 강조)" desc="강렬한 스펙큘러 하이라이트 활성화" enabled={state.enableGlint} onChange={() => handleChange(setters.setEnableGlint)(!state.enableGlint)} />
            </div>

            <div className="space-y-3 mt-4">
              <ToggleControl label="시안 연출 모드 (이펙트 & 배경)" desc="질감 있는 다크 캔버스를 깔고 특수 효과를 발동시킵니다." enabled={state.enableVfx} onChange={() => {
                const newVal = !state.enableVfx;
                handleChange(setters.setEnableVfx)(newVal);
                if (newVal && state.energyCore === "None") handleChange(setters.setEnergyCore)("GoldenDust");
              }} />
              {state.enableVfx && (
                <div className="pl-4 border-l-2 border-zinc-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 pt-1">
                  <DropdownControl label="VFX Core (효과 종류)" data={appOptions.energyCores} value={state.editEnergyCore} onChange={handleChange(setters.setEditEnergyCore)} />
                  <DropdownControl label="Origin (발생 위치)" data={appOptions.fxOrigins} value={state.editFxOrigin} onChange={handleChange(setters.setEditFxOrigin)} />
                  <DropdownControl label="Intensity (강도)" data={appOptions.fxIntensities} value={state.editFxIntensity} onChange={handleChange(setters.setEditFxIntensity)} />
                </div>
              )}
              <ToggleControl label="바닥 그림자 (Drop Shadow)" desc="배경에 글자의 그림자를 드리워 묵직한 입체감을 더합니다." enabled={state.enableShadow} onChange={() => handleChange(setters.setEnableShadow)(!state.enableShadow)} />
              <ToggleControl label="VFX 소스 분리 렌더링 모드" desc="타이포를 블랙아웃시키고 주변 이펙트만 남겨 매트 패스를 추출합니다." enabled={state.vfxPassMode} onChange={() => handleChange(setters.setVfxPassMode)(!state.vfxPassMode)} />
              <DropdownControl label="Background (기본 배경)" data={appOptions.backgrounds} value={state.background} onChange={handleChange(setters.setBackground)} disabled={state.enableVfx} />
              <DropdownControl label="Render Engine" data={RENDER_ENGINES} value={state.renderEngine} onChange={handleChange(setters.setRenderEngine)} />
            </div>
          </>
        )}

        {state.currentView === "edit" && (
          <>
            <div className="space-y-3">
              <div onClick={() => handleChange(setters.setEditVfxPassMode)(!state.editVfxPassMode)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all shadow-md group ${state.editVfxPassMode ? 'bg-blue-600/20 border-blue-500/50' : 'bg-black/30 border-zinc-700/50 hover:bg-black/50 hover:border-zinc-500'}`}>
                <div className={`p-1.5 rounded-lg ${state.editVfxPassMode ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                  <Flame className={`w-4 h-4 ${state.editVfxPassMode ? 'text-white' : 'text-zinc-400'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-[11px] font-bold ${state.editVfxPassMode ? 'text-blue-400' : 'text-zinc-300'}`}>VFX 소스 분리 매트 패스</span>
                  <span className="text-[9px] text-zinc-500">타이포를 블랙아웃하고 이펙트만 추출</span>
                </div>
                <div className={`ml-auto w-3 h-3 rounded-full border ${state.editVfxPassMode ? 'border-blue-400 bg-blue-600' : 'border-zinc-600 bg-transparent'}`} />
              </div>
              <div className="flex items-center gap-2 text-zinc-400 mb-2 mt-4">
                <Target className="w-4 h-4 shrink-0" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Target Image</h3>
              </div>
              <PopImageViewer
                image={state.editImage}
                onClear={(e) => { e.stopPropagation(); e.preventDefault(); setters.setEditImage(null); }}
                onUpload={(e) => readImage(e.target.files[0], setters.setEditImage)}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingEdit(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingEdit(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDraggingEdit(false); readImage(e.dataTransfer.files[0], setters.setEditImage); }}
                isDragging={isDraggingEdit}
                title="TARGET UPLOAD" sub="리믹스할 원본 이미지"
                icon={ImagePlus} heightClass="h-40"
              />
            </div>
            <CustomDirectiveBox
              value={state.editIntent} onChange={(v) => handleChange(setters.setEditIntent)(v)}
              placeholder="원하는 분위기를 자유롭게 입력..."
              isExpanding={isExpandingIntent} onExpand={onExpandIntent}
              onOpenChat={onOpenChatModal}
            />
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <DropdownControl label="Edit Budget (변형 허용 예산)" data={EDIT_BUDGETS} value={state.editBudget} onChange={handleChange(setters.setEditBudget)} disabled={state.editVfxPassMode} />
            </div>
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Layers className="w-4 h-4 shrink-0" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Edit Scope (레이어)</h3>
              </div>
              <div className="flex flex-col gap-2">
                <EditScopeLayer active={state.activeEditIntents.material} accent="indigo" Icon={Palette} title="재질 덮어쓰기" desc="형태 고정, 내부 재질/색상 교체"
                  disabled={state.editVfxPassMode}
                  onToggle={() => handleChange(setters.setActiveEditIntents)({ ...state.activeEditIntents, material: !state.activeEditIntents.material })}
                >
                  <DropdownControl label="Target Material" data={appOptions.materials} value={state.editMaterial} onChange={handleChange(setters.setEditMaterial)} />
                  <DropdownControl label="Surface Wear" data={appOptions.wearLevels} value={state.editWearLevel} onChange={handleChange(setters.setEditWearLevel)} />
                </EditScopeLayer>
                <EditScopeLayer active={state.activeEditIntents.lighting} accent="amber" Icon={Sun} title="엣지 / 림라이트" desc="외곽선 빛의 방향/분위기 추가"
                  disabled={state.editVfxPassMode}
                  onToggle={() => handleChange(setters.setActiveEditIntents)({ ...state.activeEditIntents, lighting: !state.activeEditIntents.lighting })}
                >
                  <div className="flex gap-2">
                    <DropdownControl label="Rim Light Intensity" data={appOptions.rimIntensities} value={state.editRimIntensity} onChange={handleChange(setters.setEditRimIntensity)} />
                    <DropdownControl label="Rim Light Color" data={appOptions.rimColors} value={state.editRimColor} onChange={handleChange(setters.setEditRimColor)} />
                  </div>
                </EditScopeLayer>
                <EditScopeLayer active={state.activeEditIntents.vfx || state.editVfxPassMode} forceActive={state.editVfxPassMode} accent="rose" Icon={Flame} title="주변 VFX (이펙트)" desc="표면에 밀착된 입자/에너지 추가"
                  onToggle={() => !state.editVfxPassMode && handleChange(setters.setActiveEditIntents)({ ...state.activeEditIntents, vfx: !state.activeEditIntents.vfx })}
                >
                  <DropdownControl label="VFX Core (효과 종류)" data={appOptions.energyCores} value={state.editEnergyCore} onChange={handleChange(setters.setEditEnergyCore)} />
                  <DropdownControl label="Origin (발생 위치)" data={appOptions.fxOrigins} value={state.editFxOrigin} onChange={handleChange(setters.setEditFxOrigin)} />
                  <DropdownControl label="Intensity (강도)" data={appOptions.fxIntensities} value={state.editFxIntensity} onChange={handleChange(setters.setEditFxIntensity)} />
                </EditScopeLayer>
              </div>
            </div>
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <DropdownControl label="Background Constraint" data={appOptions.backgrounds} value={state.editBg} onChange={handleChange(setters.setEditBg)} />
              <DropdownControl label="Depth Constraint" data={appOptions.projectionDepths} value={state.editRearExtrusion} onChange={handleChange(setters.setEditRearExtrusion)} disabled={state.editVfxPassMode} />
            </div>
          </>
        )}

        {state.currentView === "motion" && (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-400 mb-2 mt-2">
                <Target className="w-4 h-4 shrink-0" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Source Image</h3>
              </div>
              <PopImageViewer
                image={state.motionImage}
                onClear={(e) => { e.stopPropagation(); e.preventDefault(); setters.setMotionImage(null); }}
                onUpload={(e) => readImage(e.target.files[0], setters.setMotionImage)}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingMotion(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingMotion(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDraggingMotion(false); readImage(e.dataTransfer.files[0], setters.setMotionImage); }}
                isDragging={isDraggingMotion}
                title="STATIC IMAGE UPLOAD" sub="애니메이션을 부여할 원본 이미지"
                icon={ImagePlus} heightClass="h-40"
              />
            </div>
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <DropdownControl label="Camera Motion (카메라 무빙)" data={appOptions.cameraMotions} value={state.cameraMotion} onChange={handleChange(setters.setCameraMotion)} />
              <DropdownControl label="VFX Dynamics (이펙트 움직임)" data={appOptions.motionDynamics} value={state.vfxDynamics} onChange={handleChange(setters.setVfxDynamics)} />
              <DropdownControl label="Target Energy (이펙트 소스)" data={appOptions.energyCores} value={state.energyCore} onChange={handleChange(setters.setEnergyCore)} />
            </div>
            <div className="space-y-1 pt-4 border-t border-zinc-800/80">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Motion Directive (애니메이션 묘사)</label>
              <div className="w-full flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-inner">
                <textarea value={state.motionIntent} onChange={e => handleChange(setters.setMotionIntent)(e.target.value)}
                  placeholder="예: 불꽃이 천천히 타오르며 위로 흩날림"
                  className="w-full h-16 bg-transparent p-3 text-[11px] outline-none resize-none text-zinc-300 custom-scrollbar placeholder:text-zinc-600" />
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function EditScopeLayer({ active, forceActive = false, accent, Icon, title, desc, onToggle, disabled = false, children }) {
  const map = {
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/50', text: 'text-indigo-400', dot: 'border-indigo-400 bg-indigo-400', innerBorder: 'border-indigo-500/20' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/50',  text: 'text-amber-400',  dot: 'border-amber-400 bg-amber-400',  innerBorder: 'border-amber-500/20' },
    rose:   { bg: 'bg-rose-500/10',   border: 'border-rose-500/50',   text: 'text-rose-400',   dot: 'border-rose-400 bg-rose-400',    innerBorder: 'border-rose-500/20' },
  };
  const a = map[accent] || map.indigo;
  return (
    <div className={`rounded-xl border transition-all ${active ? `${a.bg} ${a.border}` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'} ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <div onClick={onToggle} className="p-3 cursor-pointer flex items-center justify-between group">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${active ? a.text : 'text-zinc-500'}`} />
          <div className="flex flex-col">
            <span className={`text-[11px] font-bold ${active ? 'text-white' : 'text-zinc-300'}`}>{title}</span>
            <span className="text-[9px] text-zinc-500">{desc}</span>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full border ${active ? a.dot : 'border-zinc-600 bg-transparent'}`} />
      </div>
      {(active || forceActive) && (
        <div className={`p-3 bg-black/20 border-t ${a.innerBorder} space-y-3`}>{children}</div>
      )}
    </div>
  );
}
