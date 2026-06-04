import { useState, useCallback } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { useRenderPrompt } from "./hooks/useRenderPrompt";
import { usePresets } from "./hooks/usePresets";
import MatrixSidebar from "./components/MatrixSidebar";
import MatrixResultPanel from "./components/MatrixResultPanel";
import { TuningRoomModal } from "./components/MatrixPromptForm";
import { renderWithImagen, IMAGEN_MODELS } from "../../lib/imagenRender";
import { uploadBase64 } from "../../lib/storage";
import { db, appId } from "../../lib/firebase";
import { serializeForFirestore } from "../PromptArc/services/firebase";
import { useAuth } from "../../context/AuthContext";

// useRenderPrompt 가 노출하는 setX 함수들을 MatrixSidebar 에 그대로 전달하기 위한 키 목록.
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

// performLogicAudit + QuickAdjustments 의 action 객체 → useRenderPrompt setter 매핑.
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

export default function RenderMatrixApp() {
  const rp = useRenderPrompt();
  const { user, grade } = useAuth();
  // pro/expert 만 Imagen 렌더링 가능.
  const canRender = grade === 'pro' || grade === 'expert';

  // setters / state 묶음 — MatrixSidebar 에 prop-drill 하기 좋게 객체로 압축.
  const setters = Object.fromEntries(SETTER_KEYS.map(k => [k, rp[k]]));
  const state = Object.fromEntries(Object.entries(rp).filter(([k]) => !k.startsWith('set') && k !== 'usageModal'));

  // ─── Imagen 렌더링 ───
  const [rendering, setRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState(null); // { dataUrl, base64, mimeType, modelId }
  const [renderError, setRenderError] = useState(null);
  const [savingToArc, setSavingToArc] = useState(false);
  const [selectedModel, setSelectedModel] = useState(IMAGEN_MODELS[0].id);

  // PromptArc 본 컬렉션에 'private' 으로 저장 — 내 폴더에 노출됨.
  // 자동 호출(렌더 완료 직후) + 수동 버튼 양쪽에서 동일 경로 사용.
  const saveRenderToPromptArc = useCallback(async (promptText, image) => {
    if (!user?.uid || !image?.dataUrl) return;
    setSavingToArc(true);
    try {
      const cloudinaryUrl = await uploadBase64(image.dataUrl);
      const id = Math.random().toString(36).slice(2);
      const now = Date.now();
      const modelLabel = IMAGEN_MODELS.find(m => m.id === image.modelId)?.label || image.modelId || 'Imagen';
      const title = `RenderMatrix · ${new Date(now).toLocaleString('ko-KR')}`;
      const record = {
        id,
        title,
        content: promptText || '',
        images: [cloudinaryUrl],
        thumbnail: cloudinaryUrl,
        stepPrompts: [promptText || ''],
        stepLabels: ['RenderMatrix'],
        stepTags: [['RenderMatrix', 'Imagen', modelLabel]],
        stepKeywords: [''],
        stepDescriptions: [''],
        tags: ['RenderMatrix', 'Imagen', modelLabel],
        visibility: 'private',
        ownerUid: user.uid,
        authorName: user.displayName || user.email || '',
        likeCount: 0,
        relatedIds: [],
        type: 'image',
        createdAt: now,
        updatedAt: now,
      };
      // PromptArc 직렬화: 중첩 배열(stepTags) 을 JSON 문자열 + _nestedKeys 마커로 변환.
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prompts', id), serializeForFirestore(record));
      rp.showToast?.('✨ PromptArc 내 폴더에 저장됐어요');
      return id;
    } catch (e) {
      console.error('[RenderMatrix] save to PromptArc failed', e);
      rp.showToast?.(`PromptArc 저장 실패: ${e.message || e.code}`);
    } finally {
      setSavingToArc(false);
    }
  }, [user, rp]);

  const handleRender = useCallback(async (promptText) => {
    if (!promptText) return;
    if (!canRender) {
      setRenderError('Imagen 렌더링은 Pro 등급 이상만 사용할 수 있습니다.');
      return;
    }
    // 기본 이미지 필수 — 사이드바 레퍼런스(역분석용) 와 분리된 별도 입력.
    // 우측 상단 "기본 이미지" 패널에 직접 업로드된 시안만 image-to-image 입력으로 사용한다.
    if (!rp.baseImage) {
      const msg = '기본 이미지를 먼저 등록해주세요. (우측 상단 "기본 이미지" 영역에 직접 업로드)';
      setRenderError(msg);
      rp.showToast?.(msg);
      return;
    }
    // 주간 크레딧 10c 차감. 부족하면 LimitReachedModal 자동 노출.
    const canGen = await rp.ensureCanGenerate?.('image');
    if (canGen === false) {
      setRenderError('이번 주 크레딧이 부족합니다. (이미지 생성 10c 필요)');
      return;
    }
    setRendering(true);
    setRenderError(null);
    setRenderedImage(null);
    try {
      // 기본 이미지(baseImage)가 dataURL 로 들어있으면 함께 전달 → image-to-image 렌더링.
      const result = await renderWithImagen(
        promptText,
        selectedModel,
        rp.baseImage,
      );
      setRenderedImage(result);
      // 렌더 완료 즉시 PromptArc 내 폴더에 자동 등록 — 사용자 클릭 없이 백그라운드 진행.
      if (user?.uid && result?.dataUrl) {
        saveRenderToPromptArc(promptText, result);
      }
    } catch (e) {
      console.error('[RenderMatrix] imagen failed', e);
      setRenderError(e.message || String(e));
    } finally {
      setRendering(false);
    }
  }, [canRender, selectedModel, rp.baseImage, user, saveRenderToPromptArc]);

  const handleDownloadRendered = useCallback(() => {
    if (!renderedImage?.dataUrl) return;
    const a = document.createElement('a');
    a.href = renderedImage.dataUrl;
    a.download = `rendermatrix_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [renderedImage]);

  // 수동 저장 버튼 — 렌더 직후 자동 저장이 실패했거나 사용자가 명시적으로 재등록하려는 경우.
  const handleSaveToPromptArc = useCallback(async (promptText) => {
    if (!user?.uid) { rp.showToast?.('로그인이 필요합니다'); return; }
    if (!renderedImage?.dataUrl) return;
    if (savingToArc) return;
    await saveRenderToPromptArc(promptText, renderedImage);
  }, [user, renderedImage, savingToArc, rp, saveRenderToPromptArc]);


  const presets = usePresets({
    setters: {
      directorPersona: rp.setDirectorPersona, material: rp.setMaterial, frontRelief: rp.setFrontRelief,
      projectionDepth: rp.setProjectionDepth, cameraLens: rp.setCameraLens, dramaticTex: rp.setDramaticTex,
      surfaceTreatment: rp.setSurfaceTreatment, surfaceDetail: rp.setSurfaceDetail, wearLevel: rp.setWearLevel,
      energyCore: rp.setEnergyCore, fxOrigin: rp.setFxOrigin, fxIntensity: rp.setFxIntensity,
      background: rp.setBackground, rimThickness: rp.setRimThickness, rimColor: rp.setRimColor,
      rimIntensity: rp.setRimIntensity, vfxPassMode: rp.setVfxPassMode, enableGlint: rp.setEnableGlint,
      enableVfx: rp.setEnableVfx, enableShadow: rp.setEnableShadow,
    },
    onApplied: (preset) => {
      rp.setActiveTroubleshoots([]);
      rp.setTroubleshootHistory({});
      rp.resetOptimized();
      rp.showToast(`✨ [${preset.label}] 스타일 적용됨`);
    },
  });

  // 사이드바 내부 드래그-오버 플래그들.
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  const [isDraggingMotion, setIsDraggingMotion] = useState(false);

  // Logic Audit / Quick Adjustments 의 action 객체 → setter 풀어 적용.
  // troubleshoot=true 면 토글식 적용/해제 (history 에 이전 값 보관).
  const applyAction = (opt, isTroubleshoot = false) => {
    rp.resetOptimized();
    if (isTroubleshoot && opt.id && rp.activeTroubleshoots.includes(opt.id)) {
      const restore = rp.troubleshootHistory[opt.id];
      if (restore) {
        Object.keys(restore).forEach(key => {
          const setterName = ACTION_TO_SETTER[key];
          if (setterName && rp[setterName]) rp[setterName](restore[key]);
        });
      }
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

  // 옵션 직접 변경 시 부수효과 묶음.
  const onAnyChange = () => {
    presets.markModified();
    rp.setActiveTroubleshoots([]);
    rp.setTroubleshootHistory({});
    rp.resetOptimized();
  };

  // view 전환 시 default model 지정 + troubleshoot/optimized 초기화.
  const onSwitchView = (view, defaultModel) => {
    rp.setCurrentView(view);
    rp.setAiModel(defaultModel);
    rp.setActiveTroubleshoots([]);
    rp.setTroubleshootHistory({});
    rp.resetOptimized();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 p-5 font-sans overflow-hidden">
      {rp.usageModal}
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
        <MatrixSidebar
          state={state}
          setters={setters}
          presets={presets}
          appOptions={rp.appOptions}
          arcRecommended={rp.arcRecommended}
          incomingFromArc={rp.incomingFromArc}
          isArcAnalyzing={rp.isArcAnalyzing}
          setIncomingFromArc={rp.setIncomingFromArc}
          setArcRecommended={rp.setArcRecommended}
          isAnalyzingRef={rp.isAnalyzingRef}
          handleAnalyzeReference={rp.handleAnalyzeReference}
          isAnalyzingPrompt={rp.isAnalyzingPrompt}
          handleAnalyzePrompt={rp.handleAnalyzePrompt}
          isExpandingIntent={rp.isExpandingIntent}
          onExpandIntent={rp.handleExpandIntent}
          onOpenChatModal={rp.openChatModal}
          onAnyChange={onAnyChange}
          onSwitchView={onSwitchView}
          isDraggingRef={isDraggingRef} setIsDraggingRef={setIsDraggingRef}
          isDraggingEdit={isDraggingEdit} setIsDraggingEdit={setIsDraggingEdit}
          isDraggingMotion={isDraggingMotion} setIsDraggingMotion={setIsDraggingMotion}
        />

        <MatrixResultPanel
          currentView={rp.currentView}
          vfxPassMode={rp.vfxPassMode} editVfxPassMode={rp.editVfxPassMode}
          auditIssues={rp.auditIssues}
          qualityScores={rp.qualityScores}
          baseImage={rp.baseImage}
          setBaseImage={rp.setBaseImage}
          activeTroubleshoots={rp.activeTroubleshoots}
          onApplyTroubleshoot={applyAction}
          aiModel={rp.aiModel} setAiModel={rp.setAiModel}
          currentIR={rp.currentIR}
          compiledOutputs={rp.compiledOutputs}
          optimizedPrompts={rp.optimizedPrompts}
          optimizedPromptsKo={rp.optimizedPromptsKo}
          isOptimizing={rp.isOptimizing}
          onOptimize={rp.handleOptimizePrompt}
          isCompressing={rp.isCompressing}
          onCompress={rp.handleCompressPrompt}
          onCopy={rp.copyToClipboard}
          isCopied={rp.isCopied}
          onSendToMotion={rp.sendToMotion}
          // Imagen 렌더링
          onRender={handleRender}
          rendering={rendering}
          renderedImage={renderedImage}
          renderError={renderError}
          onDownloadRendered={handleDownloadRendered}
          onSaveToPromptArc={handleSaveToPromptArc}
          savingToArc={savingToArc}
          isLoggedIn={!!user?.uid}
          canRender={canRender}
          grade={grade}
          imagenModels={IMAGEN_MODELS}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
        />
      </main>
    </div>
  );
}
