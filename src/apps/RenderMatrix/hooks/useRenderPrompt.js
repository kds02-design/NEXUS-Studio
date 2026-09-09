import { useState, useEffect, useMemo, useRef } from "react";
import { useGlobal } from "../../../context/GlobalContext";
import { useUsageGate } from "../../../components/UsageGate";
import { INITIAL_OPTIONS } from "../constants/materials";
import { useDraftPersistence } from "../../../lib/useDraftPersistence";
import {
  generateIR, generateEditIR,
  compileNanoBanana, compileChatGPT, compileMidjourney,
  compileEditNanoBanana, compileEditChatGPT, compileEditMidjourney,
  performLogicAudit, calculateQualityScore, buildFeelSummary,
} from "../services/promptCompiler";
import {
  analyzeReferenceImage, analyzePromptText,
  optimizePrompt, expandIntent, chatTuningMessage, analyzeArcImage,
} from "../services/gemini";
import { compressPrompt } from "../../../lib/promptCompressor";

// 메인 상태 + IR/compile 오케스트레이션 훅.
// state setter 들을 직접 노출하므로 호출부에서 stateSetters 객체로 재패키징하여 사용한다.
export function useRenderPrompt() {
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const { payload, clearPayload, navigate } = useGlobal();

  // ===== view / model / options =====
  const [currentView, setCurrentView] = useState("editor");
  const [aiModel, setAiModel] = useState("NanoBanana");
  const [appOptions, setAppOptions] = useState(INITIAL_OPTIONS);

  // ===== creation (editor) state =====
  const [directorPersona, setDirectorPersona] = useState("Cinematic");
  const [complexity] = useState(3);
  const [typographyScale, setTypographyScale] = useState("Macro");
  const [cameraLens, setCameraLens] = useState("Telephoto");
  const [background, setBackground] = useState("RealBlack");
  const [frontRelief, setFrontRelief] = useState("MicroChiseled");
  const [projectionDepth, setProjectionDepth] = useState("None");
  const [surfaceTreatment, setSurfaceTreatment] = useState("Standard");
  const [enableVfx, setEnableVfx] = useState(false);
  const [enableShadow, setEnableShadow] = useState(false);
  const [energyCore, setEnergyCore] = useState("None");
  const [fxOrigin, setFxOrigin] = useState("Edges");
  const [fxIntensity, setFxIntensity] = useState("Subtle");
  const [vfxPassMode, setVfxPassMode] = useState(false);
  // 이펙트 소스 추출의 "전면 통과" 변형 — 이펙트가 검은 타이틀 위를 자유롭게 가로지름
  // (타이틀 앞 레이어 합성용 소스. 기본 홀드아웃은 뒤 발광용).
  const [vfxPassOverlay, setVfxPassOverlay] = useState(false);
  const [material, setMaterial] = useState("HyperChrome");
  const [materialInt] = useState("Mid");
  const [dramaticTex, setDramaticTex] = useState("Auto");
  const [surfaceDetail, setSurfaceDetail] = useState("Standard");
  const [rimMaterial] = useState("None");
  const [rimThickness, setRimThickness] = useState("None");
  const [wearLevel, setWearLevel] = useState("None");
  const [rimColor, setRimColor] = useState("White");
  const [rimIntensity, setRimIntensity] = useState("Moderate");
  const [enableGlint, setEnableGlint] = useState(false);
  const [renderEngine, setRenderEngine] = useState("Unreal");
  const [userIntent, setUserIntent] = useState("");
  const [imageRatio] = useState("16:9");

  // ===== analyzer (reference image + prompt text) =====
  // referenceImage 는 사이드바 "Image Analyzer" 의 역분석용 입력.
  // 분석 버튼을 눌렀을 때만 옵션을 역공학해서 채우고, 실제 렌더링에는 사용하지 않는다.
  const [referenceImage, setReferenceImage] = useState(null);
  const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
  const [importPromptStr, setImportPromptStr] = useState("");
  const [isAnalyzingPrompt, setIsAnalyzingPrompt] = useState(false);

  // ===== base image (image-to-image 렌더 입력) =====
  // referenceImage 와 의도적으로 분리 — 사용자가 사이드바에서 레퍼런스를 올려도
  // 우측 "기본 이미지" 패널은 비어있어야 한다 (실제 렌더 입력은 별도 업로드 요구).
  // 변경: 이전엔 referenceImage 한 state 가 두 곳을 동시에 표시해 의도치 않은 교차가 발생.
  const [baseImage, setBaseImage] = useState(null);

  // ===== arc payload =====
  const [incomingFromArc, setIncomingFromArc] = useState(null);
  const [typographyLock, setTypographyLock] = useState(null);
  const [arcRecommended, setArcRecommended] = useState(null);
  const [isArcAnalyzing, setIsArcAnalyzing] = useState(false);
  const consumedPayloadRef = useRef(null);

  // ===== 완전 자동 파이프라인 (TypeCore → RenderMatrix → 자동 렌더) =====
  // payload.mode==='pipeline' 로 들어오면 base image 임포트 + Gemini 추천 옵션 자동 적용 후
  // status:'ready' 로 전환 → index.jsx 의 effect 가 image-to-image 렌더를 자동 실행한다.
  // { id, from, status: 'preparing' | 'ready' | 'rendering' | 'failed' }
  const [autoPipeline, setAutoPipeline] = useState(null);
  // 옵션 적용 후 compile 이 반영되면 ready 로 올리기 위한 1회성 플래그.
  const autoPipelineReadyPendingRef = useRef(false);

  // ===== edit state =====
  const [editImage, setEditImage] = useState(null);
  const [editBudget, setEditBudget] = useState("Conservative");
  const [activeEditIntents, setActiveEditIntents] = useState({ material: false, lighting: false, vfx: false });
  const [editBg, setEditBg] = useState("RealBlack");
  const [editRearExtrusion, setEditRearExtrusion] = useState("None");
  const [editIntent, setEditIntent] = useState("");
  const [editMaterial, setEditMaterial] = useState("HyperChrome");
  const [editWearLevel, setEditWearLevel] = useState("None");
  const [editRimColor, setEditRimColor] = useState("White");
  const [editRimIntensity, setEditRimIntensity] = useState("Moderate");
  const [editEnergyCore, setEditEnergyCore] = useState("GoldenDust");
  const [editFxOrigin, setEditFxOrigin] = useState("Edges");
  const [editFxIntensity, setEditFxIntensity] = useState("Moderate");
  const [editVfxPassMode, setEditVfxPassMode] = useState(false);

  // (motion 뷰 제거됨 — 영상 프롬프트는 Motion Matrix 앱이 담당.)

  // ===== derived: IR / compiled / audit / quality =====
  const [currentIR, setCurrentIR] = useState(null);
  // 예상 질감·느낌 요약 (한국어, 규칙 기반) — editor 뷰에서만 계산.
  const [feelSummary, setFeelSummary] = useState(null);
  const [compiledOutputs, setCompiledOutputs] = useState({ NanoBanana: "", ChatGPT: "", Midjourney: "" });
  const [optimizedPrompts, setOptimizedPrompts] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  const [optimizedPromptsKo, setOptimizedPromptsKo] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  const [auditIssues, setAuditIssues] = useState([]);
  const [qualityScores, setQualityScores] = useState({ structure: 100, material: 100, visibility: 100, fxControl: 100 });

  // ===== ui chrome =====
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTroubleshoots, setActiveTroubleshoots] = useState([]);
  const [troubleshootHistory, setTroubleshootHistory] = useState({});
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [tempIntent, setTempIntent] = useState("");

  // 연속 토스트 시 이전 타이머가 새 메시지를 조기 소멸시키는 레이스 방지 — 타이머를 ref 로 관리.
  const toastTimerRef = useRef(null);
  const showToast = (msg, ms = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), ms);
  };

  // ===== 드래프트 영속화 =====
  // 옵션 선택값 + 텍스트 입력만 스냅샷 — 이미지 dataURL/채팅/분석 결과/렌더 결과는 절대 제외 (quota).
  const draftSnapshot = useMemo(() => ({
    currentView,
    // creation 옵션
    directorPersona, typographyScale, cameraLens, background, frontRelief, projectionDepth,
    surfaceTreatment, enableVfx, enableShadow, energyCore, fxOrigin, fxIntensity,
    vfxPassMode, vfxPassOverlay, material, dramaticTex, surfaceDetail,
    rimThickness, wearLevel, rimColor, rimIntensity, enableGlint, renderEngine, userIntent,
    // edit 옵션
    editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent,
    editMaterial, editWearLevel, editRimColor, editRimIntensity,
    editEnergyCore, editFxOrigin, editFxIntensity, editVfxPassMode,
  }), [
    currentView, directorPersona, typographyScale, cameraLens, background, frontRelief, projectionDepth,
    surfaceTreatment, enableVfx, enableShadow, energyCore, fxOrigin, fxIntensity,
    vfxPassMode, vfxPassOverlay, material, dramaticTex, surfaceDetail,
    rimThickness, wearLevel, rimColor, rimIntensity, enableGlint, renderEngine, userIntent,
    editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent,
    editMaterial, editWearLevel, editRimColor, editRimIntensity,
    editEnergyCore, editFxOrigin, editFxIntensity, editVfxPassMode,
  ]);
  const draft = useDraftPersistence("nx:render-metrics:draft", draftSnapshot);
  // 저장본이 기본값과 동일하면 복원 배너를 숨김 — 아무것도 안 만진 세션의 자동 저장이
  // 다음 진입마다 배너를 띄우는 노이즈 방지. (마운트 첫 렌더의 draftSnapshot = 기본값)
  const draftDiffersFromDefaults = useMemo(() => {
    if (!draft.saved) return false;
    try { return JSON.stringify(draft.saved) !== JSON.stringify(draftSnapshot); } catch { return true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.saved]);
  const showRestoreDraft = draft.showRestore && draftDiffersFromDefaults;

  // 저장된 드래프트를 기존 setter 로 되살림 — 없는 필드는 건드리지 않음.
  const restoreDraft = () => {
    const s = draft.saved;
    if (!s) return;
    const apply = (val, setter) => { if (val !== undefined && val !== null) setter(val); };
    if (s.currentView === 'editor' || s.currentView === 'edit') setCurrentView(s.currentView);
    apply(s.directorPersona, setDirectorPersona);
    apply(s.typographyScale, setTypographyScale);
    apply(s.cameraLens, setCameraLens);
    apply(s.background, setBackground);
    apply(s.frontRelief, setFrontRelief);
    apply(s.projectionDepth, setProjectionDepth);
    apply(s.surfaceTreatment, setSurfaceTreatment);
    apply(s.enableVfx, setEnableVfx);
    apply(s.enableShadow, setEnableShadow);
    apply(s.energyCore, setEnergyCore);
    apply(s.fxOrigin, setFxOrigin);
    apply(s.fxIntensity, setFxIntensity);
    apply(s.vfxPassMode, setVfxPassMode);
    apply(s.vfxPassOverlay, setVfxPassOverlay);
    apply(s.material, setMaterial);
    apply(s.dramaticTex, setDramaticTex);
    apply(s.surfaceDetail, setSurfaceDetail);
    apply(s.rimThickness, setRimThickness);
    apply(s.wearLevel, setWearLevel);
    apply(s.rimColor, setRimColor);
    apply(s.rimIntensity, setRimIntensity);
    apply(s.enableGlint, setEnableGlint);
    apply(s.renderEngine, setRenderEngine);
    apply(s.userIntent, setUserIntent);
    apply(s.editBudget, setEditBudget);
    apply(s.activeEditIntents, setActiveEditIntents);
    apply(s.editBg, setEditBg);
    apply(s.editRearExtrusion, setEditRearExtrusion);
    apply(s.editIntent, setEditIntent);
    apply(s.editMaterial, setEditMaterial);
    apply(s.editWearLevel, setEditWearLevel);
    apply(s.editRimColor, setEditRimColor);
    apply(s.editRimIntensity, setEditRimIntensity);
    apply(s.editEnergyCore, setEditEnergyCore);
    apply(s.editFxOrigin, setEditFxOrigin);
    apply(s.editFxIntensity, setEditFxIntensity);
    apply(s.editVfxPassMode, setEditVfxPassMode);
    draft.dismiss();
    showToast('✨ 이전 드래프트를 복원했어요');
  };

  // ===== arc 추천 옵션 일괄 적용 =====
  // 파이프라인 자동 적용 + 사이드바 "추천 일괄 적용" 버튼이 같은 경로를 사용.
  const applyRecommendations = (rec) => {
    if (!rec) return;
    if (rec.material) setMaterial(rec.material);
    if (rec.frontRelief) setFrontRelief(rec.frontRelief);
    if (rec.surfaceTreatment) setSurfaceTreatment(rec.surfaceTreatment);
    if (rec.background) setBackground(rec.background);
    if (rec.energyCore) setEnergyCore(rec.energyCore);
    if (rec.surfaceDetail) setSurfaceDetail(rec.surfaceDetail);
  };

  // ===== arc payload effect — Gemini 로 추천 옵션 계산. mode==='edit' 이면 마이크로 에디트 뷰로 전환 + editImage 자동 임포트. =====
  useEffect(() => {
    if (!payload || payload.target !== 'render-metrics') return;
    if (!payload.timestamp) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const imgUrl = payload.image?.url || '';
    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const source = payload.source || 'unknown';
    const isPipeline = payload.mode === 'pipeline';
    const isEditMode = payload.mode === 'edit';
    const payloadTs = payload.timestamp;
    setTypographyLock(payload.typographyLock || null);

    (async () => {
      const mode = isPipeline ? 'pipeline' : isEditMode ? 'edit' : 'creation';
      setIncomingFromArc({ from: source, tags, text, hasImage: !!imgUrl, status: 'starting', mode });
      // 받은 프롬프트 텍스트를 ① Prompt Analyzer 에 프리필 — 붙여넣기 없이 바로 역분석(매핑) 가능.
      if (text) setImportPromptStr(text);
      try { clearPayload(); } catch {}
      // 파이프라인은 base image 가 없으면 자동 렌더가 불가능 → 실패 처리.
      if (!imgUrl) {
        setIncomingFromArc((s) => s ? { ...s, status: 'no-image' } : null);
        if (isPipeline) setAutoPipeline({ id: payloadTs, from: source, status: 'failed' });
        return;
      }
      setIsArcAnalyzing(true);
      setIncomingFromArc((s) => s ? { ...s, status: 'fetching' } : null);
      let dataUrl;
      let base64Data;
      try {
        if (imgUrl.startsWith('data:')) {
          dataUrl = imgUrl;
        } else {
          const res = await fetch(imgUrl, { mode: 'cors' });
          if (!res.ok) throw new Error(`이미지 fetch ${res.status}`);
          const blob = await res.blob();
          dataUrl = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result));
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        }
        base64Data = (dataUrl || '').split(',')[1];
      } catch (e) {
        console.error('[RenderMatrix] arc 이미지 다운로드 실패', e);
        setIsArcAnalyzing(false);
        setIncomingFromArc((s) => s ? { ...s, status: 'fetch-failed' } : null);
        if (isPipeline) setAutoPipeline({ id: payloadTs, from: source, status: 'failed' });
        return;
      }
      // edit — 마이크로 에디트 뷰 + editImage 로 임포트.
      // pipeline · creation(브리즈 등 일반 송신) — image-to-image 렌더 입력은 base image 이므로
      //   editor 뷰 + baseImage 로 임포트. (pipeline 은 이후 추천 옵션 자동 적용 + 자동 렌더까지 진행)
      if (isEditMode) {
        try {
          setCurrentView('edit');
          setAiModel('NanoBanana');
          setEditImage(dataUrl);
        } catch (e) { console.error('[RenderMatrix] edit 모드 전환 실패', e); }
      } else {
        try {
          setCurrentView('editor');
          setAiModel('NanoBanana');
          setBaseImage(dataUrl);
        } catch (e) { console.error('[RenderMatrix] base image 임포트 실패', e); }
      }
      // 크레딧 게이트 — 부족하면 자동 분석만 건너뛰고 이미지 임포트는 유지 (수신 흐름은 계속).
      if (!(await ensureCanGenerate('analysis'))) {
        showToast('크레딧이 부족해 자동 분석을 건너뛰었어요');
        setIsArcAnalyzing(false);
        setIncomingFromArc((s) => s ? { ...s, status: 'analyze-failed', errorMessage: '크레딧 부족' } : null);
        // 파이프라인은 분석 실패 시와 동일하게 기본 옵션으로 렌더를 진행.
        if (isPipeline) {
          autoPipelineReadyPendingRef.current = true;
          setAutoPipeline({ id: payloadTs, from: source, status: 'preparing' });
        }
        return;
      }
      setIncomingFromArc((s) => s ? { ...s, status: 'analyzing' } : null);
      try {
        const parsed = await analyzeArcImage(base64Data, appOptions, tags, text);
        const filterId = (val, list) => list.some(o => o.id === val) ? val : null;
        const rec = {
          summary: parsed.summary || '',
          material: filterId(parsed.material, appOptions.materials),
          frontRelief: filterId(parsed.frontRelief, appOptions.frontReliefs),
          surfaceTreatment: filterId(parsed.surfaceTreatment, appOptions.surfaceTreatments),
          background: filterId(parsed.background, appOptions.backgrounds),
          energyCore: filterId(parsed.energyCore, appOptions.energyCores),
          surfaceDetail: filterId(parsed.surfaceDetail, appOptions.surfaceDetails),
        };
        setArcRecommended(rec);
        // 파이프라인 — 추천 옵션을 실제 상태에 자동 적용 (수동 "적용" 클릭 없이 렌더에 반영).
        if (isPipeline) applyRecommendations(rec);
        setIncomingFromArc((s) => s ? { ...s, status: 'done', summary: parsed.summary } : null);
      } catch (e) {
        console.error('[RenderMatrix] arc 추천 분석 실패', e);
        setIncomingFromArc((s) => s ? { ...s, status: 'analyze-failed', errorMessage: e.message } : null);
        // 분석 실패해도 파이프라인은 기본 옵션으로 렌더를 진행한다.
      } finally {
        setIsArcAnalyzing(false);
        // 파이프라인: 옵션 적용 직후 ready 신호. 실제 ready 전환은 compile effect 가
        // 최신 옵션으로 프롬프트를 재컴파일한 뒤 수행 (autoPipelineReadyPendingRef).
        if (isPipeline) {
          autoPipelineReadyPendingRef.current = true;
          setAutoPipeline({ id: payloadTs, from: source, status: 'preparing' });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.timestamp, payload?.target]);

  // ===== AI helpers (with shared state cleanup) =====
  const resetOptimized = () => {
    setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  };

  const applyAnalyzedOptions = (parsed) => {
    if (parsed.new_options && parsed.new_options.length > 0) {
      setAppOptions(prev => {
        const next = { ...prev };
        parsed.new_options.forEach(opt => {
          if (next[opt.category] && !next[opt.category].find(o => o.id === opt.id)) {
            next[opt.category] = [...next[opt.category], { id: opt.id, name: `✨ ${opt.name}`, en: opt.en }];
          }
        });
        return next;
      });
    }
    const so = parsed.selected_options;
    if (so.material) setMaterial(so.material);
    if (so.surfaceDetail) setSurfaceDetail(so.surfaceDetail);
    if (so.dramaticTex) setDramaticTex(so.dramaticTex);
    if (so.wearLevel) setWearLevel(so.wearLevel);
    if (so.frontRelief) setFrontRelief(so.frontRelief);
    if (so.projectionDepth) setProjectionDepth(so.projectionDepth);
    if (so.energyCore) setEnergyCore(so.energyCore);
    if (so.enableVfx !== undefined) setEnableVfx(so.enableVfx);
    if (so.enableShadow !== undefined) setEnableShadow(so.enableShadow);
    if (so.rimIntensity) setRimIntensity(so.rimIntensity);
    if (so.rimColor) setRimColor(so.rimColor);
    if (parsed.custom_intent) setUserIntent(parsed.custom_intent);
  };

  const handleAnalyzeReference = async () => {
    if (!referenceImage) return;
    if (!(await ensureCanGenerate('analysis'))) return;
    setIsAnalyzingRef(true);
    try {
      const parsed = await analyzeReferenceImage(referenceImage, appOptions);
      if (parsed && parsed.selected_options) {
        applyAnalyzedOptions(parsed);
        showToast("✨ 레퍼런스 분석 및 동적 옵션 생성 완료!", 4000);
      }
    } catch (e) { console.error(e); showToast("❌ 이미지 분석에 실패했습니다."); }
    finally { setIsAnalyzingRef(false); }
  };

  const handleAnalyzePrompt = async () => {
    if (!importPromptStr.trim()) return;
    if (!(await ensureCanGenerate('analysis'))) return;
    setIsAnalyzingPrompt(true);
    try {
      const parsed = await analyzePromptText(importPromptStr, appOptions);
      if (parsed && parsed.selected_options) {
        applyAnalyzedOptions(parsed);
        setImportPromptStr("");
        showToast("✨ 프롬프트 역설계 매핑 완료!", 4000);
      }
    } catch (e) { console.error(e); showToast("❌ 프롬프트 분석에 실패했습니다."); }
    finally { setIsAnalyzingPrompt(false); }
  };

  const handleOptimizePrompt = async () => {
    if (!currentIR) {
      showToast("⚠️ 옵션을 먼저 설정해주세요. 베이스 프롬프트가 비어있습니다.");
      return;
    }
    const basePrompt = compiledOutputs[aiModel];
    if (!basePrompt) {
      showToast("⚠️ 현재 모델의 베이스 프롬프트가 비어있습니다.");
      return;
    }
    // 사용 한도/권한 체크. LIMIT_EXCEEDED 는 모달이 뜨지만 그 외(NO_PROFILE 등) 은 silent fail 이었음 → 토스트로 명시.
    const canGen = await ensureCanGenerate();
    if (!canGen) {
      // ensureCanGenerate 가 false 면 (1) LIMIT 모달이 떴거나 (2) NO_PROFILE 등 콘솔 warn.
      // 모달이 뜬 케이스는 사용자가 인지하므로, 그 외 케이스에 한정해 안내.
      showToast("⚠️ 사용 권한을 확인할 수 없습니다. 로그인 상태를 확인해 주세요.");
      return;
    }
    setIsOptimizing(true);
    try {
      const isVfxPass = currentIR.vfxPassMode === true;
      const isOrthographic = currentIR.camera_and_depth?.isFlat2D || currentIR.camera_and_depth?.isMinimal || currentIR.constraints?.extrusion?.includes("MINIMAL");
      const currentIntentText = currentView === 'editor' ? userIntent : editIntent;
      console.log('[RenderMatrix] optimize start', { aiModel, baseLen: basePrompt.length, isVfxPass, isOrthographic });
      const parsed = await optimizePrompt({
        aiModel,
        basePrompt,
        currentIntentText,
        isVfxPass, isOrthographic,
      });
      if (!parsed) {
        console.warn('[RenderMatrix] optimize returned null (response parse failed)');
        showToast("❌ AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      if (!parsed.en) {
        console.warn('[RenderMatrix] optimize parsed but `en` missing', parsed);
        showToast("❌ 최적화 결과가 비어있습니다.");
        return;
      }
      // 가드: 옵티마이저가 negative 섹션을 통째로 누락하는 사고가 자주 발생.
      // negative 가드(plaque/배경판/면적 점유 차단 태그)가 빠지면 결과가 무너지므로 원본에서 복원.
      let finalEn = parsed.en;
      const nanoMarker = '\n\nNegative prompt:';
      const mjMarker = '--no ';
      if (basePrompt.includes(nanoMarker) && !finalEn.includes('Negative prompt:')) {
        const original = basePrompt.split(nanoMarker)[1] || '';
        finalEn = `${finalEn.trim()}${nanoMarker}${original}`;
        console.warn('[RenderMatrix] optimizer dropped Negative prompt section — restored from base');
        showToast('⚠️ Negative 가드가 누락돼 원본으로 복원했어요');
      } else if (basePrompt.includes(mjMarker) && !finalEn.includes(mjMarker)) {
        const original = basePrompt.slice(basePrompt.indexOf(mjMarker));
        finalEn = `${finalEn.trim()} ${original}`;
        console.warn('[RenderMatrix] optimizer dropped --no flag — restored from base');
        showToast('⚠️ Midjourney --no 가드가 누락돼 원본으로 복원했어요');
      }
      // 형태 락 복원 가드 — 옵티마이저가 형태 보존 태그를 지우면 레터폼이 다른 폰트로
      // 교체되는 사고. Negative 복원과 동일한 방어선 (ABSOLUTE RULE F 의 클라이언트 백업).
      const SHAPE_LOCK_MARK = 'exact original letterform silhouette';
      if (basePrompt.includes(SHAPE_LOCK_MARK) && !finalEn.includes(SHAPE_LOCK_MARK)) {
        const lockTags = "(exact original letterform silhouette from the input image:1.5), (strict shape preservation lock:1.4), (preserve every serif, flourish and decorative detail of the original letterforms:1.45), (final rule — letterform shapes identical to the input image, restyle nothing:1.4)";
        const negIdx = finalEn.indexOf('\n\nNegative prompt:');
        finalEn = negIdx >= 0 ? `${finalEn.slice(0, negIdx)}, ${lockTags}${finalEn.slice(negIdx)}` : `${finalEn.trim()}, ${lockTags}`;
        console.warn('[RenderMatrix] optimizer dropped shape locks — restored from base');
        showToast('⚠️ 형태 락이 누락돼 복원했어요');
      }
      setOptimizedPrompts(prev => ({ ...prev, [aiModel]: finalEn }));
      if (parsed.ko) setOptimizedPromptsKo(prev => ({ ...prev, [aiModel]: parsed.ko }));
      showToast("✨ AI 최적화 완료!", 4000);
    } catch (e) {
      console.error('[RenderMatrix] optimize failed', e);
      showToast(`❌ 최적화 실패: ${e?.message || e}`);
    } finally { setIsOptimizing(false); }
  };

  // PromptAudit 의 conflict-resolution 로직을 inline 으로 적용 — 충돌·중복·모호 토큰을 제거해
  // 짧고 명확한 프롬프트로 압축한다. 결과는 optimizedPrompts[aiModel] 에 저장 (기존 AI 최적화 결과를 덮어씀).
  // Negative prompt / --no 가드는 옵티마이저와 동일하게 원본에서 복원.
  const handleCompressPrompt = async () => {
    const basePrompt = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
    if (!basePrompt) {
      showToast("⚠️ 압축할 프롬프트가 없습니다.");
      return;
    }
    const canGen = await ensureCanGenerate('analysis');
    if (!canGen) {
      showToast("⚠️ 사용 권한을 확인할 수 없습니다.");
      return;
    }
    setIsCompressing(true);
    try {
      const result = await compressPrompt(basePrompt, 'render-metrics');
      let finalEn = result.improvedPrompt || basePrompt;
      // Negative / --no 가드 — 옵티마이저와 동일한 복원 로직.
      const nanoMarker = '\n\nNegative prompt:';
      const mjMarker = '--no ';
      if (basePrompt.includes(nanoMarker) && !finalEn.includes('Negative prompt:')) {
        const original = basePrompt.split(nanoMarker)[1] || '';
        finalEn = `${finalEn.trim()}${nanoMarker}${original}`;
        console.warn('[RenderMatrix] compressor dropped Negative prompt — restored');
      } else if (basePrompt.includes(mjMarker) && !finalEn.includes(mjMarker)) {
        const original = basePrompt.slice(basePrompt.indexOf(mjMarker));
        finalEn = `${finalEn.trim()} ${original}`;
        console.warn('[RenderMatrix] compressor dropped --no flag — restored');
      }
      // 압축이 실제로 줄었을 때만 적용.
      if (finalEn.length < basePrompt.length) {
        setOptimizedPrompts(prev => ({ ...prev, [aiModel]: finalEn }));
        const conflictCount = result.conflicts?.length || 0;
        const conflictTail = conflictCount > 0 ? ` · 충돌 ${conflictCount}건 정리` : '';
        showToast(`✨ 압축 완료 — ${result.savedChars}자 감소 (${result.savedPct}%)${conflictTail}`, 4000);
      } else {
        showToast("프롬프트가 이미 충분히 간결합니다.", 3000);
      }
    } catch (e) {
      console.error('[RenderMatrix] compress failed', e);
      showToast(`❌ 압축 실패: ${e?.message || e}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleExpandIntent = async () => {
    const text = currentView === 'editor' ? userIntent : editIntent;
    if (!text) { showToast("⚠️ 확장할 키워드나 아이디어를 먼저 입력해주세요."); return; }
    if (!(await ensureCanGenerate('analysis'))) return;
    setIsExpandingIntent(true);
    try {
      const result = await expandIntent(text, currentView === 'editor');
      if (result) currentView === 'editor' ? setUserIntent(result.trim()) : setEditIntent(result.trim());
    } catch { showToast("❌ 구체화 통신에 실패했습니다."); }
    finally { setIsExpandingIntent(false); }
  };

  const openChatModal = () => {
    const text = currentView === 'editor' ? userIntent : editIntent;
    setTempIntent(text);
    setChatMessages([{ role: 'model', text: text ? `현재 의도: "${text}"\n어떤 부분을 더 추가하거나 수정하고 싶으신가요?` : "어떤 분위기나 느낌을 원하시는지 자유롭게 말씀해 주세요!" }]);
    setIsChatModalOpen(true);
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    if (!(await ensureCanGenerate('analysis'))) return;
    const newMessages = [...chatMessages, { role: 'user', text: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatting(true);
    try {
      const parsed = await chatTuningMessage(newMessages);
      if (parsed && parsed.message && parsed.updated_intent) {
        setChatMessages([...newMessages, { role: 'model', text: parsed.message }]);
        setTempIntent(parsed.updated_intent);
      }
    } catch (e) {
      console.error(e);
      setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]);
    } finally { setIsChatting(false); }
  };

  const applyChatIntent = () => {
    currentView === 'editor' ? setUserIntent(tempIntent) : setEditIntent(tempIntent);
    setIsChatModalOpen(false);
  };

  // ===== compile orchestrator =====
  useEffect(() => {
    // 컴파일 입력이 바뀌면 이전 AI 최적화 결과는 무효 — 옛 베이스로 만든 최적화본이
    // compiled 보다 우선 사용되면서(promptText = optimized || compiled) 컴파일러 개선이
    // 렌더에 반영되지 않던 근본 원인 (첫 줄 반복·줌·구형 표현 재발 사례).
    setOptimizedPrompts({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    setOptimizedPromptsKo({ NanoBanana: null, ChatGPT: null, Midjourney: null });
    const s = {
      currentView,
      directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment,
      energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity,
      enableGlint, background, renderEngine, userIntent, imageRatio,
      fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, vfxPassOverlay, enableVfx, enableShadow,
      editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent,
      editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity,
    };
    if (currentView === "editor") {
      const ir = generateIR(s, appOptions);
      setCurrentIR(ir);
      const lockSuffix = typographyLock?.exactText ? `\n\n[TYPOGRAPHY CONTENT LOCK — ABSOLUTE]\nExact text: ${JSON.stringify(typographyLock.exactText)}\nExact rows: ${JSON.stringify(typographyLock.lines || [])}\nPreserve spelling, row count, line breaks, glyph silhouettes, spacing, and approved composition exactly. Change material, depth, lighting, and FX only.` : '';
      setCompiledOutputs({ NanoBanana: compileNanoBanana(ir, s) + lockSuffix, ChatGPT: compileChatGPT(ir, s) + lockSuffix, Midjourney: compileMidjourney(ir, s) + lockSuffix });
      setFeelSummary(buildFeelSummary(s, appOptions));
    } else if (currentView === "edit") {
      const ir = generateEditIR(s, appOptions);
      setCurrentIR(ir);
      setCompiledOutputs({
        NanoBanana: !editImage ? "Target 이미지를 업로드해주세요." : compileEditNanoBanana(ir, s),
        ChatGPT: !editImage ? "Target 이미지를 업로드해주세요." : compileEditChatGPT(ir),
        Midjourney: !editImage ? "Target 이미지를 업로드해주세요." : compileEditMidjourney(ir, s),
      });
    }
    setAuditIssues(performLogicAudit(s));
    setQualityScores(calculateQualityScore(s));

    // 파이프라인: 옵션이 반영된 최신 compiledOutputs 가 만들어진 직후 ready 로 전환.
    // (autoPipeline?.id 를 deps 에 포함해 파이프라인 시작 시 이 effect 가 반드시 1회 재실행되도록 보장 —
    //  추천 옵션이 모두 기존값과 같아 다른 dep 이 안 바뀌는 경우에도 ready 신호가 누락되지 않음.)
    if (autoPipelineReadyPendingRef.current) {
      autoPipelineReadyPendingRef.current = false;
      setAutoPipeline((s2) => (s2 ? { ...s2, status: 'ready' } : null));
    }
  }, [directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, fxOrigin, fxIntensity, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, imageRatio, currentView, editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent, surfaceDetail, vfxPassMode, vfxPassOverlay, enableVfx, enableShadow, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity, appOptions, autoPipeline?.id, typographyLock]);

  // ===== send to Motion Metrics =====
  const sendToMotion = () => {
    const text = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
    if (!text) return;
    const styleParts = [];
    const findName = (data, id) => data?.find?.(o => o.id === id)?.name;
    const m = findName(appOptions.materials, material); if (m) styleParts.push(`material:${m}`);
    const fr = findName(appOptions.frontReliefs, frontRelief); if (fr) styleParts.push(`relief:${fr}`);
    const ec = findName(appOptions.energyCores, energyCore); if (ec && energyCore !== 'None') styleParts.push(`fx:${ec}`);
    const bg = findName(appOptions.backgrounds, background); if (bg) styleParts.push(`bg:${bg}`);
    navigate('motion-metrics', {
      source: 'render-metrics', target: 'motion-metrics',
      prompt: { text, tags: ['Render', material, energyCore].filter(Boolean), style: styleParts.join(' · ') },
      image: { url: '', metadata: {} },
      params: { fromModel: aiModel },
    });
  };

  const sendToMaskForge = (imageUrl) => {
    if (!imageUrl) return;
    navigate('mask-forge', {
      source: 'render-metrics', target: 'mask-forge', timestamp: Date.now(),
      image: { url: imageUrl, metadata: { from: 'RenderMatrix', background } },
      params: { method: 'luma', keyColor: background === 'RealBlack' ? '#000000' : undefined, removeAiFallback: true },
      typographyLock,
    });
  };

  const copyToClipboard = () => {
    const text = optimizedPrompts[aiModel] || compiledOutputs[aiModel];
    if (!text) return;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }
    catch (err) { console.error("클립보드 복사 실패", err); }
    document.body.removeChild(textArea);
  };

  return {
    // misc
    usageModal, ensureCanGenerate,
    // view / model / options
    currentView, setCurrentView,
    aiModel, setAiModel,
    appOptions, setAppOptions,
    // creation state
    directorPersona, setDirectorPersona,
    typographyScale, setTypographyScale,
    cameraLens, setCameraLens,
    background, setBackground,
    frontRelief, setFrontRelief,
    projectionDepth, setProjectionDepth,
    surfaceTreatment, setSurfaceTreatment,
    enableVfx, setEnableVfx,
    enableShadow, setEnableShadow,
    energyCore, setEnergyCore,
    fxOrigin, setFxOrigin,
    fxIntensity, setFxIntensity,
    vfxPassMode, setVfxPassMode,
    vfxPassOverlay, setVfxPassOverlay,
    material, setMaterial,
    dramaticTex, setDramaticTex,
    surfaceDetail, setSurfaceDetail,
    rimThickness, setRimThickness,
    wearLevel, setWearLevel,
    rimColor, setRimColor,
    rimIntensity, setRimIntensity,
    enableGlint, setEnableGlint,
    renderEngine, setRenderEngine,
    userIntent, setUserIntent,
    // analyzer
    referenceImage, setReferenceImage,
    isAnalyzingRef,
    importPromptStr, setImportPromptStr,
    isAnalyzingPrompt,
    handleAnalyzeReference, handleAnalyzePrompt,
    // base image (image-to-image 렌더 입력)
    baseImage, setBaseImage,
    // arc
    incomingFromArc, setIncomingFromArc,
    typographyLock,
    arcRecommended, setArcRecommended,
    isArcAnalyzing,
    // 완전 자동 파이프라인
    autoPipeline, setAutoPipeline,
    // arc 추천 일괄 적용 (파이프라인 + 사이드바 버튼 공용)
    applyRecommendations,
    // 드래프트 영속화
    draft, restoreDraft, showRestoreDraft,
    // edit
    editImage, setEditImage,
    editBudget, setEditBudget,
    activeEditIntents, setActiveEditIntents,
    editBg, setEditBg,
    editRearExtrusion, setEditRearExtrusion,
    editIntent, setEditIntent,
    editMaterial, setEditMaterial,
    editWearLevel, setEditWearLevel,
    editRimColor, setEditRimColor,
    editRimIntensity, setEditRimIntensity,
    editEnergyCore, setEditEnergyCore,
    editFxOrigin, setEditFxOrigin,
    editFxIntensity, setEditFxIntensity,
    editVfxPassMode, setEditVfxPassMode,
    // derived
    currentIR, compiledOutputs, optimizedPrompts, optimizedPromptsKo,
    auditIssues, qualityScores, feelSummary,
    // ai actions
    isOptimizing, handleOptimizePrompt,
    isCompressing, handleCompressPrompt,
    handleExpandIntent, isExpandingIntent,
    isChatModalOpen, setIsChatModalOpen,
    chatMessages, chatInput, setChatInput,
    isChatting, tempIntent,
    openChatModal, handleSendChatMessage, applyChatIntent,
    // ui chrome
    isCopied, copyToClipboard,
    toastMsg, showToast,
    activeTroubleshoots, setActiveTroubleshoots,
    troubleshootHistory, setTroubleshootHistory,
    resetOptimized,
    sendToMotion, sendToMaskForge,
  };
}
