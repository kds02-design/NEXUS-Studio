import { useState, useEffect, useRef } from "react";
import { useGlobal } from "../../../context/GlobalContext";
import { useUsageGate } from "../../../components/UsageGate";
import { INITIAL_OPTIONS } from "../constants/materials";
import {
  generateIR, generateEditIR, generateMotionIR,
  compileNanoBanana, compileChatGPT, compileMidjourney,
  compileEditNanoBanana, compileEditChatGPT, compileEditMidjourney,
  compileVeo, compileRunway, compileLuma, compileSequence,
  performLogicAudit, calculateQualityScore,
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

  // ===== motion state =====
  const [motionImage, setMotionImage] = useState(null);
  const [cameraMotion, setCameraMotion] = useState("Static");
  const [vfxDynamics, setVfxDynamics] = useState("Flowing");
  const [motionIntent, setMotionIntent] = useState("");

  // ===== derived: IR / compiled / audit / quality =====
  const [currentIR, setCurrentIR] = useState(null);
  const [compiledOutputs, setCompiledOutputs] = useState({ NanoBanana: "", ChatGPT: "", Midjourney: "", Veo: "", Runway: "", Luma: "", Sequence: "" });
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

  const showToast = (msg, ms = 3000) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), ms); };

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

    (async () => {
      const mode = isPipeline ? 'pipeline' : isEditMode ? 'edit' : 'creation';
      setIncomingFromArc({ from: source, tags, text, hasImage: !!imgUrl, status: 'starting', mode });
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
        if (isPipeline) {
          if (rec.material) setMaterial(rec.material);
          if (rec.frontRelief) setFrontRelief(rec.frontRelief);
          if (rec.surfaceTreatment) setSurfaceTreatment(rec.surfaceTreatment);
          if (rec.background) setBackground(rec.background);
          if (rec.energyCore) setEnergyCore(rec.energyCore);
          if (rec.surfaceDetail) setSurfaceDetail(rec.surfaceDetail);
        }
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
      const isOrthographic = currentIR.camera_and_depth?.isMinimal || currentIR.constraints?.extrusion?.includes("MINIMAL");
      const currentIntentText = currentView === 'editor' ? userIntent : (currentView === 'edit' ? editIntent : motionIntent);
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
    const s = {
      currentView,
      directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment,
      energyCore, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity,
      enableGlint, background, renderEngine, userIntent, imageRatio,
      fxOrigin, fxIntensity, surfaceDetail, vfxPassMode, enableVfx, enableShadow,
      editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent,
      editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity,
      motionImage, cameraMotion, vfxDynamics, motionIntent,
    };
    if (currentView === "editor") {
      const ir = generateIR(s, appOptions);
      setCurrentIR(ir);
      setCompiledOutputs({ NanoBanana: compileNanoBanana(ir, s), ChatGPT: compileChatGPT(ir, s), Midjourney: compileMidjourney(ir, s) });
    } else if (currentView === "edit") {
      const ir = generateEditIR(s, appOptions);
      setCurrentIR(ir);
      setCompiledOutputs({
        NanoBanana: !editImage ? "Target 이미지를 업로드해주세요." : compileEditNanoBanana(ir, s),
        ChatGPT: !editImage ? "Target 이미지를 업로드해주세요." : compileEditChatGPT(ir),
        Midjourney: !editImage ? "Target 이미지를 업로드해주세요." : compileEditMidjourney(ir, s),
      });
    } else if (currentView === "motion") {
      const ir = generateMotionIR(s, appOptions);
      setCurrentIR(ir);
      setCompiledOutputs({
        Veo: !motionImage ? "Target 이미지를 업로드해주세요." : compileVeo(ir),
        Runway: !motionImage ? "Target 이미지를 업로드해주세요." : compileRunway(ir),
        Luma: !motionImage ? "Target 이미지를 업로드해주세요." : compileLuma(ir),
        Sequence: !motionImage ? "Target 이미지를 업로드해주세요." : compileSequence(ir),
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
  }, [directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, fxOrigin, fxIntensity, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, imageRatio, currentView, editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent, surfaceDetail, vfxPassMode, enableVfx, enableShadow, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity, motionImage, cameraMotion, vfxDynamics, motionIntent, appOptions, autoPipeline?.id]);

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
    arcRecommended, setArcRecommended,
    isArcAnalyzing,
    // 완전 자동 파이프라인
    autoPipeline, setAutoPipeline,
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
    // motion
    motionImage, setMotionImage,
    cameraMotion, setCameraMotion,
    vfxDynamics, setVfxDynamics,
    motionIntent, setMotionIntent,
    // derived
    currentIR, compiledOutputs, optimizedPrompts, optimizedPromptsKo,
    auditIssues, qualityScores,
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
    sendToMotion,
  };
}
