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
//   - 초기 currentView 가 "edit"
//   - sendToMotion 도 없음 (copy 만 노출)
export function usePopPrompt() {
  // ===== view / model / options =====
  const [currentView, setCurrentView] = useState("edit");
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
  const [referenceImage, setReferenceImage] = useState(null);
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
    const so = parsed.selected_options;
    if (so.directorPersona) setDirectorPersona(so.directorPersona);
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
