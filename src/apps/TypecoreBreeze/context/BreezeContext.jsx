import { createContext, useContext, useState, useRef, useEffect } from 'react';
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
  const { navigate } = useGlobal();
  const canRender = grade === 'pro' || grade === 'pro_plus' || grade === 'expert';

  // ─── UI shell ──────────────────────────────────────────────
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("editor");
  const [selectedCategory, setSelectedCategory] = useState("casual");

  // ─── Creation: input + persona ────────────────────────────
  const [inputText, setInputText] = useState("해피데이");
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
  const [aiModel, setAiModel] = useState("Overview");

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

  // 새 렌더 결과가 들어오면 PromptArc 저장 상태 초기화.
  useEffect(() => {
    setSavedToArcId(null);
    setSavedCloudinaryUrl(null);
  }, [renderedImage]);

  // ─── App-level effects ────────────────────────────────────
  useEffect(() => {
    setIsOutdated(true); setVerificationLog("");
  }, [aiPersona, personaSliderValue, inputText, customDesignInjections, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, stemWeight, charWidth, charProportion, kerning, scriptType, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, slantAngle, rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration, textFlow, letterConnection, casualSurrounding, isAdvancedOptionsEnabled]);

  useEffect(() => { setIsEditOutdated(true); }, [editInstruction, editUploadedImage, editTargetCategory, editTexStyle, editEdgeStyle, editExtStyle, editRhythmStyle, editObjLetter, editObjItem]);

  useEffect(() => { if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight; }, [tuningChatHistory, isTuningLoading]);
  useEffect(() => { if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight; }, [editTuningChatHistory, isEditTuningLoading]);

  // 핸들러 묶음을 만들기 위해 state + setter 전부를 한 번에 묶어서 넘긴다.
  const stateBag = {
    ensureCanGenerate,
    theme, isSidebarOpen, currentView, selectedCategory, inputText, base64Image, isDragging,
    aiPersona, personaDropdownOpen, isAdvancedOptionsEnabled, enhanceMode, momentumActive, personaSliderValue,
    baseStyle, aspectRatio, occupancy, layoutType,
    stemWeight, charWidth, charProportion, kerning, scriptType, terminalStyle, strokeTexture, strokeSharpness,
    strokeExtension, slantAngle, rhythmDynamic, playfulDistortion, analogImperfection, internalDecoration,
    textFlow, letterConnection, casualSurrounding, dynamicOptions, customDesignInjections, aiModel,
    dramaticPrompt, optimizedPrompt, mjOptimizedPrompt, cgEnhancedPrompt, nanoViewMode, aiRecSummary, lastRecSource,
    isEnhancing, isOptimizing, isMjOptimizing, isCgEnhancing, isExpandingIntent, isRecommending, isVerifyingLogic,
    verificationLog, isAuditedHighlight, isAuditModalOpen, copiedTop, copiedBottom, baseLangView,
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
    setStemWeight, setCharWidth, setCharProportion, setKerning, setScriptType, setTerminalStyle, setStrokeTexture,
    setStrokeSharpness, setStrokeExtension, setSlantAngle, setRhythmDynamic, setPlayfulDistortion, setAnalogImperfection,
    setInternalDecoration, setTextFlow, setLetterConnection, setCasualSurrounding, setDynamicOptions, setCustomDesignInjections, setAiModel,
    setDramaticPrompt, setOptimizedPrompt, setMjOptimizedPrompt, setCgEnhancedPrompt, setNanoViewMode, setAiRecSummary, setLastRecSource,
    setIsEnhancing, setIsOptimizing, setIsMjOptimizing, setIsCgEnhancing, setIsExpandingIntent, setIsRecommending,
    setIsVerifyingLogic, setVerificationLog, setIsAuditedHighlight, setIsAuditModalOpen,
    setCopiedTop, setCopiedBottom, setBaseLangView,
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
    selectedImagenModel, sendingToRenderMatrix, canRender, grade,
    setRendering, setRenderedImage, setRenderError, setSavingToArc, setSavedToArcId, setSavedCloudinaryUrl,
    setSelectedImagenModel, setSendingToRenderMatrix,
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
