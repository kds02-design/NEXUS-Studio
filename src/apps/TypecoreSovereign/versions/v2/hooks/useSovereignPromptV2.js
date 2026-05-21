/* eslint-disable */
// v2 전용 메인 상태/핸들러 훅. 원본 v2 App() 의 모든 state, useEffect, 핸들러,
// buildPrompts / buildEditPrompts / fetch 호출까지 그대로 옮긴 격리 사본.
import { useState, useRef, useEffect } from 'react';
import { directorPersonas } from '../constants/personas.jsx';
import { staticOptions, troubleshooterOptions } from '../constants/options.js';
import { extractJson, getOptionEn, getOptionName, getSliderText, getSliderTextKo } from '../constants/utils.js';

export function useSovereignPromptV2({ apiKey }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentView, setCurrentView] = useState("editor");

    const [inputText, setInputText] = useState("데스나이트");
    const [base64Image, setBase64Image] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    // 페르소나 및 핵심 옵션
    const [aiPersona, setAiPersona] = useState('sovereign');
    const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
    const [isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled] = useState(false);
    const [isEnhanceModeEnabled, setIsEnhanceModeEnabled] = useState(true);
    const [enhanceMode, setEnhanceMode] = useState("refine");
    const [momentumActive, setMomentumActive] = useState(false);
    const [auraPriority, setAuraPriority] = useState("Balanced");
    const [personaSliderValue, setPersonaSliderValue] = useState(50);

    // MMO Specific States
    const [baseStyle, setBaseStyle] = useState("BlackWhite");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [occupancy, setOccupancy] = useState("50%");
    const [layoutType, setLayoutType] = useState("1Line");
    const [layoutPreset, setLayoutPreset] = useState("WideTitle");
    const [stemWeight, setStemWeight] = useState("Stem_Heavy");
    const [charWidth, setCharWidth] = useState("Normal");
    const [charProportion, setCharProportion] = useState("P_Std");
    const [kerning, setKerning] = useState("Kern_Std");
    const [subTitleSize, setSubTitleSize] = useState("Sub_Small");

    const [scriptType, setScriptType] = useState("Lineage_M");
    const [terminalStyle, setTerminalStyle] = useState("Term_Chisel");
    const [strokeTexture, setStrokeTexture] = useState("Tex_Frayed");
    const [strokeSharpness, setStrokeSharpness] = useState("Sharp_Razor");
    const [strokeExtension, setStrokeExtension] = useState("Ext_Razor");
    const [cornerStyle, setCornerStyle] = useState("Corner_Right");
    const [slantAngle, setSlantAngle] = useState("Slant_0");
    const [kineticVelocity, setKineticVelocity] = useState("Vel_Slashing");
    const [slicingIntensity, setSlicingIntensity] = useState("Slic_Partial");
    const [deformationDamage, setDeformationDamage] = useState("Damage_None");

    const [letterConnection, setLetterConnection] = useState("Conn_Indep");
    const [internalSpace, setInternalSpace] = useState("Space_Std");
    const [logoDegree, setLogoDegree] = useState("Logo_Std");

    const [mmoSilhouetteFraming, setMmoSilhouetteFraming] = useState("Horizontal");
    const [mmoSurroundingElement, setMmoSurroundingElement] = useState("Clean");

    const [dynamicOptions, setDynamicOptions] = useState({
        MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [],
        strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [],
        kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: []
    });

    const [customDesignInjections, setCustomDesignInjections] = useState("");
    const [aiModel, setAiModel] = useState("Overview");
    const [editAiModel, setEditAiModel] = useState("Overview");

    // Prompt Output States
    const [dramaticPrompt, setDramaticPrompt] = useState("");
    const [mjOptimizedPrompt, setMjOptimizedPrompt] = useState("");
    const [cgEnhancedPrompt, setCgEnhancedPrompt] = useState("");

    const [aiRecSummary, setAiRecSummary] = useState(null);

    // Loading States
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
    const [baseLangView, setBaseLangView] = useState('ko');

    // Manual Override Prompts
    const [manualBasePrompt, setManualBasePrompt] = useState(null);
    const [editManualBasePrompt, setEditManualBasePrompt] = useState(null);
    const [activeTroubleshoots, setActiveTroubleshoots] = useState([]);
    const [activeGuards, setActiveGuards] = useState(['guard_mutation', 'guard_3d', 'guard_layout']);

    // Edit Mode States
    const [editUploadedImage, setEditUploadedImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState("");
    const [applyAiRecInEdit, setApplyAiRecInEdit] = useState(false);
    const [applyAutoRefine, setApplyAutoRefine] = useState(false);

    const [editStrokeMod, setEditStrokeMod] = useState("E_Stroke_None");
    const [editElementMod, setEditElementMod] = useState("E_Elem_None");
    const [editSurfaceMod, setEditSurfaceMod] = useState("E_Surf_None");

    const [openCardId, setOpenCardId] = useState("layout");
    const [editOpenCardId, setEditOpenCardId] = useState("edit_retouch");

    // Prompt Collapse States
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [isEditPromptExpanded, setIsEditPromptExpanded] = useState(false);

    // Outdated Prompt States
    const [isOutdated, setIsOutdated] = useState(false);
    const [isEditOutdated, setIsEditOutdated] = useState(false);

    // Tuning Modals
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

    // Tuning Reference Image States
    const [tuningReferenceImage, setTuningReferenceImage] = useState(null);
    const [editTuningReferenceImage, setEditTuningReferenceImage] = useState(null);

    // Background Mood Analysis State
    const [isAnalyzingMood, setIsAnalyzingMood] = useState(false);
    const [isExtractingReference, setIsExtractingReference] = useState(false);

    const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionResult, setInspectionResult] = useState(null);
    const [selectedResolutionIndex, setSelectedResolutionIndex] = useState(0);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importInputValue, setImportInputValue] = useState("");

    const [editDramaticPrompt, setEditDramaticPrompt] = useState("");
    const [editMjPrompt, setEditMjPrompt] = useState("");
    const [editCgPrompt, setEditCgPrompt] = useState("");

    const [user, setUser] = useState(null);

    // === 2. REFS ===
    const moodImageRef = useRef(null);
    const referenceExtractRef = useRef(null);
    const tuningChatRef = useRef(null);
    const editTuningChatRef = useRef(null);
    const editImageRef = useRef(null);

    // === 4. EFFECTS ===
    useEffect(() => {
        setIsOutdated(true); setManualBasePrompt(null); setInspectionResult(null);
    }, [aiPersona, personaSliderValue, inputText, customDesignInjections, isEnhanceModeEnabled, enhanceMode, momentumActive, baseStyle, aspectRatio, occupancy, layoutType, layoutPreset, stemWeight, charWidth, charProportion, kerning, subTitleSize, scriptType, terminalStyle, strokeTexture, strokeSharpness, strokeExtension, cornerStyle, slantAngle, kineticVelocity, slicingIntensity, deformationDamage, letterConnection, internalSpace, logoDegree, mmoSilhouetteFraming, mmoSurroundingElement, isAdvancedOptionsEnabled, activeGuards, activeTroubleshoots]);

    useEffect(() => {
        setIsEditOutdated(true); setEditManualBasePrompt(null); setInspectionResult(null);
    }, [aiPersona, personaSliderValue, editInstruction, editUploadedImage, applyAiRecInEdit, applyAutoRefine, isEnhanceModeEnabled, enhanceMode, momentumActive, layoutType, subTitleSize, mmoSilhouetteFraming, mmoSurroundingElement, kineticVelocity, slantAngle, deformationDamage, slicingIntensity, editStrokeMod, editElementMod, editSurfaceMod, cornerStyle, activeGuards, activeTroubleshoots]);

    useEffect(() => {
        if (tuningChatRef.current) tuningChatRef.current.scrollTop = tuningChatRef.current.scrollHeight;
    }, [tuningChatHistory, isTuningLoading]);

    useEffect(() => {
        if (editTuningChatRef.current) editTuningChatRef.current.scrollTop = editTuningChatRef.current.scrollHeight;
    }, [editTuningChatHistory, isEditTuningLoading]);

    // === 5. HOISTED FUNCTIONS ===
    function handleToggleCard(id) { setOpenCardId(prev => prev === id ? null : id); }
    function handleEditToggleCard(id) { setEditOpenCardId(prev => prev === id ? null : id); }
    function toggleGuard(id) { setActiveGuards(prev => prev.includes(id) ? prev.filter(guardId => guardId !== id) : [...prev, id]); }
    function toggleTroubleshoot(id) { setActiveTroubleshoots(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]); }

    function updateDynamic(key, val) {
        if (val && typeof val === 'object' && val.id && val.name) {
            setDynamicOptions(prev => {
                const exists = prev[key]?.find(o => o.id === val.id);
                if (!exists) return { ...prev, [key]: [...(prev[key] || []), val] };
                return prev;
            });
            return val.id;
        }
        return val && typeof val === 'object' ? val.id || val : val;
    }

    function handleScriptPresetChange(presetId) {
        setScriptType(presetId);
        if (presetId === "Gen_Original" || presetId === "Lineage_Classic") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Serif"); setStrokeTexture("Tex_Scorched"); setDeformationDamage("Damage_Erosion"); }
        else if (presetId === "Gen_Fantasy" || presetId === "Lineage_2") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static"); }
        else if (presetId === "Gen_Gothic" || presetId === "Lineage_M") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing"); }
        else if (presetId === "Gen_Thorn" || presetId === "Lineage_2M") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setCharProportion("P_Slim"); }
        else if (presetId === "Gen_Agony" || presetId === "Lineage_W") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Blade"); setDeformationDamage("Damage_Erosion"); setSlicingIntensity("Slic_Partial"); }
        else if (presetId === "Gen_Tower" || presetId === "Aion_Original") { setCharProportion("P_Condensed"); setStemWeight("Stem_Std"); setTerminalStyle("Term_Round"); setKineticVelocity("Vel_Swift"); }
        else if (presetId === "Aion_2") { setTerminalStyle("Term_Blade"); setStrokeTexture("Tex_Hologram"); setKineticVelocity("Vel_Warp"); setCharProportion("P_Slim"); }
        else if (presetId === "BNS") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Blade"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Swift"); setSlantAngle("Slant_Forward"); }
        else if (presetId === "Throne_Liberty") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Serif"); setStrokeSharpness("Sharp_Crisp"); setCharProportion("P_Std"); setKineticVelocity("Vel_Static"); }
        else if (presetId === "Epic") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Static"); setCharWidth("Wide"); }
        else if (presetId === "MMO_Saviors") { setStemWeight("Stem_Light"); setTerminalStyle("Term_Blade"); setStrokeSharpness("Sharp_Crisp"); setKineticVelocity("Vel_Static"); setCharProportion("P_Slim"); }
        else if (presetId === "MMO_Antharas") { setStemWeight("Stem_Heavy"); setTerminalStyle("Term_Thorn"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Slashing"); }
        else if (presetId === "MMO_Aden") { setStemWeight("Stem_Ultra"); setTerminalStyle("Term_Chisel"); setStrokeSharpness("Sharp_Razor"); setKineticVelocity("Vel_Static"); setCharWidth("Wide"); }
    }

    function handleLayoutPresetChange(presetId) {
        setLayoutPreset(presetId);
        if (presetId === "WideTitle") { setAspectRatio("16:9"); setLayoutType("1Line"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
        else if (presetId === "CenterLogo") { setAspectRatio("1:1"); setLayoutType("Center"); setOccupancy("65%"); setMmoSilhouetteFraming("Auto"); }
        else if (presetId === "CinematicPan") { setAspectRatio("2.76:1"); setLayoutType("1Line"); setOccupancy("40%"); setMmoSilhouetteFraming("Expanded"); }
        else if (presetId === "TitleSubPre") { setAspectRatio("16:9"); setLayoutType("TitleSub"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
        else if (presetId === "SubTitlePre") { setAspectRatio("16:9"); setLayoutType("SubTitle"); setOccupancy("50%"); setMmoSilhouetteFraming("Horizontal"); }
    }

    function handleReset() {
        setDynamicOptions({ MMOStyles: [], strokeTextures: [], deformationDamages: [], terminalStyles: [], stemWeights: [], strokeSharpness: [], writingSpeeds: [], widths: [], kerningOptions: [], strokeExtensions: [], kineticVelocities: [], slicingIntensities: [], editStrokeMods: [], editElementMods: [], editSurfaceMods: [] });
        setCustomDesignInjections(""); setDramaticPrompt(""); setMjOptimizedPrompt(""); setCgEnhancedPrompt(""); setEnhanceMode("refine"); setMomentumActive(false); setIsAdvancedOptionsEnabled(false);
        setPersonaSliderValue(50); setBase64Image(null); setAiRecSummary(null); setAiPersona('sovereign');
        handleScriptPresetChange("Lineage_M"); setLetterConnection("Conn_Indep"); setInternalSpace("Space_Std"); setLogoDegree("Logo_Std"); setSubTitleSize("Sub_Small");
        setManualBasePrompt(null); setEditManualBasePrompt(null); setTuningReferenceImage(null); setEditTuningReferenceImage(null); setActiveGuards(['guard_mutation', 'guard_3d', 'guard_layout']);
        setActiveTroubleshoots([]);
    }

    function generateSaveCode() {
        const state = {
            txt: inputText, per: aiPersona, adv: isAdvancedOptionsEnabled, enh: isEnhanceModeEnabled, eMd: enhanceMode,
            mom: momentumActive, sld: personaSliderValue, bs: baseStyle, ar: aspectRatio, occ: occupancy, lyt: layoutType,
            lPre: layoutPreset, sw: stemWeight, cw: charWidth, cp: charProportion, krn: kerning, sts: subTitleSize,
            scr: scriptType, term: terminalStyle, tex: strokeTexture, shp: strokeSharpness, ext: strokeExtension,
            cor: cornerStyle, slt: slantAngle, kin: kineticVelocity, sli: slicingIntensity, dmg: deformationDamage,
            lc: letterConnection, is: internalSpace, ld: logoDegree, mmoF: mmoSilhouetteFraming, mmoS: mmoSurroundingElement,
            cdi: customDesignInjections, grd: activeGuards, ts: activeTroubleshoots,
            eInst: editInstruction, eAi: applyAiRecInEdit, eRef: applyAutoRefine,
            eStr: editStrokeMod, eEle: editElementMod, eSur: editSurfaceMod
        };
        try { return `[TC-SAVE:${btoa(encodeURIComponent(JSON.stringify(state)))}]`; } catch (e) { return ""; }
    }

    function getQualityScores() {
        let structure = 100, material = 100, visibility = 100, fxControl = 100, warnings = [];
        if (isEnhanceModeEnabled) {
            if (enhanceMode === 'variation') { structure -= 15; visibility -= 10; }
            if (enhanceMode === 'deconstruct') { structure -= 40; visibility -= 30; }
        }
        if (kineticVelocity !== 'Vel_Static') { structure -= 10; visibility -= 5; fxControl -= 5; }
        if (kineticVelocity === 'Vel_Slashing') { structure -= 15; fxControl -= 10; }
        if (momentumActive) { structure -= 15; visibility -= 10; fxControl -= 10; }
        if (slicingIntensity !== 'Slic_None') { structure -= 10; visibility -= 10; }
        if (slicingIntensity === 'Slic_Total') { structure -= 25; visibility -= 20; }
        if (deformationDamage !== 'Damage_None') { structure -= 5; fxControl -= 5; }
        if (deformationDamage === 'Damage_Cracking') { visibility -= 5; fxControl -= 10; }
        if (mmoSurroundingElement !== 'Clean') { fxControl -= 20; visibility -= 5; }
        if (kerning === 'Kern_Overlap') { visibility -= 15; structure -= 5; }
        if (letterConnection === 'Conn_Full') { visibility -= 15; structure -= 10; }

        structure = Math.max(0, Math.min(100, structure)); material = Math.max(0, Math.min(100, material));
        visibility = Math.max(0, Math.min(100, visibility)); fxControl = Math.max(0, Math.min(100, fxControl));

        if (visibility < 50) warnings.push("가독성이 심각하게 훼손될 위험이 있습니다. 해체 강도를 낮추세요.");
        if (fxControl < 60) warnings.push("이펙트가 과해 형태를 가릴 위험이 있습니다. 주변 효과를 낮추세요.");
        if (structure < 40) warnings.push("구조가 크게 붕괴될 수 있습니다. 텍스트 무결성 유지를 확인하세요.");

        return { structure, material, visibility, fxControl, warnings };
    }

    function getAdapterNotes(model) {
        if (model === 'NanoBanana') return { purpose: "형태 보존형 2D 렌더링 프롬프트", guards: "Text Lock · 2D Flat · Layout Guard", note: "- Nano Banana 2 모델의 임의 변형을 막기 위해 Text Lock을 최상단에 배치했습니다.\n- 3D 오해 방지를 위해 'No Extrusion', 'Flat Silhouette' 규칙을 다중으로 주입했습니다.\n- 가독성 하한선 이하로 구조가 붕괴되는 것을 방지합니다." };
        if (model === 'Midjourney') return { purpose: "시각적 미학 중심 프롬프트 (V6 압축형)", guards: "Strict Tagging · Aspect Ratio Enforced", note: "- Midjourney V6 특성에 맞춰 가중치(::) 태그 및 파라미터(--ar, --no) 위주로 문장형보다 단어형으로 압축 구성했습니다.\n- No-text-mutation 보다는 전반적인 실루엣 스타일링에 초점을 맞춥니다." };
        if (model === 'ChatGPT') return { purpose: "DALL-E 3용 자연어 지시문", guards: "Logical Bullets · 2D Rules", note: "- DALL-E가 이해하기 쉽도록 구조화된 불릿 포인트(Bullet Points) 형태로 자연어 번역을 수행했습니다.\n- 질감보다 구조 자체의 묘사를 중심으로 서술합니다." };
        return null;
    }

    function copyToClipboard(text, type) {
        const textArea = document.createElement("textarea"); textArea.value = text || ''; document.body.appendChild(textArea); textArea.select();
        try { document.execCommand('copy'); if (type === 'top') { setCopiedTop(true); setTimeout(() => setCopiedTop(false), 2000); } else { setCopiedBottom(true); setTimeout(() => setCopiedBottom(false), 2000); } } catch (err) { console.error("Failed to copy", err); } document.body.removeChild(textArea);
    }

    function processFile(file) { const reader = new FileReader(); reader.onloadend = () => { setBase64Image(reader.result.split(',')[1]); }; reader.readAsDataURL(file); }
    function handleDragOver(e) { e.preventDefault(); setIsDragging(true); }
    function handleDragLeave() { setIsDragging(false); }
    function handleDrop(e) { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) processFile(file); }
    function handleEditDrop(e) { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setEditUploadedImage(reader.result); reader.readAsDataURL(file); } }

    function handleEditImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setEditUploadedImage(reader.result);
            reader.readAsDataURL(file);
        }
        if (editImageRef.current) editImageRef.current.value = "";
    }

    function handleTuningImageUpload(e, isEditFlag) { const file = e.target.files[0]; if (file && file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => { const base64 = reader.result.split(',')[1]; if (isEditFlag) setEditTuningReferenceImage(base64); else setTuningReferenceImage(base64); }; reader.readAsDataURL(file); } }

    function openTuningRoom() { setCurrentTunedAura(customDesignInjections); setTuningChatHistory([{ role: 'assistant', content: "안녕하세요! 현재 구체화된 아이디어를 바탕으로 어떤 부분들을 더 추가하거나 수정하고 싶으신가요?\n원하시는 방향을 자유롭게 말씀해 주세요! (예: '조금 더 차갑고 날카로운 느낌으로 바꿔줘')" }]); setIsTuningModalOpen(true); }
    function openEditTuningRoom() { setCurrentTunedEditAura(editInstruction); setEditTuningChatHistory([{ role: 'assistant', content: "이미지 편집 튜닝룸입니다!\n현재 작성된 지시사항을 바탕으로 원하시는 수정 방향을 대화하듯 말씀해 주세요.\n(예: '지금 묘사에서 부식된 효과를 조금 더 세게 강조해줘')" }]); setIsEditTuningModalOpen(true); }

    function handleImportPrompt() {
        if (!importInputValue.trim()) return;
        const text = importInputValue;

        const saveCodeMatch = text.match(/\[TC-SAVE:(.*?)\]/);
        if (saveCodeMatch) {
            try {
                const state = JSON.parse(decodeURIComponent(atob(saveCodeMatch[1])));
                if (state.txt !== undefined) setInputText(state.txt);
                if (state.per) setAiPersona(state.per);
                if (state.adv !== undefined) setIsAdvancedOptionsEnabled(state.adv);
                if (state.enh !== undefined) setIsEnhanceModeEnabled(state.enh);
                if (state.eMd) setEnhanceMode(state.eMd);
                if (state.mom !== undefined) setMomentumActive(state.mom);
                if (state.sld) setPersonaSliderValue(state.sld);
                if (state.bs) setBaseStyle(state.bs);
                if (state.ar) setAspectRatio(state.ar);
                if (state.occ) setOccupancy(state.occ);
                if (state.lyt) setLayoutType(state.lyt);
                if (state.lPre) setLayoutPreset(state.lPre);
                if (state.sw) setStemWeight(state.sw);
                if (state.cw) setCharWidth(state.cw);
                if (state.cp) setCharProportion(state.cp);
                if (state.krn) setKerning(state.krn);
                if (state.sts) setSubTitleSize(state.sts);
                if (state.scr) setScriptType(state.scr);
                if (state.term) setTerminalStyle(state.term);
                if (state.tex) setStrokeTexture(state.tex);
                if (state.shp) setStrokeSharpness(state.shp);
                if (state.ext) setStrokeExtension(state.ext);
                if (state.cor) setCornerStyle(state.cor);
                if (state.slt) setSlantAngle(state.slt);
                if (state.kin) setKineticVelocity(state.kin);
                if (state.sli) setSlicingIntensity(state.sli);
                if (state.dmg) setDeformationDamage(state.dmg);
                if (state.lc) setLetterConnection(state.lc);
                if (state.is) setInternalSpace(state.is);
                if (state.ld) setLogoDegree(state.ld);
                if (state.mmoF) setMmoSilhouetteFraming(state.mmoF);
                if (state.mmoS) setMmoSurroundingElement(state.mmoS);
                if (state.cdi !== undefined) setCustomDesignInjections(state.cdi);
                if (state.grd) setActiveGuards(state.grd);
                if (state.ts) setActiveTroubleshoots(state.ts);
                if (state.eInst !== undefined) setEditInstruction(state.eInst);
                if (state.eAi !== undefined) setApplyAiRecInEdit(state.eAi);
                if (state.eRef !== undefined) setApplyAutoRefine(state.eRef);
                if (state.eStr) setEditStrokeMod(state.eStr);
                if (state.eEle) setEditElementMod(state.eEle);
                if (state.eSur) setEditSurfaceMod(state.eSur);

                setIsImportModalOpen(false); setImportInputValue(""); return;
            } catch (e) { console.error("Failed to parse save code from token", e); }
        }
    }

    // --- 6. PROMPT BUILDERS ---
    function buildPrompts() {
        const styleList = [...staticOptions.MMOStyles, ...(dynamicOptions.MMOStyles || [])];
        const weightList = [...staticOptions.stemWeights, ...(dynamicOptions.stemWeights || [])];
        const kerningList = [...staticOptions.kerningOptions, ...(dynamicOptions.kerningOptions || [])];
        const terminalList = [...staticOptions.terminalStyles, ...(dynamicOptions.terminalStyles || [])];
        const sharpnessList = [...staticOptions.strokeSharpness, ...(dynamicOptions.strokeSharpness || [])];
        const textureList = staticOptions.strokeTextures;
        const kineticList = [...staticOptions.kineticVelocities, ...(dynamicOptions.kineticVelocities || [])];
        const slantList = staticOptions.slantAngles;
        const destList = staticOptions.deformationDamages;

        const styleEn = getOptionEn(styleList, scriptType); const weightEn = getOptionEn(weightList, stemWeight); const kerningEn = getOptionEn(kerningList, kerning); const terminalEn = getOptionEn(terminalList, terminalStyle); const sharpnessEn = getOptionEn(sharpnessList, strokeSharpness); const textureEn = getOptionEn(textureList, strokeTexture); const widthEn = getOptionEn(staticOptions.widths, charWidth); const proportionEn = getOptionEn(staticOptions.proportions, charProportion); const extensionEn = getOptionEn(staticOptions.strokeExtensions, strokeExtension); const cornerList = [...staticOptions.cornerStyles, ...(dynamicOptions.cornerStyles || [])]; const cornerEn = getOptionEn(cornerList, cornerStyle); const kineticEn = getOptionEn(kineticList, kineticVelocity); const slantEn = getOptionEn(slantList, slantAngle); const destructionEn = getOptionEn(destList, deformationDamage); const occupancyEn = getOptionEn(staticOptions.occupancies, occupancy); const letterConnEn = getOptionEn(staticOptions.letterConnections, letterConnection); const internalSpaceEn = getOptionEn(staticOptions.internalSpaces, internalSpace); const logoDegreeEn = getOptionEn(staticOptions.logoDegrees, logoDegree); const mmoSilhouetteEn = getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming); const mmoSurroundEn = getOptionEn(staticOptions.MMOSurroundingElements, mmoSurroundingElement); const slicingEn = getOptionEn(staticOptions.slicingIntensities, slicingIntensity); const subSizeEn = getOptionEn(staticOptions.subTitleSizes, subTitleSize);

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

        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const userAuraEn = customDesignInjections || "Standard deployment";
        const bgDescEn = getOptionEn(staticOptions.base, baseStyle) || "JET BLACK Background";

        let troubleshootingBlockEn = ""; let troubleshootingBlockKo = "";
        if (activeTroubleshoots.length > 0) {
            const activeTs = troubleshooterOptions.filter(opt => activeTroubleshoots.includes(opt.id));
            troubleshootingBlockEn = `\n\n[8. TROUBLESHOOTING OVERRIDE - MAXIMUM PRIORITY]\n` + activeTs.map(opt => `- ${opt.fixEn}`).join("\n");
            troubleshootingBlockKo = `\n\n[8. 트러블슈팅 강제 적용 - 최우선 순위]\n` + activeTs.map(opt => `- ${opt.fixKo}`).join("\n");
        }

        const generatedBaseEn = `[TYPECORE V17.1 MASTER INSTRUCTION]\n\n[1. TEXT LOCK - PRIORITY 1]\n- Exact Text: "${inputText}"\n- Rule: NO text mutation, NO extra letters, NO missing letters, NO unrequested translation.\n\n[2. LAYOUT LOCK - PRIORITY 2]\n- Composition: ${layoutEn}\n- Alignment: ${mmoSilhouetteEn}\n- Occupancy: ${occupancyEn}\n- Aspect Ratio: ${aspectRatio}\n\n[3. PERSONA MORPHOLOGY - PRIORITY 3]\n- Director Persona: ${activePersonaData.shortTitle}\n- Role Focus: ${activePersonaData.role}\n- Primary Aesthetic: ${styleEn}\n- Stroke Body: ${weightEn}, ${widthEn} width, ${proportionEn} proportion.\n- Joints & Flow: ${kerningEn}, ${letterConnEn}, ${internalSpaceEn}.\n- Terminals & Edges: ${terminalEn}, ${sharpnessEn}, ${cornerEn}, ${extensionEn}.\n- Design Aura (User Intent): ${userAuraEn}\n- Sub-Trait Focus: ${getSliderText(personaSliderValue)}\n\n[4. MODIFIER ENGINE (STRENGTH & READABILITY) - PRIORITY 4]\n- Mode: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : "OFF"}\n- Intensity Budget: ${modIntensityEn}\n- Legibility Floor: MUST maintain at least ${readabilityFloorEn} readability.\n- Allowed Edits: ${modAllowedEn}\n- Forbidden Edits: ${modForbiddenEn}\n\n[5. COMBAT DYNAMICS - PRIORITY 5]\n- Status: ${momentumActive ? "ENABLED" : "DISABLED"}\n- Kinetic Velocity: ${kineticEn}\n- Slant: ${slantEn}\n- Slicing Force: ${slicingEn}\n- Damage/Erosion: ${destructionEn}\n- Vector/Impact Constraints: Vector(${combatVectorEn}), Impact Zone(${combatImpactZoneEn}), Deformation Budget(${combatDeformationEn}).\n\n[6. STYLE GUARDRAILS & RENDER MATRIX]\n- 2D Rule: STRICTLY flat graphic silhouette. ZERO depth.\n- Material Rule: NO colors, ZERO chroma. Strict monochrome (${bgDescEn}).\n- Surrounding FX: ${mmoSurroundEn}. Effects MUST NOT override stroke geometry.\n\n[7. NEGATIVE PROMPT (STRICT PROHIBITIONS)]\n- ${activePersonaData.forbidden}\n- NO 3D rendering, NO bevel, NO drop shadows.\n- NO illegible distortion falling below the Legibility Floor.\n- NO unrequested layout drifting or vertical squishing.${troubleshootingBlockEn}`.trim();
        const generatedBaseKo = `[타이프코어 V17.1 마스터 지시서]\n\n[1. 텍스트 잠금 - 우선순위 1]\n- 정확한 텍스트: "${inputText}"\n- 규칙: 텍스트 변형 절대 금지, 글자 추가/누락 금지, 임의 번역 금지.\n\n[2. 레이아웃 잠금 - 우선순위 2]\n- 구도: ${getOptionName(staticOptions.layouts, layoutType)}\n- 정렬: ${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n- 공간 점유율: ${getOptionName(staticOptions.occupancies, occupancy)}\n- 화면비: ${aspectRatio}\n\n[3. 페르소나 형태학 - 우선순위 3]\n- 디렉터 페르소나: ${activePersonaData.shortTitle}\n- 역할 집중: ${activePersonaData.role}\n- 기본 미학: ${getOptionName(styleList, scriptType)}\n- 획 뼈대: ${getOptionName(weightList, stemWeight)}, ${getOptionName(staticOptions.widths, charWidth)} 자폭, ${getOptionName(staticOptions.proportions, charProportion)} 비율.\n- 결합 및 흐름: ${getOptionName(kerningList, kerning)}, ${getOptionName(staticOptions.letterConnections, letterConnection)}, ${getOptionName(staticOptions.internalSpaces, internalSpace)}.\n- 말단 및 엣지: ${getOptionName(terminalList, terminalStyle)}, ${getOptionName(sharpnessList, strokeSharpness)}, ${getOptionName(cornerList, cornerStyle)}, ${getOptionName(staticOptions.strokeExtensions, strokeExtension)}.\n- 디자인 아우라 (사용자 의도): ${customDesignInjections || "기본 셋업"}\n- 세부 속성 집중도: ${getSliderTextKo(personaSliderValue)}\n\n[4. 모디파이어 엔진 (강도 및 가독성) - 우선순위 4]\n- 모드: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : "비활성"}\n- 변형 허용치: ${modIntensityEn}\n- 최소 가독성: 가독성 ${readabilityFloorEn} 이상 절대 유지.\n- 허용된 변형: ${isEnhanceModeEnabled ? (enhanceMode === 'refine' ? '광학적 균형 조정, 세리프 정밀화' : enhanceMode === 'variation' ? '카운터폼 재해석, 획 비례 변주' : '획 분해, 응집형 엠블럼화') : '없음'}\n- 금지된 변형: ${isEnhanceModeEnabled ? (enhanceMode === 'refine' ? '구조 재해석, 해체' : enhanceMode === 'variation' ? '읽을 수 없는 해체' : '가독성 하한선 붕괴') : '구조 변경 금지'}\n\n[5. 전투 동세 - 우선순위 5]\n- 상태: ${momentumActive ? "활성화" : "비활성"}\n- 동세 속도: ${getOptionName(kineticList, kineticVelocity)}\n- 기울기: ${getOptionName(slantList, slantAngle)}\n- 사선 절단: ${getOptionName(staticOptions.slicingIntensities, slicingIntensity)}\n- 파괴/침식: ${getOptionName(destList, deformationDamage)}\n- 벡터/임팩트 제한: 변형 한계(${combatDeformationEn}). 동세는 장식이 아닌 실제 획의 변형으로 표현.\n\n[6. 스타일 가드레일 및 렌더 매트릭스]\n- 2D 규칙: 엄격한 평면 그래픽 실루엣. 깊이감 절대 없음.\n- 질 규칙: 색상 금지. 완전한 단색화 (블랙/화이트).\n- 주변 효과: ${getOptionName(staticOptions.MMOSurroundingElements, mmoSurroundingElement)}. 효과가 글자 뼈대를 덮어쓰면 안 됨.\n\n[7. 네거티브 프롬프트 (엄격한 금지 사항)]\n- ${activePersonaData.forbidden}\n- 3D 렌더링, 베벨, 그림자 효과 절대 금지.\n- 가독성 하한선을 무너뜨리는 무작위 노이즈 왜곡 금지.${troubleshootingBlockKo}`.trim();

        let cgTextInstruction = `Render EXACTLY the text "${inputText}"`;
        if (inputText.includes('\n')) {
            const lines = inputText.split('\n');
            if (layoutType === "TitleSub") cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${lines[0]}" (Huge Main Title)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Explicitly smaller Subtitle)`;
            else if (layoutType === "SubTitle") cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${lines[0]}" (Explicitly smaller Subtitle)\n- [BOTTOM ROW]: "${lines[1] || ''}" (Huge Main Title)`;
            else if (layoutType === "2Lines") cgTextInstruction = `Render exactly 2 lines:\n- [TOP ROW]: "${lines[0]}"\n- [BOTTOM ROW]: "${lines[1] || ''}"`;
        }

        const chatGPTOutput = `Act as an expert Typography Engine. ${cgTextInstruction} in a 2D flat silhouette graphic. \n1. Constraints: Pure black and white, ${occupancyEn}. NO 3D.\n2. Layout & Proportion: ${layoutEn} Force ${proportionEn}. \n3. Directing Aura: ${customDesignInjections} ${getSliderText(personaSliderValue)}. \n4. Modifiers: ${isEnhanceModeEnabled ? enhanceMode + ' mode (' + modIntensityEn + ' intensity). ' : ''}Maintain ${readabilityFloorEn} readability.\n5. Dynamics: ${momentumActive ? combatDeformationEn + ' max combat deformation. ' : 'Static.'} Details: ${textureEn}, ${destructionEn}.`;
        const midjourneyOutput = `${inputText.replace(/\n/g, ' ')} typography logotype, ${customDesignInjections}, MMO RPG theme, 2D flat graphic silhouette, pure black and white, ${isEnhanceModeEnabled ? (enhanceMode === 'deconstruct' ? 'iconic structural emblem silhouette, ' : (enhanceMode === 'variation' ? 'diverse structural interpretations, ' : 'sharp architectural lines, ')) : ''}${momentumActive ? 'extreme dynamic momentum, ' : ''}${isAdvancedOptionsEnabled ? textureEn + ', ' + destructionEn + ', ' : ''}${layoutType.includes("Line") ? 'balanced composition, ' : 'strictly single horizontal row, '}${proportionEn}, wide panoramic span, ${occupancy.replace('%', ' percent')} occupancy, --ar ${aspectRatio.replace(':', ':')} --no 3d, font, color, texture, compressed vertical aspect ratio`;

        const baseTechnicalEnResult = manualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKoResult = manualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V17.1 RPG TYPOGRAPHY OVERVIEW ]\n■ SUBJECT: "${inputText}"\n■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}\n■ AURA: ${customDesignInjections || "기본 셋업"}\n\n[ PRIORITY QUEUE ]\n1. Text Integrity (${inputText})\n2. Legibility Floor (${readabilityFloorEn})\n3. Layout Lock (${getOptionName(staticOptions.layouts, layoutType).split(' ')[0]})\n\n[ CORE MORPHOLOGY ]\n• Theme: ${getOptionName(styleList, scriptType)} / ${getOptionName(weightList, stemWeight)}\n• Terminal: ${getOptionName(terminalList, terminalStyle)}\n• Modifier: ${isEnhanceModeEnabled ? enhanceMode.toUpperCase() : 'OFF'} (Budget: ${modIntensityEn})\n• Combat Dynamics: ${momentumActive ? "ON" : "OFF"}`;

        return { baseTechnicalEn: baseTechnicalEnResult, baseTechnicalKo: baseTechnicalKoResult, chatGPTOutput, midjourneyOutput, overview };
    }

    function buildEditPrompts() {
        const instruction = editInstruction || "원본 이미지의 형태를 유지하며 디테일을 보완합니다.";
        let modIntensityEn = "5-15%"; let readabilityFloorEn = "85%";
        const autoRefineInstructionEn = applyAutoRefine ? `[SHAPE NORMALIZATION PROTOCOL] Auto-correct rough/sketched geometry into premium 2D vector forms.` : "Maintain base sketch quality.";
        const activePersonaData = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];

        let troubleshootingBlockEn = ""; let troubleshootingBlockKo = "";
        if (activeTroubleshoots.length > 0) {
            const activeTs = troubleshooterOptions.filter(opt => activeTroubleshoots.includes(opt.id));
            troubleshootingBlockEn = `\n\n[8. TROUBLESHOOTING OVERRIDE - MAXIMUM PRIORITY]\n` + activeTs.map(opt => `- ${opt.fixEn}`).join("\n");
            troubleshootingBlockKo = `\n\n[8. 트러블슈팅 강제 적용 - 최우선 순위]\n` + activeTs.map(opt => `- ${opt.fixKo}`).join("\n");
        }

        const generatedBaseEn = `[IMAGE-TO-IMAGE TYPOGRAPHY EDIT V17.1 MASTER]\n\n[1. BASE LOCK & INTEGRITY]\n- Base Image: Treat as the STRICT structural foundation.\n- Readability Floor: Minimum ${readabilityFloorEn}.\n- Deformation Budget: Maximum ${modIntensityEn} structural shift.\n\n[2. EDIT DIRECTION (AURA) & PERSONA]\n- Aura: "${instruction}"\n- Sub-Trait Focus: ${getSliderText(personaSliderValue)}\n- Director Persona: ${activePersonaData.shortTitle}\n- Persona Constraints: Apply '${activePersonaData.keywords}'.\n\n[3. MICRO-REFINEMENTS (MODIFIERS)]\n- Stroke Mod: ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}\n- Element Mod: ${getOptionEn(staticOptions.editElementMods, editElementMod)}\n- Surface Mod: ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}\n- Auto-Refine: ${autoRefineInstructionEn}\n\n[4. GLOBAL SHAPE & DYNAMICS]\n- Framing/Layout: ${getOptionEn(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n- Kinetic Force: ${getOptionEn(staticOptions.kineticVelocities, kineticVelocity)}\n- Damage: ${getOptionEn(staticOptions.deformationDamages, deformationDamage)}\n\n[5. STRICT PROHIBITIONS]\n- NO 3D rendering. NO materials. Pure Black & White ONLY.\n- ${activePersonaData.forbidden}${troubleshootingBlockEn}`.trim();
        const generatedBaseKo = `[이미지-투-이미지 타이포그래피 편집 V17.1 마스터]\n\n[1. 베이스 고정 및 무결성]\n- 원본 이미지: 엄격한 구조적 기반으로 취급.\n- 최소 가독성: ${readabilityFloorEn} 유지.\n- 변형 허용치: 구조적 변형 최대 ${modIntensityEn} 제한.\n\n[2. 편집 방향 (아우라) 및 페르소나]\n- 아우라: "${instruction}"\n- 세부 속성 집중도: ${getSliderTextKo(personaSliderValue)}\n- 디렉터 페르소나: ${activePersonaData.shortTitle}\n- 페르소나 제약: '${activePersonaData.keywords}' 미학 적용.\n\n[3. 마이크로-리터칭 (모디파이어)]\n- 획 수정: ${getOptionName(staticOptions.editStrokeMods, editStrokeMod)}\n- 요소 수정: ${getOptionName(staticOptions.editElementMods, editElementMod)}\n- 표면 수정: ${getOptionName(staticOptions.editSurfaceMods, editSurfaceMod)}\n- 자동 보정: ${applyAutoRefine ? "거친 스케치를 프리미엄 2D 벡터 형태로 정규화 교정." : "기본 형태 퀄리티 유지."}\n\n[4. 글로벌 형태 및 동세]\n- 프레이밍: ${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n- 물리적 힘: ${getOptionName(staticOptions.kineticVelocities, kineticVelocity)}\n- 파괴: ${getOptionName(staticOptions.deformationDamages, deformationDamage)}\n\n[5. 엄격한 금지 사항]\n- 3D 렌더링 금지. 재질 표현 금지. 순수 블랙/화이트 전용.\n- ${activePersonaData.forbidden}${troubleshootingBlockKo}`.trim();

        const baseTechnicalEnResult = editManualBasePrompt?.en || generatedBaseEn;
        const baseTechnicalKoResult = editManualBasePrompt?.ko || generatedBaseKo;

        const overview = `[ V17.1 I2I EDIT OVERVIEW ]\n■ EDIT DIRECTION: ${instruction}\n■ DIRECTOR PERSONA: ${activePersonaData.shortTitle}\n\n[ MICRO REFINEMENTS ]\n• Deformation Budget: ${modIntensityEn}\n• Stroke Mod: ${getOptionName(staticOptions.editStrokeMods, editStrokeMod).split(' ')[0]}\n• Auto-Refine: ${applyAutoRefine ? "ON" : "OFF"}\n\n[ SHAPE & DYNAMICS ]\n• Silhouette: ${getOptionName(staticOptions.MMOSilhouetteFramings, mmoSilhouetteFraming)}\n• Kinetic/Damage: ${getOptionName(staticOptions.kineticVelocities, kineticVelocity)} / ${getOptionName(staticOptions.deformationDamages, deformationDamage).split(' ')[0]}`;

        const cgEditTextInstruction = `Redraw the provided image. STRICTLY MAINTAIN basic shape, pure black/white monochrome, and 2D flat graphic style. Maximum deformation ${modIntensityEn}.`;
        const chatGPTOutput = `Act as an expert Typography Engine. ${cgEditTextInstruction}\n1. Focused Edits: ${instruction} ${getSliderText(personaSliderValue)}. \n2. Retouching: Stroke(${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}), Surface(${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}).\n3. Dynamics: ${getOptionEn(staticOptions.kineticVelocities, kineticVelocity)}, ${getOptionEn(staticOptions.deformationDamages, deformationDamage)}.\n4. Rule: Readability floor ${readabilityFloorEn}. NO 3D.`;
        const midjourneyOutput = `[UPLOAD BASE IMAGE AS REFERENCE] typography logotype, image-to-image edit, exact structural foundation, pure black and white, 2D flat graphic silhouette, ${instruction}, ${getOptionEn(staticOptions.editStrokeMods, editStrokeMod)}, ${getOptionEn(staticOptions.editSurfaceMods, editSurfaceMod)}, ${getOptionEn(staticOptions.kineticVelocities, kineticVelocity)}, wide panoramic span, --ar 16:9 --iw 1.5 --style raw --no 3d, font, color, compressed vertical aspect ratio`;

        return { baseTechnicalEn: baseTechnicalEnResult, baseTechnicalKo: baseTechnicalKoResult, chatGPTOutput, midjourneyOutput, overview };
    }

    // --- 7. ASYNC API HANDLERS (Hoisted) ---
    async function handleAiRecommendation() {
        if (isRecommending) return; setIsRecommending(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const prompt = `Act as an Elite Art Director for a Dark Fantasy RPG typography project.\n[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[KEYWORDS YOU FAVOR]: ${persona.keywords}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[USER INPUT]: Text: "${inputText}"\n[DETAILED DESIGN INTENT / AURA]: "${customDesignInjections || "None"}"\n[CRITICAL INSTRUCTION]: You MUST base your setup heavily on the "[DETAILED DESIGN INTENT / AURA]" and your Persona. Reflect the [CURRENT SUB-TRAIT FOCUS] deeply in your choices.\nReturn JSON: { "summary": { "title": "...", "reason": "..." }, "setStyle": { "id": "...", "name": "...", "en": "..." }, "setWeight": { "id": "...", "name": "...", "en": "..." }, "setTerminal": { "id": "...", "name": "...", "en": "..." }, "setTexture": { "id": "...", "name": "...", "en": "..." }, "setKinetic": { "id": "...", "name": "...", "en": "..." }, "setSharpness": { "id": "...", "name": "...", "en": "..." }, "setKerning": { "id": "...", "name": "..." , "en": "..."} }`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json(); const res = extractJson(data.candidates[0].content.parts[0].text);
            if (res?.summary) setAiRecSummary(res.summary);
            if (res?.setStyle) setScriptType(updateDynamic('MMOStyles', res.setStyle));
            if (res?.setWeight) setStemWeight(updateDynamic('stemWeights', res.setWeight));
            if (res?.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', res.setTerminal));
            if (res?.setTexture) setStrokeTexture(updateDynamic('strokeTextures', res.setTexture));
            if (res?.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', res.setKinetic));
            if (res?.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', res.setSharpness));
            if (res?.setKerning) setKerning(updateDynamic('kerningOptions', res.setKerning));
            setIsAdvancedOptionsEnabled(true);
        } catch (e) { } finally { setIsRecommending(false); }
    }

    async function handleReferenceExtraction(e) {
        const files = Array.from(e.target.files); if (files.length === 0) return; setIsExtractingReference(true);
        try {
            const base64Promises = files.map(file => { return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } }); reader.readAsDataURL(file); }); });
            const imageParts = await Promise.all(base64Promises);
            const systemPrompt = `You are a master Typography Structural Analyst. Analyze the typography in the provided reference image.
      1. Write a 2-3 sentence Korean description of its morphological characteristics (weight, edges, layout, texture) to use as the 'Design Aura'.
      2. Map its structural traits to our engine's exact parameters. If a trait is unique, create a NEW custom object.
      Return JSON STRICTLY in this format:
      {
        "extractedAura": "Korean description of the visual mood and structural anatomy...",
        "updateOptions": {
           "setStyle": { "id": "...", "name": "...", "en": "..." },
           "setWeight": { "id": "...", "name": "...", "en": "..." },
           "setTerminal": { "id": "...", "name": "...", "en": "..." },
           "setTexture": { "id": "...", "name": "...", "en": "..." },
           "setLayout": { "id": "...", "name": "...", "en": "..." },
           "setDamage": { "id": "...", "name": "...", "en": "..." }
        }
      }`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, ...imageParts] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json();
            const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            if (result?.extractedAura) setCustomDesignInjections(String(result.extractedAura).trim());
            if (result?.updateOptions) {
                const opts = result.updateOptions;
                if (opts.setStyle) setScriptType(updateDynamic('MMOStyles', opts.setStyle));
                if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight));
                if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal));
                if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture));
                if (opts.setLayout) setLayoutType(updateDynamic('layouts', opts.setLayout));
                if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage));
                setIsAdvancedOptionsEnabled(true);
            }
        } catch (error) { console.error("Reference extraction failed:", error); } finally { setIsExtractingReference(false); if (referenceExtractRef.current) referenceExtractRef.current.value = ""; }
    }

    async function handleMoodImageUpload(e) {
        const files = Array.from(e.target.files); if (files.length === 0) return; setIsAnalyzingMood(true);
        try {
            const base64Promises = files.map(file => { return new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: reader.result.split(',')[1] } }); reader.readAsDataURL(file); }); });
            const imageParts = await Promise.all(base64Promises);
            const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
            const systemPrompt = `You are a legendary Typography Art Director specialized in STRICTLY 2D FLAT BLACK-AND-WHITE SILHOUETTE typography. [YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\nAnalyze the provided reference image(s). Synthesize their core worldview, narrative tension, and character traits.\n[CRITICAL RULE FOR TYPOGRAPHY AURA]: The resulting typography MUST be a pure 2D flat silhouette. ABSOLUTELY NO textures, NO lighting, NO 3D, NO materials, NO gradient colors. Focus ONLY on structural morphology.\nReturn ONLY a 2-3 sentence Korean description (Aura) detailing how the structural lines and shapes of the typography should be formed to match the combined mood.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, ...imageParts] }], generationConfig: { temperature: 0.7 } }) });
            const data = await response.json(); const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) setCustomDesignInjections(resultText.trim());
        } catch (error) { console.error("Mood analysis failed:", error); } finally { setIsAnalyzingMood(false); if (moodImageRef.current) moodImageRef.current.value = ""; }
    }

    async function handleSendTuningMessage() {
        if (!tuningInputValue.trim() && !tuningReferenceImage) return;
        const userMsg = tuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setTuningInputValue(""); setTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsTuningLoading(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are a Typography Art Director and a friendly assistant. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Aura]: "${currentTunedAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Aura] to reflect the [User Request] and visual analysis. Make it professional. APPLY YOUR PERSONA'S VIBE AND KEYWORDS: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].\nWrite a short, friendly reply in Korean explaining what you changed and analyzed. Tone: ${persona.tone}.\nReturn JSON strictly in this format: { "newAura": "The updated aura string", "replyMessage": "Your friendly reply in Korean", "updateOptions": { "setStyle": { "id": "...", "name": "...", "en": "..." }, ... } }`;
        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (tuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: tuningReferenceImage } });
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedAura(String(result.newAura)); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: String(result.replyMessage) }]);
                if (result.updateOptions) { const opts = result.updateOptions; if (opts.setStyle) setScriptType(updateDynamic('MMOStyles', opts.setStyle)); if (opts.setWeight) setStemWeight(updateDynamic('stemWeights', opts.setWeight)); if (opts.setTerminal) setTerminalStyle(updateDynamic('terminalStyles', opts.setTerminal)); if (opts.setTexture) setStrokeTexture(updateDynamic('strokeTextures', opts.setTexture)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setSharpness) setStrokeSharpness(updateDynamic('strokeSharpness', opts.setSharpness)); if (opts.setKerning) setKerning(updateDynamic('kerningOptions', opts.setKerning)); setIsAdvancedOptionsEnabled(true); }
            }
        } catch (e) { setTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsTuningLoading(false); setTuningReferenceImage(null); }
    }

    async function handleSendEditTuningMessage() {
        if (!editTuningInputValue.trim() && !editTuningReferenceImage) return;
        const userMsg = editTuningInputValue.trim() || "이미지 스타일을 분석해줘.";
        setEditTuningInputValue(""); setEditTuningChatHistory(prev => [...prev, { role: 'user', content: userMsg }]); setIsEditTuningLoading(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are an expert Typography Art Director adjusting an Image-to-Image edit instruction. [YOUR PERSONA]: ${persona.role}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\n[Current Edit Direction]: "${currentTunedEditAura}"\n[User Request]: "${userMsg}"\nTask: Update the [Current Edit Direction] integrating the user's request and image analysis. Maintain a professional tone while applying your persona's vibe and keywords: ${persona.keywords}. Reflect the [CURRENT SUB-TRAIT FOCUS].\nWrite a friendly response in Korean explaining the update. Tone: ${persona.tone}.\nReturn JSON strictly: { "newAura": "Updated instruction string", "replyMessage": "Friendly response in Korean", "updateOptions": { "setEditStroke": { "id": "...", "name": "...", "en": "..." }, ... } }`;
        const parts = [{ text: "Process the tuning request. Analyze the reference image if provided." }];
        if (editTuningReferenceImage) parts.push({ inlineData: { mimeType: "image/jpeg", data: editTuningReferenceImage } });
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }) });
            const data = await response.json(); const result = extractJson(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
            if (result?.newAura && result?.replyMessage) {
                setCurrentTunedEditAura(String(result.newAura)); setTuningChatHistory(prev => [...prev, { role: 'assistant', content: String(result.replyMessage) }]);
                if (result.updateOptions) { const opts = result.updateOptions; if (opts.setEditStroke) setEditStrokeMod(updateDynamic('editStrokeMods', opts.setEditStroke)); if (opts.setEditElement) setEditElementMod(updateDynamic('editElementMods', opts.setEditElement)); if (opts.setEditSurface) setEditSurfaceMod(updateDynamic('editSurfaceMods', opts.setEditSurface)); if (opts.setKinetic) setKineticVelocity(updateDynamic('kineticVelocities', opts.setKinetic)); if (opts.setDamage) setDeformationDamage(updateDynamic('deformationDamages', opts.setDamage)); }
            }
        } catch (e) { setEditTuningChatHistory(prev => [...prev, { role: 'assistant', content: "오류가 발생했습니다." }]); } finally { setIsEditTuningLoading(false); setEditTuningReferenceImage(null); }
    }

    async function handleExpandIntent() {
        if (!customDesignInjections.trim() || isExpandingIntent) return; setIsExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's keyword into a detailed, highly professional morphological design direction. NO MATERIALS / NO LIGHTING. FOCUS ON PURE FORM. 2-3 sentences. Return ONLY the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: customDesignInjections }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setCustomDesignInjections(String(data.candidates[0].content.parts[0].text).trim());
        } catch (e) { } finally { setIsExpandingIntent(false); }
    }

    async function handleEditExpandIntent() {
        if (!editInstruction.trim() || isEditExpandingIntent) return; setIsEditExpandingIntent(true);
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `[YOUR PERSONA]: ${persona.role}\n[YOUR TONE]: ${persona.tone}\n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)}\nExpand the user's short edit keyword into a detailed, structural Image-to-Image morphological edit instruction incorporating the sub-trait focus. NO 3D/MATERIALS. Keep it 2D flat. Focus on stroke edges, dynamics, and destruction. Return only the expanded text in Korean.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: editInstruction }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json(); if (data.candidates?.[0]?.content?.parts?.[0]?.text) setEditInstruction(String(data.candidates[0].content.parts[0].text).trim());
        } catch (e) { } finally { setIsEditExpandingIntent(false); }
    }

    async function runInspector(isEditFlag = false) {
        setIsInspecting(true); setSelectedResolutionIndex(0);
        const { baseTechnicalEn } = isEditFlag ? buildEditPrompts() : buildPrompts();
        const systemPrompt = `You are the 'Prompt Integrity Inspector' for an elite Dark Fantasy RPG typography generation engine.
    Your task is to analyze the user's [Base Technical Prompt] for logical conflicts that could confuse the AI image generator.
    Pay attention to the strict block structure: [TEXT LOCK], [LAYOUT LOCK], [PERSONA MORPHOLOGY], etc.
    Return STRICTLY a valid JSON object: { "hasConflict": boolean, "analysisMessage": "string", "resolutions": [ { "title": "string", "desc": "string", "resolvedPromptEn": "string", "resolvedPromptKo": "string" } ] }`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }) });
            const data = await response.json(); const result = extractJson(data.candidates[0].content.parts[0].text);
            setInspectionResult({ ...result, isEdit: isEditFlag }); setIsInspectorModalOpen(true);
        } catch (e) { console.error("Inspector error", e); } finally { setIsInspecting(false); }
    }

    async function requestDramaticEnhancement() {
        if (isEnhancing) return; setIsEnhancing(true);
        const { baseTechnicalEn } = buildPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are a visionary Art Director for "Nano Banana 2". Transform technical specs into a morphological masterpiece. \n[YOUR PERSONA]: ${persona.role} \n[YOUR WRITING TONE]: ${persona.tone} \n[KEYWORDS]: ${persona.keywords} \n[CURRENT SUB-TRAIT FOCUS]: ${getSliderText(personaSliderValue)} \nPROHIBIT 3D and MATERIALS.\n[CRITICAL RULE]: Adhere to the [PRIORITY 1-7] block structure in your mind. Emphasize the allowed deformation budget and Legibility floor.\nOutput format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite prompt string.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json();
            const saveCode = generateSaveCode();
            const finalPrompt = String(data.candidates?.[0]?.content?.parts?.[0]?.text || "") + `\n\n${saveCode}`;
            setDramaticPrompt(finalPrompt);
            setIsOutdated(false);
        } catch (err) { } finally { setIsEnhancing(false); }
    }

    async function requestEditDramaticEnhancement() {
        if (isEditEnhancing) return; setIsEditEnhancing(true);
        const { baseTechnicalEn } = buildEditPrompts();
        const persona = directorPersonas.find(p => p.id === aiPersona) || directorPersonas[0];
        const systemPrompt = `You are a visionary Art Director for Nano Banana 2 Image-to-Image generation.\n[YOUR PERSONA]: ${persona.role} \n[YOUR WRITING TONE]: ${persona.tone} \n[KEYWORDS]: ${persona.keywords} \nPROHIBIT 3D and MATERIALS. \n[INTERPRETATION LIMIT]: Do NOT reinterpret the structure beyond the deformation budget. Focus on Micro-refinements. \nOutput format: \n1. # ARCHITECTURAL EVOLUTION \n2. # KINETIC ORGANIC ANATOMY \n3. # THE UNBOUNDED BOUNDARY \n4. # THE SUPREME COMMAND: Consolidated elite I2I prompt string.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json();
            const saveCode = generateSaveCode();
            const finalPrompt = String(data.candidates?.[0]?.content?.parts?.[0]?.text || "") + `\n\n${saveCode}`;
            setEditDramaticPrompt(finalPrompt);
            setIsEditOutdated(false);
        } catch (err) { } finally { setIsEditEnhancing(false); }
    }

    async function requestMidjourneyOptimization(isEditFlag = false) {
        if (isEditFlag) { if (isEditMjOptimizing) return; setIsEditMjOptimizing(true); } else { if (isMjOptimizing) return; setIsMjOptimizing(true); }
        const { baseTechnicalEn, midjourneyOutput } = isEditFlag ? buildEditPrompts() : buildPrompts();
        const currentAR = aspectRatio;
        const systemPrompt = `Convert specs into Midjourney V6 tag string. Use ::2 for critical traits. Force 2D flat silhouette. \nEnd exactly with this exact suffix (DO NOT omit the --ar parameter): " --ar ${currentAR} --iw 1.5 --style raw --no 3d, volumetric, perspective, emboss, bevel, shadow, color, standard font, texture, glowing shader, material"`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.2 } }) });
            const data = await response.json();
            let resultText = String(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || midjourneyOutput);
            const saveCode = generateSaveCode();
            if (resultText.includes('--ar')) resultText = resultText.replace('--ar', `${saveCode} --ar`);
            else resultText += ` ${saveCode}`;

            if (isEditFlag) { setEditMjPrompt(resultText); setIsEditOutdated(false); }
            else { setMjOptimizedPrompt(resultText); setIsOutdated(false); }
        } catch (err) { } finally { if (isEditFlag) setIsEditMjOptimizing(false); else setIsMjOptimizing(false); }
    }

    async function requestChatGPTEnhancement(isEditFlag = false) {
        if (isEditFlag) { if (isEditCgEnhancing) return; setIsEditCgEnhancing(true); } else { if (isCgEnhancing) return; setIsCgEnhancing(true); }
        const { baseTechnicalEn, chatGPTOutput } = isEditFlag ? buildEditPrompts() : buildPrompts();
        const systemPrompt = `Create DALL-E 3 instructions for this typography prompt. Bullet points for edits. Strictly forbid 3D/materials. Output ONLY the final prompt text.`;
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: baseTechnicalEn }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { temperature: 0.7 } }) });
            const data = await response.json();
            const saveCode = generateSaveCode();
            const resultText = String(data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || chatGPTOutput) + `\n\n${saveCode}`;
            if (isEditFlag) { setEditCgPrompt(resultText); setIsEditOutdated(false); }
            else { setCgEnhancedPrompt(resultText); setIsOutdated(false); }
        } catch (err) { } finally { if (isEditFlag) setIsEditCgEnhancing(false); else setIsCgEnhancing(false); }
    }

    async function handleCompileDramatic() {
        if (currentView === 'edit') { await requestEditDramaticEnhancement(); } else { await requestDramaticEnhancement(); }
    }

    function handleCompileMj() {
        requestMidjourneyOptimization(currentView === 'edit');
    }

    function handleCompileCg() {
        requestChatGPTEnhancement(currentView === 'edit');
    }

    // === DERIVED STATES ===
    const isEditMode = currentView === 'edit';
    const currentModel = isEditMode ? editAiModel : aiModel;
    const setModel = isEditMode ? setEditAiModel : setAiModel;
    const isPromptOutdated = isEditMode ? isEditOutdated : isOutdated;
    const isExpanded = isEditMode ? isEditPromptExpanded : isPromptExpanded;
    const setExpanded = isEditMode ? setIsEditPromptExpanded : setIsPromptExpanded;

    const isGeneratingDramatic = isEditMode ? isEditEnhancing : isEnhancing;
    const isGeneratingMj = isEditMode ? isEditMjOptimizing : isMjOptimizing;
    const isGeneratingCg = isEditMode ? isEditCgEnhancing : isCgEnhancing;

    const hasManualBasePrompt = isEditMode ? editManualBasePrompt : manualBasePrompt;

    const currentPrompts = isEditMode ? buildEditPrompts() : buildPrompts();
    const currentOutputContent = (() => {
        if (currentModel === 'NanoBanana') return isEditMode ? editDramaticPrompt : dramaticPrompt;
        if (currentModel === 'Midjourney') return isEditMode ? editMjPrompt : mjOptimizedPrompt;
        if (currentModel === 'ChatGPT')    return isEditMode ? editCgPrompt : cgEnhancedPrompt;
        return '';
    })();

    return {
        // refs
        moodImageRef, referenceExtractRef, tuningChatRef, editTuningChatRef, editImageRef,
        // sidebar / view
        isSidebarOpen, setIsSidebarOpen, currentView, setCurrentView,
        // base
        inputText, setInputText, base64Image, setBase64Image, isDragging, setIsDragging,
        // persona
        aiPersona, setAiPersona, personaDropdownOpen, setPersonaDropdownOpen,
        isAdvancedOptionsEnabled, setIsAdvancedOptionsEnabled,
        isEnhanceModeEnabled, setIsEnhanceModeEnabled,
        enhanceMode, setEnhanceMode, momentumActive, setMomentumActive,
        auraPriority, setAuraPriority, personaSliderValue, setPersonaSliderValue,
        // MMO
        baseStyle, setBaseStyle, aspectRatio, setAspectRatio, occupancy, setOccupancy,
        layoutType, setLayoutType, layoutPreset, setLayoutPreset,
        stemWeight, setStemWeight, charWidth, setCharWidth, charProportion, setCharProportion,
        kerning, setKerning, subTitleSize, setSubTitleSize,
        scriptType, setScriptType, terminalStyle, setTerminalStyle,
        strokeTexture, setStrokeTexture, strokeSharpness, setStrokeSharpness,
        strokeExtension, setStrokeExtension, cornerStyle, setCornerStyle,
        slantAngle, setSlantAngle, kineticVelocity, setKineticVelocity,
        slicingIntensity, setSlicingIntensity, deformationDamage, setDeformationDamage,
        letterConnection, setLetterConnection, internalSpace, setInternalSpace, logoDegree, setLogoDegree,
        mmoSilhouetteFraming, setMmoSilhouetteFraming, mmoSurroundingElement, setMmoSurroundingElement,
        dynamicOptions, setDynamicOptions, customDesignInjections, setCustomDesignInjections,
        aiModel, setAiModel, editAiModel, setEditAiModel,
        // output prompts
        dramaticPrompt, mjOptimizedPrompt, cgEnhancedPrompt,
        editDramaticPrompt, editMjPrompt, editCgPrompt,
        aiRecSummary,
        // loading
        isEnhancing, isMjOptimizing, isCgEnhancing, isExpandingIntent, isRecommending,
        isEditEnhancing, isEditMjOptimizing, isEditCgEnhancing, isEditExpandingIntent,
        // copy
        copiedTop, copiedBottom, baseLangView, setBaseLangView,
        // manual base
        manualBasePrompt, editManualBasePrompt, setManualBasePrompt, setEditManualBasePrompt,
        activeTroubleshoots, setActiveTroubleshoots, activeGuards, setActiveGuards,
        // edit mode
        editUploadedImage, setEditUploadedImage, editInstruction, setEditInstruction,
        applyAiRecInEdit, setApplyAiRecInEdit, applyAutoRefine, setApplyAutoRefine,
        editStrokeMod, setEditStrokeMod, editElementMod, setEditElementMod, editSurfaceMod, setEditSurfaceMod,
        openCardId, setOpenCardId, editOpenCardId, setEditOpenCardId,
        isPromptExpanded, setIsPromptExpanded, isEditPromptExpanded, setIsEditPromptExpanded,
        isOutdated, isEditOutdated,
        // tuning
        isTuningModalOpen, setIsTuningModalOpen, isEditTuningModalOpen, setIsEditTuningModalOpen,
        tuningChatHistory, editTuningChatHistory, tuningInputValue, setTuningInputValue,
        editTuningInputValue, setEditTuningInputValue,
        isTuningLoading, isEditTuningLoading,
        currentTunedAura, setCurrentTunedAura, currentTunedEditAura, setCurrentTunedEditAura,
        tuningReferenceImage, setTuningReferenceImage, editTuningReferenceImage, setEditTuningReferenceImage,
        isAnalyzingMood, isExtractingReference,
        // inspector
        isInspectorModalOpen, setIsInspectorModalOpen, isInspecting,
        inspectionResult, selectedResolutionIndex, setSelectedResolutionIndex,
        // import
        isImportModalOpen, setIsImportModalOpen, importInputValue, setImportInputValue,
        // derived
        isEditMode, currentModel, setModel, isPromptOutdated, isExpanded, setExpanded,
        isGeneratingDramatic, isGeneratingMj, isGeneratingCg, hasManualBasePrompt,
        currentPrompts, currentOutputContent,
        // handlers
        handleToggleCard, handleEditToggleCard, toggleGuard, toggleTroubleshoot,
        handleScriptPresetChange, handleLayoutPresetChange,
        handleReset, handleAiRecommendation,
        copyToClipboard, processFile,
        handleDragOver, handleDragLeave, handleDrop,
        handleEditDrop, handleEditImageUpload, handleMoodImageUpload, handleTuningImageUpload, handleReferenceExtraction,
        openTuningRoom, openEditTuningRoom,
        handleSendTuningMessage, handleSendEditTuningMessage,
        handleExpandIntent, handleEditExpandIntent,
        handleImportPrompt, generateSaveCode, getQualityScores, getAdapterNotes,
        buildPrompts, buildEditPrompts, runInspector,
        requestDramaticEnhancement, requestEditDramaticEnhancement,
        requestMidjourneyOptimization, requestChatGPTEnhancement,
        handleCompileDramatic, handleCompileMj, handleCompileCg,
    };
}
