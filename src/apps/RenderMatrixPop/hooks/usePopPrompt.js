import { useState, useEffect } from "react";
import { INITIAL_OPTIONS } from "../constants/categories";
import {
  generateIR, generateEditIR, generateMotionIR,
  compileNanoBanana, compileChatGPT, compileMidjourney,
  compileEditNanoBanana, compileEditChatGPT, compileEditMidjourney,
  compileVeo, compileRunway, compileLuma, compileSequence,
  performLogicAudit, calculateQualityScore,
} from "../services/promptCompiler";
import {
  analyzeReferenceImage, analyzePromptText,
  optimizePrompt, expandIntent, chatTuningMessage,
} from "../services/gemini";

// Pop 전용 메인 state + IR/compile orchestrator.
// RenderMatrix 의 useRenderPrompt 와 비교 시:
//   - usageGate / useGlobal payload 없음 (Pop 은 독립적)
//   - 초기 currentView 가 "editor" (생성 모드 — 신규 사용자 진입 시 첫 화면)
//   - sendToMotion 도 없음 (copy 만 노출)
export function usePopPrompt() {
  // ===== view / model / options =====
  const [currentView, setCurrentView] = useState("editor");
  const [aiModel, setAiModel] = useState("NanoBanana");
  const [appOptions, setAppOptions] = useState(INITIAL_OPTIONS);

  // ===== creation (editor) state =====
  const [directorPersona, setDirectorPersona] = useState("Chameleon");
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

  // ===== analyzer =====
  // referenceImage — 사이드바의 "레퍼런스 이미지". 스타일/옵션 분석 입력.
  // baseImage — 우측 결과 패널의 "기본 이미지". Imagen 렌더링의 base(image-to-image) 입력.
  // 두 슬롯을 분리해 사용 — 분석용과 렌더용을 다른 이미지로 다룰 수 있도록.
  const [referenceImage, setReferenceImage] = useState(null);
  const [baseImage, setBaseImage] = useState(null);
  const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);
  const [importPromptStr, setImportPromptStr] = useState("");
  const [isAnalyzingPrompt, setIsAnalyzingPrompt] = useState(false);

  // ===== edit state =====
  const [editImage, setEditImage] = useState(null);
  const [editBudget, setEditBudget] = useState("SilhouetteTrace");
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

  // ===== derived =====
  const [currentIR, setCurrentIR] = useState(null);
  const [compiledOutputs, setCompiledOutputs] = useState({ NanoBanana: "", ChatGPT: "", Midjourney: "", Veo: "", Runway: "", Luma: "", Sequence: "" });
  const [optimizedPrompts, setOptimizedPrompts] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  const [optimizedPromptsKo, setOptimizedPromptsKo] = useState({ NanoBanana: null, ChatGPT: null, Midjourney: null });
  const [auditIssues, setAuditIssues] = useState([]);
  const [qualityScores, setQualityScores] = useState({ structure: 100, material: 100, visibility: 100, fxControl: 100 });

  // ===== ui chrome =====
  const [isOptimizing, setIsOptimizing] = useState(false);
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
    const so = parsed.selected_options || {};
    // 2D 평면 레퍼런스면 입체 가정을 강제 차단 — AI 가 selected_options 를 누락하거나
    // 매끈한 값으로 잘못 잡아도 클라이언트에서 그런지/디스트레스 표현이 보존되도록 보정.
    const is2DFlat = !!parsed.is2DFlat;
    if (so.directorPersona) setDirectorPersona(so.directorPersona);

    // material — AI 가 new_options 에 평면 페인트/그런지 material 을 만들면 그 ID 로 자동 선택.
    // selected_options.material 이 누락된 경우의 폴백.
    const materialNewOpt = (parsed.new_options || []).find(o => o.category === 'materials');
    if (so.material) setMaterial(so.material);
    else if (materialNewOpt) setMaterial(materialNewOpt.id);

    // surfaceDetail — 2D 평면 + "Clean"(매끈 강제) 조합은 모순. 그런지 보존 위해 "High" 로 승격.
    //   "perfectly smooth, flawless clean surface, absolutely NO scratches" 가 prompt 에 들어가면
    //   분석이 잡아준 페인트/스크래치 텍스처를 완전히 무효화함.
    if (is2DFlat) {
      if (!so.surfaceDetail || so.surfaceDetail === "Clean") setSurfaceDetail("High");
      else setSurfaceDetail(so.surfaceDetail);
    } else if (so.surfaceDetail) setSurfaceDetail(so.surfaceDetail);

    // dramaticTex — 2D 평면 + "None"("flawless polished uniform material") 도 마찬가지 모순.
    //   AI 가 새 텍스처 옵션을 만들었으면 우선 사용, 아니면 기존 그런지 옵션(AncientErosion)으로 강제.
    const dramaticTexNewOpt = (parsed.new_options || []).find(o => o.category === 'dramaticTextures');
    if (is2DFlat) {
      if (dramaticTexNewOpt) setDramaticTex(dramaticTexNewOpt.id);
      else if (so.dramaticTex && so.dramaticTex !== "None") setDramaticTex(so.dramaticTex);
      else setDramaticTex("AncientErosion"); // 그런지/페인트 디스트레스 톤 보존
    } else if (so.dramaticTex) setDramaticTex(so.dramaticTex);

    // wearLevel — 2D 평면 + "None"(Pristine) 도 디스트레스 표현과 충돌. 최소 MicroScratches.
    if (is2DFlat) {
      if (so.wearLevel && so.wearLevel !== "None") setWearLevel(so.wearLevel);
      else setWearLevel("MicroScratches");
    } else if (so.wearLevel) setWearLevel(so.wearLevel);

    if (so.frontRelief) setFrontRelief(so.frontRelief);
    else if (is2DFlat) setFrontRelief("Flat");
    if (so.projectionDepth) setProjectionDepth(so.projectionDepth);
    else if (is2DFlat) setProjectionDepth("None");
    if (so.energyCore) setEnergyCore(so.energyCore);
    if (so.enableVfx !== undefined) setEnableVfx(so.enableVfx);
    if (so.enableShadow !== undefined) setEnableShadow(so.enableShadow);
    else if (is2DFlat) setEnableShadow(false);
    if (so.rimIntensity) setRimIntensity(so.rimIntensity);
    if (so.rimColor) setRimColor(so.rimColor);
    // editBudget — 2D 면 SilhouetteTrace 강제(입체 추출 방지). 3D 면 모델 응답 그대로(없으면 유지).
    if (so.editBudget) setEditBudget(so.editBudget);
    else if (is2DFlat) setEditBudget("SilhouetteTrace");
    if (parsed.custom_intent) setUserIntent(parsed.custom_intent);
  };

  const handleAnalyzeReference = async () => {
    if (!referenceImage) {
      // 프리셋(ref_copy)이나 사이드바 분석 버튼 어디서 호출되든 일관된 안내.
      showToast("📷 사이드바 \"레퍼런스 이미지\" 슬롯에 이미지를 먼저 등록하세요.", 4000);
      return;
    }
    setIsAnalyzingRef(true);
    try {
      const parsed = await analyzeReferenceImage(referenceImage, appOptions);
      if (parsed && parsed.selected_options) {
        applyAnalyzedOptions(parsed);
        showToast("✨ 레퍼런스 분석 및 완벽 복제 세팅 완료!", 4000);
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
    if (!currentIR) return;
    setIsOptimizing(true);
    try {
      const isVfxPass = currentIR.vfxPassMode === true;
      const isOrthographic = currentIR.camera_and_depth?.isMinimal || currentIR.constraints?.extrusion?.includes("MINIMAL");
      const isChameleon = currentIR._meta?.persona?.id === "Chameleon" || currentIR.budget?.id === "StyleTransfer";
      const isSilhouetteTrace = currentIR.budget?.id === "SilhouetteTrace";
      const currentIntentText = currentView === 'editor' ? userIntent : (currentView === 'edit' ? editIntent : motionIntent);
      const parsed = await optimizePrompt({
        aiModel, basePrompt: compiledOutputs[aiModel],
        currentIntentText, isVfxPass, isOrthographic, isChameleon, isSilhouetteTrace,
      });
      if (parsed && parsed.en) {
        setOptimizedPrompts(prev => ({ ...prev, [aiModel]: parsed.en }));
        if (parsed.ko) setOptimizedPromptsKo(prev => ({ ...prev, [aiModel]: parsed.ko }));
        showToast("✨ AI 최적화 완료!", 4000);
      }
    } catch (e) { console.error(e); showToast("❌ 최적화 중 오류가 발생했습니다."); }
    finally { setIsOptimizing(false); }
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
    } catch (e) { console.error(e); setChatMessages([...newMessages, { role: 'model', text: "오류가 발생했습니다." }]); }
    finally { setIsChatting(false); }
  };

  const applyChatIntent = () => {
    currentView === 'editor' ? setUserIntent(tempIntent) : setEditIntent(tempIntent);
    setIsChatModalOpen(false);
  };

  // compile orchestrator
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
  }, [directorPersona, complexity, typographyScale, cameraLens, frontRelief, projectionDepth, surfaceTreatment, energyCore, fxOrigin, fxIntensity, material, materialInt, dramaticTex, wearLevel, rimMaterial, rimThickness, rimColor, rimIntensity, enableGlint, background, renderEngine, userIntent, imageRatio, currentView, editImage, editBudget, activeEditIntents, editBg, editRearExtrusion, editIntent, surfaceDetail, vfxPassMode, enableVfx, enableShadow, editVfxPassMode, editMaterial, editWearLevel, editRimColor, editRimIntensity, editEnergyCore, editFxOrigin, editFxIntensity, motionImage, cameraMotion, vfxDynamics, motionIntent, appOptions]);

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
    currentView, setCurrentView, aiModel, setAiModel, appOptions, setAppOptions,
    directorPersona, setDirectorPersona, typographyScale, setTypographyScale,
    cameraLens, setCameraLens, background, setBackground, frontRelief, setFrontRelief,
    projectionDepth, setProjectionDepth, surfaceTreatment, setSurfaceTreatment,
    enableVfx, setEnableVfx, enableShadow, setEnableShadow,
    energyCore, setEnergyCore, fxOrigin, setFxOrigin, fxIntensity, setFxIntensity,
    vfxPassMode, setVfxPassMode, material, setMaterial, dramaticTex, setDramaticTex,
    surfaceDetail, setSurfaceDetail, rimThickness, setRimThickness, wearLevel, setWearLevel,
    rimColor, setRimColor, rimIntensity, setRimIntensity, enableGlint, setEnableGlint,
    renderEngine, setRenderEngine, userIntent, setUserIntent,
    referenceImage, setReferenceImage, isAnalyzingRef,
    baseImage, setBaseImage,
    importPromptStr, setImportPromptStr, isAnalyzingPrompt,
    handleAnalyzeReference, handleAnalyzePrompt,
    editImage, setEditImage, editBudget, setEditBudget,
    activeEditIntents, setActiveEditIntents, editBg, setEditBg,
    editRearExtrusion, setEditRearExtrusion, editIntent, setEditIntent,
    editMaterial, setEditMaterial, editWearLevel, setEditWearLevel,
    editRimColor, setEditRimColor, editRimIntensity, setEditRimIntensity,
    editEnergyCore, setEditEnergyCore, editFxOrigin, setEditFxOrigin,
    editFxIntensity, setEditFxIntensity, editVfxPassMode, setEditVfxPassMode,
    motionImage, setMotionImage, cameraMotion, setCameraMotion,
    vfxDynamics, setVfxDynamics, motionIntent, setMotionIntent,
    currentIR, compiledOutputs, optimizedPrompts, optimizedPromptsKo,
    auditIssues, qualityScores,
    isOptimizing, handleOptimizePrompt,
    handleExpandIntent, isExpandingIntent,
    isChatModalOpen, setIsChatModalOpen,
    chatMessages, chatInput, setChatInput, isChatting, tempIntent,
    openChatModal, handleSendChatMessage, applyChatIntent,
    isCopied, copyToClipboard,
    toastMsg, showToast,
    activeTroubleshoots, setActiveTroubleshoots,
    troubleshootHistory, setTroubleshootHistory,
    resetOptimized,
  };
}
