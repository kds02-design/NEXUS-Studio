/* eslint-disable */
// current 전용 메인 상태/핸들러 훅. 원본 current PromptEngine.jsx 의 모든 state, useEffect,
// 핸들러, buildPrompts / buildEditPrompts / fetch 호출까지 그대로 옮긴 격리 사본.
import { useState, useRef, useEffect } from 'react';
import { useUsageGate } from '../../../../../components/UsageGate';
import { useGlobal } from '../../../../../context/GlobalContext';
import { coreArchetypes, safetyGuards } from '../constants/personas.jsx';
import { staticOptions } from '../constants/options.js';
import {
  TYPECORE_VERSION,
  extractJson,
  getOptionEn,
  getOptionName,
  getSliderText,
} from '../constants/utils.js';

export function useSovereignPromptCurrent({ apiKey }) {
  // 1. Context & Global States
  const { ensureCanGenerate, modal: usageModal } = useUsageGate();
  const { payload, clearPayload, isLight } = useGlobal();
  const [incomingFromArc, setIncomingFromArc] = useState(null); // { from, hasImage, text }
  const consumedPayloadRef = useRef(null);
  const theme = isLight ? "light" : "dark";
  const [currentView, setCurrentView] = useState("editor");
  const isEditMode = currentView === 'edit';

  const [activeModel, setActiveModel] = useState("NanoBanana");
  const [activeEditModel, setActiveEditModel] = useState("NanoBanana");
  const currentModel = isEditMode ? activeEditModel : activeModel;

  const setModel = (m) => {
    if (isEditMode) setActiveEditModel(m);
    else setActiveModel(m);
  };

  // 2. Local Setup States
  const [inputText, setInputText] = useState("데스나이트");
  const [base64Image, setBase64Image] = useState(null);

  const [activePurpose, setActivePurpose] = useState('Purpose_GameLogo');
  const [coreArchetype, setCoreArchetype] = useState('core_fortress');
  const [coreDropdownOpen, setCoreDropdownOpen] = useState(false);

  const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
  const [isEnhanceModeEnabled, setIsEnhanceModeEnabled] = useState(true);
  const [enhanceMode, setEnhanceMode] = useState("refine");
  const [momentumActive, setMomentumActive] = useState(false);
  const [personaSliderValue, setPersonaSliderValue] = useState(50);

  const [baseStyle, setBaseStyle] = useState("BlackWhite");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [occupancy, setOccupancy] = useState("50%");
  const [layoutType, setLayoutType] = useState("Center");
  const [layoutPreset, setLayoutPreset] = useState("CenterLogo");
  const [stemWeight, setStemWeight] = useState("Stem_Heavy");
  const [charWidth, setCharWidth] = useState("Normal");
  const [charProportion, setCharProportion] = useState("P_Std");
  const [kerning, setKerning] = useState("Kern_Std");
  const [subTitleSize, setSubTitleSize] = useState("Sub_Small");

  const [terminalStyle, setTerminalStyle] = useState("Term_Chisel");
  const [strokeTexture, setStrokeTexture] = useState("Tex_Clean");
  const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Std");
  const [strokeExtension, setStrokeExtension] = useState("Ext_None");
  const [cornerStyle, setCornerStyle] = useState("Corner_Right");
  const [slantAngle, setSlantAngle] = useState("Slant_0");
  const [kineticVelocity, setKineticVelocity] = useState("Vel_Static");
  const [slicingIntensity, setSlicingIntensity] = useState("Slic_None");
  const [deformationDamage, setDeformationDamage] = useState("Damage_None");

  const [letterConnection, setLetterConnection] = useState("Conn_Indep");
  const [internalSpace, setInternalSpace] = useState("Space_Std");
  const [logoDegree, setLogoDegree] = useState("Logo_Std");

  const [mmoSilhouetteFraming, setMmoSilhouetteFraming] = useState("Emblem");
  const [mmoSurroundingElement, setMmoSurroundingElement] = useState("Clean");

  const [dynamicOptions, setDynamicOptions] = useState({
    strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [],
    strokeSharpness: [], cornerStyles: [], widths: [], kerningOptions: [], kineticVelocities: [], slicingIntensities: [],
    editStrokeMods: [], editElementMods: [], editSurfaceMods: [], strokeExtensions: [], letterConnections: [], internalSpaces: [], logoDegrees: [], MMOSilhouetteFramings: [], MMOSurroundingElements: []
  });

  const [customDesignInjections, setCustomDesignInjections] = useState("");

  // Prompt Output States
  const [dramaticPrompt, setDramaticPrompt] = useState("");
  const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState("");
  const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState("");
  const [editDramaticPrompt, setEditDramaticPrompt] = useState("");
  const [editMjPrompt, setEditMjPrompt] = useState("");
  const [editCgPrompt, setEditCgPrompt] = useState("");

  const [aiRecSummary, setAiRecSummary] = useState(null);

  // Loading & View States
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isMjOptimizing, setIsMjOptimizing] = useState(false);
  const [isCgEnhancing, setIsCgEnhancing] = useState(false);
  const [isExpandingIntent, setIsExpandingIntent] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);

  const [isEditEnhancing, setIsEditEnhancing] = useState(false);
  const [isEditMjOptimizing, setIsEditMjOptimizing] = useState(false);
  const [isEditCgEnhancing, setIsEditCgEnhancing] = useState(false);
  const [isEditExpandingIntent, setIsEditExpandingIntent] = useState(false);

  const [copiedTop, setCopiedTop] = useState(false);
  const [copiedBottom, setCopiedBottom] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals & Panels
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInputValue, setImportInputValue] = useState("");

  const [activeGuards, setActiveGuards] = useState(['guard_mutation', 'guard_3d', 'guard_layout', 'guard_noise']);

  // File Upload States
  const [creationUploadedImage, setCreationUploadedImage] = useState(null);
  const [isCreationDragging, setIsCreationDragging] = useState(false);
  const [isAnalyzingCreation, setIsAnalyzingCreation] = useState(false);

  const [editUploadedImage, setEditUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [editInstruction, setEditInstruction] = useState("");
  const [applyAiRecInEdit, setApplyAiRecInEdit] = useState(false);
  const [applyAutoRefine, setApplyAutoRefine] = useState(false);

  const [editStrokeMod, setEditStrokeMod] = useState("E_Stroke_None");
  const [editElementMod, setEditElementMod] = useState("E_Elem_None");
  const [editSurfaceMod, setEditSurfaceMod] = useState("E_Surf_None");

  const [openCardId, setOpenCardId] = useState("layout");
  const [editOpenCardId, setEditOpenCardId] = useState("edit_retouch");

  const [isOutdated, setIsOutdated] = useState(false);
  const [isEditOutdated, setIsEditOutdated] = useState(false);

  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);

  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [isEditTuningModalOpen, setIsEditTuningModalOpen] = useState(false);
  const [tuningChatHistory, setTuningChatHistory] = useState([]);
  const [editTuningChatHistory, setEditTuningChatHistory] = useState([]);
  const [tuningInputValue, setTuningInputValue] = useState("");
  const [editTuningInputValue, setEditTuningInputValue] = useState("");
  const [isTuningLoading, setIsTuningLoading] = useState(false);
  const [isEditTuningLoading, setIsEditTuningLoading] = useState(false);
  const [currentTunedAura, setCurrentTunedAura] = useState("");
  const [currentTunedEditAura, setCurrentTunedEditAura] = useState("");

  const [tuningReferenceImage, setTuningReferenceImage] = useState(null);
  const [editTuningReferenceImage, setEditTuningReferenceImage] = useState(null);

  const moodImageRef = useRef(null);
  const tuningChatRef = useRef(null);
  const editTuningChatRef = useRef(null);

  // Derivative States
  const isPromptOutdated = isEditMode ? isEditOutdated : isOutdated;
  const isExpanded = isEditMode ? isEditPromptExpanded : isPromptExpanded;
  const setExpanded = isEditMode ? setIsEditPromptExpanded : setIsPromptExpanded;

  const handleToggleCard = (id) => setOpenCardId(prev => prev === id ? null : id);
  const handleEditToggleCard = (id) => setEditOpenCardId(prev => prev === id ? null : id);

  // 글자수 5자 이상 시 자동 시네마틱 강제 전환
  useEffect(() => {
    const textLen = inputText.replace(/\s/g, '').length;
    if (textLen >= 5 && layoutType !== "1Line") {
      setLayoutType("1Line");
      setAspectRatio("2.76:1");
      setOccupancy("40%");
      setMmoSilhouetteFraming("Horizontal");
    }
  }, [inputText]);

  // Change Detection
  useEffect(() => { setIsOutdated(true); }, [activePurpose, coreArchetype, personaSliderValue, inputText, customDesignInjections, isEnhanceModeEnabled, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, stemWeight, charWidth, charProportion, kerning, subTitleSize, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, cornerStyle, slantAngle, kineticVelocity, slicingIntensity, deformationDamage, letterConnection, internalSpace, logoDegree, mmoSilhouetteFraming, mmoSurroundingElement, isAdvancedOptionsEnabled, activeGuards]);

  useEffect(() => { setIsEditOutdated(true); }, [activePurpose, coreArchetype, personaSliderValue, editInstruction, editUploadedImage, applyAiRecInEdit, applyAutoRefine, isEnhanceModeEnabled, enhanceMode, momentumActive, layoutType, subTitleSize, kineticVelocity, slantAngle, deformationDamage, slicingIntensity, editStrokeMod, editElementMod, editSurfaceMod, mmoSilhouetteFraming, mmoSurroundingElement, cornerStyle, activeGuards]);

  useEffect(() => { if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight; }, [tuningChatHistory, isTuningLoading]);
  useEffect(() => { if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight; }, [editTuningChatHistory, isEditTuningLoading]);

  const toggleGuard = (id) => setActiveGuards(prev => prev.includes(id) ? prev.filter(guardId => guardId !== id) : [...prev, id]);

  const hasKoreanAura = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(customDesignInjections);
  const hasKoreanEdit = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(editInstruction);

  const handlePurposeChange = (presetId) => {
    setActivePurpose(presetId);
    const p = staticOptions.purposes.find(o => o.id === presetId);
    if (p) {
      setLayoutType(p.layout);
      setAspectRatio(p.ratio);
      setOccupancy(p.occ);
      setCoreArchetype(p.core);
      setMmoSilhouetteFraming(p.frame);
    }
  };

  const handleLayoutPresetChange = (presetId) => {
    setLayoutPreset(presetId);
    if (presetId === "WideTitle") { setAspectRatio("16:9"); setLayoutType("1Line"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
    else if (presetId === "CenterLogo") { setAspectRatio("1:1"); setLayoutType("Center"); setOccupancy("65%"); setMmoSilhouetteFraming("Auto"); }
    else if (presetId === "CinematicPan") { setAspectRatio("2.76:1"); setLayoutType("1Line"); setOccupancy("40%"); setMmoSilhouetteFraming("Expanded"); }
    else if (presetId === "TitleSubPre") { setAspectRatio("16:9"); setLayoutType("TitleSub"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
    else if (presetId === "SubTitlePre") { setAspectRatio("16:9"); setLayoutType("SubTitle"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
  };

  // V18 Validation Engine
  const getValidationScores = () => {
    let shapeIntegrity = 100, legibility = 100, styleConsistency = 100, layoutStability = 100, conflicts = [];

    if (isEnhanceModeEnabled) {
      if (enhanceMode === 'variation') { shapeIntegrity -= 20; legibility -= 15; }
      if (enhanceMode === 'deconstruct') { shapeIntegrity -= 45; legibility -= 45; layoutStability -= 10; }
    }

    if (kineticVelocity !== 'Vel_Static') { shapeIntegrity -= 10; styleConsistency -= 5; layoutStability -= 10; }
    if (kineticVelocity === 'Vel_Slashing') { shapeIntegrity -= 15; legibility -= 10; layoutStability -= 15; }
    if (momentumActive) { shapeIntegrity -= 20; legibility -= 15; styleConsistency -= 10; layoutStability -= 15; }
    if (slicingIntensity !== 'Slic_None') { shapeIntegrity -= 15; legibility -= 15; }
    if (slicingIntensity === 'Slic_Deep' || slicingIntensity === 'Slic_Total') { shapeIntegrity -= 35; legibility -= 30; }

    if (kerning === 'Kern_Overlap') { legibility -= 20; shapeIntegrity -= 10; }
    if (letterConnection === 'Conn_Full') { legibility -= 15; shapeIntegrity -= 15; }

    if (deformationDamage !== 'Damage_None') { shapeIntegrity -= 5; layoutStability -= 10; styleConsistency -= 5; }
    if (deformationDamage === 'Damage_Cracking') { legibility -= 10; layoutStability -= 15; }
    if (strokeTexture !== 'Tex_Clean') { styleConsistency -= 10; layoutStability -= 10; }
    if (mmoSurroundingElement !== 'Clean') { layoutStability -= 20; legibility -= 5; }

    shapeIntegrity = Math.max(0, Math.min(100, shapeIntegrity)); legibility = Math.max(0, Math.min(100, legibility));
    styleConsistency = Math.max(0, Math.min(100, styleConsistency)); layoutStability = Math.max(0, Math.min(100, layoutStability));

    if (shapeIntegrity < 50) conflicts.push({ level: '치명적 위험', rule: '형태 원형 붕괴 (Shape Drift)', action: '텍스트 보존 락 활성화 및 해체 모드 해제', fixId: 'fix_shape' });
    if (legibility < 55) conflicts.push({ level: '경고', rule: '가독성 하한선 도달 (Legibility Breach)', action: '자간 확보 및 절단 강도 완화', fixId: 'fix_legibility' });
    if (styleConsistency < 80 && !activeGuards.includes('guard_3d')) conflicts.push({ level: '경고', rule: '입체(3D) 발생 가능성', action: '[L6] 2D 평면 강제 락 활성화', fixId: 'fix_3d' });
    if (layoutStability < 60 && !activeGuards.includes('guard_noise')) conflicts.push({ level: '경고', rule: '실루엣 간섭 및 노이즈', action: '[L7] VFX 억제 락 활성화', fixId: 'fix_noise' });

    if ((layoutType === '2Lines' || layoutType === 'TitleSub' || layoutType === 'SubTitle') && !activeGuards.includes('guard_layout')) {
      conflicts.push({ level: '경고', rule: '세로 붕괴(Squishing) 위험', action: '[L2] 세로 붕괴 락 활성화', fixId: 'fix_squish' });
    }

    return { shapeIntegrity, legibility, styleConsistency, layoutStability, conflicts };
  };

  const executeAutoCorrection = (fixId) => {
    let newGuards = [...activeGuards];
    if (fixId === 'fix_shape') {
      setEnhanceMode('refine');
      if (!newGuards.includes('guard_mutation')) newGuards.push('guard_mutation');
    }
    if (fixId === 'fix_legibility') {
      if (slicingIntensity === 'Slic_Deep' || slicingIntensity === 'Slic_Total') setSlicingIntensity('Slic_Partial');
      if (kerning === 'Kern_Overlap') setKerning('Kern_Std');
      if (!newGuards.includes('guard_mutation')) newGuards.push('guard_mutation');
    }
    if (fixId === 'fix_3d' && !newGuards.includes('guard_3d')) newGuards.push('guard_3d');
    if (fixId === 'fix_noise' && !newGuards.includes('guard_noise')) newGuards.push('guard_noise');
    if (fixId === 'fix_squish' && !newGuards.includes('guard_layout')) newGuards.push('guard_layout');

    setActiveGuards(newGuards);
    setIsOutdated(true);
    setIsEditOutdated(true);
  };

  const handleApplyAllCorrections = () => {
    const scores = getValidationScores();
    scores.conflicts.forEach(c => executeAutoCorrection(c.fixId));
  };

  const updateDynamic = (key, val) => {
    if (val && typeof val === 'object' && val.id && val.name) {
      setDynamicOptions(prev => {
        const exists = prev[key]?.find(o => o.id === val.id);
        if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] };
        return prev;
      });
      return val.id;
    }
    return val && typeof val === 'object' ? val.id || val : val;
  };

  const handleReset = () => {
    setDynamicOptions({ strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [], strokeSharpness: [], cornerStyles: [], widths: [], kerningOptions: [], kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: [], strokeExtensions: [], letterConnections: [], internalSpaces: [], logoDegrees: [], MMOSilhouetteFramings: [], MMOSurroundingElements: [] });
    setCustomDesignInjections(""); setDramaticPrompt(""); setMjOptimizedPrompt(""); setCgEnhancedPrompt(""); setEnhanceMode("refine"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
    setPersonaSliderValue(50); setAiRecSummary(null); setCoreArchetype('core_fortress');
    setCreationUploadedImage(null); setEditUploadedImage(null);
    setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Chisel"); setStrokeTexture("Tex_Clean"); setStrokeSharpness("Sharp_Std"); setStrokeExtension("Ext_None"); setKineticVelocity("Vel_Static"); setSlicingIntensity("Slic_None"); setSubTitleSize("Sub_Small"); setLetterConnection("Conn_Indep"); setInternalSpace("Space_Std"); setLogoDegree("Logo_Std");
    setTuningReferenceImage(null); setEditTuningReferenceImage(null); setActiveGuards(['guard_mutation', 'guard_3d', 'guard_layout', 'guard_noise']);
  };

  const copyToClipboard = (text, type = 'bottom') => {
    const textArea = document.createElement("textarea"); textArea.value = text || ''; document.body.appendChild(textArea); textArea.select();
    try {
      document.execCommand('copy');
      if (type === 'top') { setCopiedTop(true); setTimeout(() => setCopiedTop(false), 2000); }
      else { setCopiedBottom(true); setTimeout(() => setCopiedBottom(false), 2000); }
    } catch (err) { console.error("Failed to copy", err); } document.body.removeChild(textArea);
  };

  const handleCreationDragOver = (e) => { e.preventDefault(); setIsCreationDragging(true); };
  const handleCreationDragLeave = () => { setIsCreationDragging(false); };
  const handleCreationDrop = async (e) => {
    e.preventDefault(); setIsCreationDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => { setCreationUploadedImage(reader.result); analyzeCreationImage(reader.result); };
      reader.readAsDataURL(file);
    }
  };
  const handleCreationImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setCreationUploadedImage(reader.result); analyzeCreationImage(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleEditDrop = (e) => {
    e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); }
  };
  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); }
  };

  const analyzeCreationImage = async (dataUrl) => {
    if (!dataUrl) return;
    setIsAnalyzingCreation(true);
    try {
      const base64Data = dataUrl.split(',')[1];
      const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
      const imageParts = [{ inlineData: { mimeType, data: base64Data } }];
      const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
      const systemPrompt = `You are a legendary Typography Art Director and System Engineer.
[YOUR PERSONA]: ${persona.role}
Task: Analyze the uploaded reference image's typography style. Extract its structural morphology, weight, terminals, kerning, and texture.
IMPORTANT: You MUST generate precise, dynamically created options (id, name(Korean), en(English description)) that perfectly match the uploaded image's style. Do not just use existing options; invent detailed new ones.
CRITICAL CONSTRAINT: This engine is STRICTLY for 2D FLAT BLACK-AND-WHITE SILHOUETTES. The dynamically created options MUST NOT contain any 3D effects, colors (e.g., gold, silver), lighting, shadows, or realistic materials. Invent ONLY structural and 2D morphological descriptors (e.g., "Deep geometric cuts", "Aggressive razor stems", "Blocky massive terminals").
Core Archetypes available: 'core_fortress', 'core_blade', 'core_relic', 'core_glyph', 'core_kinetic'. Choose the best fit.
Return strictly in JSON format:
{
  "summary": { "title": "분석된 스타일 요약 (한국어)", "reason": "해당 세팅을 추천하는 이유 (한국어)" },
  "aura": "Detailed English description of the structural lines, shapes, and rhythm to match the image. NO vague emotional words. Focus on geometry and tension.",
  "setArchetype": "core_...",
  "setWeight": { "id": "...", "name": "...", "en": "..." },
  "setTerminal": { "id": "...", "name": "...", "en": "..." },
  "setTexture": { "id": "...", "name": "...", "en": "..." },
  "setKinetic": { "id": "...", "name": "...", "en": "..." },
  "setSharpness": { "id": "...", "name": "...", "en": "..." },
  "setKerning": { "id": "...", "name": "...", "en": "..." }
}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, ...imageParts] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json();
      const res = extractJson(data.candidates[0].content.parts[0].text);

      if (res?.summary) setAiRecSummary(res.summary);
      if (res?.aura) setCustomDesignInjections(res.aura);
      if (res?.setArchetype) {
        const match = coreArchetypes.find(a => a.id === res.setArchetype);
        if (match) setCoreArchetype(match.id);
      }
      if (res?.setWeight) setStemWeight(updateDynamic('stemWeights', res.setWeight));
      if (res?.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', res.setTerminal));
      if (res?.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
      if (res?.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', res.setKinetic));
      if (res?.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
      if (res?.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));

      setIsAdvancedOptionsEnabled(true);
    } catch (error) { console.error("Image analysis failed:", error); } finally { setIsAnalyzingCreation(false); }
  };

  // payload 수신 (다른 앱에서 전달됨)
  useEffect(() => {
    if (!payload || payload.target !== 'typecore-sovereign') return;
    if (!payload.timestamp) return;
    if (consumedPayloadRef.current === payload.timestamp) return;
    consumedPayloadRef.current = payload.timestamp;

    const imgUrl = payload.image?.url || '';
    const text = payload.prompt?.text || '';
    const tags = Array.isArray(payload.prompt?.tags) ? payload.prompt.tags : [];
    const source = payload.source || 'unknown';
    const isEditModeArc = payload.mode === 'edit';

    (async () => {
      let dataUrl = null;
      if (imgUrl) {
        try {
          if (imgUrl.startsWith('data:')) {
            dataUrl = imgUrl;
          } else {
            const res = await fetch(imgUrl, { mode: 'cors' });
            if (!res.ok) throw new Error(`이미지 fetch 실패: ${res.status}`);
            const blob = await res.blob();
            dataUrl = await new Promise((resolve, reject) => {
              const r = new FileReader();
              r.onloadend = () => resolve(String(r.result));
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
          }
        } catch (e) {
          console.error('[TypecoreSovereign] 전달 이미지 로드 실패', e);
        }
      }

      if (isEditModeArc) {
        try { setCurrentView('edit'); } catch {}
        if (dataUrl) setEditUploadedImage(dataUrl);
        if (text) setCustomDesignInjections(text);
        setIncomingFromArc({ from: source, hasImage: !!dataUrl, text, tags, mode: 'edit' });
      } else {
        if (dataUrl) setCreationUploadedImage(dataUrl);
        if (text) setInputText(text.slice(0, 60));
        setIncomingFromArc({ from: source, hasImage: !!dataUrl, text, tags });
        if (dataUrl) {
          try { await analyzeCreationImage(dataUrl); }
          catch (e) { console.error('[TypecoreSovereign] 자동 분석 실패', e); }
        }
      }
      try { clearPayload(); } catch {}
    })();
  }, [payload?.timestamp, payload?.target]);

  const handleTuningImageUpload = (e, isEdit) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader(); reader.onloadend = () => { const base64 = reader.result.split(',')[1]; if (isEdit) setEditTuningReferenceImage(base64); else setTuningReferenceImage(base64); }; reader.readAsDataURL(file);
    }
  };

  const openTuningRoom = () => { setCurrentTunedAura(customDesignInjections); setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 현재 구체화된 아이디어를 바탕으로 어떤 부분들을 더 추가하거나 수정하고 싶으신가요?\n원하시는 방향을 자유롭게 말씀해 주세요! (예: '조금 더 차갑고 날카로운 느낌으로 바꿔줘')" }]); setIsTuningModalOpen(true); };
  const openEditTuningRoom = () => { setCurrentTunedEditAura(editInstruction); setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다!\n현재 작성된 지시사항을 바탕으로 원하시는 수정 방향을 대화하듯 말씀해 주세요.\n(예: '지금 묘사에서 부식된 효과를 조금 더 세게 강조해줘')" }]); setIsEditTuningModalOpen(true); };

  const handleSendTuningMessage = async () => {
    if (!tuningInputValue.trim() && !tuningReferenceImage) return;
    const userMsg = tuningInputValue.trim() || "이미지 스타일을 분석해줘.";
    setTuningInputValue(""); setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsTuningLoading(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `You are a Typography Art Director and a friendly assistant. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Aura]: "${currentTunedAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Aura] to reflect the [User Request] and visual analysis. Make it professional. APPLY YOUR PERSONA'S VIBE AND KEYWORDS: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
CRITICAL CONSTRAINT: Maintain strictly 2D flat silhouette graphic structure. DO NOT invent options related to 3D, colors, or realistic materials. ONLY focus on 2D morphology (shape, cuts, stems).
Write a short, friendly reply in Korean explaining what you changed and analyzed. Tone: ${persona.tone}.\nReturn JSON strictly in this format: { "newAura": "The updated aura string IN ENGLISH", "replyMessage": "Your friendly reply in Korean", "updateOptions": { "setWeight": { "id": "...", "name": "...", "en": "..." }, ... } }`;
    const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
    if (tuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: tuningReferenceImage } });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result?.newAura && result?.replyMessage) {
        setCurrentTunedAura(result.newAura); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
        if (result.updateOptions) { const opts = result.updateOptions; if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight)); if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal)); if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', opts.setSharpness)); if (opts.setKerning) setKerning(updateDynamic('kerningOptions', opts.setKerning)); setIsAdvancedOptionsEnabled(true); }
      }
    } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); setTuningReferenceImage(null); }
  };

  const handleSendEditTuningMessage = async () => {
    if (!editTuningInputValue.trim() && !editTuningReferenceImage) return;
    const userMsg = editTuningInputValue.trim() || "이미지 스타일을 분석해줘.";
    setEditTuningInputValue(""); setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsEditTuningLoading(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `You are an expert Typography Art Director adjusting an Image-to-Image edit instruction. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Edit Direction]: "${currentTunedEditAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Edit Direction] integrating the user's request and image analysis. Maintain a professional tone while applying your persona's vibe and keywords: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].
CRITICAL CONSTRAINT: Maintain strictly 2D flat silhouette graphic structure. DO NOT invent options related to 3D, colors, or realistic materials. ONLY focus on 2D morphology (shape, cuts, stems).
Write a friendly response in Korean explaining the update. Tone: ${persona.tone}.\nReturn JSON strictly: { "newAura": "Updated instruction string IN ENGLISH", "replyMessage": "Friendly response in Korean", "updateOptions": { "setEditStroke": { "id": "...", "name": "...", "en": "..." }, ... } }`;
    const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
    if (editTuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: editTuningReferenceImage } });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
      const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text);
      if (result?.newAura && result?.replyMessage) {
        setCurrentTunedEditAura(result.newAura); setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: result.replyMessage }]);
        if (result.updateOptions) { const opts = result.updateOptions; if (opts.setEditStroke) setEditStrokeMod(updateDynamic('editStrokeMods', opts.setEditStroke)); if (opts.setEditElement) setEditElementMod(updateDynamic('editElementMods', opts.setEditElement)); if (opts.setEditSurface) setEditSurfaceMod(updateDynamic('editSurfaceMods', opts.setEditSurface)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage)); }
      }
    } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); setEditTuningReferenceImage(null); }
  };

  const extractRecipe = () => {
    const recipe = {
      typecoreVersion: TYPECORE_VERSION,
      mode: currentView,
      text: inputText,
      purpose: activePurpose,
      coreArchetype: coreArchetype,
      layoutType: layoutType,
      aspectRatio: aspectRatio,
      occupancy: occupancy,
      stemWeight: stemWeight,
      charWidth: charWidth,
      charProportion: charProportion,
      kerning: kerning,
      terminalStyle: terminalStyle,
      strokeTexture: strokeTexture,
      strokeSharpness: strokeSharpness,
      kineticVelocity: kineticVelocity,
      slicingIntensity: slicingIntensity,
      deformationDamage: deformationDamage,
      activeGuards: activeGuards,
      customDesignInjections: customDesignInjections,
      personaSliderValue: personaSliderValue,
      isEnhanceModeEnabled: isEnhanceModeEnabled,
      enhanceMode: enhanceMode,
      momentumActive: momentumActive
    };
    copyToClipboard(JSON.stringify(recipe, null, 2), 'top');
    alert("Recipe JSON 복사 완료!");
  };

  const handleImportPrompt = () => {
    if (!importInputValue.trim()) return;
    try {
      const recipe = JSON.parse(importInputValue);
      if (recipe.typecoreVersion) {
        if (recipe.text) setInputText(recipe.text);
        if (recipe.purpose) setActivePurpose(recipe.purpose);
        if (recipe.coreArchetype) setCoreArchetype(recipe.coreArchetype);
        if (recipe.layoutType) setLayoutType(recipe.layoutType);
        if (recipe.aspectRatio) setAspectRatio(recipe.aspectRatio);
        if (recipe.occupancy) setOccupancy(recipe.occupancy);
        if (recipe.stemWeight) setStemWeight(recipe.stemWeight);
        if (recipe.charWidth) setCharWidth(recipe.charWidth);
        if (recipe.charProportion) setCharProportion(recipe.charProportion);
        if (recipe.kerning) setKerning(recipe.kerning);
        if (recipe.terminalStyle) setTerminalStyle(recipe.terminalStyle);
        if (recipe.strokeTexture) setStrokeTexture(recipe.strokeTexture);
        if (recipe.strokeSharpness) setStrokeSharpness(recipe.strokeSharpness);
        if (recipe.kineticVelocity) setKineticVelocity(recipe.kineticVelocity);
        if (recipe.slicingIntensity) setSlicingIntensity(recipe.slicingIntensity);
        if (recipe.deformationDamage) setDeformationDamage(recipe.deformationDamage);
        if (recipe.activeGuards) setActiveGuards(recipe.activeGuards);
        if (recipe.customDesignInjections) setCustomDesignInjections(recipe.customDesignInjections);
        if (recipe.personaSliderValue) setPersonaSliderValue(recipe.personaSliderValue);
        if (recipe.isEnhanceModeEnabled !== undefined) setIsEnhanceModeEnabled(recipe.isEnhanceModeEnabled);
        if (recipe.enhanceMode) setEnhanceMode(recipe.enhanceMode);
        if (recipe.momentumActive !== undefined) setMomentumActive(recipe.momentumActive);

        setIsAdvancedOptionsEnabled(true);
        setIsImportModalOpen(false);
        setImportInputValue("");
        return;
      }
    } catch (e) {}

    const text = importInputValue;
    const safeMatch = (regex) => { const m = text.match(regex); return m ? m[1].trim() : null; };

    const textMatch = safeMatch(/Exact Text:\s*"(.*?)"/);
    if (textMatch) setInputText(textMatch);

    const layoutMatch = safeMatch(/Composition:\s*(.*?)\n/);
    if (layoutMatch) {
      const match = staticOptions.layouts.find(opt => layoutMatch.includes(opt.en) || opt.en.includes(layoutMatch));
      if (match) setLayoutType(match.id);
    }

    const occMatch = safeMatch(/Occupancy:\s*(.*?)\n/);
    if (occMatch) {
      const match = staticOptions.occupancies.find(opt => occMatch.includes(opt.en) || opt.en.includes(occMatch));
      if (match) setOccupancy(match.id);
    }

    const arMatch = safeMatch(/Aspect Ratio:\s*(.*?)\n/);
    if (arMatch) setAspectRatio(arMatch);

    const personaMatch = safeMatch(/Core Archetype:\s*(.*?)\n/) || safeMatch(/Director Persona:\s*(.*?)\n/);
    if (personaMatch) {
      const match = coreArchetypes.find(p => personaMatch.includes(p.shortTitle));
      if (match) setCoreArchetype(match.id);
    }

    const bodyMatch = safeMatch(/Stroke Body:\s*(.*?)\n/);
    if (bodyMatch) {
      const wMatch = staticOptions.stemWeights.find(opt => bodyMatch.includes(opt.en));
      if (wMatch) setStemWeight(wMatch.id);
      const wdMatch = staticOptions.widths.find(opt => bodyMatch.includes(opt.en));
      if (wdMatch) setCharWidth(wdMatch.id);
      const pMatch = staticOptions.proportions.find(opt => bodyMatch.includes(opt.en));
      if (pMatch) setCharProportion(pMatch.id);
    }

    const jointsMatch = safeMatch(/Joints & Flow:\s*(.*?)\n/);
    if (jointsMatch) {
      const kMatch = staticOptions.kerningOptions.find(opt => jointsMatch.includes(opt.en));
      if (kMatch) setKerning(kMatch.id);
      const lMatch = staticOptions.letterConnections.find(opt => jointsMatch.includes(opt.en));
      if (lMatch) setLetterConnection(lMatch.id);
      const iMatch = staticOptions.internalSpaces.find(opt => jointsMatch.includes(opt.en));
      if (iMatch) setInternalSpace(iMatch.id);
    }

    const termMatch = safeMatch(/Terminals & Edges:\s*(.*?)\n/);
    if (termMatch) {
      const tMatch = staticOptions.terminalStyles.find(opt => termMatch.includes(opt.en));
      if (tMatch) setTerminalStyle(tMatch.id);
      const sMatch = staticOptions.strokeSharpness.find(opt => termMatch.includes(opt.en));
      if (sMatch) setStrokeSharpness(sMatch.id);
      const cMatch = staticOptions.cornerStyles.find(opt => termMatch.includes(opt.en));
      if (cMatch) setCornerStyle(cMatch.id);
      const eMatch = staticOptions.strokeExtensions.find(opt => termMatch.includes(opt.en));
      if (eMatch) setStrokeExtension(eMatch.id);
    }

    const auraMatch = safeMatch(/Design Aura \(Normalized Intent\):\s*(.*?)\n/);
    if (auraMatch && auraMatch !== "Standard deployment") setCustomDesignInjections(auraMatch);

    const modeMatch = safeMatch(/Mode:\s*(.*?)\n/);
    if (modeMatch) {
      if (modeMatch.includes("OFF")) {
        setIsEnhanceModeEnabled(false);
      } else {
        setIsEnhanceModeEnabled(true);
        if (modeMatch.includes("REFINE")) setEnhanceMode("refine");
        if (modeMatch.includes("VARIATION")) setEnhanceMode("variation");
        if (modeMatch.includes("DECONSTRUCT")) setEnhanceMode("deconstruct");
      }
    }

    const dynStatusMatch = safeMatch(/Status:\s*(.*?)\n/);
    if (dynStatusMatch) setMomentumActive(dynStatusMatch.includes("ENABLED"));

    const kinMatch = safeMatch(/Kinetic Velocity:\s*(.*?)\n/);
    if (kinMatch) {
      const match = staticOptions.kineticVelocities.find(opt => kinMatch.includes(opt.en));
      if (match) setKineticVelocity(match.id);
    }

    const slantMatch = safeMatch(/Slant:\s*(.*?)\n/);
    if (slantMatch) {
      const match = staticOptions.slantAngles.find(opt => slantMatch.includes(opt.en));
      if (match) setSlantAngle(match.id);
    }

    const slicingMatch = safeMatch(/Slicing Force:\s*(.*?)\n/);
    if (slicingMatch) {
      const match = staticOptions.slicingIntensities.find(opt => slicingMatch.includes(opt.en));
      if (match) setSlicingIntensity(match.id);
    }

    const damageMatch = safeMatch(/Damage\/Erosion:\s*(.*?)\n/);
    if (damageMatch) {
      const match = staticOptions.deformationDamages.find(opt => damageMatch.includes(opt.en));
      if (match) setDeformationDamage(match.id);
    }

    let newGuards = [];
    if (text.includes("ANTI-MUTATION MAX") || text.includes("[L1 LOCK] TEXT INTEGRITY MAX")) newGuards.push("guard_mutation");
    if (text.includes("2D FLAT ENFORCEMENT") || text.includes("[L6 LOCK] 2D FLAT ENFORCEMENT") || text.includes("[L6: STYLE GUARDRAILS - CRITICAL 2D ENFORCEMENT]")) newGuards.push("guard_3d");
    if (text.includes("ANTI-STACKING") || text.includes("[L2 LOCK] ANTI-SQUISHING")) newGuards.push("guard_layout");
    if (text.includes("CLEAN SILHOUETTE") || text.includes("[L7 LOCK] CLEAN SILHOUETTE")) newGuards.push("guard_noise");
    setActiveGuards(newGuards);

    setIsAdvancedOptionsEnabled(true);
    setIsImportModalOpen(false);
    setImportInputValue("");
  };

  const handleExpandIntent = async () => {
    if (!customDesignInjections.trim() || isExpandingIntent) return; setIsExpandingIntent(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `[YOUR PERSONA]: ${persona.role}
Task: AURA NORMALIZATION ENGINE.
Convert the user's emotional/abstract keyword into strict structural, morphological, and parameter-based directives IN ENGLISH ONLY.
DO NOT use vague emotional words in the output. Translate feelings into edges, contrast, kerning, and terminal shapes.
Format: ONLY English, 2-3 sentences of highly optimized structural prompt descriptions (comma separated if needed).`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
      const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(data.candidates[0].content.parts[0].text.trim());
    } catch (e) {} finally { setIsExpandingIntent(false); }
  };

  const handleEditExpandIntent = async () => {
    if (!editInstruction.trim() || isEditExpandingIntent) return; setIsEditExpandingIntent(true);
    const persona = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const systemPrompt = `[YOUR PERSONA]: ${persona.role}
Task: AURA NORMALIZATION ENGINE (Micro-Edit Mode).
Expand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction IN ENGLISH ONLY.
CRITICAL RULE: Must enforce 95-98% silhouette preservation. NO structure changes, NO layout drift.
Focus only on edge refinement, surface detail, or micro incisions.
Format: ONLY English, strict structural commands.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
      const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(data.candidates[0].content.parts[0].text.trim());
    } catch (e) {} finally { setIsEditExpandingIntent(false); }
  };

  // --- V18: Prompt Intermediate Representation (IR) Compiler ---
  const buildPromptIR = () => {
    const weightList = [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])];
    const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
    const terminalList = [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])];
    const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
    const textureList = staticOptions.strokeTextures;
    const kineticList = [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])];
    const slantList = staticOptions.slantAngles;
    const destList = staticOptions.deformationDamages;

    const weightEn = getOptionEn(weightList, stemWeight); const kerningEn = getOptionEn(kerningList, kerning); const terminalEn = getOptionEn(terminalList, terminalStyle); const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness); const textureEn = getOptionEn(textureList, strokeTexture); const widthEn = getOptionEn(staticOptions.widths, charWidth); const proportionEn = getOptionEn(staticOptions.proportions, charProportion); const cornerList = [...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]; const cornerEn = getOptionEn(cornerList, cornerStyle); const kineticEn = getOptionEn(kineticList, kineticVelocity); const slantEn = getOptionEn(slantList, slantAngle); const destructionEn = getOptionEn(destList, deformationDamage); const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy); const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity); const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);
    const extensionEn = getOptionEn([...staticOptions.strokeExtensions, ...(dynamicOptions.strokeExtensions || [])], strokeExtension);
    const letterConnEn = getOptionEn([...staticOptions.letterConnections, ...(dynamicOptions.letterConnections || [])], letterConnection);
    const internalSpaceEn = getOptionEn([...staticOptions.internalSpaces, ...(dynamicOptions.internalSpaces || [])], internalSpace);
    const mmoSilhouetteEn = getOptionEn([...staticOptions.MMOSilhouetteFramings, ...(dynamicOptions.MMOSilhouetteFramings || [])], mmoSilhouetteFraming);

    let modIntensityEn = "0%"; let readabilityFloorEn = "90%"; let modAllowedEn = "None"; let modForbiddenEn = "Any structural mutation";
    if (isEnhanceModeEnabled) {
      if (enhanceMode === 'refine') { modIntensityEn = "5-15%"; readabilityFloorEn = "85%"; modAllowedEn = "Optical balance, serif sharpening, minor cut refinements."; modForbiddenEn = "Structural reinterpretation, letter merging, excessive ornamentation."; }
      else if (enhanceMode === 'variation') { modIntensityEn = "20-45%"; readabilityFloorEn = "70%"; modAllowedEn = "Stroke proportion variation, partial merging, counterform reinterpretation."; modForbiddenEn = "Illegible deconstruction, total structural collapse."; }
      else if (enhanceMode === 'deconstruct') { modIntensityEn = "50-75%"; readabilityFloorEn = "40%"; modAllowedEn = "Stroke disassembly, severe overlapping, asymmetric fragmentation, emblemization."; modForbiddenEn = "Dropping below minimum readability floor. Random noise generation."; }
    }

    let combatVectorEn = "None"; let combatImpactZoneEn = "None"; let combatDeformationEn = "0%";
    if (momentumActive) { combatVectorEn = "Right-to-left slash or diagonal compression based on aura"; combatImpactZoneEn = "Asymmetrical focus (e.g., right terminal or center core)"; combatDeformationEn = "20-35% maximum deformation limit"; }

    let layoutEn = "Single horizontal row.";
    if (layoutType === "2Lines") layoutEn = "Two-tier vertical stacked composition.";
    else if (layoutType === "TitleSub") layoutEn = `Hierarchical composition. Main title on top, explicitly smaller subtitle below (${subSizeEn}).`;
    else if (layoutType === "SubTitle") layoutEn = `Hierarchical composition. Explicitly smaller subtitle on top (${subSizeEn}), Main title below.`;
    else if (layoutType === "Center") layoutEn = "Centralized balanced composition.";

    let aspectRatioEn = "";
    if (aspectRatio === "1:1") aspectRatioEn = "(perfectly 1:1 square canvas resolution:1.5), symmetric square frame, ";
    else if (aspectRatio === "16:9") aspectRatioEn = "(16:9 widescreen canvas format:1.4), horizontal wide framing, ";
    else if (aspectRatio === "9:16") aspectRatioEn = "(9:16 vertical portrait canvas format:1.5), tall vertical framing, ";
    else if (aspectRatio === "2.76:1") aspectRatioEn = "(ultra-wide 2.76:1 cinematic panorama canvas:1.5), extreme horizontal framing, ";

    const activeCoreData = coreArchetypes.find(p => p.id === coreArchetype) || coreArchetypes[0];
    const userAuraEn = customDesignInjections || "Standard deployment";

    const isWhiteBg = baseStyle === "WhiteBlack";
    const bgDescEn = isWhiteBg ? "STARK WHITE Background, SOLID BLACK Subject" : "JET BLACK Background, RADIANT WHITE Subject";
    const solidBgPrompt = isWhiteBg ? "pure solid #FFFFFF bright white void background, solid #000000 matte black text" : "pure solid #000000 matte black void background, solid #FFFFFF bright white text";

    const isSlicingActive = slicingIntensity !== "Slic_None";
    const intactGuard = isSlicingActive ? "" : "perfectly intact silhouette, ";
    const optimizedBase = `masterpiece, best quality, ultra highres, insanely detailed, 8k resolution, isolated standalone typography graphic, clear cutout text shape, flawless silhouette boundary, ${intactGuard}highly legible, AAA game title aesthetic, sharp geometric corners, precise structural lines, strong material contrast`;

    let troubleshootingBlockEn = "";
    let activeGuardsEn = [];
    if (activeGuards.length > 0) {
      const activeTs = safetyGuards.filter(opt => activeGuards.includes(opt.id));
      troubleshootingBlockEn = `\n\n[L8: NEGATIVE ENFORCEMENT & GUARDS]\n` + activeTs.map(opt => `- ${opt.fixEn}`).join("\n");
      activeGuardsEn = activeTs.map(opt => opt.fixEn);
    }

    let cgTextInstruction = `Render EXACTLY the text "${inputText}"`;
    let explicitTwoLineInstruction = `The text "${inputText.replace(/\n/g, ' ')}"`;

    if (inputText.includes('\n') || layoutType !== "1Line") {
      const lines = inputText.split('\n');
      const topRow = lines[0] || "";
      const bottomRow = lines[1] || topRow;

      if (layoutType === "TitleSub") {
        cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${topRow}" (Huge Main Title)\n- [BOTTOM ROW]: "${bottomRow}" (Explicitly smaller Subtitle)`;
        explicitTwoLineInstruction = `(Two lines of text:1.4). Top row: "${topRow}". Bottom row: "${bottomRow}".`;
      } else if (layoutType === "SubTitle") {
        cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${topRow}" (Explicitly smaller Subtitle)\n- [BOTTOM ROW]: "${bottomRow}" (Huge Main Title)`;
        explicitTwoLineInstruction = `(Two lines of text:1.4). Top row: "${topRow}". Bottom row: "${bottomRow}".`;
      } else if (layoutType === "2Lines" || layoutType === "Center") {
        cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${topRow}"\n- [BOTTOM ROW]: "${bottomRow}"`;
        explicitTwoLineInstruction = `(Strictly two lines of text vertical stacked:1.5). Top row: "${topRow}". Bottom row: "${bottomRow}".`;
      }
    }

    return {
      inputText, layoutEn, mmoSilhouetteEn, occupancyEn, aspectRatio, activeCoreData, weightEn, widthEn, proportionEn, kerningEn, letterConnEn, internalSpaceEn, terminalEn, sharpnessEn, cornerEn, extensionEn, userAuraEn, personaSliderValue, modIntensityEn, readabilityFloorEn, modAllowedEn, modForbiddenEn, momentumActive, kineticEn, slantEn, slicingEn, combatVectorEn, combatImpactZoneEn, combatDeformationEn, bgDescEn, destructionEn, troubleshootingBlockEn, cgTextInstruction, explicitTwoLineInstruction, optimizedBase, solidBgPrompt, isSlicingActive, activeGuardsEn, aspectRatioEn
    };
  };

  const buildPrompts = () => {
    const ir = buildPromptIR();

    const generatedBaseEn = `[TYPECORE ${TYPECORE_VERSION} SYSTEM SPECIFICATION]

[L1: TEXT LOCK - MAX PRIORITY]
- Exact Text: "${ir.inputText}"
- Expected Output: 100% structural retention.
- Rule: NO text mutation, NO extra letters, NO missing letters, NO unrequested translation.

[L2: LAYOUT LOCK]
- Composition: ${ir.layoutEn}
- Alignment: ${ir.mmoSilhouetteEn}
- Occupancy: ${ir.occupancyEn}
- Aspect Ratio: ${ir.aspectRatio}

[L3: MORPHOLOGY]
- Core Archetype: ${ir.activeCoreData.shortTitle}
[STRUCTURAL SILHOUETTE LANGUAGE]
- ${ir.activeCoreData.language.split(', ').join('\n- ')}
- Stroke Body: ${ir.weightEn}, ${ir.widthEn} width, ${ir.proportionEn} proportion.
- Joints & Flow: ${ir.kerningEn}, ${ir.letterConnEn}, ${ir.internalSpaceEn}.
- Terminals & Edges: ${ir.terminalEn}, ${ir.sharpnessEn}, ${ir.cornerEn}, ${ir.extensionEn}.
- Design Aura (Normalized Intent): ${ir.userAuraEn}
- Sub-Trait Focus: ${getSliderText(ir.personaSliderValue)}

[L4: MODIFIER ENGINE]
- Mode: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : "OFF"}
- Intensity Budget: ${ir.modIntensityEn}
- Legibility Floor: MUST maintain at least ${ir.readabilityFloorEn} readability.
- Allowed Edits: ${ir.modAllowedEn}
- Forbidden Edits: ${ir.modForbiddenEn}

[L5: COMBAT DYNAMICS]
- Status: ${ir.momentumActive ? "ENABLED" : "DISABLED"}
- Kinetic Velocity: ${ir.kineticEn}
- Slant: ${ir.slantEn}
- Slicing Force: ${ir.slicingEn}
- Vector/Impact Constraints: Vector(${ir.combatVectorEn}), Impact Zone(${ir.combatImpactZoneEn}), Deformation Budget(${ir.combatDeformationEn}).

[L6: STYLE GUARDRAILS - CRITICAL 2D ENFORCEMENT]
- 2D Vector Rule: STRICTLY flat 2D vector silhouette graphic. ZERO depth. NO lighting. NO shading.
- Background Rule: Isolated on solid background. NO scenery. NO environmental elements.
- Material Rule: NO colors, ZERO chroma. Strict monochrome (${ir.bgDescEn}).
- Damage/Erosion: ${ir.destructionEn}

[NEGATIVE PROMPT (STRICT PROHIBITIONS)]
- ${ir.activeCoreData.forbidden}
- NO 3D rendering, NO bevel, NO drop shadows, NO shading, NO volumetric lighting.
- NO background scenery, NO gradient, NO realistic textures.
- NO illegible distortion falling below the Legibility Floor.
- NO unrequested layout drifting or vertical squishing.${ir.troubleshootingBlockEn}`.trim();

    const chatGPTOutput = `Generate a masterpiece, ultra highres, insanely detailed 2D flat typography graphic for EXACTLY the text "${ir.inputText}".

Aesthetic & Style: AAA game title aesthetic, pure 2D custom typography silhouette, logo-grade flat graphic (not a generic font, not a plain vector icon). ${ir.userAuraEn}.
Morphology ([${ir.activeCoreData.shortTitle}]): Enforce ${ir.activeCoreData.language}. Implement ${ir.weightEn}, ${ir.widthEn} width, ${ir.proportionEn}, ${ir.kerningEn}, ${ir.letterConnEn}, ${ir.internalSpaceEn}. Terminals should be ${ir.terminalEn}, ${ir.sharpnessEn}, ${ir.cornerEn}, ${ir.extensionEn}.
Surface & Dynamics: Apply ${ir.destructionEn}. The text should show ${ir.kineticEn}, ${ir.slantEn}, and ${ir.slicingEn}.
Layout constraints: ${ir.layoutEn} Occupancy must be ${ir.occupancyEn}. Canvas size should be ${ir.aspectRatio}.
Environment: MUST be isolated on a ${ir.solidBgPrompt}.
CRITICAL NEGATIVE PROMPT: Absolutely NO 3D extrusion, NO shading, NO lighting, NO background scenery, NO gradients, NO realistic textures. Flawless silhouette boundary with sharp geometric corners and perfectly intact layout.`;

    const midjourneyOutput = `An epic cinematic 2D flat typography graphic, ${ir.userAuraEn}, typography logotype for exactly the text "${ir.inputText.replace(/\n/g, ' ')}", ${ir.optimizedBase}, pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon, [${ir.activeCoreData.shortTitle}], ${ir.activeCoreData.language}, ${ir.weightEn}, ${ir.widthEn} width, ${ir.proportionEn}, ${ir.kerningEn}, ${ir.letterConnEn}, ${ir.internalSpaceEn}, ${ir.terminalEn}, ${ir.sharpnessEn}, ${ir.cornerEn}, ${ir.extensionEn}, ${ir.destructionEn}, ${ir.kineticEn}, ${ir.slantEn}, ${ir.slicingEn}, ${ir.mmoSilhouetteEn}, ${ir.solidBgPrompt}, isolated on solid background, wide panoramic span, ${ir.layoutEn}, ${occupancy.replace('%', ' percent')} occupancy, --ar ${ir.aspectRatio.replace(':', ':')} --no 3d, depth, shading, lighting, realistic, shadow, volumetric, bevel, emboss, texture, background elements, scenery, gradient, color, generic font, plain vector, plain svg`;

    const holeGuard = ir.isSlicingActive ? "" : "perfectly intact silhouette, absolutely NO holes through text. ";
    const nanoBananaOutput = `An epic cinematic 2D flat typography graphic, macro photography, hyper-detailed single focal point, large typography, flat focal plane, strictly zero perspective distortion. ${ir.aspectRatioEn}${ir.explicitTwoLineInstruction} is crafted as a pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon. Feature: ${ir.activeCoreData.weightTags}, ${ir.weightEn}, ${ir.kerningEn}, ${ir.terminalEn}. The structure is modified by ${ir.kineticEn}, ${ir.slantEn}, and (${ir.slicingEn}:1.4). The surface is transformed by ${ir.destructionEn}, ${ir.optimizedBase}, ${ir.solidBgPrompt}. Highly legible, 95% shape preservation, AAA game title aesthetic. Flawless silhouette boundary, ${holeGuard}(pure 2D flat silhouette:1.5), ${ir.layoutEn}, ${ir.occupancyEn}, ${getSliderText(ir.personaSliderValue)}, ${ir.userAuraEn}, ${ir.activeGuardsEn.join(', ')}.
Negative prompt: (3D rendering:1.9), (drop shadows:1.9), (bevel:1.8), (perspective:1.8), (background scenery:1.8), (gradients:1.5), (shading:1.5), (lighting:1.5), ${ir.activeCoreData.forbidden}`;

    return { baseTechnicalEn: generatedBaseEn, baseTechnicalKo: generatedBaseEn, chatGPTOutput, midjourneyOutput, nanoBananaOutput };
  };

  const buildEditPrompts = () => {
    const ir = buildPromptIR();
    const instruction = editInstruction || "원본 이미지의 형태를 유지하며 디테일을 보완합니다.";
    const autoRefineInstructionEn = applyAutoRefine ? `[SHAPE NORMALIZATION PROTOCOL] Auto-correct rough/sketched geometry into premium 2D vector forms.` : "Maintain base sketch quality.";

    const generatedBaseEn = `[TYPECORE V17 MICRO-EDIT SPECIFICATION]

[L1: BASE LOCK & INTEGRITY (MAX PRIORITY)]
- Base Image: Treat as the STRICT structural foundation.
- Shape Preservation Lock: MUST preserve 95-98% of the original silhouette.
- Readability Floor: Minimum ${ir.readabilityFloorEn}.
- Deformation Budget: Maximum ${ir.modIntensityEn} structural shift. Outline changes FORBIDDEN.

[L3: EDIT DIRECTION & MORPHOLOGY]
- Aura (Normalized): "${instruction}"
- Sub-Trait Focus: ${getSliderText(ir.personaSliderValue)}
- Core Archetype: ${ir.activeCoreData.shortTitle}
[STRUCTURAL SILHOUETTE LANGUAGE]
- ${ir.activeCoreData.language.split(', ').join('\n- ')}

[L4: MICRO-REFINEMENT MODIFIERS]
- Framing/Alignment: ${ir.mmoSilhouetteEn}
- Scope: Edge refinement, surface detail, micro incision ONLY.
- Stroke Mod: ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}
- Element Mod: ${getOptionEn(staticOptions.editElementMods, editElementMod)}
- Surface Mod: ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}
- Auto-Refine: ${autoRefineInstructionEn}

[L5: KINETIC & DAMAGE]
- Kinetic Force: ${ir.kineticEn}
- Damage: ${ir.destructionEn}

[L6: STYLE GUARDRAILS - CRITICAL 2D ENFORCEMENT]
- 2D Vector Rule: STRICTLY flat 2D vector silhouette graphic. ZERO depth. NO lighting. NO shading.
- Background Rule: Isolated on solid background. NO scenery. NO environmental elements.
- Material Rule: NO colors. Strict monochrome (${ir.bgDescEn}).

[NEGATIVE PROMPT (STRICT PROHIBITIONS)]
- NO structure changes. NO layout drift.
- NO 3D rendering. NO shading, NO volumetric lighting. NO materials. Pure Black & White ONLY.
- NO background scenery.
- ${ir.activeCoreData.forbidden}${ir.troubleshootingBlockEn}`.trim();

    const chatGPTOutput = `Act as an expert Typography Engine (V17 Edit Mode). Redraw the provided reference image into a masterpiece, ultra highres, insanely detailed 2D flat typography graphic. STRICTLY MAINTAIN basic shape (95-98% silhouette preservation lock). Maximum deformation ${ir.modIntensityEn}.

Aesthetic & Style: AAA game title aesthetic, pure 2D custom typography silhouette, logo-grade flat graphic (not generic font, not plain vector icon). ${instruction} ${getSliderText(ir.personaSliderValue)}.
Micro-Refinements ([${ir.activeCoreData.shortTitle}]): Enforce ${ir.activeCoreData.language}. Apply Stroke(${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}) and Surface(${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}).
Dynamics: ${ir.kineticEn}, ${ir.destructionEn}.
Environment: ${ir.solidBgPrompt}. Readability floor ${ir.readabilityFloorEn}.
CRITICAL NEGATIVE PROMPT: Absolutely NO 3D extrusion, NO shading, NO lighting, NO background scenery, NO gradients. Flawless silhouette boundary.`;

    const midjourneyOutput = `[UPLOAD BASE IMAGE AS REFERENCE] An epic cinematic 2D flat typography graphic, image-to-image edit, exact structural foundation, ${ir.userAuraEn}, ${ir.optimizedBase}, pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon, [${ir.activeCoreData.shortTitle}], ${ir.activeCoreData.language}, ${ir.solidBgPrompt}, isolated on solid background, ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}, ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}, ${ir.kineticEn}, wide panoramic span, --ar 16:9 --iw 1.5 --style raw --no 3d, depth, shading, lighting, realistic, shadow, volumetric, bevel, emboss, texture, background elements, scenery, gradient, color, generic font, plain vector, plain svg`;

    const holeGuard = ir.isSlicingActive ? "" : "perfectly intact silhouette, absolutely NO holes through text. ";
    const nanoBananaOutput = `[UPLOAD BASE IMAGE AS REFERENCE] An epic cinematic 2D flat typography graphic, macro photography, hyper-detailed single focal point, flat focal plane, strictly zero perspective distortion. Image-to-image edit, strictly maintain basic shape, (95-98% silhouette preservation lock:1.5). ${ir.aspectRatioEn}The text is crafted as a pure 2D custom typography silhouette, logo-grade flat graphic, not generic font, not plain vector icon. Feature: ${ir.activeCoreData.weightTags}, ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}, ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}. The structure is modified by ${ir.kineticEn}, ${ir.slantEn}, and (${ir.slicingEn}:1.4). The surface is transformed by ${ir.destructionEn}, ${ir.optimizedBase}, ${ir.solidBgPrompt}. Highly legible, AAA game title aesthetic. Flawless silhouette boundary. ${holeGuard}(pure 2D flat silhouette:1.5), ${getSliderText(ir.personaSliderValue)}, ${instruction}, ${ir.activeGuardsEn.join(', ')}.
Negative prompt: (3D rendering:1.9), (drop shadows:1.9), (bevel:1.8), (perspective:1.8), (background scenery:1.8), (gradients:1.5), (shading:1.5), (lighting:1.5), ${ir.activeCoreData.forbidden}`;

    return { baseTechnicalEn: generatedBaseEn, baseTechnicalKo: generatedBaseEn, chatGPTOutput, midjourneyOutput, nanoBananaOutput };
  };

  const currentPrompts = isEditMode ? buildEditPrompts() : buildPrompts();
  let currentOutputContent = "";
  if (currentModel === 'NanoBanana') currentOutputContent = isEditMode ? editDramaticPrompt : dramaticPrompt;
  else if (currentModel === 'Midjourney') currentOutputContent = isEditMode ? editMjPrompt : mjOptimizedPrompt;
  else if (currentModel === 'ChatGPT') currentOutputContent = isEditMode ? editCgPrompt : cgEnhancedPrompt;

  if (!currentOutputContent && currentModel !== 'Overview') currentOutputContent = "프롬프트를 컴파일해주세요.";

  const handleCompileDramatic = async () => {
    if (isEnhancing) return;
    if (!(await ensureCanGenerate())) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setDramaticPrompt(currentPrompts.nanoBananaOutput);
      setIsOutdated(false);
      setIsEnhancing(false);
    }, 400);
  };

  const requestEditDramaticEnhancement = async () => {
    if (isEditEnhancing) return;
    setIsEditEnhancing(true);
    setTimeout(() => {
      setEditDramaticPrompt(currentPrompts.nanoBananaOutput);
      setIsEditOutdated(false);
      setIsEditEnhancing(false);
    }, 400);
  };

  // current 진입점은 NanoBanana 컴파일 핸들러를 isEditMode 와 무관하게 단일 진입으로 노출.
  const handleCompileNanoBanana = isEditMode ? requestEditDramaticEnhancement : handleCompileDramatic;

  const handleCompileMj = () => {
    setIsMjOptimizing(true);
    setTimeout(() => {
      if (isEditMode) { setEditMjPrompt(currentPrompts.midjourneyOutput); setIsEditOutdated(false); }
      else { setMjOptimizedPrompt(currentPrompts.midjourneyOutput); setIsOutdated(false); }
      setIsMjOptimizing(false);
    }, 400);
  };

  const handleCompileCg = () => {
    setIsCgEnhancing(true);
    setTimeout(() => {
      if (isEditMode) { setEditCgPrompt(currentPrompts.chatGPTOutput); setIsEditOutdated(false); }
      else { setCgEnhancedPrompt(currentPrompts.chatGPTOutput); setIsOutdated(false); }
      setIsCgEnhancing(false);
    }, 400);
  };

  const isGeneratingMj = isEditMode ? isEditMjOptimizing : isMjOptimizing;
  const isGeneratingCg = isEditMode ? isEditCgEnhancing : isCgEnhancing;
  const isGeneratingNano = isEditMode ? isEditEnhancing : isEnhancing;

  return {
    // 전역
    usageModal, theme, isLight,
    // 뷰 상태
    currentView, setCurrentView, isEditMode,
    activeModel, activeEditModel, currentModel, setModel,
    isSidebarOpen, setIsSidebarOpen,
    // 입력/설정
    inputText, setInputText,
    base64Image, setBase64Image,
    activePurpose, setActivePurpose,
    coreArchetype, setCoreArchetype,
    coreDropdownOpen, setCoreDropdownOpen,
    isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled,
    isEnhanceModeEnabled, setIsEnhanceModeEnabled,
    enhanceMode, setEnhanceMode,
    momentumActive, setMomentumActive,
    personaSliderValue, setPersonaSliderValue,
    baseStyle, setBaseStyle,
    aspectRatio, setAspectRatio,
    occupancy, setOccupancy,
    layoutType, setLayoutType,
    layoutPreset, setLayoutPreset,
    stemWeight, setStemWeight,
    charWidth, setCharWidth,
    charProportion, setCharProportion,
    kerning, setKerning,
    subTitleSize, setSubTitleSize,
    terminalStyle, setTerminalStyle,
    strokeTexture, setStrokeTexture,
    strokeSharpness, setStrokeSharpness,
    strokeExtension, setStrokeExtension,
    cornerStyle, setCornerStyle,
    slantAngle, setSlantAngle,
    kineticVelocity, setKineticVelocity,
    slicingIntensity, setSlicingIntensity,
    deformationDamage, setDeformationDamage,
    letterConnection, setLetterConnection,
    internalSpace, setInternalSpace,
    logoDegree, setLogoDegree,
    mmoSilhouetteFraming, setMmoSilhouetteFraming,
    mmoSurroundingElement, setMmoSurroundingElement,
    dynamicOptions, setDynamicOptions,
    customDesignInjections, setCustomDesignInjections,
    activeGuards, setActiveGuards, toggleGuard,
    // 결과 & 컴파일
    dramaticPrompt, mjOptimizedPrompt, cgEnhancedPrompt,
    editDramaticPrompt, editMjPrompt, editCgPrompt,
    aiRecSummary, setAiRecSummary,
    // 로딩
    isEnhancing, isMjOptimizing, isCgEnhancing, isExpandingIntent, isRecommending,
    isEditEnhancing, isEditMjOptimizing, isEditCgEnhancing, isEditExpandingIntent,
    isGeneratingMj, isGeneratingCg, isGeneratingNano,
    // 복사 / 사이드바
    copiedTop, copiedBottom,
    // Import 모달
    isImportModalOpen, setIsImportModalOpen,
    importInputValue, setImportInputValue,
    handleImportPrompt,
    // 업로드
    creationUploadedImage, setCreationUploadedImage,
    isCreationDragging, isAnalyzingCreation,
    editUploadedImage, setEditUploadedImage,
    isDragging,
    editInstruction, setEditInstruction,
    applyAiRecInEdit, setApplyAiRecInEdit,
    applyAutoRefine, setApplyAutoRefine,
    editStrokeMod, setEditStrokeMod,
    editElementMod, setEditElementMod,
    editSurfaceMod, setEditSurfaceMod,
    openCardId, setOpenCardId,
    editOpenCardId, setEditOpenCardId,
    handleToggleCard, handleEditToggleCard,
    isOutdated, isEditOutdated, isPromptOutdated,
    isPromptExpanded, isEditPromptExpanded, isExpanded, setExpanded,
    // 튜닝룸
    isTuningModalOpen, setIsTuningModalOpen,
    isEditTuningModalOpen, setIsEditTuningModalOpen,
    tuningChatHistory, editTuningChatHistory,
    tuningInputValue, setTuningInputValue,
    editTuningInputValue, setEditTuningInputValue,
    isTuningLoading, isEditTuningLoading,
    currentTunedAura, setCurrentTunedAura,
    currentTunedEditAura, setCurrentTunedEditAura,
    tuningReferenceImage, setTuningReferenceImage,
    editTuningReferenceImage, setEditTuningReferenceImage,
    tuningChatRef, editTuningChatRef,
    handleTuningImageUpload,
    openTuningRoom, openEditTuningRoom,
    handleSendTuningMessage, handleSendEditTuningMessage,
    // 핸들러
    incomingFromArc, setIncomingFromArc,
    hasKoreanAura, hasKoreanEdit,
    handlePurposeChange,
    handleLayoutPresetChange,
    getValidationScores, executeAutoCorrection, handleApplyAllCorrections,
    handleReset, copyToClipboard,
    handleCreationDragOver, handleCreationDragLeave, handleCreationDrop, handleCreationImageUpload,
    handleDragOver, handleDragLeave, handleEditDrop, handleEditImageUpload,
    analyzeCreationImage,
    handleExpandIntent, handleEditExpandIntent,
    extractRecipe,
    handleCompileDramatic, requestEditDramaticEnhancement, handleCompileNanoBanana,
    handleCompileMj, handleCompileCg,
    currentPrompts, currentOutputContent,
  };
}
