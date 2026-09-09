import { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { useDraftPersistence } from '../../../lib/useDraftPersistence.js';
import { useUsageGate } from '../../../components/UsageGate';
import { useAuth } from '../../../context/AuthContext';
import { useGlobal } from '../../../context/GlobalContext';
import { IMAGEN_MODELS } from '../../../lib/imagenRender';
import { createHandlers } from './breezeHandlers.js';
import { createAiHandlers } from './breezeAiHandlers.js';
import { createRenderHandlers } from './breezeRenderHandlers.js';

const BreezeContext = createContext(null);
export const useBreeze = () => useContext(BreezeContext);

export const BreezeProvider = ({ children }) => {
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const { user, grade } = useAuth();
  const { navigate, payload, clearPayload } = useGlobal();
  const canRender = grade === 'pro' || grade === 'pro_plus' || grade === 'expert';

  // ─── UI shell ──────────────────────────────────────────────
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("editor");
  const [selectedCategory, setSelectedCategory] = useState("casual");

  // ─── Creation: input + persona ────────────────────────────
  const [inputText, setInputText] = useState("6월\n오늘의 상품\n스페셜");
  const [base64Image, setBase64Image] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [aiPersona, setAiPersona] = useState('bubble_pop');
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [enhanceMode, setEnhanceMode] = useState("perfection");
  const [momentumActive, setMomentumActive] = useState(false);
  const [personaSliderValue, setPersonaSliderValue] = useState(50);
  const [baseStyle, setBaseStyle] = useState("BlackWhite");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [occupancy, setOccupancy] = useState("50%");
  const [layoutType, setLayoutType] = useState("1Line");

  // ─── Creation: typography options ─────────────────────────
  const [stemWeight, setStemWeight] = useState("Weight_Chunky");
  const [charWidth, setCharWidth] = useState("Normal");
  const [charProportion, setCharProportion] = useState("P_Std");
  const [kerning, setKerning] = useState("Kern_Std");
  const [scriptType, setScriptType] = useState("Casual_Bubble");
  const [narrativeIntensity, setNarrativeIntensity] = useState("subtle");
  const [narrativeScope, setNarrativeScope] = useState("one");
  const [narrativeMutation, setNarrativeMutation] = useState("auto");
  const [narrativeTarget, setNarrativeTarget] = useState("");
  const [terminalStyle, setTerminalStyle] = useState("End_Round");
  const [strokeTexture, setStrokeTexture] = useState("Tex_Smooth");
  const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Soft");
  const [strokeExtension, setStrokeExtension] = useState("Ext_None");
  const [slantAngle, setSlantAngle] = useState("Slant_0");
  const [rhythmDynamic, setRhythmDynamic] = useState("Rhythm_Bouncy");
  const [playfulDistortion, setPlayfulDistortion] = useState("Distort_Squeeze");
  const [analogImperfection, setAnalogImperfection] = useState("Imp_None");
  const [internalDecoration, setInternalDecoration] = useState("Solid");
  const [textFlow, setTextFlow] = useState("Straight");
  const [letterConnection, setLetterConnection] = useState("Separated");
  const [casualSurrounding, setCasualSurrounding] = useState("Clean");
  const [dynamicOptions, setDynamicOptions] = useState({ CasualStyles: [], strokeTextures: [], analogImperfections: [], strokeEnds: [], strokeWeights: [], strokeSharpness: [], widths: [], kerningOptions: [], strokeExtensions: [], rhythmDynamics: [], playfulDistortions: [] });

  const [customDesignInjections, setCustomDesignInjections] = useState("");
  // 기본 탭은 NanoBanana — Overview 탭에는 Generate Prompt 버튼이 없어 첫 진입 시 생성 진입점이 보이지 않음.
  const [aiModel, setAiModel] = useState("NanoBanana");

  // ─── Creation: AI outputs / loading ───────────────────────
  const [dramaticPrompt, setDramaticPrompt] = useState(null);
  const [optimizedPrompt, setOptimizedPrompt] = useState(null);
  const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState(null);
  const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState(null);
  const [nanoViewMode, setNanoViewMode] = useState("enhanced");
  const [aiRecSummary, setAiRecSummary] = useState(null);
  const [lastRecSource, setLastRecSource] = useState(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMjOptimizing, setIsMjOptimizing] = useState(false);
  const [isCgEnhancing, setIsCgEnhancing] = useState(false);
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isVerifyingLogic, setIsVerifyingLogic] = useState(false);
  const [verificationLog, setVerificationLog] = useState("");
  const [isAuditedHighlight, setIsAuditedHighlight] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [copiedTop, setCopiedTop] = useState(false);
  const [copiedBottom, setCopiedBottom] = useState(false);
  const [baseLangView, setBaseLangView] = useState('ko');
  const [aiError, setAiError] = useState(null); // AI 호출 실패 메시지 (renderError 와 동일 패턴)

  // ─── 외부 payload 수신 (NEXUS Preview KV 타이틀 등) ─────────
  // payload.prompt.text → 입력 텍스트로 주입 + 에디터 뷰 전환 (timestamp 로 1회만 소비).
  const consumedPayloadRef = useRef(null);
  useEffect(() => {
    if (!payload || payload.target !== "typecore-breeze" || !payload.timestamp) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;
    const text = payload.prompt?.text;
    if (text) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputText(text);
      setCurrentView("editor");
    }
    try { clearPayload?.(); } catch { /* noop */ }
  }, [payload, clearPayload]);

  // ─── Edit (Micro-Edit view) ───────────────────────────────
  const [editUploadedImage, setEditUploadedImage] = useState(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [editTargetCategory, setEditTargetCategory] = useState("texture");
  const [editTexStyle, setEditTexStyle] = useState("Tex_DryBrush");
  const [editEdgeStyle, setEditEdgeStyle] = useState("Edge_Round");
  const [editExtStyle, setEditExtStyle] = useState("Ext_Swash");
  const [editRhythmStyle, setEditRhythmStyle] = useState("Rhythm_Bounce");
  const [editObjLetter, setEditObjLetter] = useState("");
  const [editObjItem, setEditObjItem] = useState("");
  const [editAiModel, setEditAiModel] = useState("Overview");
  const [editNanoMode, setEditNanoMode] = useState("enhanced");
  const [editDramaticPrompt, setEditDramaticPrompt] = useState(null);
  const [editOptimizedPrompt, setEditOptimizedPrompt] = useState(null);
  const [editMjPrompt, setEditMjPrompt] = useState(null);
  const [editCgPrompt, setEditCgPrompt] = useState(null);
  const [isEditEnhancing, setIsEditEnhancing] = useState(false);
  const [isEditOptimizing, setIsEditOptimizing] = useState(false);
  const [isEditMjOptimizing, setIsEditMjOptimizing] = useState(false);
  const [isEditCgEnhancing, setIsEditCgEnhancing] = useState(false);
  const [isEditExpandingIntent, setIsEditExpandingIntent] = useState(false);

  // ─── Style image / expanders / outdated / tuning ──────────
  const [styleImage, setStyleImage] = useState(null);
  const [isStyleDragging, setIsStyleDragging] = useState(false);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);
  const [isBaseContextExpanded, setIsBaseContextExpanded] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isEditOutdated, setIsEditOutdated] = useState(false);
  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [tuningChatHistory, setTuningChatHistory] = useState([]);
  const [tuningInputValue, setTuningInputValue] = useState("");
  const [isTuningLoading, setIsTuningLoading] = useState(false);
  const [currentTunedAura, setCurrentTunedAura] = useState("");
  const tuningChatRef = useRef(null);
  const [isEditTuningModalOpen, setIsEditTuningModalOpen] = useState(false);
  const [editTuningChatHistory, setEditTuningChatHistory] = useState([]);
  const [editTuningInputValue, setEditTuningInputValue] = useState("");
  const [isEditTuningLoading, setIsEditTuningLoading] = useState(false);
  const [currentTunedEditAura, setCurrentTunedEditAura] = useState("");
  const editTuningChatRef = useRef(null);

  // ─── Imagen 렌더링 (Sovereign current 와 동일 흐름) ─────────
  const [rendering, setRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [savingToArc, setSavingToArc] = useState(false);
  const [savedToArcId, setSavedToArcId] = useState(null);
  const [savedCloudinaryUrl, setSavedCloudinaryUrl] = useState(null);
  const [selectedImagenModel, setSelectedImagenModel] = useState(IMAGEN_MODELS[0].id);
  const [sendingToRenderMatrix, setSendingToRenderMatrix] = useState(false);
  const [sendingToMaskForge, setSendingToMaskForge] = useState(false);
  const [sendingToVectorForge, setSendingToVectorForge] = useState(false);

  // 새 렌더 결과가 들어오면 PromptArc 저장 상태 초기화.
  useEffect(() => {
    setSavedToArcId(null);
    setSavedCloudinaryUrl(null);
  }, [renderedImage]);

  // ─── 드래프트 영속화 (useDraftPersistence 공용 훅) ──────────
  // 옵션 값만 스냅샷 — 이미지(dataURL)/튜닝 채팅/렌더 결과/생성 프롬프트는 제외 (프롬프트는 라이브 재계산).
  const draftSnapshot = useMemo(() => ({
    inputText, selectedCategory, aiPersona, personaSliderValue, customDesignInjections,
    baseStyle, aspectRatio, occupancy, layoutType, enhanceMode, momentumActive, isAdvancedOptionsEnabled,
    stemWeight, charWidth, charProportion, kerning, scriptType,
    narrativeIntensity, narrativeScope, narrativeMutation, narrativeTarget,
    terminalStyle, strokeTexture, strokeSharpness, strokeExtension, slantAngle,
    rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration,
    textFlow, letterConnection, casualSurrounding, dynamicOptions, aiModel,
  }), [
    inputText, selectedCategory, aiPersona, personaSliderValue, customDesignInjections,
    baseStyle, aspectRatio, occupancy, layoutType, enhanceMode, momentumActive, isAdvancedOptionsEnabled,
    stemWeight, charWidth, charProportion, kerning, scriptType,
    narrativeIntensity, narrativeScope, narrativeMutation, narrativeTarget,
    terminalStyle, strokeTexture, strokeSharpness, strokeExtension, slantAngle,
    rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration,
    textFlow, letterConnection, casualSurrounding, dynamicOptions, aiModel,
  ]);
  const draft = useDraftPersistence('nx:typecore-breeze:draft', draftSnapshot);

  // [복원] — 저장된 드래프트 값을 현재 상태에 적용 (없는 필드는 건너뜀).
  const restoreDraft = () => {
    const s = draft.saved;
    if (!s) return;
    const apply = (setter, v) => { if (v !== undefined && v !== null) setter(v); };
    apply(setInputText, s.inputText); apply(setSelectedCategory, s.selectedCategory);
    apply(setAiPersona, s.aiPersona); apply(setPersonaSliderValue, s.personaSliderValue);
    apply(setCustomDesignInjections, s.customDesignInjections);
    apply(setBaseStyle, s.baseStyle); apply(setAspectRatio, s.aspectRatio);
    apply(setOccupancy, s.occupancy); apply(setLayoutType, s.layoutType);
    apply(setEnhanceMode, s.enhanceMode); apply(setMomentumActive, s.momentumActive);
    apply(setIsAdvancedOptionsEnabled, s.isAdvancedOptionsEnabled);
    apply(setStemWeight, s.stemWeight); apply(setCharWidth, s.charWidth);
    apply(setCharProportion, s.charProportion); apply(setKerning, s.kerning);
    apply(setScriptType, s.scriptType);
    apply(setNarrativeIntensity, s.narrativeIntensity); apply(setNarrativeScope, s.narrativeScope);
    apply(setNarrativeMutation, s.narrativeMutation); apply(setNarrativeTarget, s.narrativeTarget);
    apply(setTerminalStyle, s.terminalStyle); apply(setStrokeTexture, s.strokeTexture);
    apply(setStrokeSharpness, s.strokeSharpness); apply(setStrokeExtension, s.strokeExtension);
    apply(setSlantAngle, s.slantAngle); apply(setRhythmDynamic, s.rhythmDynamic);
    apply(setPlayfulDistortion, s.playfulDistortion); apply(setAnalogImperfection, s.analogImperfection);
    apply(setInternalDecoration, s.internalDecoration); apply(setTextFlow, s.textFlow);
    apply(setLetterConnection, s.letterConnection); apply(setCasualSurrounding, s.casualSurrounding);
    apply(setDynamicOptions, s.dynamicOptions); apply(setAiModel, s.aiModel);
    draft.dismiss();
  };

  // ─── App-level effects ────────────────────────────────────
  useEffect(() => {
    setIsOutdated(true); setVerificationLog("");
  }, [aiPersona, personaSliderValue, inputText, customDesignInjections, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, stemWeight, charWidth, charProportion, kerning, scriptType, narrativeIntensity, narrativeScope, narrativeMutation, narrativeTarget, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, slantAngle, rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration, textFlow, letterConnection, casualSurrounding, isAdvancedOptionsEnabled]);

  useEffect(() => { setIsEditOutdated(true); }, [editInstruction, editUploadedImage, editTargetCategory, editTexStyle, editEdgeStyle, editExtStyle, editRhythmStyle, editObjLetter, editObjItem]);

  useEffect(() => { if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight; }, [tuningChatHistory, isTuningLoading]);
  useEffect(() => { if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight; }, [editTuningChatHistory, isEditTuningLoading]);

  // 핸들러 묶음을 만들기 위해 state + setter 전부를 한 번에 묶어서 넘긴다.
  const stateBag = {
    ensureCanGenerate,
    theme, isSidebarOpen, currentView, selectedCategory, inputText, base64Image, isDragging,
    aiPersona, personaDropdownOpen, isAdvancedOptionsEnabled, enhanceMode, momentumActive, personaSliderValue,
    baseStyle, aspectRatio, occupancy, layoutType,
    stemWeight, charWidth, charProportion, kerning, scriptType, narrativeIntensity, narrativeScope, narrativeMutation, narrativeTarget, terminalStyle, strokeTexture, strokeSharpness,
    strokeExtension, slantAngle, rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration,
    textFlow, letterConnection, casualSurrounding, dynamicOptions, customDesignInjections, aiModel,
    dramaticPrompt, optimizedPrompt, mjOptimizedPrompt, cgEnhancedPrompt, nanoViewMode, aiRecSummary, lastRecSource,
    isEnhancing, isOptimizing, isMjOptimizing, isCgEnhancing, isExpandingIntent, isRecommending, isVerifyingLogic,
    verificationLog, isAuditedHighlight, isAuditModalOpen, copiedTop, copiedBottom, baseLangView, aiError,
    editUploadedImage, editInstruction, editTargetCategory, editTexStyle, editEdgeStyle, editExtStyle,
    editRhythmStyle, editObjLetter, editObjItem, editAiModel, editNanoMode,
    editDramaticPrompt, editOptimizedPrompt, editMjPrompt, editCgPrompt,
    isEditEnhancing, isEditOptimizing, isEditMjOptimizing, isEditCgEnhancing, isEditExpandingIntent,
    styleImage, isStyleDragging, isAnalyzingStyle, isPromptExpanded, isEditPromptExpanded, isBaseContextExpanded,
    isOutdated, isEditOutdated, isTuningModalOpen, tuningChatHistory, tuningInputValue, isTuningLoading, currentTunedAura,
    isEditTuningModalOpen, editTuningChatHistory, editTuningInputValue, isEditTuningLoading, currentTunedEditAura,
    tuningChatRef, editTuningChatRef,
    setTheme, setIsSidebarOpen, setCurrentView, setSelectedCategory, setInputText, setBase64Image, setIsDragging,
    setAiPersona, setPersonaDropdownOpen, setIsAdvancedOptionsEnabled, setEnhanceMode, setMomentumActive, setPersonaSliderValue,
    setBaseStyle, setAspectRatio, setOccupancy, setLayoutType,
    setStemWeight, setCharWidth, setCharProportion, setKerning, setScriptType, setNarrativeIntensity, setNarrativeScope, setNarrativeMutation, setNarrativeTarget, setTerminalStyle, setStrokeTexture,
    setStrokeSharpness, setStrokeExtension, setSlantAngle, setRhythmDynamic, setPlayfulDistortion, setAnalogImperfection,
    setInternalDecoration, setTextFlow, setLetterConnection, setCasualSurrounding, setDynamicOptions, setCustomDesignInjections, setAiModel,
    setDramaticPrompt, setOptimizedPrompt, setMjOptimizedPrompt, setCgEnhancedPrompt, setNanoViewMode, setAiRecSummary, setLastRecSource,
    setIsEnhancing, setIsOptimizing, setIsMjOptimizing, setIsCgEnhancing, setIsExpandingIntent, setIsRecommending,
    setIsVerifyingLogic, setVerificationLog, setIsAuditedHighlight, setIsAuditModalOpen,
    setCopiedTop, setCopiedBottom, setBaseLangView, setAiError,
    setEditUploadedImage, setEditInstruction, setEditTargetCategory, setEditTexStyle, setEditEdgeStyle, setEditExtStyle,
    setEditRhythmStyle, setEditObjLetter, setEditObjItem, setEditAiModel, setEditNanoMode,
    setEditDramaticPrompt, setEditOptimizedPrompt, setEditMjPrompt, setEditCgPrompt,
    setIsEditEnhancing, setIsEditOptimizing, setIsEditMjOptimizing, setIsEditCgEnhancing, setIsEditExpandingIntent,
    setStyleImage, setIsStyleDragging, setIsAnalyzingStyle, setIsPromptExpanded, setIsEditPromptExpanded, setIsBaseContextExpanded,
    setIsOutdated, setIsEditOutdated,
    setIsTuningModalOpen, setTuningChatHistory, setTuningInputValue, setIsTuningLoading, setCurrentTunedAura,
    setIsEditTuningModalOpen, setEditTuningChatHistory, setEditTuningInputValue, setIsEditTuningLoading, setCurrentTunedEditAura,

    // Imagen 렌더링
    rendering, renderedImage, renderError, savingToArc, savedToArcId, savedCloudinaryUrl,
    selectedImagenModel, sendingToRenderMatrix, sendingToMaskForge, sendingToVectorForge, canRender, grade,
    setRendering, setRenderedImage, setRenderError, setSavingToArc, setSavedToArcId, setSavedCloudinaryUrl,
    setSelectedImagenModel, setSendingToRenderMatrix, setSendingToMaskForge, setSendingToVectorForge,

    // 드래프트 영속화 — 복원 배너(BreezeResultPanel) + 초기화 시 clear(breezeHandlers).
    showDraftRestore: draft.showRestore, restoreDraft, dismissDraftRestore: draft.dismiss, clearDraft: draft.clear,
  };

  const handlers = createHandlers(stateBag);
  const aiHandlers = createAiHandlers(stateBag, { upsertDynamic: handlers.upsertDynamic });
  const renderHandlers = createRenderHandlers(stateBag, {
    user, navigate, IMAGEN_MODELS,
    isEditView: () => currentView === 'edit',
    getPrompts: aiHandlers.getPrompts,
    getEditPrompts: aiHandlers.getEditPrompts,
  });

  return (
    <BreezeContext.Provider value={{ ...stateBag, ...handlers, ...aiHandlers, ...renderHandlers, IMAGEN_MODELS, isLoggedIn: !!user?.uid, usageModal }}>
      {children}
    </BreezeContext.Provider>
  );
};
