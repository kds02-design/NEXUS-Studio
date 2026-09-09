import { useState, useCallback } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { useRenderPrompt } from "./hooks/useRenderPrompt";
import { usePresets } from "./hooks/usePresets";
import MatrixSidebar from "./components/MatrixSidebar";
import MatrixResultPanel from "./components/MatrixResultPanel";
import { TuningRoomModal } from "./components/MatrixPromptForm";
import { renderWithImagen, IMAGEN_MODELS, RENDER_SIZES, isProImageModel } from "../../lib/imagenRender";
import { uploadBase64 } from "../../lib/storage";
import { TEMP_TTL_MS } from "../../lib/promptArcSave";
import { db, appId } from "../../lib/firebase";
import { serializeForFirestore } from "../PromptArc/services/firebase";
import { useAuth } from "../../context/AuthContext";
import { ACCENT } from "./constants/accent";

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
  // 자동 아카이브가 업로드한 Cloudinary URL — Mask Forge 송신 시 dataURL 대신 재사용 (payload 경량화).
  const [savedCloudinaryUrl, setSavedCloudinaryUrl] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [savingToArc, setSavingToArc] = useState(false);
  const [selectedModel, setSelectedModel] = useState(IMAGEN_MODELS[0].id);
  // 출력 해상도 — Pro 모델만 1K/2K/4K 선택 (Flash 는 1K 고정, clampImageSize 가 보정).
  const [selectedRenderSize, setSelectedRenderSize] = useState("2K");

  // PromptArc 본 컬렉션에 'private' 으로 저장 — 내 폴더에 노출됨.
  // 자동 호출(렌더 완료 직후) + 수동 버튼 양쪽에서 동일 경로 사용.
  const saveRenderToPromptArc = useCallback(async (promptText, image) => {
    if (!user?.uid || !image?.dataUrl) return;
    setSavingToArc(true);
    try {
      const cloudinaryUrl = await uploadBase64(image.dataUrl);
      setSavedCloudinaryUrl(cloudinaryUrl);
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
        // 렌더 자동 저장물 = 임시 파일 (15일 활성 + 15일 휴지통). 공개 전환 시 영구 보존.
        temporary: true, expiresAt: now + TEMP_TTL_MS,
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
    // 뷰별 image-to-image 입력 — editor(생성): baseImage / edit(마이크로 에디트): editImage.
    // 이전엔 뷰와 무관하게 baseImage 만 사용해, 에디트 뷰에서 Target 이미지를 올려도
    // "기본 이미지 등록" 에러가 나거나(외부 앱 mode:'edit' 진입 케이스), 생성 뷰에 남아 있던
    // 다른 이미지가 참조로 들어가던 버그.
    const referenceImage = rp.currentView === 'edit' ? rp.editImage : rp.baseImage;
    if (!referenceImage) {
      const msg = rp.currentView === 'edit'
        ? 'Target 이미지를 먼저 업로드해주세요. (사이드바 마이크로 에디트의 Target 이미지)'
        : '기본 이미지를 먼저 등록해주세요. (우측 상단 "기본 이미지" 영역에 직접 업로드)';
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
    // 이전 결과는 유지 — 재렌더 실패 시 10c 짜리 기존 이미지가 사라지는 것 방지. 성공 시에만 교체.
    try {
      // 뷰에 맞는 대상 이미지(dataURL)를 함께 전달 → image-to-image 렌더링.
      const result = await renderWithImagen(
        promptText,
        selectedModel,
        referenceImage,
        { imageSize: selectedRenderSize },
      );
      setRenderedImage(result);
      setSavedCloudinaryUrl(null); // 이전 렌더의 URL 은 무효 — 자동 아카이브가 새 URL 로 갱신.
      // 자동 파이프라인 렌더였다면 완료 상태로 마감 ('rendering' 에 영원히 머무는 것 방지).
      rp.setAutoPipeline?.((s) => (s && s.status === 'rendering' ? { ...s, status: 'done' } : s));
      // 렌더 완료 즉시 PromptArc 내 폴더에 자동 등록 — 사용자 클릭 없이 백그라운드 진행.
      if (user?.uid && result?.dataUrl) {
        saveRenderToPromptArc(promptText, result);
      }
    } catch (e) {
      console.error('[RenderMatrix] imagen failed', e);
      // 원문(영문 API 에러)은 콘솔에만 — 사용자에겐 한국어 안내로 매핑.
      const raw = e.message || String(e);
      const friendly = /429|quota/i.test(raw)
        ? '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
        : /SAFETY|blocked/i.test(raw)
          ? '프롬프트가 정책에 의해 거부되었습니다. 표현을 조정해보세요.'
          : `렌더링에 실패했습니다: ${raw}`;
      setRenderError(friendly);
      // 자동 파이프라인 렌더였다면 실패 상태로 마감.
      rp.setAutoPipeline?.((s) => (s && s.status === 'rendering' ? { ...s, status: 'failed' } : s));
    } finally {
      setRendering(false);
    }
  }, [canRender, selectedModel, selectedRenderSize, rp.baseImage, rp.editImage, rp.currentView, user, saveRenderToPromptArc, rp.setAutoPipeline]);

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

  // ─── 완전 자동 파이프라인 ───
  // TypeCore 에서 mode:'pipeline' 로 들어오면 훅이 base image 임포트 + 추천 옵션 적용 후
  // autoPipeline.status==='ready' 로 올린다. 이전엔 그 즉시 10c 렌더를 자동 발화했지만,
  // 지금은 결과 패널에 확인 배너를 띄우고 [바로 렌더] 클릭 시에만 실행한다 (크레딧 오소비 방지).
  const handlePipelineRender = useCallback(async () => {
    const text = rp.optimizedPrompts[rp.aiModel] || rp.compiledOutputs[rp.aiModel];
    if (!text || text.length < 20 || text.includes('업로드')) {
      rp.showToast?.('⚠️ 프롬프트가 아직 준비되지 않았어요. 잠시 후 다시 시도해주세요.');
      return;
    }
    rp.setAutoPipeline?.((s) => (s ? { ...s, status: 'rendering' } : null));
    await handleRender(text);
    // handleRender 의 성공/실패 경로가 done/failed 로 마감. 조기 return(크레딧 부족·이미지 누락 등)
    // 케이스는 'rendering' 에 남으므로 여기서 failed 로 마감.
    rp.setAutoPipeline?.((s) => (s && s.status === 'rendering' ? { ...s, status: 'failed' } : s));
  }, [rp.optimizedPrompts, rp.compiledOutputs, rp.aiModel, handleRender, rp]);

  // [옵션 먼저 확인] — 배너만 닫고 적용된 옵션·이미지는 그대로 유지 (수동 렌더 흐름으로 전환).
  const handlePipelineDismiss = useCallback(() => {
    rp.setAutoPipeline?.(null);
  }, [rp]);


  const presets = usePresets({
    setters: {
      directorPersona: rp.setDirectorPersona, material: rp.setMaterial, frontRelief: rp.setFrontRelief,
      projectionDepth: rp.setProjectionDepth, cameraLens: rp.setCameraLens, dramaticTex: rp.setDramaticTex,
      surfaceTreatment: rp.setSurfaceTreatment, surfaceDetail: rp.setSurfaceDetail, wearLevel: rp.setWearLevel,
      energyCore: rp.setEnergyCore, fxOrigin: rp.setFxOrigin, fxIntensity: rp.setFxIntensity,
      background: rp.setBackground, rimThickness: rp.setRimThickness, rimColor: rp.setRimColor,
      rimIntensity: rp.setRimIntensity, vfxPassMode: rp.setVfxPassMode, vfxPassOverlay: rp.setVfxPassOverlay, enableGlint: rp.setEnableGlint,
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
    <div className="flex flex-col h-full bg-slate-50 text-slate-900 dark:bg-[#09090B] dark:text-zinc-100 p-5 font-sans overflow-hidden" style={{ "--rm-accent": ACCENT }}>
      {rp.usageModal}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.2); border-radius: 4px; transition: background 0.2s; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.5); }
      `}</style>

      {rp.toastMsg && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full font-bold text-[12px] shadow-2xl z-[9500] flex items-center gap-2 animate-in slide-in-from-top-4 fade-in whitespace-nowrap border backdrop-blur-md transition-colors ${rp.toastMsg.includes('해제') || rp.toastMsg.includes('실패') ? 'bg-zinc-800/90 border-zinc-600 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-rose-400' : 'bg-emerald-500/90 border-emerald-400/50 shadow-[0_10px_30px_rgba(16,185,129,0.3)]'}`}>
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
          onApplyRecommendations={rp.applyRecommendations}
          isDraggingRef={isDraggingRef} setIsDraggingRef={setIsDraggingRef}
          isDraggingEdit={isDraggingEdit} setIsDraggingEdit={setIsDraggingEdit}
          showToast={rp.showToast}
        />

        <MatrixResultPanel
          currentView={rp.currentView}
          vfxPassMode={rp.vfxPassMode} editVfxPassMode={rp.editVfxPassMode}
          auditIssues={rp.auditIssues}
          qualityScores={rp.qualityScores}
          feelSummary={rp.feelSummary}
          baseImage={rp.baseImage}
          setBaseImage={rp.setBaseImage}
          editImage={rp.editImage}
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
          // 드래프트 복원 배너
          showRestoreDraft={rp.showRestoreDraft}
          onRestoreDraft={rp.restoreDraft}
          onDismissDraft={rp.draft?.dismiss}
          // 완전 자동 파이프라인 — 확인 배너 + 상태 칩
          autoPipeline={rp.autoPipeline}
          onPipelineRender={handlePipelineRender}
          onPipelineDismiss={handlePipelineDismiss}
          // Imagen 렌더링
          onRender={handleRender}
          rendering={rendering}
          renderedImage={renderedImage}
          renderError={renderError}
          onDownloadRendered={handleDownloadRendered}
          // Cloudinary URL 우선 — 수 MB dataURL 대신 경량 URL 전달 (미로그인 등 업로드 실패 시 dataURL 폴백).
          onSendToMaskForge={() => rp.sendToMaskForge?.(savedCloudinaryUrl || renderedImage?.dataUrl)}
          onSaveToPromptArc={handleSaveToPromptArc}
          savingToArc={savingToArc}
          isLoggedIn={!!user?.uid}
          canRender={canRender}
          grade={grade}
          imagenModels={IMAGEN_MODELS}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          renderSizes={RENDER_SIZES}
          selectedRenderSize={selectedRenderSize}
          setSelectedRenderSize={setSelectedRenderSize}
          sizeSelectable={isProImageModel(selectedModel)}
          showToast={rp.showToast}
        />
      </main>
    </div>
  );
}
