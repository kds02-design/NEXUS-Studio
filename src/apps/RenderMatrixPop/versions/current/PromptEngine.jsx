import { useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
// 분리된 모듈들은 RenderMatrixPop 루트에 위치 (components/, hooks/, services/, constants/).
// index.jsx 가 lazy 분기로 사용하는 진입점이므로 default export 만 유지.
import { usePopPrompt } from "../../hooks/usePopPrompt";
import { usePresets } from "../../hooks/usePresets";
import PopSidebar from "../../components/PopSidebar";
import PopResultPanel from "../../components/PopResultPanel";
import { TuningRoomModal } from "../../components/PopPromptForm";

// usePopPrompt 의 setX 들을 PopSidebar 에 prop-drill 하기 위한 키 목록.
const SETTER_KEYS = [
  'setDirectorPersona','setTypographyScale','setCameraLens','setBackground','setFrontRelief',
  'setProjectionDepth','setSurfaceTreatment','setEnableVfx','setEnableShadow','setEnergyCore',
  'setFxOrigin','setFxIntensity','setVfxPassMode','setMaterial','setDramaticTex','setSurfaceDetail',
  'setRimThickness','setWearLevel','setRimColor','setRimIntensity','setEnableGlint','setRenderEngine',
  'setUserIntent','setReferenceImage','setImportPromptStr',
  'setEditImage','setEditBudget','setActiveEditIntents','setEditBg','setEditRearExtrusion','setEditIntent',
  'setEditMaterial','setEditWearLevel','setEditRimColor','setEditRimIntensity','setEditEnergyCore',
  'setEditFxOrigin','setEditFxIntensity','setEditVfxPassMode',
  'setMotionImage','setCameraMotion','setVfxDynamics','setMotionIntent',
];

// LogicAudit + QuickAdjustments action 객체 → setter 매핑.
const ACTION_TO_SETTER = {
  directorPersona: 'setDirectorPersona', projectionDepth: 'setProjectionDepth', frontRelief: 'setFrontRelief',
  energyCore: 'setEnergyCore', fxOrigin: 'setFxOrigin', fxIntensity: 'setFxIntensity', background: 'setBackground',
  dramaticTex: 'setDramaticTex', material: 'setMaterial', surfaceDetail: 'setSurfaceDetail', wearLevel: 'setWearLevel',
  rimThickness: 'setRimThickness', rimColor: 'setRimColor', rimIntensity: 'setRimIntensity',
  enableGlint: 'setEnableGlint', surfaceTreatment: 'setSurfaceTreatment',
  editBudget: 'setEditBudget', editRearExtrusion: 'setEditRearExtrusion', activeEditIntents: 'setActiveEditIntents',
  editIntent: 'setEditIntent', vfxPassMode: 'setVfxPassMode', editVfxPassMode: 'setEditVfxPassMode',
  editEnergyCore: 'setEditEnergyCore', userIntent: 'setUserIntent',
  cameraMotion: 'setCameraMotion', vfxDynamics: 'setVfxDynamics', motionIntent: 'setMotionIntent',
  typographyScale: 'setTypographyScale', cameraLens: 'setCameraLens',
  enableVfx: 'setEnableVfx', enableShadow: 'setEnableShadow',
};

export default function RenderMatrixPopApp() {
  const rp = usePopPrompt();
  const setters = Object.fromEntries(SETTER_KEYS.map(k => [k, rp[k]]));
  const state = Object.fromEntries(Object.entries(rp).filter(([k]) => !k.startsWith('set')));

  const presets = usePresets({
    setters: {
      directorPersona: rp.setDirectorPersona, material: rp.setMaterial, frontRelief: rp.setFrontRelief,
      projectionDepth: rp.setProjectionDepth, cameraLens: rp.setCameraLens, dramaticTex: rp.setDramaticTex,
      surfaceTreatment: rp.setSurfaceTreatment, surfaceDetail: rp.setSurfaceDetail, wearLevel: rp.setWearLevel,
      energyCore: rp.setEnergyCore, fxOrigin: rp.setFxOrigin, fxIntensity: rp.setFxIntensity,
      background: rp.setBackground, rimThickness: rp.setRimThickness, rimColor: rp.setRimColor,
      rimIntensity: rp.setRimIntensity, vfxPassMode: rp.setVfxPassMode,
    },
    onApplied: (preset) => {
      rp.setActiveTroubleshoots([]); rp.setTroubleshootHistory({}); rp.resetOptimized();
      rp.showToast(`✨ [${preset.label}] 스타일 적용됨`);
    },
  });

  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  const [isDraggingMotion, setIsDraggingMotion] = useState(false);

  // LogicAudit/QuickAdjustments 토글식 적용. troubleshoot 시 history 에 이전 값 저장하고
  // 같은 옵션을 다시 클릭하면 복원.
  const applyAction = (opt, isTroubleshoot = false) => {
    rp.resetOptimized();
    if (isTroubleshoot && opt.id && rp.activeTroubleshoots.includes(opt.id)) {
      const restore = rp.troubleshootHistory[opt.id];
      if (restore) Object.keys(restore).forEach(key => {
        const setterName = ACTION_TO_SETTER[key];
        if (setterName && rp[setterName]) rp[setterName](restore[key]);
      });
      rp.setActiveTroubleshoots(prev => prev.filter(id => id !== opt.id));
      if (opt.label) rp.showToast(`↩️ '${opt.label.split(' ').slice(1).join(' ')}' 조치가 해제되었습니다`);
      return;
    }
    const action = opt.action;
    if (isTroubleshoot && opt.id) {
      const history = {};
      Object.keys(action).forEach(key => { if (state[key] !== undefined) history[key] = state[key]; });
      rp.setTroubleshootHistory(prev => ({ ...prev, [opt.id]: history }));
      rp.setActiveTroubleshoots(prev => [...prev, opt.id]);
    }
    Object.keys(action).forEach(key => {
      const setterName = ACTION_TO_SETTER[key];
      if (setterName && rp[setterName]) rp[setterName](action[key]);
    });
    presets.markModified();
    if (opt.label) rp.showToast(`✅ '${opt.label.split(' ').slice(1).join(' ')}' 조치가 반영되었습니다`);
  };

  const onAnyChange = () => {
    presets.markModified();
    rp.setActiveTroubleshoots([]); rp.setTroubleshootHistory({}); rp.resetOptimized();
  };

  const onSwitchView = (view, defaultModel) => {
    rp.setCurrentView(view); rp.setAiModel(defaultModel);
    rp.setActiveTroubleshoots([]); rp.setTroubleshootHistory({}); rp.resetOptimized();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 p-5 font-sans overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.5); }
      `}</style>

      {rp.toastMsg && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full font-bold text-[12px] shadow-2xl z-[1000] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in whitespace-nowrap border backdrop-blur-md transition-colors ${rp.toastMsg.includes('해제') || rp.toastMsg.includes('실패') ? 'bg-zinc-800/90 border-zinc-600 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-rose-400' : 'bg-emerald-500/90 border-emerald-400/50 shadow-[0_10px_30px_rgba(16,185,129,0.3)]'}`}>
          {rp.toastMsg.includes('해제') || rp.toastMsg.includes('실패') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          {rp.toastMsg}
        </div>
      )}

      <TuningRoomModal
        isOpen={rp.isChatModalOpen}
        onClose={() => rp.setIsChatModalOpen(false)}
        tempIntent={rp.tempIntent}
        chatMessages={rp.chatMessages}
        chatInput={rp.chatInput} setChatInput={rp.setChatInput}
        isChatting={rp.isChatting}
        onSend={rp.handleSendChatMessage}
        onApply={rp.applyChatIntent}
      />

      <main className="flex-1 flex gap-5 h-full overflow-hidden">
        <PopSidebar
          state={state} setters={setters} presets={presets} appOptions={rp.appOptions}
          isAnalyzingRef={rp.isAnalyzingRef} handleAnalyzeReference={rp.handleAnalyzeReference}
          isAnalyzingPrompt={rp.isAnalyzingPrompt} handleAnalyzePrompt={rp.handleAnalyzePrompt}
          isExpandingIntent={rp.isExpandingIntent}
          onExpandIntent={rp.handleExpandIntent}
          onOpenChatModal={rp.openChatModal}
          onAnyChange={onAnyChange} onSwitchView={onSwitchView}
          isDraggingRef={isDraggingRef} setIsDraggingRef={setIsDraggingRef}
          isDraggingEdit={isDraggingEdit} setIsDraggingEdit={setIsDraggingEdit}
          isDraggingMotion={isDraggingMotion} setIsDraggingMotion={setIsDraggingMotion}
        />

        <PopResultPanel
          currentView={rp.currentView}
          vfxPassMode={rp.vfxPassMode} editVfxPassMode={rp.editVfxPassMode}
          auditIssues={rp.auditIssues} qualityScores={rp.qualityScores}
          activeTroubleshoots={rp.activeTroubleshoots} onApplyTroubleshoot={applyAction}
          aiModel={rp.aiModel} setAiModel={rp.setAiModel} currentIR={rp.currentIR}
          compiledOutputs={rp.compiledOutputs}
          optimizedPrompts={rp.optimizedPrompts} optimizedPromptsKo={rp.optimizedPromptsKo}
          isOptimizing={rp.isOptimizing} onOptimize={rp.handleOptimizePrompt}
          onCopy={rp.copyToClipboard} isCopied={rp.isCopied}
        />
      </main>
    </div>
  );
}
